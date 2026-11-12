import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  atualizarTipoUsuario,
  ehTipoUsuario,
  listarUsuarios,
  ROTULOS_TIPO_USUARIO,
  TIPOS_USUARIO,
  type Conta,
  type TipoUsuario,
  type Usuario,
} from '../services/auth'

type LogadoProps = {
  conta: Conta
  onTipoUsuarioAlterado: (tipoUsuario: TipoUsuario) => void
  onSair: () => void
}

const SITUACOES_LIVRO = ['disponivel', 'emprestado', 'devolvido', 'atrasado'] as const
type SituacaoLivro = (typeof SITUACOES_LIVRO)[number]

const ROTULOS_SITUACAO: Record<SituacaoLivro, string> = {
  disponivel: 'Disponível',
  emprestado: 'Emprestado',
  devolvido: 'Devolvido',
  atrasado: 'Atrasado',
}

type Livro = {
  id: string
  titulo: string
  autor: string
  categoria: string
  quantidade: number
  situacao: SituacaoLivro
}

type LivroForm = Omit<Livro, 'id'>

const LIVROS_KEY = 'entrelinhas:livros'
const FORM_VAZIO: LivroForm = { titulo: '', autor: '', categoria: '', quantidade: 1, situacao: 'disponivel' }

function ehSituacaoLivro(valor: unknown): valor is SituacaoLivro {
  return SITUACOES_LIVRO.some((situacao) => situacao === valor)
}

function lerLivros(): Livro[] {
  const dados = localStorage.getItem(LIVROS_KEY)
  if (!dados) return []

  const livros: unknown = JSON.parse(dados)
  if (
    !Array.isArray(livros) ||
    !livros.every(
      (livro) =>
        typeof livro.id === 'string' &&
        typeof livro.titulo === 'string' &&
        typeof livro.autor === 'string' &&
        typeof livro.categoria === 'string' &&
        Number.isSafeInteger(livro.quantidade) &&
        livro.quantidade >= 0 &&
        (livro.situacao === undefined || ehSituacaoLivro(livro.situacao)),
    )
  ) {
    throw new Error('Os dados do acervo estão inválidos.')
  }

  return livros.map((livro) => ({ ...livro, situacao: livro.situacao ?? 'disponivel' })) as Livro[]
}

function Logado({ conta, onTipoUsuarioAlterado, onSair }: LogadoProps) {
  const [livros, setLivros] = useState<Livro[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState<LivroForm>(FORM_VAZIO)
  const [livroEditando, setLivroEditando] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const podeGerenciarAcervo = conta.tipoUsuario !== 'leitor'
  const podeGerenciarUsuarios = conta.tipoUsuario === 'administrador'

  useEffect(() => {
    try {
      setLivros(lerLivros())
    } catch {
      setErro('Não foi possível carregar o acervo salvo neste navegador.')
    }

    if (conta.tipoUsuario === 'administrador') {
      try {
        setUsuarios(listarUsuarios())
      } catch {
        setErro('Não foi possível carregar os usuários salvos neste navegador.')
      }
    } else {
      setUsuarios([])
    }
  }, [conta.tipoUsuario])

  const livrosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR')
    if (!termo) return livros

    return livros.filter((livro) =>
      `${livro.titulo} ${livro.autor} ${livro.categoria} ${ROTULOS_SITUACAO[livro.situacao]}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo),
    )
  }, [busca, livros])

  function limparFormulario() {
    setForm(FORM_VAZIO)
    setLivroEditando(null)
    setErro('')
  }

  function salvarLivro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    const titulo = form.titulo.trim()
    const autor = form.autor.trim()
    if (!titulo || !autor || !Number.isSafeInteger(form.quantidade) || form.quantidade < 0) {
      setErro('Informe título, autor e uma quantidade válida (zero ou mais).')
      return
    }

    const novoAcervo = livroEditando
      ? livros.map((livro) => livro.id === livroEditando ? { ...livro, ...form, titulo, autor, categoria: form.categoria.trim() } : livro)
      : [...livros, { ...form, titulo, autor, categoria: form.categoria.trim(), id: crypto.randomUUID() }]

    try {
      localStorage.setItem(LIVROS_KEY, JSON.stringify(novoAcervo))
      setLivros(novoAcervo)
      limparFormulario()
    } catch {
      setErro('Não foi possível salvar o livro. Verifique o armazenamento do navegador.')
    }
  }

  function editarLivro(livro: Livro) {
    setLivroEditando(livro.id)
    setForm({
      titulo: livro.titulo,
      autor: livro.autor,
      categoria: livro.categoria,
      quantidade: livro.quantidade,
      situacao: livro.situacao,
    })
    setErro('')
    document.getElementById('formulario-livro')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function excluirLivro(livro: Livro) {
    if (!window.confirm(`Excluir "${livro.titulo}" do acervo?`)) return

    const novoAcervo = livros.filter((item) => item.id !== livro.id)
    try {
      localStorage.setItem(LIVROS_KEY, JSON.stringify(novoAcervo))
      setLivros(novoAcervo)
      if (livroEditando === livro.id) limparFormulario()
      setErro('')
    } catch {
      setErro('Não foi possível excluir o livro. Verifique o armazenamento do navegador.')
    }
  }

  function alterarSituacaoLivro(id: string, situacao: SituacaoLivro) {
    const novoAcervo = livros.map((livro) => livro.id === id ? { ...livro, situacao } : livro)
    try {
      localStorage.setItem(LIVROS_KEY, JSON.stringify(novoAcervo))
      setLivros(novoAcervo)
      setErro('')
    } catch {
      setErro('Não foi possível atualizar o status do livro. Verifique o armazenamento do navegador.')
    }
  }

  function alterarPerfilUsuario(email: string, tipoUsuario: TipoUsuario) {
    try {
      atualizarTipoUsuario(email, tipoUsuario)
      setUsuarios(listarUsuarios())
      if (email === conta.email) onTipoUsuarioAlterado(tipoUsuario)
      setErro('')
    } catch (erroPerfil) {
      setErro(erroPerfil instanceof Error ? erroPerfil.message : 'Não foi possível atualizar o perfil.')
    }
  }

  return (
    <main className="app dashboard">
      <header className="topbar dashboard-topbar">
        <a className="brand" href="#">Biblioteca</a>
        <div className="dashboard-account">
          <span className="account-name">{conta.nome.split(' ')[0]}</span>
          <span className="role-badge">{ROTULOS_TIPO_USUARIO[conta.tipoUsuario]}</span>
          <button className="text-button" onClick={onSair}>Sair</button>
        </div>
      </header>

      <section className="welcome-section">
        <h1>Acervo da biblioteca</h1>
        <p className="welcome-copy">
          {podeGerenciarAcervo
            ? 'Cadastre os livros e mantenha as quantidades disponíveis atualizadas.'
            : 'Consulte e pesquise os livros disponíveis no acervo.'}
        </p>
        <div className="inventory-summary">
          <span><strong>{livros.length}</strong> {livros.length === 1 ? 'título' : 'títulos'}</span>
          <span><strong>{livros.reduce((total, livro) => total + livro.quantidade, 0)}</strong> exemplares disponíveis</span>
        </div>
      </section>

      {podeGerenciarAcervo && <section className="inventory-section">
        <div className="section-heading">
          <div>
            <h2>{livroEditando ? 'Editar livro' : 'Cadastrar livro'}</h2>
            <p className="section-description">{livroEditando ? 'Altere os dados e salve as mudanças.' : 'Preencha os dados para adicionar um livro ao acervo.'}</p>
          </div>
        </div>
        <form id="formulario-livro" className="book-form" onSubmit={salvarLivro}>
          <label className="field">
            <span>Título</span>
            <input value={form.titulo} onChange={(evento) => setForm({ ...form, titulo: evento.target.value })} placeholder="Título do livro" required maxLength={120} />
          </label>
          <label className="field">
            <span>Autor</span>
            <input value={form.autor} onChange={(evento) => setForm({ ...form, autor: evento.target.value })} placeholder="Nome do autor" required maxLength={100} />
          </label>
          <label className="field">
            <span>Categoria</span>
            <input value={form.categoria} onChange={(evento) => setForm({ ...form, categoria: evento.target.value })} placeholder="Ex.: Romance" maxLength={60} />
          </label>
          <label className="field quantity-field">
            <span>Quantidade</span>
            <input type="number" value={form.quantidade} onChange={(evento) => setForm({ ...form, quantidade: Number(evento.target.value) })} min={0} step={1} required />
          </label>
          {erro && <p className="form-error inventory-error" role="alert">{erro}</p>}
          <div className="book-form-actions">
            <button className="submit-button" type="submit">{livroEditando ? 'Salvar alterações' : 'Adicionar livro'}</button>
            {livroEditando && <button className="cancel-button" type="button" onClick={limparFormulario}>Cancelar</button>}
          </div>
        </form>
      </section>}

      <section className="catalog-section">
        <div className="section-heading">
          <h2>Livros cadastrados</h2>
          <span className="book-count">{livrosFiltrados.length} {livrosFiltrados.length === 1 ? 'livro' : 'livros'}</span>
        </div>
        <label className="search-box">
          <input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar por título, autor ou categoria" aria-label="Buscar livros do acervo" />
        </label>
        {livrosFiltrados.length > 0 ? (
          <div className="book-list">
            {livrosFiltrados.map((livro) => (
              <article className="book-card" key={livro.id}>
                <div className="book-details">
                  <h3>{livro.titulo}</h3>
                  <p className="book-author">{livro.autor}{livro.categoria && ` · ${livro.categoria}`}</p>
                </div>
                <span className={`book-quantity ${livro.quantidade === 0 ? 'out-of-stock' : ''}`}>
                  {livro.quantidade} {livro.quantidade === 1 ? 'exemplar' : 'exemplares'}
                </span>
                <span className={`book-status status-${livro.situacao}`}>
                  {ROTULOS_SITUACAO[livro.situacao]}
                </span>
                {podeGerenciarAcervo && (
                  <div className="book-actions">
                    <label className="field book-status-control">
                      <span className="visually-hidden">Status de {livro.titulo}</span>
                      <select
                        aria-label={`Status de ${livro.titulo}`}
                        value={livro.situacao}
                        onChange={(evento) => {
                          const situacao = evento.target.value
                          if (ehSituacaoLivro(situacao)) alterarSituacaoLivro(livro.id, situacao)
                        }}
                      >
                        {SITUACOES_LIVRO.map((situacao) => (
                          <option key={situacao} value={situacao}>{ROTULOS_SITUACAO[situacao]}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className="text-button" onClick={() => editarLivro(livro)}>Editar</button>
                    <button type="button" className="delete-button" onClick={() => excluirLivro(livro)}>Excluir</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-search">
            {busca
              ? 'Nenhum livro encontrado com essa busca.'
              : podeGerenciarAcervo
                ? 'Ainda não há livros no acervo. Use o formulário acima para cadastrar o primeiro.'
                : 'Ainda não há livros cadastrados no acervo.'}
          </p>
        )}
      </section>
      {podeGerenciarUsuarios && (
        <section className="users-section">
          <div className="section-heading">
            <div>
              <h2>Usuários</h2>
              <p className="section-description">Consulte as contas e altere os tipos de usuário.</p>
            </div>
            <span className="book-count">{usuarios.length} {usuarios.length === 1 ? 'usuário' : 'usuários'}</span>
          </div>
          {erro && <p className="form-error" role="alert">{erro}</p>}
          <div className="user-list">
            {usuarios.map((usuario) => (
              <div className="user-row" key={usuario.email}>
                <div className="user-details">
                  <strong>{usuario.nome}</strong>
                  <span>{usuario.email}</span>
                </div>
                <label className="field user-role">
                  <span className="visually-hidden">Tipo de usuário de {usuario.nome}</span>
                  <select
                    aria-label={`Tipo de usuário de ${usuario.nome}`}
                    value={usuario.tipoUsuario}
                    onChange={(evento) => {
                      const tipo = evento.target.value
                      if (ehTipoUsuario(tipo)) {
                        alterarPerfilUsuario(usuario.email, tipo)
                      }
                    }}
                  >
                    {TIPOS_USUARIO.map((tipo) => (
                      <option key={tipo} value={tipo}>{ROTULOS_TIPO_USUARIO[tipo]}</option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
        </section>
      )}
      <footer className="dashboard-footer">
        Os dados ficam salvos neste navegador. Os perfis são demonstrativos e não oferecem controle de acesso seguro sem um servidor.
      </footer>
    </main>
  )
}

export default Logado
