# Como iniciar o ESTLIM no Claude Code

## 1. Prepare a pasta

Crie a pasta do projeto e coloque dentro:

```
estlim/
├── CLAUDE.md                        ← copiar de docs/CLAUDE.md para a RAIZ
└── docs/
    ├── ESTLIM_PROJETO.md            ← documento mestre com os 15 épicos
    ├── ESPECIFICACAO_TECNICA.md     ← schema, RLS, triggers, estrutura
    ├── PERGUNTAS_INICIAIS.md        ← roteiro do Épico 0
    ├── PROGRESSO.md                 ← memória entre sessões
    └── ESTLIM_v40.html              ← protótipo aprovado (a especificação visual)
```

O `CLAUDE.md` precisa estar na raiz, é o arquivo que o Claude Code lê automaticamente em toda sessão.

## 2. Conecte o que for necessário

Antes da primeira sessão, tenha em mãos:
- Repositório GitHub criado (privado) e o Claude Code com acesso
- Projeto Supabase criado, com Project URL, anon key e senha do banco
- Conta Vercel conectada ao GitHub

Se preferir, pode criar tudo durante a primeira sessão: o Claude Code sabe usar a CLI do Supabase e o git, e o roteiro de perguntas cobre isso.

## 3. Primeira sessão (Épico 0)

O prompt completo e pronto está em . Versão curta:

Abra o Claude Code na pasta e cole:

```
Leia CLAUDE.md, docs/ESTLIM_PROJETO.md e docs/ESPECIFICACAO_TECNICA.md.
Abra também docs/ESTLIM_v40.html, que é a especificação visual do projeto.

Execute o Épico 0 seguindo docs/PERGUNTAS_INICIAIS.md: me faça as perguntas
em blocos, aguardando minhas respostas de cada bloco. Ao final, gere o
PROGRESSO.md com as decisões, crie o .env.local, inicialize o repositório
e confirme a lista de épicos.
```

Responda os cinco blocos. Ao final você terá o projeto configurado e o plano fechado.

## 4. Sessões seguintes

Uma sessão por épico. O comando é sempre o mesmo:

```
Leia CLAUDE.md e PROGRESSO.md. Execute o próximo épico pendente até concluir,
seguindo a definição de pronto. Trabalhe com autonomia: não me pergunte a cada
passo, só nos casos previstos no CLAUDE.md. Ao terminar, rode build e lint,
commite, atualize o PROGRESSO.md e me dê um resumo curto.
```

Se quiser emendar vários épicos numa sessão longa, troque "o próximo épico pendente" por "os épicos 5, 6 e 7" e use `/compact` entre eles para manter o contexto enxuto.

## 5. Ritmo sugerido

| Sessão | Épicos | Entrega visível |
|---|---|---|
| 1 | 0 | Projeto configurado, plano fechado |
| 2 | 1 e 2 | App navegando, banco criado com RLS |
| 3 | 3 e 4 | Login funcionando, componentes prontos |
| 4 | 5 e 6 | Carteira e Categorias completas |
| 5 | 7 | Lançamentos completos |
| 6 | 8 e 9 | Automações e baixa com timestamp |
| 7 | 10 e 11 | Dashboard e Agenda |
| 8 | 12, 13 e 14 | Realtime, PWA publicado, testes |

Estimativa de 8 sessões para a primeira versão completa, variando com o tempo dedicado a cada uma.

## 6. Como manter a autonomia alta

- Responda os blocos do Épico 0 com o máximo de detalhe: quanto mais dados iniciais, menos interrupções depois.
- Ao revisar uma entrega, dê feedback em lote no fim do épico, não durante.
- Se algo sair diferente do protótipo, aponte o arquivo e a seção: "no v27 o badge de método fica em linha única com reticências".
- Deixe o `PROGRESSO.md` ser a fonte da verdade. Se você mesmo mudar algo, registre lá.
- Quando surgir ideia nova no meio do caminho, mande para "Ideias para versões futuras" em vez de interromper o épico em andamento.
