# Módulo Banco de Dados — Database Explorer

> Documentação do módulo Database Explorer da Central de Operação.
> Inspirado no `projeto_BD.md` da raiz do monorepo. Para o passo-a-passo de
> implementação, ver `projeto_BD.md` § 46 (Processo de Implementação Obrigatório).
> Para a documentação completa do sistema, ver `frontend/docs/DOCUMENTACAO-COMPLETA.md` § 6.6.

---

## 1. Propósito

Permitir que as equipes **SUPORTE**, **IMPLANTAÇÃO** e **CIAA** investiguem a
estrutura real do banco SQL Server Actyon **em tempo real**, com:

- **SQL Server = fonte de verdade da estrutura física** (catálogos `sys.*`).
- **Documentação Markdown = fonte de verdade do conhecimento institucional**.
- **Inferência por IA = sugestão de relacionamentos não declarados**, sempre
  marcada como **POSSÍVEL** (nunca como confirmada).

---

## 2. Arquitetura

```
Angular (porta 4200)
        ↓
API .NET 8 (porta 1009)
        ↓
DatabaseConnectionService
        ↓
SQL Server (Microsoft.Data.SqlClient)
```

**Sem Dapper** — usa `Microsoft.Data.SqlClient` direto, padrão já estabelecido
pelo `LegacyDataService` do módulo IMPL.

**Sem FKs formais** entre o sistema e o SQL Server alvo — toda conexão é
efêmera (escopo de request), com `using` garantindo fechamento.

---

## 3. Configuração segura da conexão

### Precedência de leitura

1. **Variaveis de ambiente** (produção)
   - `DB_EXPLORER_SERVIDOR`
   - `DB_EXPLORER_PORTA`
   - `DB_EXPLORER_BANCO`
   - `DB_EXPLORER_USUARIO`
   - `DB_EXPLORER_SENHA` ← **NUNCA** commitada
   - `DB_EXPLORER_ENCRYPT`
   - `DB_EXPLORER_TRUST`
2. **Seção `DatabaseExplorer`** do `appsettings.json` (dev only)
3. **User-secrets do dotnet** (dev only, ideal para senha)
4. Vazio → serviço não conectado (frontend mostra banner "DESCONECTADO")

### Garantias de segurança

- ✅ Senha **nunca** é logada (mesmo em `_logger.LogError`)
- ✅ Senha **nunca** é retornada pela API — endpoint `GET /config` retorna `"***"`
- ✅ Senha **nunca** é commitada no git
- ✅ Frontend exibe `<input type="password">` com autocomplete off
- ✅ Senhas vazias em update = mantém senha atual (não apaga)

### Configurar localmente (Development)

```bash
# 1) Setar user-secrets do projeto
cd backend/Central_BackEnd
dotnet user-secrets set "DatabaseExplorer:Servidor" "192.168.2.154"
dotnet user-secrets set "DatabaseExplorer:Porta" "1433"
dotnet user-secrets set "DatabaseExplorer:Banco" "dbBUSINESS_HML"
dotnet user-secrets set "DatabaseExplorer:Usuario" "bussiness"
dotnet user-secrets set "DatabaseExplorer:Senha" "bsn@2018"

# 2) Rodar backend
dotnet run

# 3) Acessar /database/configuracao e clicar em 'Testar conexão'
```

---

## 4. Endpoints (`/api/v1/database`)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/database/status` | Conectado/Servidor/Banco/Última consulta |
| GET | `/database/info` | Info completa: contadores (tabelas, colunas, PKs, FKs, índices, views, procedures, functions, triggers) + versão SQL Server |
| GET | `/database/tables?schema=` | Lista todas as tabelas (com qtd de registros) |
| GET | `/database/tables/{schema}/{nome}` | Detalhe de uma tabela |
| GET | `/database/tables/{schema}/{nome}/columns` | Colunas com tipo, nulidade, PK/FK, default, collation |
| GET | `/database/tables/{schema}/{nome}/indexes` | Índices (únicos/não, colunas) |
| GET | `/database/relationships?schema=&incluirPossiveis=` | FKs confirmadas + (opcional) inferidas |
| GET | `/database/column-usage?coluna=X` | Onde a coluna X é usada |
| GET | `/database/graph?tabela=X&profundidade=N&incluirPossiveis=` | Grafo BFS (1-5 níveis) |
| GET | `/database/search?termo=X` | Busca global (tabela/coluna/view/proc/func/trigger) |
| POST | `/database/query` | Executa SELECT (somente leitura) |
| POST | `/database/test-connection` | Testa conexão sem persistir |
| GET | `/database/config` | Lê config (senha mascarada) |
| PUT | `/database/config` | Atualiza config em memória da sessão |

---

## 5. UI (frontend) — `/database`

Shell com 7 abas + banner de status (verde conectado / vermelho desconectado):

| Aba | Função |
|---|---|
| **Visão Geral** | Cards com contadores + detalhes da conexão (servidor, banco, versão, usuário, última consulta, duração) |
| **Explorador** | Árvore lateral de tabelas + painel de detalhe (colunas, índices, metadados) + busca global |
| **Relacionamentos** | Tabela com tipo (Confirmada linha contínua / Possível tracejada), score, motivos. Filtros: Todas / Confirmadas / Possíveis + busca por coluna |
| **Diagrama** | SVG próprio com layout BFS (raiz no centro, colunas por profundidade). Setas: azul contínua (confirmada) / violeta tracejada (possível). Profundidade 1-5 |
| **Consultas** | Editor SQL (SELECT/WITH) com timeout configurável e paginação. Resultado em tabela |
| **Diferenças** | Resumo (X tabelas iguais, Y novas, Z removidas...) + lista de divergências. Placeholder — integração com diff real de Markdown em v2.x |
| **Configuração** | Form com servidor/porta/banco/usuário/senha mascarada/encrypt/trust + botão Testar conexão |

---

## 6. Segurança do Query (camadas)

1. **Frontend**: textarea, sem autocomplete, sem preview destrutivo
2. **Validação de tamanho**: 1-5000 registros, 1-120s timeout
3. **Regex server-side**: bloqueia `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`,
   `TRUNCATE`, `CREATE`, `EXEC`, `EXECUTE`, `GRANT`, `REVOKE`, `MERGE`, `BULK`
4. **Permite só SELECT/WITH**: `cmd.ExecuteReaderAsync` é estritamente read-only
5. **Transação ReadUncommitted** + `ROLLBACK` explícito (defesa em profundidade)
6. **Timeout via `CommandTimeout`**: erro -2 do SqlClient vira mensagem amigável
7. **Limite automático via `TOP`**: envelopa SELECT com `TOP N` se ausente
8. **Log de auditoria**: registra a consulta (sem senha) para investigação

> **Não confie só no frontend.** O backend **sempre** valida.

---

## 7. Inferência de Relacionamentos

| Critério | Pontos | Motivo |
|---|---|---|
| 1. Nome `_ID` / `COD_` / `ID_` | – | filtro inicial de colunas candidatas |
| 2. Tipo compatível (INT, BIGINT, UNIQUEIDENTIFIER…) | +40 | "tipos compativeis" |
| 3. Coluna destino é PK | +25 | "coluna destino e PK" |
| 4. Coluna origem indexada | +15 | "coluna origem indexada" |
| 5. Tipo comum de FK (INT/GUID) | +10 | "tipo comum de FK" |

**Score final**: 0-99 (relacionamentos confirmados são sempre 100).

**Relacionamentos confirmados (linha contínua azul)** vêm diretamente de
`sys.foreign_keys`. Nunca são inferidos — vem do SQL Server.

**Relacionamentos possíveis (linha tracejada violeta)** vêm do algoritmo acima
e **nunca** devem ser tratados como FKs reais sem validação manual.

---

## 8. Próximos passos (v2.x)

- [ ] **Snapshot do banco** (§ 26 do `projeto_BD.md`): salvar metadados
      completos num JSON para comparar versões no tempo
- [ ] **Diff real com Markdown** (§ 23-25 do `projeto_BD.md`): hoje é placeholder
- [ ] **Gerador de SQL** (§ 19 do `projeto_BD.md`): hoje não há UI para isso
      (criação de SELECT a partir das tabelas selecionadas)
- [ ] **MCP server** (§ 28 do `projeto_BD.md`): expor os 5 services
      (`DatabaseMetadataService`, `DatabaseRelationshipService`,
      `DatabaseQueryService`, `DatabaseSchemaDiffService`, `DatabaseSnapshotService`)
      via protocolo MCP para o Agente IA consumir
- [ ] **Filtros do diagrama** (§ 17 do `projeto_BD.md`): zoom, centralizar, expandir
- [ ] **Status da documentação** (§ 39 do `projeto_BD.md`): badges 🟢/🟡/🔴 por tabela
- [ ] **Search em procedures** (§ 12.6 do `projeto_BD.md`): parser de `sys.sql_modules`

---

## 9. Critérios de aceite (subset entregue)

- [x] módulo Banco de Dados aparece no menu (Sidebar > Ferramentas)
- [x] conexão SQL Server funciona (configurável pela UI)
- [x] conexão é testável pela interface (botão "Testar conexão")
- [x] credenciais não ficam expostas (senha mascarada em logs, DTOs e git)
- [x] lista de tabelas é carregada diretamente do SQL Server
- [x] detalhes das tabelas funcionam (colunas, índices, contadores)
- [x] colunas são exibidas (com tipo, nulidade, PK/FK, identity, default, collation)
- [x] PKs são identificadas
- [x] FKs são identificadas
- [x] relacionamentos físicos são exibidos
- [x] relacionamentos possíveis são identificados separadamente (com score)
- [x] busca por coluna funciona (`/column-usage`)
- [x] grafo de relacionamentos funciona (BFS até 5 níveis)
- [x] profundidade do grafo funciona
- [x] filtros funcionam (Todas / Confirmadas / Possíveis)
- [x] SQL SELECT pode ser executado
- [x] comandos destrutivos são bloqueados (regex server-side)
- [x] consultas possuem paginação/limite (25/50/100/500)
- [x] timeout existe (5/15/30/60s)
- [ ] comparação SQL Server × Markdown funciona (placeholder — v2.x)
- [x] arquitetura está preparada para MCP (services isolados, sem DTOs anêmicos)
- [x] funcionalidades existentes da Central de Operação continuam funcionando

---

## 10. Testar localmente

```bash
# 1) Backend com EF InMemory (NAO precisa de SQL Server real para o backend subir)
cd backend/Central_BackEnd
dotnet run

# 2) Frontend
cd frontend
npm start

# 3) Acessar http://localhost:4200/database
# 4) Clicar em "Configuração" > preencher > "Testar conexão"
# 5) Voltar para "Visão Geral" — se conectado, verá os contadores reais
```

**Homolog (referência)**:
- Servidor: `192.168.2.154`
- Banco: `dbBUSINESS_HML` (já configurado em `projeto_BD.md`)
- Usuário: `bussiness`
- Senha: `bsn@2018` (via env var, **NUNCA** em appsettings.json)

---

**Gerado em v0.8.0-rc1** (junto com a v1.3.0 do IMPL). Para contribuir, edite
diretamente e abra PR contra `projeto-implantacao`.
