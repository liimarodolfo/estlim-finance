import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Investimentos() {
  return (
    <Tela>
      <TituloSecao icone="fa-seedling">Investir</TituloSecao>
      <EmConstrucao epico={6} o_que="O patrimônio total, os Ativos, as Caixinhas e o cadastro de corretoras chegam no" />
    </Tela>
  )
}
