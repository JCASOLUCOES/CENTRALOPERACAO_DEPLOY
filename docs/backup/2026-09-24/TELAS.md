# Central de Operação — Documentação de Telas & APIs (v0.7.0+)

> Gerado automaticamente. **Não edite este índice nem os arquivos abaixo manualmente** — o agente `docs-writer` mantém sincronizado com o código-fonte.
> Sempre que um `.component.ts`, `.service.ts`, `.routes.ts`, Controller, Model ou Migration for alterado, a doc é atualizada pelo agente.
> Roteiro de QA com histórias de cada tela (passos clicáveis, endpoints e tabelas): ver [`HISTORIAS-TELAS.md`](./HISTORIAS-TELAS.md).

## Como ler (resposta rápida)

> Precisa resolver algo de um módulo? **Abra direto o arquivo dele** — cada arquivo tem só aquele assunto (~130–540 linhas em vez de 2300+).

| Preciso de… | Abra |
|---|---|
| Layout, autenticação, home | [`telas/01-base.md`](./telas/01-base.md) (§§1–3) |
| Ferramentas, acessos, cursos, trilhas, stack, fraseologia, FAQ, modelo de chamados, política, visão ADM | [`telas/02-conhecimento.md`](./telas/02-conhecimento.md) (§§4–12) |
| Implantação / Projetos (dashboard, kanban, projetos, tarefas, forms) | [`telas/03-implantacao.md`](./telas/03-implantacao.md) (§13) |
| Database Explorer | [`telas/04-database.md`](./telas/04-database.md) (§14) |
| Empresa / Onboarding, Agenda | [`telas/05-empresa-agenda.md`](./telas/05-empresa-agenda.md) (§§15–16) |
| Backend: endpoints por controller, entidades e migrations | [`telas/06-backend.md`](./telas/06-backend.md) (§§17–18) |
| Chat/JOTA (widget flutuante; página `/chat` e Módulo Gestor **removidos** em 24/09/2026) | [`telas/07-gestao.md`](./telas/07-gestao.md) (§§19–21) |

## Correspondência (âncoras antigas → arquivo novo)

Links antigos no formato `TELAS.md#12-visao-adm` mudaram de escopo: a âncora agora vive dentro do arquivo do módulo. Ex.: antiga `#16-agenda` → [`telas/05-empresa-agenda.md`](./telas/05-empresa-agenda.md); antiga `#17-backend--endpoints-por-controller` → [`telas/06-backend.md`](./telas/06-backend.md). Ao linkar, **aponte para o arquivo, nunca para âncora profunda**.

## Contribuindo

- Uma tela nova entra na seção do arquivo do seu módulo + (se for módulo novo) nova linha nesta tabela.
- Teto por arquivo: ~600 linhas — ao estourar, subdivida e atualize esta tabela.
- Regra de ouro: **atualizar ≠ engordar** — troque o trecho obsoleto em vez de anexar um novo.
