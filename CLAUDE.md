# CLAUDE.md · ESTLIM

Contexto permanente do projeto. Leia este arquivo por inteiro no início de toda sessão, junto de `docs/ESTLIM_PROJETO.md` e `PROGRESSO.md`.

## O que é

ESTLIM é o sistema de planejamento e controle financeiro do casal Rodolfo e Thainy, incluindo o perfil PJ RLiima. Substitui uma planilha anual de abas mensais. A palavra-chave do produto é previsibilidade.

## Stack

React 18 + Vite + TypeScript + Tailwind + Framer Motion + Recharts + TanStack Query + Zustand + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) + PWA (vite-plugin-pwa). Deploy na Vercel, código no GitHub.

## Referência visual

`docs/ESTLIM_v40.html` é o protótipo aprovado e serve como **especificação**, não como inspiração. Cores, tokens, espaçamentos, animações, máscaras, textos de rótulo, ícones e comportamentos saem dele. Abra o arquivo sempre que for construir uma tela. Não redesenhe, não "melhore" a UI por conta própria e não troque a paleta.

## Autonomia

Você conduz o projeto épico a épico, sem pedir aprovação a cada passo. Aja assim:

**Faça sem perguntar**: escolher nomes de arquivos, componentes e funções; criar migrations; escrever testes; instalar dependências que a stack exige; refatorar código que você mesmo escreveu; corrigir bugs que encontrar; commitar ao fim de cada entrega significativa; atualizar `PROGRESSO.md`.

**Pergunte antes**: qualquer coisa que gere custo (upgrade de plano, serviço pago novo); mudar a stack definida; alterar regra de negócio deste documento ou do documento mestre; apagar dados de produção; expor rota pública sem autenticação; mudar decisão de design do protótipo.

**Quando travar**: se faltar uma credencial ou decisão, registre o bloqueio no topo do `PROGRESSO.md` com o título "BLOQUEIO", siga para a próxima tarefa que não dependa dela, e só interrompa o usuário quando não houver mais nada a fazer sem a resposta.

**Ao terminar um épico**: rode a validação (build, lint, testes), commite, atualize o `PROGRESSO.md` e comece o próximo épico. Um resumo curto do que foi feito basta como comunicação, sem pedir permissão para continuar.

## Regras invioláveis

### Idioma e escrita
- Toda a interface, mensagens, rótulos e commits em português do Brasil.
- Nunca use travessão em textos da interface ou da documentação.
- Comentários de código em português, curtos e só onde a intenção não é óbvia.

### Formatos
- Datas sempre DD/MM/AAAA na interface. No banco, `date` nativo.
- Horas sempre 24h (HH:MM). No banco, `time`.
- Campos de data e hora usam inputs mascarados com `inputMode="numeric"`. Nunca `type="date"` ou `type="datetime-local"`, porque exibem no formato do sistema operacional.
- Moeda em BRL com `Intl.NumberFormat('pt-BR')`.

### Banco e segurança
- Toda tabela nasce com RLS habilitado e políticas por `casal_id`, antes de qualquer query do frontend.
- Schema só muda por migration versionada em `supabase/migrations`. Nunca alterar pelo painel.
- Nenhuma chave de serviço (`service_role`) no frontend. Só a `anon key`.
- Regenerar os types do banco após cada migration e usar o client tipado.
- Valores monetários em `numeric(12,2)`, jamais float.

### Código
- TypeScript estrito, sem `any`. Se precisar de escape, use `unknown` com narrowing.
- Componentes em `src/features/<modulo>/`, reutilizáveis em `src/ui/`, acesso a dados em `src/hooks/`.
- Nenhum componente acessa o Supabase diretamente: sempre via hook com TanStack Query.
- Sem `localStorage` para dados de negócio; ele serve apenas a preferências locais (tema).
- Animações com Framer Motion, respeitando `prefers-reduced-motion`.

### Regras de negócio que não podem ser simplificadas
Estão detalhadas na seção 4 do documento mestre. As cinco mais sensíveis:
1. O check de baixa captura data e hora do clique.
2. A fatura automática do cartão sempre reflete o limite utilizado, e pagá-la zera esse limite.
3. Parcelas geram N lançamentos numerados X/N, com vencimento vindo do cartão quando a compra é no crédito.
4. Ajuste de carteira exige motivo, validado antes de tocar no saldo.
5. Lançamentos variáveis podem existir sem valor, com notificação de "Adicionar valor" até serem preenchidos.
6. Existem três tipos de lançamento: Despesa, Receita e Investimento. O aporte soma ao investimento de destino quando marcado como aplicado, e desfazer subtrai.
7. Investimento em banco sempre referencia uma conta já cadastrada na Carteira; em corretora, referencia uma corretora cadastrada pelo usuário, com logo opcional.

## Fluxo de trabalho

1. Leia `PROGRESSO.md` para saber onde parou.
2. Trabalhe o épico atual em uma branch `epico/<numero>-<slug>`.
3. Commits pequenos e descritivos ("carteira: seletor de perfil filtrando card e listas").
4. Ao concluir: build + lint + testes, merge na main, atualização do `PROGRESSO.md`.
5. Nunca deixe a main quebrada.

## Definição de pronto

Compila sem erro de tipo, passa no lint, funciona no mobile e no desktop, funciona nos temas light e dark, respeita os formatos de data, hora e moeda, tem commit e `PROGRESSO.md` atualizado.
