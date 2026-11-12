export const TIPOS_USUARIO = ['leitor', 'bibliotecario', 'administrador'] as const
export type TipoUsuario = (typeof TIPOS_USUARIO)[number]

export const ROTULOS_TIPO_USUARIO: Record<TipoUsuario, string> = {
  leitor: 'Leitor',
  bibliotecario: 'Bibliotecário',
  administrador: 'Administrador',
}

export type Conta = {
  nome: string
  cpf?: string
  email: string
  telefone?: string
  dataNascimento?: string
  endereco?: string
  tipoUsuario: TipoUsuario
  salt: string
  senhaHash: string
}

export type Usuario = Pick<Conta, 'nome' | 'email' | 'tipoUsuario'>

const CONTAS_KEY = 'entrelinhas:contas'
const SESSAO_KEY = 'entrelinhas:sessao'
const ITERACOES = 310_000

export function ehTipoUsuario(valor: unknown): valor is TipoUsuario {
  return TIPOS_USUARIO.some((tipo) => tipo === valor)
}

function bytesParaHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function criarHash(senha: string, salt: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits'])
  const saltBytes = Uint8Array.from(salt.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16))
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: ITERACOES, hash: 'SHA-256' },
    chave,
    256,
  )

  return bytesParaHex(new Uint8Array(bits))
}

function lerContas(): Conta[] {
  const dados = localStorage.getItem(CONTAS_KEY)
  if (!dados) return []

  const contas: unknown = JSON.parse(dados)
  if (
    !Array.isArray(contas) ||
    !contas.every(
      (conta) =>
        typeof conta.nome === 'string' &&
        typeof conta.email === 'string' &&
        typeof conta.salt === 'string' &&
        typeof conta.senhaHash === 'string' &&
        (conta.tipoUsuario === undefined || ehTipoUsuario(conta.tipoUsuario)),
    )
  ) {
    throw new Error('Os dados salvos estão inválidos.')
  }

  return contas.map((conta) => ({ ...conta, tipoUsuario: conta.tipoUsuario ?? 'leitor' })) as Conta[]
}

export async function cadastrarConta(
  nome: string,
  cpf: string,
  email: string,
  telefone: string,
  dataNascimento: string,
  endereco: string,
  tipoUsuario: TipoUsuario,
  senha: string,
) {
  if (!ehTipoUsuario(tipoUsuario)) {
    throw new Error('Selecione um tipo de usuário válido.')
  }

  const emailNormalizado = email.trim().toLocaleLowerCase('pt-BR')
  const contas = lerContas()

  if (contas.some((conta) => conta.email === emailNormalizado)) {
    throw new Error('Este e-mail já tem uma conta. Entre ou use outro e-mail.')
  }

  const salt = bytesParaHex(crypto.getRandomValues(new Uint8Array(16)))
  const conta: Conta = {
    nome: nome.trim(),
    cpf: cpf.replace(/\D/g, ''),
    email: emailNormalizado,
    telefone: telefone.trim(),
    dataNascimento,
    endereco: endereco.trim(),
    tipoUsuario,
    salt,
    senhaHash: await criarHash(senha, salt),
  }

  localStorage.setItem(CONTAS_KEY, JSON.stringify([...contas, conta]))
  localStorage.setItem(SESSAO_KEY, conta.email)
  return conta
}

export function listarUsuarios(): Usuario[] {
  return lerContas().map(({ nome, email, tipoUsuario }) => ({ nome, email, tipoUsuario }))
}

export function atualizarTipoUsuario(email: string, tipoUsuario: TipoUsuario): Usuario {
  if (!ehTipoUsuario(tipoUsuario)) {
    throw new Error('Selecione um tipo de usuário válido.')
  }

  const emailNormalizado = email.trim().toLocaleLowerCase('pt-BR')
  const contas = lerContas()
  const indice = contas.findIndex((conta) => conta.email === emailNormalizado)
  if (indice < 0) throw new Error('Usuário não encontrado.')

  const contaAtualizada = { ...contas[indice], tipoUsuario }
  contas[indice] = contaAtualizada
  localStorage.setItem(CONTAS_KEY, JSON.stringify(contas))

  const { nome, email: emailConta, tipoUsuario: tipoAtualizado } = contaAtualizada
  return { nome, email: emailConta, tipoUsuario: tipoAtualizado }
}

export async function autenticar(email: string, senha: string, tipoUsuario: TipoUsuario) {
  if (!ehTipoUsuario(tipoUsuario)) {
    throw new Error('Selecione um tipo de usuário válido.')
  }

  const emailNormalizado = email.trim().toLocaleLowerCase('pt-BR')
  const conta = lerContas().find((item) => item.email === emailNormalizado)

  if (!conta || (await criarHash(senha, conta.salt)) !== conta.senhaHash) {
    throw new Error('E-mail ou senha incorretos. Confira seus dados e tente novamente.')
  }

  if (conta.tipoUsuario !== tipoUsuario) {
    throw new Error(`Esta conta está cadastrada como ${ROTULOS_TIPO_USUARIO[conta.tipoUsuario]}. Selecione o tipo correto para entrar.`)
  }

  localStorage.setItem(SESSAO_KEY, conta.email)
  return conta
}

export function carregarSessao() {
  const email = localStorage.getItem(SESSAO_KEY)
  if (!email) return null

  const conta = lerContas().find((item) => item.email === email)
  if (!conta) localStorage.removeItem(SESSAO_KEY)
  return conta ?? null
}

export function encerrarSessao() {
  localStorage.removeItem(SESSAO_KEY)
}
