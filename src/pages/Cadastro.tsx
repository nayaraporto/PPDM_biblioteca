import { useState, type FormEvent } from 'react'
import { cadastrarConta, ehTipoUsuario, ROTULOS_TIPO_USUARIO, TIPOS_USUARIO, type Conta, type TipoUsuario } from '../services/auth'

type CadastroProps = {
  erroSessao: string
  onCadastroConcluido: (conta: Conta) => void
  onIrParaLogin: () => void
}

function Cadastro({ erroSessao, onCadastroConcluido, onIrParaLogin }: CadastroProps) {
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [endereco, setEndereco] = useState('')
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('leitor')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const [dataMaxima] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  })

  function formatarCpf(valor: string) {
    const digitos = valor.replace(/\D/g, '').slice(0, 11)
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  function cpfValido(valor: string) {
    const digitos = valor.replace(/\D/g, '')
    if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false

    const calcularDigito = (base: string, pesoInicial: number) => {
      const soma = [...base].reduce((total, digito, indice) => total + Number(digito) * (pesoInicial - indice), 0)
      const resto = (soma * 10) % 11
      return resto === 10 ? 0 : resto
    }

    return (
      calcularDigito(digitos.slice(0, 9), 10) === Number(digitos[9]) &&
      calcularDigito(digitos.slice(0, 10), 11) === Number(digitos[10])
    )
  }

  async function enviarCadastro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')

    if (!cpfValido(cpf)) {
      setErro('Informe um CPF válido.')
      return
    }
    if (senha.length < 8) {
      setErro('Sua senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não coincidem. Confira e tente novamente.')
      return
    }

    setCarregando(true)
    try {
      const conta = await cadastrarConta(nome, cpf, email, telefone, dataNascimento, endereco, tipoUsuario, senha)
      onCadastroConcluido(conta)
    } catch (erroCadastro) {
      setErro(erroCadastro instanceof Error ? erroCadastro.message : 'Não foi possível criar a conta.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="app auth-layout">
      <aside className="auth-intro">
        <div className="auth-intro-content">
          <a className="brand auth-brand" href="#">Biblioteca</a>
          <p className="eyebrow">LEITURAS EM ORDEM</p>
          <h1>Um espaço simples para cuidar do seu acervo.</h1>
          <p className="auth-intro-copy">Cadastre seus livros, acompanhe os exemplares e encontre tudo em um só lugar.</p>
          <p className="auth-intro-note">Sua biblioteca, organizada do seu jeito.</p>
        </div>
      </aside>
      <section className="form-panel">
        <div className="form-wrap">
          <div className="form-heading">
            <p className="eyebrow">VAMOS COMEÇAR?</p>
            <h2>Crie sua conta</h2>
            <p>Preencha seus dados para acessar a biblioteca.</p>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Acesso à plataforma">
            <button type="button" onClick={onIrParaLogin} role="tab" aria-selected="false">Entrar</button>
            <button type="button" className="active" role="tab" aria-selected="true">Criar conta</button>
          </div>

          <form className="auth-form" onSubmit={enviarCadastro}>
            <label className="field">
              <span>Seu nome</span>
              <input autoComplete="name" value={nome} onChange={(evento) => setNome(evento.target.value)} placeholder="Seu nome" required maxLength={80} />
            </label>
            <label className="field">
              <span>CPF</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={cpf}
                onChange={(evento) => setCpf(formatarCpf(evento.target.value))}
                placeholder="000.000.000-00"
                required
                maxLength={14}
                aria-describedby="cpf-ajuda"
              />
              <span id="cpf-ajuda" className="field-hint">Usado apenas para identificar seu cadastro.</span>
            </label>
            <label className="field">
              <span>E-mail</span>
              <input type="email" autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="voce@exemplo.com" required maxLength={254} />
            </label>
            <label className="field">
              <span>Telefone</span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={telefone} onChange={(evento) => setTelefone(evento.target.value)} placeholder="(00) 00000-0000" required maxLength={20} />
            </label>
            <label className="field">
              <span>Data de nascimento</span>
              <input type="date" autoComplete="bday" value={dataNascimento} onChange={(evento) => setDataNascimento(evento.target.value)} required max={dataMaxima} />
            </label>
            <label className="field">
              <span>Endereço</span>
              <input type="text" autoComplete="street-address" value={endereco} onChange={(evento) => setEndereco(evento.target.value)} placeholder="Rua, número, bairro e cidade" required maxLength={200} />
            </label>
            <label className="field">
              <span>Tipo de usuário</span>
              <select
                value={tipoUsuario}
                onChange={(evento) => {
                  const tipo = evento.target.value
                  if (ehTipoUsuario(tipo)) setTipoUsuario(tipo)
                }}
                required
              >
                {TIPOS_USUARIO.map((tipo) => (
                  <option key={tipo} value={tipo}>{ROTULOS_TIPO_USUARIO[tipo]}</option>
                ))}
              </select>
              <span className="field-hint">Demonstração local: os perfis não são protegidos por um servidor.</span>
            </label>
            <label className="field">
              <span>Senha</span>
              <span className="password-wrap">
                <input type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Pelo menos 8 caracteres" required minLength={8} />
                <button className="show-password" type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
              </span>
            </label>
            <label className="field">
              <span>Confirme sua senha</span>
              <input type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password" value={confirmacao} onChange={(evento) => setConfirmacao(evento.target.value)} placeholder="Digite a senha novamente" required minLength={8} />
            </label>
            {(erroSessao || erro) && <p className="form-error" role="alert">{erroSessao || erro}</p>}
            <button className="submit-button" type="submit" disabled={carregando}>
              {carregando ? 'Criando conta...' : 'Criar minha conta'}
            </button>
          </form>

          <p className="form-switch">
            Já tem uma conta? <button type="button" onClick={onIrParaLogin}>Entrar</button>
          </p>
          <p className="privacy-note">Seus dados ficam salvos apenas neste dispositivo.</p>
        </div>
      </section>
    </main>
  )
}

export default Cadastro
