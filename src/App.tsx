import { useEffect, useState } from 'react'
import type { Conta } from './services/auth'
import { encerrarSessao, carregarSessao } from './services/auth'
import Cadastro from './pages/Cadastro'
import Logado from './pages/Logado'
import Login from './pages/Login'
import './App.css'

type Pagina = 'login' | 'cadastro'

function App() {
  const [conta, setConta] = useState<Conta | null>(null)
  const [pagina, setPagina] = useState<Pagina>('login')
  const [erroSessao, setErroSessao] = useState('')

  useEffect(() => {
    try {
      setConta(carregarSessao())
    } catch {
      setErroSessao('Não foi possível ler os dados salvos neste navegador.')
    }
  }, [])

  function sair() {
    try {
      encerrarSessao()
      setConta(null)
      setPagina('login')
    } catch {
      setErroSessao('Não foi possível encerrar a sessão. Tente novamente.')
    }
  }

  if (conta) {
    return (
      <Logado
        conta={conta}
        onTipoUsuarioAlterado={(tipoUsuario) => setConta((atual) => atual ? { ...atual, tipoUsuario } : atual)}
        onSair={sair}
      />
    )
  }

  if (pagina === 'cadastro') {
    return (
      <Cadastro
        erroSessao={erroSessao}
        onCadastroConcluido={setConta}
        onIrParaLogin={() => {
          setErroSessao('')
          setPagina('login')
        }}
      />
    )
  }

  return (
    <Login
      erroSessao={erroSessao}
      onLoginConcluido={setConta}
      onIrParaCadastro={() => {
        setErroSessao('')
        setPagina('cadastro')
      }}
    />
  )
}

export default App
