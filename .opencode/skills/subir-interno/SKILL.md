---
name: subir-interno
description: Use when the user types "subir interno", "subir local", "rodar local", "subir o sistema", "testar localmente" or asks to start the Central de Conhecimento locally for development. Starts backend (dotnet run, Development, port 1009) and frontend (ng serve, port 4200) without production build. Local DB can be InMemory or SQL Server homolog via Database:UseSqlServer.
---

# Subir Interno (ambiente local de desenvolvimento)

Sobe backend + frontend **em modo dev** (hot-reload, **sem build de produção**).
Não publica no IIS. Depois de testar no navegador, o fluxo é: **`validar` → commit → `deploy limpo`**.

## Conceitos importantes

### Banco de dados (interruptor)

Em `Program.cs`, se `ASPNETCORE_ENVIRONMENT=Development`:

| `Database:UseSqlServer` (em `appsettings.Development.json`) | Provider |
|---|---|
| `false` (padrão rápido) | **InMemory** — dados somem ao fechar; seed `admin`/`admin123` |
| `true` | **SQL Server real** — connection string `ConnectionStrings:DefaultConnection` |

**Homolog configurado no projeto:**

- Servidor: `192.168.2.154`
- Banco: `dbBUSINESS_HML`
- Usuário: `bussiness`
- Flag: `"Database": { "UseSqlServer": true }` em `appsettings.Development.json`

> A senha fica no `appsettings.Development.json` (Development only — **não** é publicado pelo deploy).
> Se preferir fora do Git: `dotnet user-secrets set "ConnectionStrings:DefaultConnection" "..."` em `backend/Central_BackEnd`.

Se o banco estiver vazio/sem migrations:

```powershell
cd backend/Central_BackEnd
dotnet ef database update --connection "Server=192.168.2.154;Database=dbBUSINESS_HML;User Id=bussiness;Password=...;TrustServerCertificate=True;"
```

Com InMemory: operador de teste seed automático `admin` / `admin123`.
Com SQL homolog: use os **usuários reais** do banco (o seed só insere se a tabela `Operadores` estiver vazia).

### Google Sheets / portas

- Acervo de empresas: CSV público do SpreadsheetId em `appsettings.Development.json` (precisa internet).
- Backend `http://localhost:1009` · frontend `http://localhost:4200` (CORS já libera).

## Passos

1. **Parar processos antigos** (opcional):
   ```powershell
   Get-Process -Name dotnet,node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
   ⚠️ Não mate processos de outras aplicações.

2. **Backend** (`backend/Central_BackEnd`):
   ```powershell
   dotnet run
   ```
   Aguarde `Now listening on: http://0.0.0.0:1009` e swagger em `http://localhost:1009/swagger`.
   (`dotnet run --no-build` se já compilado.)

3. **Frontend** (`frontend/`):
   ```powershell
   npm start
   # ou: npm start -- -o
   ```
   Abre `http://localhost:4200`.

4. **Validar subida**: swagger 200 + tela de login no front.

5. **Testar** o fluxo (login, acervo, etc.).

## Depois de testar (fluxo do dia a dia)

```
subir interno  →  validar  →  git commit/push  →  validar  →  deploy limpo
```

Código pronto? Fale **“validar”** (skill `validar`).

## Observações

- **Não builda produção** — `dotnet run` + `ng serve` são dev. Build só no `validar` / `deploy`.
- `appsettings.Development.json` **nunca** é publicado pelo `deploy.ps1`.
- JWT de dev: chave em `appsettings.Development.json` (não usar em produção).
- Para encerrar: mate os processos `dotnet`/`node` do backend e do `ng serve`.
