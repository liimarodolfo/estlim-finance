import { useMemo, useState } from 'react'
import { Tela } from '@/ui/Tela'
import { Chip } from '@/ui/Chip'
import { CardGradiente } from '@/ui/CardGradiente'
import { NumeroAnimado } from '@/ui/NumeroAnimado'
import { LogoMarca } from '@/ui/LogoMarca'
import { Bandeira } from '@/ui/Bandeira'
import { useReveal } from '@/ui/useReveal'
import { fmtMoeda } from '@/lib/formatters'
import { GRADIENTE_DONO, gradienteDaMarca } from '@/lib/marcas'
import { useCarteiras } from '@/hooks/useCarteiras'
import { SheetCarteira } from '@/features/carteira/SheetCarteira'
import { SheetAjuste } from '@/features/carteira/SheetAjuste'
import type { Carteira as TipoCarteiraLinha, Dono, TipoCarteira } from '@/types/database'

type Perfil = 'Geral' | 'Rodolfo' | 'Thainy' | 'RLiima'

const PERFIS: { id: Perfil; rotulo: string; icone: string }[] = [
  { id: 'Geral', rotulo: 'Carteira Geral', icone: 'fa-layer-group' },
  { id: 'Rodolfo', rotulo: 'Rodolfo', icone: 'fa-user' },
  { id: 'Thainy', rotulo: 'Thainy', icone: 'fa-user' },
  { id: 'RLiima', rotulo: 'RLiima', icone: 'fa-building' },
]

const dia = (n: number | null) => String(n ?? 0).padStart(2, '0')

function tituloDoPerfil(perfil: Perfil) {
  if (perfil === 'Geral') return 'Carteira geral do casal e da RLiima'
  if (perfil === 'RLiima') return 'Carteira RLiima · Empresa (PJ)'
  return `Carteira ${perfil}`
}

function subtituloDoPerfil(perfil: Perfil) {
  if (perfil === 'Geral') return 'Saldo somado das contas do casal e da RLiima (PJ)'
  if (perfil === 'RLiima') return 'Saldo das contas da empresa'
  return `Saldo das contas de ${perfil}`
}

export default function Carteira() {
  const { data: carteiras = [], isLoading } = useCarteiras()
  const [perfil, setPerfil] = useState<Perfil>('Geral')
  const [sheetAberto, setSheetAberto] = useState(false)
  const [ajusteAberto, setAjusteAberto] = useState(false)
  const [emEdicao, setEmEdicao] = useState<TipoCarteiraLinha | null>(null)
  const [tipoNovo, setTipoNovo] = useState<TipoCarteira>('conta')

  const doPerfil = useMemo(
    () => carteiras.filter((c) => perfil === 'Geral' || c.dono === perfil),
    [carteiras, perfil],
  )
  const contas = useMemo(() => doPerfil.filter((c) => c.tipo === 'conta'), [doPerfil])
  const cartoes = useMemo(() => doPerfil.filter((c) => c.tipo === 'cartao'), [doPerfil])

  const saldoTotal = contas.reduce((s, c) => s + c.saldo, 0)
  const usadoTotal = cartoes.reduce((s, c) => s + c.usado, 0)
  const limiteLivre = cartoes.reduce((s, c) => s + c.limite, 0) - usadoTotal

  const donos: Dono[] = perfil === 'Geral' ? ['Rodolfo', 'Thainy', 'RLiima'] : [perfil]

  useReveal([carteiras, perfil])

  const abrirNovo = (tipo: TipoCarteira) => {
    setEmEdicao(null)
    setTipoNovo(tipo)
    setSheetAberto(true)
  }

  const abrirEdicao = (carteira: TipoCarteiraLinha) => {
    setEmEdicao(carteira)
    setTipoNovo(carteira.tipo)
    setSheetAberto(true)
  }

  return (
    <Tela id="view-wallet">
      <CardGradiente variante="carteira" gradiente={GRADIENTE_DONO[perfil]} key={perfil}>
        <div className="hero-label">{tituloDoPerfil(perfil)}</div>
        <NumeroAnimado valor={saldoTotal} className="hero-value" />
        <div className="hero-sub">{subtituloDoPerfil(perfil)}</div>
        <div className="ws-row">
          <div className="ws-item">
            <b>{fmtMoeda(usadoTotal)}</b>
            <span>
              <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" />
              Faturas em aberto
            </span>
          </div>
          <div className="ws-item">
            <b>{fmtMoeda(limiteLivre)}</b>
            <span>
              <i className="fa-solid fa-unlock" aria-hidden="true" />
              Limite livre
            </span>
          </div>
        </div>
        {perfil !== 'Geral' ? (
          <button type="button" className="ajuste-btn" onClick={() => setAjusteAberto(true)}>
            <i className="fa-solid fa-scale-balanced" aria-hidden="true" />
            Ajustar saldo
          </button>
        ) : null}
      </CardGradiente>

      <div className="owner-filters">
        {PERFIS.map((p) => (
          <Chip key={p.id} ativo={perfil === p.id} icone={p.icone} aoClicar={() => setPerfil(p.id)}>
            {p.rotulo}
          </Chip>
        ))}
      </div>

      <div id="walletBody">
        {donos.map((d) => {
          const doDono = contas.filter((c) => c.dono === d)
          if (!doDono.length) return null
          return (
            <div key={`contas-${d}`}>
              <div className="section-title">
                <span className="st-l">
                  <i className="fa-solid fa-building-columns" aria-hidden="true" />
                  Contas {d}
                </span>
                <span className="owner-tag">{fmtMoeda(doDono.reduce((s, c) => s + c.saldo, 0))}</span>
              </div>
              <div className="card list-card">
                {doDono.map((c) => (
                  <div
                    key={c.id}
                    className="bank-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirEdicao(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') abrirEdicao(c)
                    }}
                  >
                    <LogoMarca
                      marca={c.banco}
                      tamanho={42}
                      fundo={c.banco === 'custom' ? c.cor_gradiente : null}
                      rotulo={c.banco === 'custom' ? (c.banco_nome ?? '').slice(0, 3) : null}
                    />
                    <div className="b-info">
                      <b>{c.nome}</b>
                      <span>{c.descricao ?? c.banco_nome ?? ''}</span>
                    </div>
                    <span className="b-val">{fmtMoeda(c.saldo)}</span>
                    <i className="fa-solid fa-chevron-right row-chev" aria-hidden="true" />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {donos.map((d) => {
          const doDono = cartoes.filter((c) => c.dono === d)
          if (!doDono.length) return null
          return (
            <div key={`cartoes-${d}`}>
              <div className="section-title">
                <span className="st-l">
                  <i className="fa-solid fa-credit-card" aria-hidden="true" />
                  Cartões {d}
                </span>
                <span className="owner-tag">
                  {fmtMoeda(doDono.reduce((s, c) => s + c.usado, 0))} em uso
                </span>
              </div>
              <div className="cc-grid">
                {doDono.map((c, i) => {
                  const pct = c.limite > 0 ? Math.round((c.usado / c.limite) * 100) : 0
                  return (
                    <div
                      key={c.id}
                      className="credit-card"
                      style={{
                        background: c.cor_gradiente ?? gradienteDaMarca(c.banco),
                        animationDelay: `${i * 80}ms`,
                      }}
                      role="button"
                      tabIndex={0}
                      onClick={() => abrirEdicao(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') abrirEdicao(c)
                      }}
                    >
                      <div className="cc-top">
                        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                          <LogoMarca
                            marca={c.banco}
                            tamanho={42}
                            fundo={c.banco === 'custom' ? c.cor_gradiente : null}
                            rotulo={c.banco === 'custom' ? (c.banco_nome ?? '').slice(0, 3) : null}
                          />
                          <div>
                            <small>
                              Cartão{c.funcao ? ` · ${c.funcao}` : ''} · {c.dono}
                            </small>
                            <h3>{c.nome}</h3>
                          </div>
                        </div>
                        <Bandeira bandeira={c.bandeira} />
                      </div>
                      <div className="limit-track">
                        <div className="limit-fill" data-w={`${pct}%`} />
                      </div>
                      <div className="cc-meta">
                        <span>
                          <i className="fa-solid fa-cart-shopping" aria-hidden="true" /> Usado{' '}
                          {fmtMoeda(c.usado)} ({pct}%)
                        </span>
                        <span>
                          <i className="fa-solid fa-unlock" aria-hidden="true" /> Livre{' '}
                          {fmtMoeda(c.limite - c.usado)}
                        </span>
                      </div>
                      <div className="cc-meta">
                        <span>
                          <i className="fa-solid fa-calendar-check" aria-hidden="true" /> Fecha dia{' '}
                          {dia(c.dia_fechamento)}
                        </span>
                        <span>
                          <i className="fa-solid fa-calendar-day" aria-hidden="true" /> Vence dia{' '}
                          {dia(c.dia_vencimento)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {!isLoading && doPerfil.length === 0 ? (
          <div className="card" style={{ marginTop: 26 }}>
            <div className="empty">
              <i
                className="fa-solid fa-wallet"
                style={{ fontSize: 22, display: 'block', marginBottom: 10 }}
                aria-hidden="true"
              />
              {perfil === 'Geral'
                ? 'Nenhuma conta ou cartão cadastrado ainda.'
                : `Nenhuma conta ou cartão de ${perfil} ainda.`}
              <br />
              Comece pelos botões abaixo.
            </div>
          </div>
        ) : null}
      </div>

      <div className="bal-actions" style={{ marginTop: 22 }}>
        <button type="button" className="btn-sm ghost" onClick={() => abrirNovo('conta')}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          Nova conta
        </button>
        <button type="button" className="btn-sm ghost" onClick={() => abrirNovo('cartao')}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          Novo cartão
        </button>
      </div>

      <SheetCarteira
        // Remontar por key garante formulário limpo a cada abertura.
        key={`${emEdicao?.id ?? 'novo'}-${tipoNovo}-${sheetAberto}`}
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        carteira={emEdicao}
        tipoInicial={tipoNovo}
        donoInicial={perfil === 'Geral' ? 'Rodolfo' : perfil}
      />

      <SheetAjuste
        key={`ajuste-${perfil}-${ajusteAberto}`}
        aberto={ajusteAberto}
        aoFechar={() => setAjusteAberto(false)}
        contas={contas}
      />
    </Tela>
  )
}
