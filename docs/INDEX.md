# Índice da documentação — Central de Operação

> Fonte única de navegação da doc. Um assunto, um arquivo. Ao linkar, aponte para o **arquivo**, nunca para âncora profunda.

## Por necessidade

| Preciso de… | Abra |
|---|---|
| Contexto do projeto, stack, checklist de nova tela | [`VISAO-GERAL.md`](./VISAO-GERAL.md) |
| Regras de negócio compactas (auth, dados, permissões) | [`NEGOCIO.md`](./NEGOCIO.md) |
| Mapa de telas e APIs por módulo | [`TELAS.md`](./TELAS.md) → [`telas/`](./telas/) |
| Histórias de QA (passos, endpoints, tabelas) | [`HISTORIAS-TELAS.md`](./HISTORIAS-TELAS.md) |
| Arquitetura, JWT, versionamento, deploy IIS, segurança | [`DOCUMENTACAO-COMPLETA.md`](./DOCUMENTACAO-COMPLETA.md) |
| Google Sheets, tabelas SQL, Database Explorer | [`integracoes-bd.md`](./integracoes-bd.md) |
| Módulo Implantação / Projetos | [`implantacao.md`](./implantacao.md) |
| Módulos frontend (Agenda, Central Executiva desativada) | [`frontend-modulos.md`](./frontend-modulos.md) |
| Publicação, rollback, Swagger no IIS | [`DEPLOY.md`](./DEPLOY.md) |
| Fluxo JWT passo a passo | [`backend-auth-integracao.md`](./backend-auth-integracao.md) |
| Auditoria endpoints usados/não usados | [`ENDPOINTS-AUDITORIA.md`](./ENDPOINTS-AUDITORIA.md) |

## Por subpasta

- [`telas/`](./telas/) — docs por módulo (auto-sync com código; índice em `TELAS.md`)
- [`Projeto-Implantação/`](./Projeto-Implantação/) — plano mestre, mapa do módulo
- [`Projeto-BD/`](./Projeto-BD/) — modelo de banco de dados

## Repositórios grandes (referência histórica)

| Arquivo | Linhas | Uso |
|---|---|---|
| `AgendaProjeto.md` | ~1800 | Histórico/diário do projeto |
| `projeto_BD.md` | ~1100 | Análise de BD |
| `PLANO_MESTRE.md` | ~410 | Plano geral (também em `Projeto-Implantação/`) |

## Regras

- Teto ~600 linhas por arquivo; ao estourar, subdividir e atualizar este índice.
- **Atualizar ≠ engordar**: trocar trecho obsoleto, não anexar.
- Docs de tela ficam em `telas/` (fonte única); este índice só navega.
