---
title: "Central de Operação — entrada da documentação"
description: "Ponto de entrada único e matriz de navegação da documentação canônica."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Central de Operação — documentação

> **Este arquivo é a entrada única da documentação em `docs/`.** Use a matriz abaixo e a busca textual do editor (`Ctrl+F`) para localizar o documento pela necessidade ou por termos como `rotas`, `JWT`, `deploy`, `CORS` ou `IIS`.
>
> Reorganização canônica executada. Este conjunto tem validade em 2026-09-25 e reflete o snapshot curado do working tree de 2026-09-24. O documento não infere build, testes, QA, deploy ou smoke.

## Matriz “necessidade → documento” — 12 arquivos canônicos

| # | Preciso de… / termos para `Ctrl+F` | Documento | Uso principal |
|---:|---|---|---|
| 1 | começar, entrada, índice, visão geral da documentação | [`README.md`](./README.md) | Navegação e escopo do conjunto canônico |
| 2 | como ler, estrutura, monorepo, documentação canônica, backup, branches, pipeline, agents, skills, `screens-data.json` | [`00-ESTRUTURA.md`](./00-ESTRUTURA.md) | Convenções, fonte de verdade e fluxo de trabalho |
| 3 | propósito, público, módulos, rotas ativas, stack, ambientes, segurança, roadmap | [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md) | Contexto funcional e situação atual do produto |
| 4 | arquitetura vigente, Angular SSR, ASP.NET Core, SQL Server, Google Sheets, AnythingLLM, `/api/v1`, JWT, CORS, IIS | [`02-ARQUITETURA.md`](./02-ARQUITETURA.md) | Componentes, fluxos e limites técnicos atuais |
| 5 | negócio, regras, perfis, permissões, payloads e limites | [`03-REGRAS-NEGOCIO.md`](./03-REGRAS-NEGOCIO.md) | Regras de negócio verificadas no código |
| 6 | entidades, tabelas, padrão de nomenclatura `tb*`, colunas, PK/FK, migrations, SQL Server, Google Sheets, Database Explorer | [`04-ESTRUTURA-DADOS.md`](./04-ESTRUTURA-DADOS.md) | Estrutura de dados, padronização de nomes e integrações |
| 7 | APIs, endpoints, métodos, corpos, autorização, respostas e limites | [`05-ENDPOINTS.md`](./05-ENDPOINTS.md) | Catálogo da API REST e do proxy RAG |
| 8 | frontend, componentes, rotas, serviços, layout e responsividade | [`06-COMPONENTES-FRONTEND.md`](./06-COMPONENTES-FRONTEND.md) | Arquitetura e inventário do frontend |
| 9 | backend, controllers, serviços, modelos, persistência e migrations | [`07-SERVICES-BACKEND.md`](./07-SERVICES-BACKEND.md) | Arquitetura e inventário do backend |
| 10 | QA, histórias, passos, cenários, checklists | [`08-HISTORIAS-TELAS.md`](./08-HISTORIAS-TELAS.md) | Roteiros funcionais por tela |
| 11 | troubleshooting, diagnóstico, CORS, IIS, bloqueio de arquivos, smoke | [`09-TROUBLESHOOTING.md`](./09-TROUBLESHOOTING.md) | Diagnóstico de dependências e operação |
| 12 | deploy, IIS, rollback, backup, smoke, branches | [`10-DEPLOY.md`](./10-DEPLOY.md) | Runbook de publicação no servidor |

O conjunto canônico é formado exatamente por este README e pelos onze arquivos `00-ESTRUTURA.md` a `10-DEPLOY.md`. Planos, auditorias e históricos fora dessa lista são materiais complementares; `backup/2026-09-24/` é um snapshot curado do working tree em 24/09, não é imutável nem necessariamente igual ao `HEAD` e permanece não canônico.

## Ordem de leitura

1. Leia [`00-ESTRUTURA.md`](./00-ESTRUTURA.md) para entender a hierarquia e as regras.
2. Leia [`01-VISAO-GERAL.md`](./01-VISAO-GERAL.md) para conhecer finalidade, público, rotas e ambientes.
3. Leia [`02-ARQUITETURA.md`](./02-ARQUITETURA.md) antes de alterar código que atravesse frontend, backend ou infraestrutura.
4. Vá somente ao documento especializado da tarefa: negócio, telas, QA, deploy, autenticação, integrações ou plano.

## Regras de navegação

- A fonte factual é o código e a configuração presentes no working tree; documentação antiga não prevalece sobre eles.
- Links desta estrutura abrem arquivos, nunca âncoras profundas.
- Segredos, chaves, senhas e connection strings com credenciais não devem ser copiados para a documentação.
- `scripts/screens-data.json` é apenas um inventário auxiliar gerado; ele não substitui a leitura das rotas e dos controllers.
- O documento multi-webapp é um plano. A arquitetura vigente possui um frontend Angular e um backend ASP.NET Core.
