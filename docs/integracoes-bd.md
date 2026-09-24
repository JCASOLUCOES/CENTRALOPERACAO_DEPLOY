# Central de Operação — Integrações e Banco de Dados

> Extraído de `DOCUMENTACAO-COMPLETA.md` §5–§6 e §6.6. Fonte única para Google Sheets, tabelas SQL e Database Explorer.

---


## 5. Integração com Google Sheets

### 5.1. Estrutura da planilha

A planilha tem **16 colunas (A–P)**:

| Col | Campo | Exemplo |
|---|---|---|
| A | EMPRESA | MEIRELES |
| B | TS flag | `ACESSO SOMENTE VIA ANYDESK` |
| C | TS IP | `10.0.0.5` |
| D | TS USUARIO/SENHA | `suporte / 1234` |
| E | BANCO IP | `10.0.0.9` |
| F | BANCO USUARIO/SENHA | `sa / 1234` |
| G | VPN | `SIM`/`NÃO` |
| H | VPN NOME | `CLIENTE_VPN` |
| I | VPN GATEWAY:PORTA | `brcpu01:443` |
| J | VPN USUARIO/SENHA | `user / pass` |
| K | BANCO | `dbCLIENTE` |
| L | VERSAO COB | `1.2.3` |
| M | REDE | `192.168.1.0/24` |
| N | ACESSO ACTYON WEB | `https://...` |
| O | ANYDESK | `id / senha` |
| P | OBSE | Observações |

**Convenções:**
- Credenciais no formato `usuario / senha` em uma única célula (algumas multilinha).
- Grupos MEIRELES/ENEL/TIM compartilham o mesmo padrão de VPN.
- Linhas especiais (WS, GESTART) marcadas com "ACESSO SOMENTE VIA ANYDESK" na col B.

### 5.2. Serviço de leitura e fallback CSV

O `GoogleSheetsService`:
1. Tenta a **API key** (configurada em `appsettings.json`).
2. Se falhar, faz **fallback CSV** via endpoint `gviz/tq` da planilha.
3. Parser CSV próprio que trata campos cercados por aspas e quebras de linha.
4. **Cache em memória por 10 minutos**.

### 5.3. Endpoints de Acessos

| Método | Rota | Descrição | Autenticado |
|---|---|---|---|
| GET | `/api/v1/acessos` | Lista as empresas (resumo `EmpresaResumo`, **sem senhas**) | Sim |
| POST | `/api/v1/acessos/validar-senha` | Valida a senha mestre (`PasswordValidationResponse`) | Sim |
| POST | `/api/v1/acessos/visualizar?empresaId=N` | Retorna as credenciais da empresa (`EmpresaDetalheResponse`; exige senha mestre e grava auditoria) | Sim |

O `AcessosController.MapearParaDetalhe` transforma as linhas em blocos de credenciais
`TS`, `Banco`, `VPN`, além de `VersaoCob`, `AnyDesk` e `Observacoes`, usando o modelo
`EmpresaDetalheResponse`. A auditoria é registrada em `AuditoriaAcessos` a cada visualização.

### 5.4. Validação de senha e auditoria

- `PasswordValidationService` usa um `ConcurrentDictionary` com janela de **5 minutos** para evitar
  re-validar a mesma senha repetidamente.
- A senha é comparada em **tempo constante** (`SegurancaHelper`) e o endpoint está protegido por
  **rate limiting** (`5/min por usuário`) + **lockout** (`BruteForceGuard`, 5 falhas/5 min → 15 min).
- Toda ação relevante é registrada na tabela `AuditoriaAcessos`.

---

## 6. Banco de Dados (SQL Server)

Tabelas do sistema (criadas manualmente no banco `dbBUSINESS_HML`, mapeadas pelas entidades
`RefreshToken` e `AuditoriaAcesso` do backend):

### `RefreshTokens`
```sql
CREATE TABLE RefreshTokens (
    Id INT IDENTITY PRIMARY KEY,
    OperadorId NVARCHAR(15) NOT NULL,
    TokenHash NVARCHAR(500) NOT NULL,
    ExpiraEm DATETIME2 NOT NULL,
    CriadoEm DATETIME2 NOT NULL,
    Revogado BIT NOT NULL DEFAULT 0,
    SubstituidoPor NVARCHAR(500) NULL
);
```

### `AuditoriaAcessos`
```sql
CREATE TABLE AuditoriaAcessos (
    Id INT IDENTITY PRIMARY KEY,
    Usuario NVARCHAR(50) NOT NULL,
    Empresa NVARCHAR(200) NULL,
    TipoInformacao NVARCHAR(50) NULL,
    DataAcesso DATETIME2 NOT NULL,
    HoraAcesso TIME NULL,
    EnderecoIP NVARCHAR(50) NULL,
    Navegador NVARCHAR(200) NULL
);
```

### Tabelas do legado consultadas
- `TBOPERADOR` — usuários (`OPERADOR_ID`, `EMAIL`, `SENHA`, `SE_ATIVO`, `SE_ADMIN`).
- `TBFUNCIONARIO`, `TBFUNCAO` — dados de funcionário.

---


---

### 6.6. Módulo Banco de Dados — Database Explorer (v0.8.0)

Explorador em tempo real do SQL Server Actyon para as equipes SUPORTE, IMPLANTAÇÃO e CIAA.
Inspirado em `projeto_BD.md` da raiz do monorepo. Cobre (subset): metadados (`sys.*`),
relacionamentos (confirmados via `sys.foreign_keys` + inferidos com score 0-99%),
grafo BFS até 5 níveis, busca global, consultas SELECT-only com timeout, configuração
segura de conexão.

**Páginas frontend (`/database/*`)**:

| Rota | Componente | Função |
|---|---|---|
| `/database` | `DatabaseShellComponent` | Shell com 7 abas + banner de status (verde conectado / vermelho desconectado); header via `app-page-header` (Lote B): `titulo="Banco de Dados"`, `icone="bi-hdd-network-fill"`, status continua abaixo |
| `/database/visao-geral` | `DbVisaoGeralComponent` | 9 cards (servidor, tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) + detalhes |
| `/database/explorador` | `DbExploradorComponent` | Árvore de tabelas + painel de detalhe (colunas + índices) + busca global |
| `/database/relacionamentos` | `DbRelacionamentosComponent` | Dropdown de tabela → só vínculos dela (`GET /relationships?tabela=`): Confirmadas × Possíveis com score/motivos + pills e busca por coluna após a seleção |
| `/database/diagrama` | `DbDiagramaComponent` | SVG próprio, layout BFS, profundidade 1-5, setas: azul contínua / violeta tracejada |
| `/database/consultas` | `DbConsultasComponent` | Só o Criador de Consultas (wizard 7 etapas, etapa final "SQL" com Copiar; SQL livre/favoritos/Executar removidos em 23/09/2026) |
| `/database/diferencas` | `DbDiferencasComponent` | Só **Sincronização** (`DbSincronizacaoComponent`): upload CSV/JSON × schema JCA via `POST /database/compare-schemas`, resumo críticos/avisos/match %, filtro diferenças, export CSV client-side + bloco "Script de exportação" com T-SSQL JSON copiável; duplicatas no arquivo → `Aviso`, sem erro (aba "Banco × Documentação" e snapshots removidos em 23/09/2026) |
| `/database/configuracao` | `DbConfiguracaoComponent` | Leitura da conexão (servidor/porta/banco/usuário/senha mascarada) + Testar conexão (somente leitura; `PUT /config` removido) |

**Endpoints backend (`/api/v1/database`)** — 21 endpoints, ver `MODULO-BANCO-DADOS.md` § 4.

**Segurança**: senha nunca é logada, retornada em claro ou commitada. Leitura via
env var (`DB_EXPLORER_*`) em produção, user-secrets em Development. Sem execução de
SQL no servidor (endpoint `POST /query` removido em 23/09/2026); o Criador de
Consultas só gera/copía SQL (execução no SSMS do usuário).

**Mapa completo**: `MODULO-BANCO-DADOS.md` na raiz do monorepo.

---

