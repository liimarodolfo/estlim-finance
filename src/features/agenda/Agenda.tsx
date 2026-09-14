import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Agenda() {
  return (
    <Tela>
      <TituloSecao icone="fa-calendar-days">Agenda</TituloSecao>
      <EmConstrucao epico={11} o_que="O calendário mensal com marcadores por dia e a lista do dia selecionado chegam no" />
    </Tela>
  )
}
