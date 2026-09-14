import { MARCAS } from '@/lib/marcas'

type Props = {
  marca?: string | null
  tamanho?: number
  /** Sobrescreve o fundo, para corretora com cor própria. */
  fundo?: string | null
  /** Sobrescreve o texto, para iniciais de corretora. */
  rotulo?: string | null
  /** Logo enviado pelo usuário, quando houver. */
  imagem?: string | null
}

/** Quadradinho da marca do banco, da corretora ou da forma de pagamento. */
export function LogoMarca({ marca, tamanho = 44, fundo, rotulo, imagem }: Props) {
  const m = (marca && MARCAS[marca]) || { bg: '#64748b', label: '?' }
  const conteudo = imagem ? (
    <img src={imagem} alt="" />
  ) : rotulo ? (
    rotulo
  ) : m.icone ? (
    <i className={`fa-solid ${m.icone}`} aria-hidden="true" />
  ) : (
    m.label
  )

  return (
    <div
      className="brand-logo"
      style={{
        background: fundo ?? m.bg,
        color: m.fg ?? '#fff',
        width: tamanho,
        height: tamanho,
      }}
    >
      {conteudo}
    </div>
  )
}
