import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Dashboard() {
  return (
    <Tela>
      <TituloSecao icone="fa-gauge-high">Início</TituloSecao>
      <EmConstrucao epico={10} o_que="O Dashboard completo, com card de saldo animado, resumo rápido, gráficos, próximos vencimentos e o Balanço do mês, chega no" />
    </Tela>
  )
}
