import { useState } from 'react'
import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { Sheet } from '@/ui/Sheet'
import { CheckCircle } from '@/ui/CheckCircle'
import { Chip } from '@/ui/Chip'
import { MiniBadge } from '@/ui/MiniBadge'
import { StatusBadge } from '@/ui/StatusBadge'
import { CardGradiente } from '@/ui/CardGradiente'
import { SeletorCor } from '@/ui/SeletorCor'
import { SeletorCorSolida } from '@/ui/SeletorCorSolida'
import { SeletorIcone } from '@/ui/SeletorIcone'
import { Campo } from '@/ui/Campo'
import { InputData } from '@/ui/InputData'
import { InputHora } from '@/ui/InputHora'
import { InputTelefone } from '@/ui/InputTelefone'
import { InputMoeda } from '@/ui/InputMoeda'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { LogoMarca } from '@/ui/LogoMarca'
import { Bandeira } from '@/ui/Bandeira'
import { NumeroAnimado } from '@/ui/NumeroAnimado'
import { useReveal } from '@/ui/useReveal'
import { confetti } from '@/lib/confetti'
import { toast } from '@/store/useToasts'
import { GRADIENTES, gradienteDaMarca } from '@/lib/marcas'
import { agora, fmtData, fmtMoeda, paraISO } from '@/lib/formatters'

/**
 * Catálogo do design system. Tela de conferência, fora da navegação: serve para
 * olhar todas as peças lado a lado nos dois temas antes de usá-las nas telas.
 */
export default function Catalogo() {
  const [sheetAberto, setSheetAberto] = useState(false)
  const [sheetLongo, setSheetLongo] = useState(false)
  const [marcado, setMarcado] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const [gradiente, setGradiente] = useState<string>(GRADIENTES[0][1])
  const [corSolida, setCorSolida] = useState('#5a2be2')
  const [icone, setIcone] = useState('fa-house')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [telefone, setTelefone] = useState('')
  const [valor, setValor] = useState<number | null>(null)
  const [saldo, setSaldo] = useState(7581.5)

  useReveal([])

  return (
    <Tela id="view-catalogo">
      <TituloSecao icone="fa-swatchbook" acessorio="tela de conferência">
        Catálogo do design system
      </TituloSecao>

      <CardGradiente>
        <div className="hero-label">Card de gradiente, com número animado</div>
        <NumeroAnimado valor={saldo} className="hero-value" como="div" />
        <div className="hero-sub">Toque em trocar valor para ver a contagem</div>
        <div className="hero-stats">
          <div className="hero-stat">
            <b>{fmtMoeda(22000)}</b>
            <span>
              <i className="fa-solid fa-arrow-trend-up" aria-hidden="true" />
              Receitas
            </span>
          </div>
          <div className="hero-stat">
            <b>{fmtMoeda(14418.5)}</b>
            <span>
              <i className="fa-solid fa-arrow-trend-down" aria-hidden="true" />
              Despesas
            </span>
          </div>
        </div>
        <button
          type="button"
          className="ajuste-btn"
          onClick={() => setSaldo(Math.round(Math.random() * 1500000) / 100)}
        >
          <i className="fa-solid fa-rotate" aria-hidden="true" />
          Trocar valor
        </button>
      </CardGradiente>

      <TituloSecao icone="fa-filter">Chips de filtro</TituloSecao>
      <div className="filters">
        {[
          ['todos', 'Todos', 'fa-bars'],
          ['receitas', 'Receitas', 'fa-arrow-trend-up'],
          ['despesas', 'Despesas', 'fa-arrow-trend-down'],
          ['fixas', 'Fixas', 'fa-repeat'],
          ['parcelas', 'Parcelas', 'fa-layer-group'],
        ].map(([id, rotulo, ico]) => (
          <Chip key={id} ativo={filtro === id} icone={ico} aoClicar={() => setFiltro(id)}>
            {rotulo}
          </Chip>
        ))}
      </div>

      <TituloSecao icone="fa-circle-check">Check de baixa, selos e status</TituloSecao>
      <div className="card list-card">
        <div className="tx">
          <CheckCircle
            concluido={marcado}
            rotulo="pago"
            aoClicar={(e) => {
              const novo = !marcado
              setMarcado(novo)
              if (novo) {
                const r = e.currentTarget.getBoundingClientRect()
                confetti(r.left + r.width / 2, r.top + r.height / 2)
                toast('Marcado como pago', 'fa-circle-check')
              }
            }}
          />
          <div className="tx-icon" style={{ background: 'var(--income-soft)', color: 'var(--income)' }}>
            <i className="fa-solid fa-bolt" aria-hidden="true" />
          </div>
          <div className="tx-info">
            <b>Energia elétrica</b>
            <span>Emitida {fmtData('2026-09-08')} · Débito · Nubank</span>
            <div className="tx-badges">
              <MiniBadge tom="fixa" icone="fa-repeat">
                fixa
              </MiniBadge>
              <MiniBadge tom="var" icone="fa-wave-square">
                variável
              </MiniBadge>
              <MiniBadge tom="parc">2/5</MiniBadge>
              <MiniBadge tom="fat" icone="fa-file-invoice">
                fatura
              </MiniBadge>
              <MiniBadge tom="inv" icone="fa-seedling">
                aporte
              </MiniBadge>
            </div>
          </div>
          <div className="tx-val neg">
            <b>{fmtMoeda(310)}</b>
            <StatusBadge status={marcado ? 'pago' : 'pendente'} />
          </div>
        </div>
        <div className="tx">
          <span className="no-price">
            <i className="fa-solid fa-tag" aria-hidden="true" />
            Adicionar valor
          </span>
          <StatusBadge status="atrasado" />
          <StatusBadge status="aplicado" />
        </div>
      </div>

      <TituloSecao icone="fa-building-columns">Marcas e bandeiras</TituloSecao>
      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {['nubank', 'itau', 'bb', 'caixa', 'c6', 'inter', 'rliima', 'pix', 'cash'].map((m) => (
            <LogoMarca key={m} marca={m} />
          ))}
        </div>
        <div
          className="credit-card"
          style={{ background: gradienteDaMarca('nubank'), marginTop: 18 }}
        >
          <div className="cc-top">
            <div>
              <small>Cartão de crédito</small>
              <h3>Nubank</h3>
            </div>
            <Bandeira bandeira="mastercard" />
          </div>
          <div className="limit-track">
            <div className="limit-fill" data-w="62%" />
          </div>
          <div className="cc-meta">
            <span>Usado {fmtMoeda(6200)}</span>
            <span>Limite {fmtMoeda(10000)}</span>
          </div>
        </div>
      </div>

      <TituloSecao icone="fa-palette">Seletores de cor e de ícone</TituloSecao>
      <div className="card">
        <Campo rotulo="Cor do card" icone="fa-palette">
          <SeletorCor valor={gradiente} aoEscolher={setGradiente} />
        </Campo>
        <Campo rotulo="Cor da categoria" icone="fa-droplet">
          <SeletorCorSolida valor={corSolida} aoEscolher={setCorSolida} />
        </Campo>
        <Campo rotulo="Ícone da categoria" icone="fa-icons">
          <SeletorIcone valor={icone} cor={corSolida} aoEscolher={setIcone} />
        </Campo>
      </div>

      <TituloSecao icone="fa-keyboard">Campos mascarados</TituloSecao>
      <div className="card">
        <div className="field-row">
          <Campo id="cData" rotulo="Data" icone="fa-calendar-day">
            <InputData id="cData" valor={data} aoMudar={setData} />
          </Campo>
          <Campo id="cHora" rotulo="Hora" icone="fa-clock">
            <InputHora id="cHora" valor={hora} aoMudar={setHora} />
          </Campo>
        </div>
        <Campo id="cFone" rotulo="Telefone" icone="fa-phone">
          <InputTelefone id="cFone" valor={telefone} aoMudar={setTelefone} />
        </Campo>
        <Campo id="cValor" rotulo="Valor (R$)" icone="fa-brazilian-real-sign">
          <InputMoeda id="cValor" valor={valor} aoMudar={setValor} />
        </Campo>
        <div className="bl-formula">
          Data em ISO: <b>{paraISO(data) ?? 'inválida ou incompleta'}</b> · Hora: <b>{hora || '-'}</b> ·
          Valor: <b>{valor == null ? 'sem valor' : fmtMoeda(valor)}</b>
        </div>
      </div>

      <TituloSecao icone="fa-window-restore">Sheets, botões e toasts</TituloSecao>
      <div className="card">
        <div className="sheet-actions">
          <BotaoPill icone="fa-window-maximize" aoClicar={() => setSheetAberto(true)}>
            Abrir sheet curto
          </BotaoPill>
          <BotaoExcluir aoClicar={() => toast('A lixeira pediu confirmação', 'fa-trash')} />
        </div>
        <BotaoPill icone="fa-scroll" variante="verde" aoClicar={() => setSheetLongo(true)}>
          Abrir sheet com rolagem
        </BotaoPill>
        <div className="bal-actions">
          <button type="button" className="btn-sm approve" onClick={() => toast('Balanço aprovado', 'fa-circle-check')}>
            <i className="fa-solid fa-check" aria-hidden="true" />
            Aprovar
          </button>
          <button
            type="button"
            className="btn-sm ghost"
            onClick={() => toast('Isso é um toast com barra de progresso', 'fa-bell')}
          >
            <i className="fa-solid fa-bell" aria-hidden="true" />
            Disparar toast
          </button>
        </div>
      </div>

      <Sheet
        aberto={sheetAberto}
        aoFechar={() => setSheetAberto(false)}
        titulo="Adicionar valor"
        icone="fa-tag"
        corIcone="var(--accent)"
        acoes={
          <div className="sheet-actions">
            <BotaoPill
              icone="fa-check"
              aoClicar={() => {
                setSheetAberto(false)
                toast('Valor salvo', 'fa-circle-check')
              }}
            >
              Salvar valor
            </BotaoPill>
            <BotaoExcluir aoClicar={() => setSheetAberto(false)} />
          </div>
        }
      >
        <div className="pay-resume">
          <div className="tx-icon" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
            <i className="fa-solid fa-bolt" aria-hidden="true" />
          </div>
          <div>
            <b>Gás encanado</b>
            <span>Vence {fmtData('2026-09-18')} · conta variável</span>
          </div>
        </div>
        <Campo id="sValor" rotulo="Valor previsto (R$)" icone="fa-brazilian-real-sign">
          <InputMoeda id="sValor" valor={valor} aoMudar={setValor} />
        </Campo>
        <div className="bl-formula">Fecha pelo X, por toque no fundo e pela tecla Esc.</div>
      </Sheet>

      <Sheet
        aberto={sheetLongo}
        aoFechar={() => setSheetLongo(false)}
        titulo="Sheet com rolagem interna"
        icone="fa-scroll"
        acoes={
          <BotaoPill icone="fa-check" aoClicar={() => setSheetLongo(false)}>
            Fechar
          </BotaoPill>
        }
      >
        <div className="bl-formula" style={{ marginBottom: 12 }}>
          Cabeçalho e rodapé ficam parados. Só o corpo rola, e a sombra aparece embaixo do título
          quando a rolagem começa. Agora são {agora().hora}.
        </div>
        {Array.from({ length: 12 }, (_, i) => (
          <Campo key={i} id={`campo${i}`} rotulo={`Campo de exemplo ${i + 1}`} icone="fa-pen">
            <input id={`campo${i}`} placeholder="Só para dar altura" />
          </Campo>
        ))}
      </Sheet>
    </Tela>
  )
}
