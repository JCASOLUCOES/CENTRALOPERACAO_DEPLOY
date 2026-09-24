# Regras de negócio — Central de Operação

> Compacto e verificado no código (2026-09). Detalhe técnico: [`DOCUMENTACAO-COMPLETA.md`](./DOCUMENTACAO-COMPLETA.md) · Telas: [`TELAS.md`](./TELAS.md).

## Identidade e acesso

- **Login:** `POST /api/v1/auth/login` → access token **só em memória** + refresh em cookie HttpOnly `cc_refresh` (4h com "Lembrar acesso").
- **Perfis:** `Usuario | Editor | Administrador | Suporte | F`.
- **Guards:** `authGuard` = qualquer autenticado; `adminGuard` = **só `Administrador`** (perfil `F` é barrado no guard; `hasRole('F')` é super-usuário só em menus que o declararem).
- **Pós-login:** deep-link (`returnUrl`) sempre respeitado; sem deep-link → **`/`** (Home, qualquer perfil).
- **Brute force / rate limit** no backend; senha da planilha de acessos é separada (mestra).

## Pós-login e módulos ativos

| Perfil | Destino genérico |
|---|---|
| Qualquer (sem deep-link) | `/` (Home operacional) |

**Removidos (24/09/2026, `e87d763`):** Módulo Gestor (`/gestor/entrada` + painéis CEO/CTO/COO),
Central Executiva (`features/executivo/`), página `/chat`. Kanban ADM do menu usa
`/implantacao/kanban?perfil=F` (query param, não rota `/administrativo`).

## Fontes de verdade dos dados

| Tipo | Onde | Regra |
|---|---|---|
| **HTTP real** | Implantação, Agenda, Acessos, Database Explorer, Admin dashboard, RagProxy (JOTA) | Nunca mockar; estados loading/empty/error honestos |
| **Estático** | `*.data.ts` (ferramentas, cursos, trilhas, SQL, fraseologia, FAQ, stack, política, onboarding, procedimentos) | Sem escrita; mudanças via content-editor |
| **Local (localStorage)** | recentes `cc.recentes.v1`, favoritos Visão ADM, tema, colunas kanban | Por usuário no browser; sem backend |

**Proibido inventar:** métricas globais de acesso, busca server-side, sessões
persistentes de chat, IA no Query Builder. Usar empty-state honesto.

## Módulos e regras-chave

- **Implantação:** projetos `PRJ-XXXX`; prioridades 0–3; status Backlog→…→Concluido/Bloqueado/Cancelado; Kanban DnD (`PATCH .../coluna`) sincroniza Agenda quando coluna é Reunião/Treinamento/Marco de Entrega; colunas `padrao` não excluíveis (máx 8).
- **Agenda:** CRUD com 409 `CONFLICT_HORARIOS` (sobreposição do responsável); editar/excluir/mover = só dono ou admin (403); criar aceita terceiros; filtros `responsavelId`/`funcaoId`/escopo Meus-Geral.
- **Acessos:** Google Sheets (16 col); visualização exige senha mestra e gera auditoria em `AuditoriaAcessos`; credenciais expiram em 5 min no cliente.
- **Database Explorer:** somente leitura; sem execução de SQL no servidor desde 23/09/2026 (Criador gera/copía); config via env/user-secrets.
- **JOTA:** único endpoint `POST /api/rag-proxy/chat` (workspace `suporte`); sem `/sessions`; erro honesto, sem resposta fake; só widget flutuante (página `/chat` removida).

## Design e UX obrigatórios

- Design system único (`adm-page`, `adm-card`, `adm-stats`, tokens `--primary-color` etc.); sem criar DS paralelo.
- Navegação SPA via `router.navigate` (sem `window.location` para rotas internas).
- Estados vazios com copy real ("começa vazio, aprende com o uso") — ex.: recentes.

## Versionamento e branches

- Fonte única da versão: `frontend/src/app/shared/meta/app-version.ts` (beta `<1.0`).
- `master` = produção (IIS 192.168.2.130); `developer` = dev; tags `vX.Z.Y` substituem "branch backup".
