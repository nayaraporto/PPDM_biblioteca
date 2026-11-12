import { useState, type FormEvent } from 'react'
import { autenticar, ehTipoUsuario, ROTULOS_TIPO_USUARIO, TIPOS_USUARIO, type Conta, type TipoUsuario } from '../services/auth'

type LoginProps = {
  erroSessao: string
  onLoginConcluido: (conta: Conta) => void
  onIrParaCadastro: () => void
}

function Login({ erroSessao, onLoginConcluido, onIrParaCadastro }: LoginProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('leitor')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviarLogin(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      const conta = await autenticar(email, senha, tipoUsuario)
      onLoginConcluido(conta)
    } catch (erroLogin) {
      setErro(erroLogin instanceof Error ? erroLogin.message : 'Não foi possível entrar na conta.')
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
            <p className="eyebrow">BEM-VINDA(O) DE VOLTA</p>
            <h2>Entre na sua conta</h2>
            <p>Acesse sua conta para continuar.</p>
          </div>

          <div className="mode-switch" role="tablist" aria-label="Acesso à plataforma">
            <button type="button" className="active" role="tab" aria-selected="true">Entrar</button>
            <button type="button" onClick={onIrParaCadastro} role="tab" aria-selected="false">Criar conta</button>
          </div>

          <form className="auth-form" onSubmit={enviarLogin}>
            <label className="field">
              <span>Entrar como</span>
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
            </label>
            <label className="field">
              <span>E-mail</span>
              <input type="email" autoComplete="email" value={email} onChange={(evento) => setEmail(evento.target.value)} placeholder="voce@exemplo.com" required maxLength={254} />
            </label>
            <label className="field">
              <span>Senha</span>
              <span className="password-wrap">
                <input type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(evento) => setSenha(evento.target.value)} placeholder="Digite sua senha" required />
                <button className="show-password" type="button" onClick={() => setMostrarSenha(!mostrarSenha)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}>{mostrarSenha ? 'Ocultar' : 'Mostrar'}</button>
              </span>
            </label>
            {(erroSessao || erro) && <p className="form-error" role="alert">{erroSessao || erro}</p>}
            <button className="submit-button" type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar na biblioteca'}
            </button>
          </form>

          <p className="form-switch">
            Ainda não tem uma conta? <button type="button" onClick={onIrParaCadastro}>Cadastre-se</button>
          </p>
          <p className="privacy-note">Seus dados ficam salvos apenas neste dispositivo.</p>
        </div>
      </section>
    </main>
  )
}

export default Login
