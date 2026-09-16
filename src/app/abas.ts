/**
 * Abas da navegação flutuante.
 *
 * O protótipo tinha Categorias na última casa. Ela saiu para dentro de
 * Lançamentos, que é de onde se fala de categoria o tempo todo, e a casa ficou
 * para os Relatórios, que respondem perguntas que nenhuma outra tela responde.
 */
export const ABAS = [
  { para: '/', rotulo: 'Início', icone: 'fa-house' },
  { para: '/lancamentos', rotulo: 'Lançamentos', icone: 'fa-right-left' },
  { para: '/carteira', rotulo: 'Carteira', icone: 'fa-wallet' },
  { para: '/investir', rotulo: 'Investir', icone: 'fa-seedling' },
  { para: '/agenda', rotulo: 'Agenda', icone: 'fa-calendar-days' },
  { para: '/relatorios', rotulo: 'Relatórios', icone: 'fa-chart-pie' },
] as const
