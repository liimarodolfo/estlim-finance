import { useRef, useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { toast } from '@/store/useToasts'
import { iniciaisCorretora } from '@/lib/corretoras'
import {
  useCorretoras,
  useExcluirCorretora,
  useInvestimentos,
  useSalvarCorretora,
  type CorretoraComLogo,
} from '@/hooks/useInvestimentos'
import { mensagemDeErro } from '@/lib/erros'

type Props = {
  aberto: boolean
  aoFechar: () => void
}

export function SheetCorretora({ aberto, aoFechar }: Props) {
  const { data: corretoras = [] } = useCorretoras()
  const { data: investimentos = [] } = useInvestimentos()
  const salvar = useSalvarCorretora()
  const excluir = useExcluirCorretora()
  const arquivo = useRef<HTMLInputElement>(null)

  const [emEdicao, setEmEdicao] = useState<CorretoraComLogo | null>(null)
  const [nome, setNome] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)

  const limpar = () => {
    setEmEdicao(null)
    setNome('')
    setLogo(null)
    setPrevia(null)
  }

  const editar = (c: CorretoraComLogo) => {
    setEmEdicao(c)
    setNome(c.nome)
    setLogo(null)
    setPrevia(c.logoAssinado)
  }

  const escolherLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 2 * 1024 * 1024) {
      toast('O logo precisa ter no máximo 2 MB', 'fa-triangle-exclamation')
      return
    }
    setLogo(f)
    setPrevia(URL.createObjectURL(f))
  }

  const aoSalvar = async () => {
    if (!nome.trim()) {
      toast('Informe o nome da corretora', 'fa-triangle-exclamation')
      return
    }
    try {
      await salvar.mutateAsync({
        id: emEdicao?.id ?? null,
        nome: nome.trim(),
        logo,
        quantasJaExistem: corretoras.length,
      })
      toast(emEdicao ? 'Corretora atualizada' : `${nome.trim()} cadastrada`, 'fa-building-columns')
      limpar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoExcluir = async () => {
    if (!emEdicao) return
    try {
      await excluir.mutateAsync(emEdicao.id)
      toast(`${emEdicao.nome} removida`, 'fa-trash')
      limpar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={() => {
        limpar()
        aoFechar()
      }}
      titulo={emEdicao ? 'Editar corretora' : 'Corretoras'}
      icone="fa-chart-simple"
      acoes={
        <div className="sheet-actions">
          <BotaoPill icone="fa-check" aoClicar={aoSalvar} ocupado={salvar.isPending}>
            Salvar corretora
          </BotaoPill>
          {emEdicao ? <BotaoExcluir aoClicar={aoExcluir} titulo="Excluir corretora" /> : null}
        </div>
      }
    >
      <Campo id="cNomeCor" rotulo="Nome da corretora" icone="fa-signature">
        <input
          id="cNomeCor"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: XP Investimentos"
        />
      </Campo>

      <Campo rotulo="Logo" icone="fa-image">
        <div className="corretora-linha">
          <button
            type="button"
            className="logo-upload"
            onClick={() => arquivo.current?.click()}
            aria-label="Enviar o logo da corretora"
          >
            {previa ? (
              <img src={previa} alt="Logo da corretora" />
            ) : (
              <i className="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
            )}
          </button>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Toque para enviar o logo
            <br />
            PNG, JPG, WEBP ou SVG, até 2 MB
            <br />
            Sem logo, aparecem as iniciais sobre a cor
          </div>
        </div>
        <input
          ref={arquivo}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          hidden
          onChange={escolherLogo}
        />
      </Campo>

      {emEdicao ? (
        <button type="button" className="btn-danger-link" onClick={limpar}>
          Cancelar a edição e cadastrar uma nova
        </button>
      ) : null}

      <div style={{ marginTop: 20 }}>
        {corretoras.length ? (
          <>
            <div className="section-title" style={{ margin: '0 0 10px' }}>
              <span className="st-l">
                <i className="fa-solid fa-list" aria-hidden="true" />
                Corretoras cadastradas
              </span>
            </div>
            <div className="card list-card">
              {corretoras.map((c) => {
                const quantos = investimentos.filter((i) => i.corretora_id === c.id).length
                return (
                  <div
                    key={c.id}
                    className="bank-row"
                    role="button"
                    tabIndex={0}
                    onClick={() => editar(c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') editar(c)
                    }}
                  >
                    <div
                      className="brand-logo"
                      style={{ background: c.logoAssinado ? '#fff' : c.cor, width: 40, height: 40 }}
                    >
                      {c.logoAssinado ? (
                        <img src={c.logoAssinado} alt={c.nome} />
                      ) : (
                        iniciaisCorretora(c.nome)
                      )}
                    </div>
                    <div className="b-info">
                      <b>{c.nome}</b>
                      <span>
                        {quantos} investimento{quantos === 1 ? '' : 's'}
                      </span>
                    </div>
                    <i className="fa-solid fa-chevron-right row-chev" aria-hidden="true" />
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="empty">Nenhuma corretora cadastrada</div>
        )}
      </div>
    </Sheet>
  )
}
