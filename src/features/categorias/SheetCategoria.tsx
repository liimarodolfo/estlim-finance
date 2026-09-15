import { useState } from 'react'
import { Sheet } from '@/ui/Sheet'
import { Campo } from '@/ui/Campo'
import { InputMoeda } from '@/ui/InputMoeda'
import { SeletorCorSolida } from '@/ui/SeletorCorSolida'
import { SeletorIcone } from '@/ui/SeletorIcone'
import { BotaoPill } from '@/ui/BotaoPill'
import { BotaoExcluir } from '@/ui/BotaoExcluir'
import { CORES_CATEGORIA } from '@/lib/marcas'
import { toast } from '@/store/useToasts'
import { useExcluirCategoria, useSalvarCategoria } from '@/hooks/useCategorias'
import type { Categoria } from '@/types/database'
import { mensagemDeErro } from '@/lib/erros'

type Props = {
  aberto: boolean
  aoFechar: () => void
  categoria: Categoria | null
}

export function SheetCategoria({ aberto, aoFechar, categoria }: Props) {
  const editando = categoria !== null
  const salvar = useSalvarCategoria()
  const excluir = useExcluirCategoria()

  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [orcamento, setOrcamento] = useState<number | null>(categoria?.orcamento_mensal ?? null)
  const [cor, setCor] = useState(categoria?.cor ?? CORES_CATEGORIA[0])
  const [icone, setIcone] = useState(categoria?.icone ?? 'fa-tag')

  const protegida = categoria?.protegida ?? false

  const aoSalvar = async () => {
    if (!nome.trim()) {
      toast('Informe o nome', 'fa-triangle-exclamation')
      return
    }
    // Ícone e cor são obrigatórios: é por eles que a categoria se identifica na
    // lista, na legenda do gráfico e na agenda.
    if (!icone || !cor) {
      toast('Escolha um ícone e uma cor', 'fa-triangle-exclamation')
      return
    }
    try {
      await salvar.mutateAsync({
        id: categoria?.id ?? null,
        dados: {
          nome: nome.trim(),
          icone,
          cor,
          orcamento_mensal: orcamento ?? 0,
        },
      })
      toast(
        editando ? `Categoria ${nome.trim()} atualizada` : `Categoria ${nome.trim()} criada`,
        editando ? 'fa-pen' : icone,
      )
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  const aoExcluir = async () => {
    if (!categoria) return
    try {
      const movidos = await excluir.mutateAsync(categoria.id)
      toast(
        movidos > 0
          ? `Categoria excluída. ${movidos} lançamento${movidos === 1 ? '' : 's'} foi para Contas fixas.`
          : `Categoria ${categoria.nome} excluída`,
        'fa-trash',
      )
      aoFechar()
    } catch (erro) {
      toast(mensagemDeErro(erro), 'fa-triangle-exclamation')
    }
  }

  return (
    <Sheet
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? 'Editar categoria' : 'Nova categoria'}
      icone="fa-tags"
      acoes={
        <div className="sheet-actions">
          <BotaoPill icone="fa-check" aoClicar={aoSalvar} ocupado={salvar.isPending}>
            Salvar categoria
          </BotaoPill>
          {editando && !protegida ? (
            <BotaoExcluir aoClicar={aoExcluir} titulo="Excluir categoria" />
          ) : null}
        </div>
      }
    >
      {protegida ? (
        <div className="login-aviso" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}>
          <i className="fa-solid fa-lock" aria-hidden="true" />
          <span>
            Categoria do sistema. O nome não muda e ela não pode ser excluída, porque o ajuste de
            saldo, o salário e os aportes dependem dela. O orçamento, a cor e o ícone você ajusta à
            vontade.
          </span>
        </div>
      ) : null}

      <Campo id="cNome" rotulo="Nome" icone="fa-tag">
        <input
          id="cNome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Pets"
          disabled={protegida}
        />
      </Campo>

      <Campo id="cOrcamento" rotulo="Orçamento mensal (R$)" icone="fa-bullseye">
        <InputMoeda id="cOrcamento" valor={orcamento} aoMudar={setOrcamento} />
      </Campo>

      <Campo rotulo="Cor" icone="fa-palette">
        <SeletorCorSolida valor={cor} aoEscolher={setCor} />
      </Campo>

      <Campo rotulo="Ícone" icone="fa-icons">
        <SeletorIcone valor={icone} cor={cor} aoEscolher={setIcone} />
      </Campo>

      {/* Prévia de como a categoria vai aparecer nas listas. */}
      <div className="cat-row" style={{ borderBottom: 'none', paddingTop: 10 }}>
        <div className="cat-swatch" style={{ background: `${cor}1e`, color: cor }}>
          <i className={`fa-solid ${icone}`} aria-hidden="true" />
        </div>
        <div className="cat-info">
          <b>{nome.trim() || 'Nome da categoria'}</b>
          <span>É assim que ela aparece nas listas e no gráfico</span>
        </div>
      </div>
    </Sheet>
  )
}
