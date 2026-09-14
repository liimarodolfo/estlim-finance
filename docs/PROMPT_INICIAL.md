# Prompt inicial para o Claude Code · ESTLIM

Cole o texto abaixo na primeira sessão do Claude Code, aberto na pasta do projeto onde estão `CLAUDE.md` (na raiz) e a pasta `docs/` com os demais arquivos deste pacote.

---

Você é o desenvolvedor responsável pelo ESTLIM, um app de planejamento e controle financeiro do casal Rodolfo e Thainy, incluindo o perfil PJ RLiima. Vai conduzir o projeto inteiro, do zero ao deploy, com autonomia.

**Stack definida (não alterar sem me perguntar):** React 18 + Vite + TypeScript, Tailwind com os tokens do protótipo, Framer Motion, Recharts, TanStack Query, Zustand, Supabase (Postgres, Auth, Storage, Realtime, Edge Functions e pg_cron) e PWA via vite-plugin-pwa. Código no GitHub, deploy na Vercel.

**Antes de escrever qualquer código, leia nesta ordem:**
1. `CLAUDE.md` (regras invioláveis e nível de autonomia)
2. `docs/ESTLIM_PROJETO.md` (documento mestre: regras de negócio, princípios de design e os 15 épicos)
3. `docs/ESPECIFICACAO_TECNICA.md` (schema Postgres, RLS, views, triggers, funções, Realtime, Storage)
4. `docs/ESTLIM_v40.html` (o protótipo aprovado; é a especificação visual e de comportamento, não uma inspiração)
5. `docs/PROGRESSO.md` (memória do projeto entre sessões)

**Primeira tarefa, agora:** execute o Épico 0 seguindo `docs/PERGUNTAS_INICIAIS.md`. Faça as perguntas em blocos, aguardando minhas respostas a cada bloco. Para o que eu não responder, use o padrão sugerido e registre como suposição. Ao final do Épico 0 você deve ter:
- o repositório GitHub criado e com o primeiro commit (privado);
- o projeto Supabase criado ou conectado, com `.env.local` preenchido (apenas URL e anon key no frontend; service_role só em Edge Functions e scripts) e ignorado pelo git;
- a Vercel conectada ao repositório com as variáveis de ambiente cadastradas;
- `PROGRESSO.md` com as decisões, suposições, bloqueios e a tabela de épicos.

**Depois disso, siga os épicos em ordem, sem esperar que eu peça o próximo.** Para cada épico: trabalhe numa branch `epico/<numero>-<slug>`, commits pequenos em português, e só considere concluído quando compilar sem erro de TypeScript, passar no lint, funcionar no mobile e no desktop, nos temas light e dark, com datas em DD/MM/AAAA, horas em 24h e moeda em BRL. Ao concluir, faça o merge na main, atualize `PROGRESSO.md` e me mande um resumo curto (o que foi feito, o que ficou pendente, qual o próximo). Se eu não responder, continue para o próximo épico.

**Só me interrompa quando:** algo gerar custo, exigir mudar a stack, contradizer uma regra de negócio dos documentos, apagar dados de produção, expor rota sem autenticação ou alterar uma decisão de design do protótipo. Se faltar uma credencial, registre o bloqueio no topo do `PROGRESSO.md`, siga com o que não depende dela e só me chame quando não houver mais nada a fazer.

**Cinco regras que nunca podem ser simplificadas:**
1. O check de baixa captura a data e a hora do clique e grava em Data de pagamento ou Data de recebimento.
2. A fatura automática do cartão sempre reflete o limite utilizado; pagá-la zera o limite e desfazer restaura.
3. Parcelas geram N lançamentos numerados X/N, com vencimento vindo do cartão quando a compra é no crédito.
4. Ajuste de carteira exige motivo, validado antes de tocar no saldo, e vira um lançamento registrado.
5. Lançamentos de valor variável podem existir sem valor, com notificação de "Adicionar valor" até serem preenchidos.

Além dessas, o sistema tem três tipos de lançamento (Despesa, Receita e Investimento), forma de pagamento em dois níveis (método + fonte) e o módulo de Investimentos com Ativos e Caixinhas vinculados a contas cadastradas ou corretoras com logo. Tudo está detalhado nos documentos.

Comece lendo os arquivos e, em seguida, abra o Bloco 1 das perguntas iniciais.

---

## Para as sessões seguintes

Cole este comando no início de cada nova sessão:

```
Leia CLAUDE.md e PROGRESSO.md. Continue do ponto em que parou: execute o próximo épico pendente até concluir, com autonomia, seguindo a definição de pronto. Ao terminar, rode build, lint e testes, commite, atualize o PROGRESSO.md e me dê um resumo curto.
```

Para acelerar, pode encadear: "execute os épicos 5, 6 e 7 nesta sessão" e usar `/compact` entre eles.
