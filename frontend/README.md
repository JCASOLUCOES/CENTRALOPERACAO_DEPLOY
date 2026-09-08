# Central de Operação — Actyon (Frontend)

Portal interno da **JCA Soluções** (anteriormente "Central de Conhecimento") que
reúne ferramentas, trilhas de conhecimento, cursos, acessos de empresas,
procedimentos administrativos e fluxos de atendimento para a equipe de suporte.

## Versão atual: **v0.7.0** (beta) — fonte única em `src/app/shared/meta/app-version.ts`.

## Repositório e branches

- **Repositório**: [`JCASOLUCOES/Central-Conhecimento`](https://github.com/JCASOLUCOES/Central-Conhecimento)
- **Branch padrão (produção)**: `main` — espelho do que está no IIS 192.168.2.130.
- **Branch de desenvolvimento**: `developer` — onde o JCASOLUCOES mexe no dia-a-dia.
- **Branches pessoais**: `sara`, `samuel` (criadas a partir de `developer`).
- **Branch futura**: `projeto-implantacao` (quando o JCASOLUCOES for acoplar o novo projeto).
- **Tags de versão**: `v0.7.0`, `v0.7.1`, ... — marcam releases estáveis já em produção (em vez de branch `backup`).

### Regras de proteção de `main`
- `main` é a branch padrão no GitHub.
- **Branch protection recomendada** (configurar via `Settings → Branches → Add rule` para `main`):
  - ☑ Require a pull request before merging (1 aprovação)
  - ☑ Require conversation resolution before merging
  - ☑ Require linear history
  - ☐ Allow force pushes (deixe **desmarcado**)
- `developer`, `sara`, `samuel` **não têm proteção** — push direto é permitido.

### Como criar uma nova branch pessoal

```bash
# sempre baseada em developer
git fetch origin
git checkout developer
git pull
git checkout -b sara          # ou samuel, projeto-implantacao, etc.
git push -u origin sara
```

> 💡 A mesma branch precisa existir nos 3 repos (`Central-Conhecimento`,
> `CCBAckend`, `CENTRALOPERACAO_DEPLOY`) — ver
> [README do monorepo](https://github.com/JCASOLUCOES/CENTRALOPERACAO_DEPLOY)
> para a convenção completa. Quando o monorepo virar submódulos git
> (Etapa 4), um único `branch-todos.ps1` cria a branch em todos.

## Stack

- **Angular 18** (componentes standalone, SSR/prerender, **lazy loading** em todas as rotas wiki)
- **Bootstrap 5** (SCSS parcial — módulos importados sob demanda; inclui `modal` + `transitions`,
  exigidos pelos modais do ng-bootstrap, que injeta a janela no fim do `<body>`)
  + **Bootstrap Icons** + **ng-bootstrap 17**
- SCSS BEM, com tema claro/escuro via `[data-theme]`
- **Versionamento de API**: todos os endpoints usam prefixo `/api/v1/` (ex.: `/api/v1/auth/login`,
  `/api/v1/acessos`). Suporta segmento de URL e header `X-Api-Version`.
- Autenticação JWT (interceptor com refresh token single-flight) — tokens de **4h**; access token
  fica **somente em memória** e o refresh token em **cookie HttpOnly** no backend
  ("Lembrar meu acesso" = cookie persistente por 4h; senão cookie de sessão). Após **F5/reload**
  (guard) ou **401 → refresh** (interceptor), o usuário é **restaurado automaticamente** — o
  `POST /auth/refresh` devolve o objeto `user`, que repopula `currentUser$` e mantém o perfil do
  header visível.
  **Verificação periódica da sessão** a cada 5 minutos detecta expiração proativamente e
  redireciona para o login com mensagem "Sua sessão expirou".

> O backend ASP.NET Core 8 fica em `../backend/Central_BackEnd/`
> (no monorepo `CENTRALOPERACAO_DEPLOY`).
> Detalhes de arquitetura em `docs/DOCUMENTACAO-COMPLETA.md` e
> `docs/backend-auth-integracao.md`.

## Swagger

O Swagger está disponível em `/swagger` (porta 1009). Para habilitar/desabilitar, use a chave
`SwaggerEnabled` no `appsettings.json` do backend (padrão: `false` em produção, `true` em
`Development`). Pode ser sobrescrita via variável de ambiente `SwaggerEnabled=true`.

## Desenvolvimento

```bash
npm install
ng serve        # http://localhost:4200
```

Para subir backend + frontend de uma vez (banco em memória, login `admin/admin123`),
digite no opencode **"subir interno"** (skill `subir-interno`), ou veja
`.opencode/skills/subir-interno/SKILL.md`.

## Build

```bash
npm run build
```

Saída em `dist/central-conhecimento-actyon/` (SSR: pastas `browser/` e `server/`).
Com **lazy loading** em todas as rotas wiki, o bundle inicial caiu de 1,51 MB para ~669 kB.
Avisos de budget de SCSS de fraseologia/acessos podem aparecer — são esperados.

## Deploy

Deploy de **um comando** — o `deploy.ps1` faz o build e **publica direto nas
pastas reais do IIS** do servidor 192.168.2.130 (via `c$`, com
`app_offline.htm`), fazendo **backup automático** do IIS atual e **preservando
os `appsettings*.json`** reais do servidor:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy.ps1
```

**Fluxo interativo de credenciais** (sem senha hard-coded):
1. O script exibe o servidor (`192.168.2.130`) e o usuário com indicação
   de padrão: `Usuario: JCASRV-SUP (padrao)`.
2. Pede confirmação ou alteração do usuário (Enter aceita o padrão).
3. Solicita a senha separadamente (`Read-Host -AsSecureString`).

**Preservação de appsettings**: antes de copiar o backend, o script exibe
`Excluindo do deploy: appsettings*.json (preservados no servidor)`. Após
a cópia, informa explicitamente `appsettings.json do servidor mantido
intacto` ou `AVISO: appsettings.json nao encontrado` (caso não exista no
servidor).

| Camada | Porta | Pasta IIS |
|---|---|---|
| Frontend | 1010 | `C:\inetpub\wwwroot\Suporte_Front` |
| Backend | 1009 | `C:\inetpub\wwwroot\Suporte_Back` |

Backup em `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`. Para só
empacotar: `-Publicar:$false`. Passo a passo completo em
[`docs/DEPLOY.md`](docs/DEPLOY.md). No opencode, digite **"deploy limpo"**
(skill `deploy-limpo`).

## Estrutura principal

```
src/app/
├─ layout/            header (nav, breadcrumb, busca) e sidebar (seções de navegação)
├─ wiki/
│  ├─ wiki.routes.ts  rotas do portal
│  └─ pages/
│     ├─ home/        página inicial
│     ├─ cursos/      catálogo de cursos por plataforma/área
│     ├─ ferramentas/ central de utilidades, acessos das empresas, FAQ
│     ├─ fraseologia/ fluxo de atendimento e fraseologias
│     ├─ modelo-chamados/
│     ├─ stack/
│     ├─ trilhas/     resolver problemas, dicas de SQL/Rede/Infra
│     └─ ...
└─ visao-adm/         procedimentos administrativos (Visão ADM) + Central de Utilidades
```

## Como adicionar um curso

1. Abra `src/app/wiki/pages/cursos/cursos-novos.data.ts`.
2. Adicione o objeto `Curso` no array adequado (`cursosYouTube`,
   `cursosCursoEmVideo`, `cursosMicrosoftLearn`, `cursosCisco`,
   `cursosFundacaoBradesco`, `cursosPostman`, `cursosDocumentacao`).
   - YouTube: informe `videoId` (ou `playlistId` + `videoId`) e `embeddable: true`.
   - Sites externos: `embeddable: false` e a `url` do curso.
3. **Valide o canal/URL antes de incluir**: cursos de canais inexistentes já
   foram removidos (regra mantida — conferir se o `handle`/`url` responde).
4. Vínculo com trilha: acrescente o `id` do curso em `trilhas` (array `trilhas`
   do mesmo arquivo, 9 áreas) e/ou use uma categoria de `categoriasCursos`.
5. `npm run build` para validar.

## Documentação

- `docs/DOCUMENTACAO-COMPLETA.md` — arquitetura geral (front + back, autenticação, Sheets) e **assistentes opencode (agents & skills)**, na seção 12.
- `docs/DEPLOY.md` — passo a passo de deploy/IIS.
- `docs/backend-auth-integracao.md` — integração de autenticação e backend.

## Assistência opencode (agents & skills)

- **Skills**: `deploy-limpo` e `frontend-design` (idem a busca automática; ver `DOCUMENTACAO-COMPLETA.md` §12).
- **Agents** em `.opencode/agents/`: `@security-auditor`, `@dotnet-engineer`, `@angular-engineer`, `@docs-writer`, `@content-editor`.
