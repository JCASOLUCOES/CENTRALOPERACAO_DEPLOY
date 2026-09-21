---
name: deploy-limpo
description: Use when the user types "deploy limpo", "deploy", "gerar deploy", "publicar o sistema" or asks to build and package the Central de Conhecimento frontend+backend for IIS. Runs deploy.ps1 (npm run build + dotnet publish) and publishes directly to the IIS folders with automatic backup and appsettings preservation.
---

# Deploy limpo (Central de Conhecimento)

Executa o deploy completo do sistema **Central de Conhecimento** da JCA Soluções:
build do frontend Angular (SSR) + publish do backend ASP.NET Core 8, empacotando
em `deploy/` e **publicando direto nas pastas reais do IIS** do servidor
192.168.2.130 via compartilhamento administrativo `\\192.168.2.130\c$` (a conta
de acesso é Administrador e o `LocalAccountTokenFilterPolicy` está liberado).

## Localização

- Script: `scripts/deploy/deploy.ps1` (NÃO mais na raiz).
- Frontend: `frontend/` (Angular 18 SSR).
- Backend: `backend/Central_BackEnd/` (ASP.NET Core 8, .NET 8).
- Saída local: `deploy/backend/` e `deploy/frontend/`.
- Publica direto em:
  - Backend → `C:\inetpub\wwwroot\Suporte_Back`
  - Frontend → `C:\inetpub\wwwroot\Suporte_Front`
- Backup do IIS (opcional, `-Backup:$true`) em: `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`

## Passos

1. **Pré-requisitos**: confirmar Node/npm e SDK do .NET 8 instalados e que não
   há build pendurado em `dist/` ou `bin/Release`.
2. **Executar o script** do diretório raiz (o working directory). `-BuildFrontend`,
   `-BuildBackend` e `-Backup` são `Nullable[bool]` — via `powershell -File`/`-Command`
   o `$true` chega como string e o bind falha; usar `-Command` com `$` escapado:
   ```powershell
   powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend `$true -BuildBackend `$true -Backup `$true"
   ```
   O script:
   - roda `npm run build` em `frontend/`;
   - roda `dotnet publish -c Release` em `backend/Central_BackEnd/`;
   - regenera `deploy/backend` e `deploy/frontend`;
   - usa a senha padrão `jca@1532` do usuário `JCASRV-SUP` (embutida, sem prompt);
   - autentica no servidor e conecta em `\\192.168.2.130\c$`;
   - com `-Backup:$true`, faz backup do IIS atual em `Backup_IIS\<timestamp>`;
   - publica o backend em `Suporte_Back` usando `app_offline.htm` para liberar o
     lock do worker e **NUNCA toca em `appsettings*.json`** do servidor;
   - publica `deploy\frontend\browser` em `Suporte_Front`;
   - remove o `app_offline.htm` (IIS recarrega sozinho).
3. **Verificar o resultado**:
   - "Deploy publicado com sucesso no IIS" deve aparecer.
   - "appsettings.json do servidor mantido intacto" deve aparecer.
   - `deploy/backend/Central_BackEnd.dll` e `deploy/frontend/browser/index.html` + `server/server.mjs` existem.
   - Testes: frontend `http://192.168.2.130:1010` · swagger `http://192.168.2.130:1009/swagger`.

## Parâmetros do script

| Parâmetro | Default | Descrição |
|---|---|---|
| `-Publicar` | `$true` | `false` = só empacota em `deploy/` sem publicar |
| `-ServidorRemoto` | `192.168.2.130` | IP do servidor IIS |
| `-UsuarioRemoto` | `JCASRV-SUP` | Conta de acesso |
| `-SenhaRemota` | `jca@1532` (padrão embutido) | Sem prompt na prática |
| `-BuildFrontend`/`-BuildBackend` | pergunta se omitido | `Nullable[bool]` — passar explícito em automação |
| `-Backup` | `$false` | `$true` = backup do IIS antes de publicar |
| `-DestinoBackendRel` | `inetpub\wwwroot\Suporte_Back` | Caminho relativo do backend no IIS |
| `-DestinoFrontRel` | `inetpub\wwwroot\Suporte_Front` | Caminho relativo do frontend no IIS |
| `-BackupBaseRel` | `Users\JCASRV-SUP\Documents\Backup_IIS` | Pasta de backups |
| `-EsperaOffline` | `3` | Segundos após `app_offline.htm` antes do mirror |

Para só empacotar: `powershell -ExecutionPolicy Bypass -Command "& '.\scripts\deploy\deploy.ps1' -BuildFrontend `$true -BuildBackend `$true -Publicar `$false"`

## Observações

- O build é SSR/prerender ("Prerendered N static routes"). Avisos de budget
  (bundle > 1.05 MB) e de SCSS (`fraseologia`/`acessos`) são esperados.
- Não edite manualmente `deploy/`; ele é regenerado pelo script.
- **APPSETTINGS PRESERVADOS**: O script **NUNCA sobrescreve nem apaga** os
  `appsettings*.json` do servidor. O parâmetro `-Excluir "appsettings*.json"`
  é aplicado em todas as cópias robocopy. A config real (banco/JWT/Google)
  fica guardada só no servidor.
- Rollback: copiar `Backup_IIS\<timestamp>\backend` e `\frontend` de volta para
  `Suporte_Back` / `Suporte_Front` (sem mexer nos `appsettings*.json`).
- **Lock da DLL:** se o mirror do backend falhar com robocopy código 11, a espera
  de 3 s foi insuficiente — aguarde 1–2 min (o `app_offline.htm` é mantido) e repita
  só o mirror: `robocopy deploy\backend \\192.168.2.130\c$\inetpub\wwwroot\Suporte_Back /MIR /XF appsettings*.json app_offline.htm /MT:8 /R:4 /W:5`
  (código 3 = OK). Depois remova o `app_offline.htm` e publique o frontend.