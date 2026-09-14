import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Lancamentos() {
  return (
    <Tela>
      <TituloSecao icone="fa-right-left">Lançamentos</TituloSecao>
      <EmConstrucao epico={7} o_que="A lista agrupada em A pagar, A receber e A investir, com filtros, check de baixa e CRUD completo, chega no" />
    </Tela>
  )
}
