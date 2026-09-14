import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Categorias() {
  return (
    <Tela>
      <TituloSecao icone="fa-chart-pie">Categorias</TituloSecao>
      <EmConstrucao epico={6} o_que="A lista com orçamento, barra de consumo e o CRUD com seletor de ícone e cor chegam no" />
    </Tela>
  )
}
