# Backup da documentação anterior

Esta pasta preserva a documentação substituída pela reorganização de 24/09/2026. O conteúdo é **histórico e não canônico**: não deve ser editado pelo agente `docs-writer` nem usado como fonte da verdade para o código atual.

O snapshot corresponde ao working tree imediatamente anterior à reorganização e pode conter alterações locais ainda não commitadas; portanto, não é idêntico ao `HEAD`. Credenciais literais foram removidas deste backup e não devem ser reintroduzidas.

## Documentação canônica

A versão vigente da documentação está organizada em 12 arquivos na pasta `docs/`:

- [`docs/README.md`](../README.md)
- [`docs/00-ESTRUTURA.md`](../00-ESTRUTURA.md)
- [`docs/01-VISAO-GERAL.md`](../01-VISAO-GERAL.md)
- [`docs/02-ARQUITETURA.md`](../02-ARQUITETURA.md)
- [`docs/03-REGRAS-NEGOCIO.md`](../03-REGRAS-NEGOCIO.md)
- [`docs/04-ESTRUTURA-DADOS.md`](../04-ESTRUTURA-DADOS.md)
- [`docs/05-ENDPOINTS.md`](../05-ENDPOINTS.md)
- [`docs/06-COMPONENTES-FRONTEND.md`](../06-COMPONENTES-FRONTEND.md)
- [`docs/07-SERVICES-BACKEND.md`](../07-SERVICES-BACKEND.md)
- [`docs/08-HISTORIAS-TELAS.md`](../08-HISTORIAS-TELAS.md)
- [`docs/09-TROUBLESHOOTING.md`](../09-TROUBLESHOOTING.md)
- [`docs/10-DEPLOY.md`](../10-DEPLOY.md)

## Conteúdo arquivado

- Documentação consolidada anterior: `DOCUMENTACAO-COMPLETA.md`, `VISAO-GERAL.md`, `NEGOCIO.md`, `HISTORIAS-TELAS.md`, `DEPLOY.md`, `integracoes-bd.md`, `implantacao.md` e `frontend-modulos.md`.
- Índice e organização anteriores: `INDEX.md`, `TELAS.md` e `telas/`.
- Referências técnicas anteriores: `backend-auth-integracao.md` e `ENDPOINTS-AUDITORIA.md`.

## Regra de manutenção

- Não adicionar fatos novos a estes arquivos.
- Não corrigir conteúdo antigo neste local.
- Quando um documento canônico precisar incluir informação histórica, hacerlo no arquivo temático correspondente e identificar o estado como histórico.
- Remover apenas após confirmar que a informação foi migrada ou não é mais necessária.
