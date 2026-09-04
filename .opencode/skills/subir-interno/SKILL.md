---
name: subir-interno
description: Use when the user types "subir interno", "subir local", "rodar local", "subir o sistema", "testar localmente" or asks to start the Central de Conhecimento locally for development. Starts the backend (dotnet run, Development env, in-memory DB, port 1009) and the frontend (npm start / ng serve -o, port 4200) so the user can test the full login flow (admin/admin123) against the real Google Sheets without deploying.
---

# Subir Interno (ambiente local de desenvolvimento)

Sobe o ambiente **local** do sistema **Central de Conhecimento** da JCA
Soluções, para desenvolvimento/testes antes do deploy. Não faz build de
produção nem publica no IIS — apenas inicia backend e frontend via localhost.

## Conceitos importantes

- **Sem banco local**: o backend roda em `Development` com **EF Core em memória**
  (provider `UseInMemoryDatabase("CentralDev")` em `Program.cs`). Nada é
  instalado/gravado; os dados somem quando o processo fecha.
- **Operador de teste (seed automático no startup em Development)**:
  - Usuário: `admin`
  - Senha: `admin123`
  - Perfil: Administrador (`SeAdmin=true`)
- **Google Sheets real**: o acervo de empresas vem do CSV público do
  SpreadsheetId `1K4wnpvmdS8d5FIiaGZ0TS3q49zOIhoE3rsP-sRJlct4` (sem API key,
  configurado em `appsettings.Development.json`). Funciona de fora da rede,
  desde que haja internet.
- Portas: backend `http://localhost:1009` · frontend `http://localhost:4200`
  (o CORS do backend já libera `localhost:4200`).

## Passos

1. **Parar processos antigos** (opcional, evita porta em uso):
   ```powershell
   Get-Process -Name dotnet,node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
   ⚠️ Cuidado: não mate processos `dotnet`/`node` de outras aplicações abertas.

2. **Subir o backend** (diretório `backend/Central_BackEnd`):
   ```powershell
   dotnet run
   ```
   Usa `Properties/launchSettings.json` → ambiente `Development` + porta 1009.
   Se já estiver compilado, `dotnet run --no-build` sobe mais rápido.
   Aguarde no log aparecer `Now listening on: http://0.0.0.0:1009` e o
   swagger responder em `http://localhost:1009/swagger`.

3. **Subir o frontend** (diretório `frontend`):
   ```powershell
   npm start
   # ou, para abrir o navegador automaticamente:
   npm start -- -o
   ```
   O `ng serve` serve em `http://localhost:4200` (padrão).

4. **Validar subida**:
   - Swagger: `http://localhost:1009/swagger` deve retornar 200.
   - Frontend: `http://localhost:4200` deve abrir a tela de login.

5. **Testar o fluxo**:
   - Login: `admin` / `admin123`
   - Navegar no acervo, validar senha, visualizar empresa. Os dados vêm do
     Google Sheets real (requer internet).

## Observações

- **Nada vai para produção**: o gate `IsDevelopment()` em `Program.cs` é o que
  troca o provider do banco; em produção continua `UseSqlServer`. O
  `appsettings.Development.json` Nunca é publicado pelo `deploy.ps1`.
- **Chave JWT de dev**: `DEV_CHAVE_NAO_USAR_EM_PRODUCAO_1234567890123456`
  (apenas testes locais; produção usa `JWT_KEY` do servidor).
- Se o login de um endpoint protegido retornar 401 com token válido, checar se
  o `launchSettings.json` não foi alterado (tem que estar em `Development`).
- Para encerrar: interromper os processos `dotnet`/`node` do backend e do `ng serve`.