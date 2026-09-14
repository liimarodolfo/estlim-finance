import { Tela } from '@/ui/Tela'
import { TituloSecao } from '@/ui/TituloSecao'
import { EmConstrucao } from '@/ui/EmConstrucao'

export default function Perfil() {
  return (
    <Tela>
      <TituloSecao icone="fa-user">Perfil</TituloSecao>
      <EmConstrucao epico={3} o_que="A foto, o nome, o e-mail, o telefone e a troca de senha chegam no" />
    </Tela>
  )
}
