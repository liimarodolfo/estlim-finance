import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Carteira() {
  return (
    <Tela>
      <TituloSecao icone="fa-wallet">Carteira</TituloSecao>
      <EmConstrucao epico={5} o_que="O seletor de perfil, o card de saldo, as contas, os cartões e o ajuste de saldo chegam no" />
    </Tela>
  )
}
