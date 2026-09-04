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

- Script: `deploy.ps1` (raiz do repositório, ao lado das pastas `CENTRALOPERACAO_FRONTEND/` e `CENTRALOPERACAO_BACKEND/`).
- Frontend: `CENTRALOPERACAO_FRONTEND/` (Angular 18 SSR).
- Backend: `CENTRALOPERACAO_BACKEND/Central_BackEnd/` (ASP.NET Core 8, .NET 8).
- Saída local: `deploy/backend/` e `deploy/frontend/`.
- Publica direto em:
  - Backend → `C:\inetpub\wwwroot\Suporte_Back`
  - Frontend → `C:\inetpub\wwwroot\Suporte_Front`
- Backup automático do IIS atual em: `C:\Users\JCASRV-SUP\Documents\Backup_IIS\<timestamp>`

## Passos

1. **Pré-requisitos**: confirmar Node/npm e SDK do .NET 8 instalados e que não
   há build pendurado em `dist/` ou `bin/Release`.
2. **Executar o script** do diretório raiz (o working directory):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy.ps1
   ```
   O script:
   - roda `npm run build` em `CENTRALOPERACAO_FRONTEND/`;
   - roda `dotnet publish -c Release` em `CENTRALOPERACAO_BACKEND/Central_BackEnd/`;
   - regenera `deploy/backend` e `deploy/frontend`;
   - **pede a senha** do usuário `JCASRV-SUP` (padrão pré-preenchido);
   - autentica no servidor e conecta em `\\192.168.2.130\c$`;
   - **faz backup do IIS atual** em `Backup_IIS\<timestamp>`;
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
| `-UsuarioRemoto` | `JCASRV-SUP` | Usuário pré-preenchido (confirma com Enter) |
| `-SenhaRemota` | (obrigatória) | Senha pedida interativamente (não é salva) |
| `-DestinoBackendRel` | `inetpub\wwwroot\Suporte_Back` | Caminho relativo do backend no IIS |
| `-DestinoFrontRel` | `inetpub\wwwroot\Suporte_Front` | Caminho relativo do frontend no IIS |
| `-BackupBaseRel` | `Users\JCASRV-SUP\Documents\Backup_IIS` | Pasta de backups |

**Modo interativo (recomendado):**
```powershell
.\deploy.ps1
# Usuario: JCASRV-SUP (padrao, basta Enter)
# Senha: ******** (digitada pelo usuario)
```

**Modo automatizado (CI/CD):**
```powershell
$senha = ConvertTo-SecureString 'senha_aqui' -AsPlainText -Force
.\deploy.ps1 -UsuarioRemoto 'JCASRV-SUP' -SenhaRemota $senha
```

Para só empacotar: `powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Publicar:$false`

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