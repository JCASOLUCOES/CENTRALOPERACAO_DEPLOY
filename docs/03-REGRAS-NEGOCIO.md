---
title: "Regras de negócio"
description: "Regras de autenticação, permissões, tarefas, projetos, Agenda e dados sensíveis verificadas no código atual."
date: "2026-09-25"
language: "pt-BR"
status: "canônico"
---

# Regras de negócio

Documento derivado do código atualmente presente no *working tree*. Não infere telas, componentes ou fluxos visuais. Exemplos de payload não são contrato: o contrato efetivo está nos DTOs e nos *controllers*.

## Índice para busca

| Termo | Fonte primária |
|---|---|
| autenticação, JWT, refresh | [AuthController.cs](../backend/Central_BackEnd/Controllers/AuthController.cs), [AuthService.cs](../backend/Central_BackEnd/Services/AuthService.cs), [token-storage.service.ts](../frontend/src/app/core/services/token-storage.service.ts) |
| atraso de tarefa | [TarefaAtrasoExtensions.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaAtrasoExtensions.cs), [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs) |
| bloqueio, WIP, arquivamento | [Tarefa.cs](../backend/Central_BackEnd/Models/Implantacao/Tarefa.cs), [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs) |
| apontamentos e horas | [TarefaApontamento.cs](../backend/Central_BackEnd/Models/Implantacao/TarefaApontamento.cs), [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs) |
| sincronização tarefa–agenda | [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs), [AgendaService.cs](../backend/Central_BackEnd/Services/Implantacao/AgendaService.cs) |
| etapas e jornada | [ProjetoEtapaService.cs](../backend/Central_BackEnd/Services/Implantacao/ProjetoEtapaService.cs), [ProjetoEtapa.cs](../backend/Central_BackEnd/Models/Implantacao/ProjetoEtapa.cs), [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs) |
| propriedade, perfis e permissões | [AuthService.cs](../backend/Central_BackEnd/Services/AuthService.cs), [TarefaService.cs](../backend/Central_BackEnd/Services/Implantacao/TarefaService.cs), [AgendaController.cs](../backend/Central_BackEnd/Controllers/AgendaController.cs), [auth.service.ts](../frontend/src/app/core/services/auth.service.ts) |
| conflitos de agenda | [AgendaService.cs](../backend/Central_BackEnd/Services/Implantacao/AgendaService.cs), [ConflictException.cs](../backend/Central_BackEnd/Exceptions/ConflictException.cs) |
| código global PRJ | [ProjetoService.cs](../backend/Central_BackEnd/Services/Implantacao/ProjetoService.cs), [Projeto.cs](../backend/Central_BackEnd/Models/Implantacao/Projeto.cs) |
| dados sensíveis e fontes externas | [AcessosController.cs](../backend/Central_BackEnd/Controllers/AcessosController.cs), [GoogleSheetsService.cs](../backend/Central_BackEnd/Services/GoogleSheetsService.cs), [DatabaseConnectionService.cs](../backend/Central_BackEnd/Services/Database/DatabaseConnectionService.cs) |

## Legenda de situação

- **Implementado**: regra executada pelo backend no código atual.
- **Parcial**: há implementação, mas com limite, inconsistência ou autorização incompleta.
- **Planejado/recomendado**: não foi localizado como regra executada; é uma recomendação deste documento, não um contrato.

| Regra solicitada | Situação |
|---|---|
| autenticação e refresh | **Implementado**, com proteção de transporte parcial |
| atraso de tarefa | **Implementado** com `DataEntrega ?? DataPrevisao` |
| bloqueios | **Parcial** |
| apontamentos | **Parcial** |
| sincronização tarefa–agenda | **Parcial** |
| etapas | **Implementado**; a etapa do projeto é obrigatória na tarefa com projeto, com fórmulas de progresso concorrentes |
| propriedade/permissões | **Parcial** |
| conflitos de agenda | **Parcial** |
| código PRJ global | **Parcial** |
| dados sensíveis | **Parcial** |
| regras adicionais planejadas | **Não confirmadas no código** |

Nenhuma regra de negócio adicional “planejada” foi confirmada no código. Os itens marcados como recomendados não devem ser tratados como funcionalidade existente.

## Autenticação e refresh

**Situação: implementado; proteção de transporte e identidade parcialmente implementada.**

- `POST /api/v1/auth/login` recebe `Usuario`, `Senha` e `LembrarAcesso`. O serviço aceita identificador de operador ou e-mail; rejeita operador inexistente, inativo, senha inválida ou chave bloqueada pelo controle de tentativas.
- O token de acesso JWT é emitido com expiração lida de `Jwt:AccessTokenMinutes`. O refresh token é aleatório, tem expiração lida de `Jwt:RefreshTokenHours` e é armazenado no banco somente como hash SHA-256.
- O refresh gira o token: o anterior é revogado, recebe `SubstituidoPor` com o hash do novo e o novo é emitido. Token revogado, expirado ou associado a operador inativo não renova.
- O controller envia o refresh token no cookie `cc_refresh` com `HttpOnly`, `SameSite=Strict` e `Path=/`; o token não é removido do JSON: os controllers devolvem `refreshToken: ""` no login e no refresh. `LembrarAcesso=true` acrescenta `MaxAge` de quatro horas; sem essa opção, o cookie fica sem `MaxAge`.
- No frontend, o token de acesso e o usuário ficam somente em memória; o refresh token não é gravado em `localStorage`/`sessionStorage`. As requisições usam `withCredentials` para enviar o cookie.
- `POST /api/v1/auth/refresh` não exige token de acesso no controller. O frontend envia um objeto vazio, mas o backend não lê o corpo. `POST /api/v1/auth/logout` exige Bearer, revoga o cookie quando presente e devolve `204`.
- A comparação de senha do login e da revalidação de Acessos aplica SHA-256 ao valor informado e ao valor lido do operador; não há, no código consultado, migração para um algoritmo de hash adaptativo com sal.
- O `BruteForceGuard` é singleton em memória: cinco falhas na janela de cinco minutos bloqueiam a chave por quinze minutos. O estado não é distribuído entre processos.
- O cookie de refresh está com `Secure=false` no código atual. HSTS só é habilitado fora de Development e não há, neste arquivo, uma regra explícita de redirecionamento para HTTPS. Isso deve ser corrigido antes de exposição por rede não confiável.

## Atraso real da tarefa

**Situação: implementado para tarefas; não generalizar para a regra de atraso de projetos.**

A única função canônica encontrada está em `TarefaAtrasoExtensions`:

```text
prazo = DataEntrega ?? DataPrevisao
atrasada = prazo preenchido
           E prazo.Date < DateTime.Today
           E Status != Cancelada
           E (Status != Concluida
              OU DataConclusao não preenchida
              OU DataConclusao.Date > prazo.Date)
```

Consequências confirmadas:

| Situação | Resultado |
|---|---|
| `DataEntrega` e `DataPrevisao` ausentes | não atrasada |
| prazo hoje | não atrasada, pois a comparação é estritamente `<` |
| tarefa aberta com prazo anterior | atrasada |
| concluída até o prazo | não atrasada |
| concluída depois do prazo | atrasada |
| cancelada | nunca conta como atrasada |

`DataEntrega` tem precedência sobre `DataPrevisao`, mesmo quando ambas são preenchidas. A função é reutilizada na listagem de tarefas, no detalhe do projeto e nos dashboards. Para o **projeto**, o dashboard exige `Projeto.DataPrevisao` preenchida, data anterior a `DateTime.Today` e status diferente de `Concluido` e `Cancelado`; portanto a comparação do projeto não é apenas uma comparação de datas. Essa é uma regra diferente da fórmula de tarefa.

## Bloqueios, WIP e arquivamento

**Situação: parcial.**

- `Tarefa.Bloqueada` e `Tarefa.MotivoBloqueio` são persistidos. A criação e a atualização aceitam os dois campos.
- Ao mover uma tarefa para uma coluna cujo nome contenha `BLOQUEAD`, o serviço exige motivo quando ainda não existe motivo anterior, marca `Bloqueada=true` e não troca o status pela coluna.
- Ao mover para uma coluna não bloqueada, o serviço limpa `Bloqueada` e `MotivoBloqueio`; uma coluna de conclusão também preenche `DataConclusao` quando necessário.
- A movimentação para uma coluna com `LimiteWip` positivo é recusada quando a quantidade de tarefas na coluna já atingiu o limite. A contagem não filtra tarefas arquivadas.
- Somente tarefas com status `Concluida` podem ser arquivadas. Desarquivar força status `Concluida` e escolhe a coluna cujo nome contém `CONCLUID`, se existir.
- A atualização direta pode definir `Bloqueada` sem exigir motivo; portanto a obrigação de motivo não é uniforme.
- O alerta administrativo chamado `Bloqueadas` não conta o campo `Bloqueada`: ele conta `Cancelada`, `Backlog` e `A Fazer`. Essa é uma divergência de regra que deve ser corrigida ou renomeada.

## Apontamentos de horas

**Situação: parcial.**

- Cada apontamento pertence a uma tarefa, tem operador, data, horas, observação e usuário de inclusão. `Horas` é `decimal(5,2)` e deve ser maior que zero.
- A soma dos apontamentos é mantida em `Tarefa.HorasRealizadas`; o valor persistido é inteiro e usa `Math.Ceiling` da soma. A criação, alteração e exclusão recalculam esse campo.
- A data vazia na criação assume `DateTime.Today`. Se `OperadorId` vier preenchido, o serviço usa esse valor; caso contrário, usa o operador autenticado.
- Alteração e exclusão verificam se o apontamento pertence ao operador autenticado, salvo quando o controller informa `ehAdmin`.
- Há uma inconsistência a validar: o controller calcula `ehAdmin` com `User.IsInRole("Admin")` ou claim `PerfilId == "A"`, enquanto [AuthService.cs](../backend/Central_BackEnd/Services/AuthService.cs) emite o papel `Administrador` e a claim `perfil`. Não se deve afirmar, com o código atual, que o caminho administrativo de apontamentos funciona como pretendido.
- A criação aceita um `OperadorId` enviado na requisição sem validar se ele existe ou está ativo. A atualização e a exclusão não registram uma nova linha em `IMPL_Auditoria`; apenas a criação chama o auditor de implantação.

## Sincronização tarefa–agenda

**Situação: parcial; a sincronização existe, mas é unilateral e heurística.**

- A sincronização só é chamada em `MudarColunaAsync`.
- Nomes de coluna que contenham `REUNIAO`/`REUNIÃO` ou `TREINAMENTO`/`CAPACITACAO` geram evento de reunião/treinamento; `MARCO`, `ENTREGA` ou `MILESTONE` geram evento do tipo `Outro`.
- O serviço procura um evento existente pelo mesmo `ProjetoId` e por `Titulo.Contains(tarefa.Titulo)`. Se não encontrar, cria um; se encontrar, atualiza título, descrição, datas, tipo e visibilidade.
- A data usada é `Tarefa.DataPrevisao ?? DateTime.Now`; `DataEntrega` não é a fonte dessa sincronização.
- O responsável do novo evento é `ResponsavelId ?? CriadorId`; não há validação de conflito, participante, idempotência ou vínculo direto por ID de tarefa.
- Não foi localizada sincronização inversa agenda–tarefa, nem sincronização na criação/edição direta da tarefa. Portanto a regra não é bidirecional nem completa.

## Etapas do projeto

**Situação: implementado com fórmulas de progresso concorrentes.**

- A jornada padrão tem nove etapas, nesta ordem: `KICKOFF`, `LEVANTAMENTO`, `DESENVOLVIMENTO`, `HOMOLOGAÇÃO`, `TREINAMENTO`, `GO LIVE`, `PÓS-IMPLANTAÇÃO`, `PASSAR PARA O SUPORTE` e `CONCLUÍDO`.
- A criação do projeto inicializa as nove etapas, com checklists padrão. A ordem de início é 1–9: etapas anteriores nascem concluídas, a etapa inicial nasce em andamento e as seguintes pendentes.
- `ProjetoId + Ordem` é único. Checklist, documento, histórico e comentário dependem da etapa e são removidos em cascata.
- Tarefa com `ProjetoId` exige `ProjetoEtapaId` **do mesmo projeto**. `TarefaService.ValidarEtapaFixaAsync` exige a etapa (`Etapa do projeto é obrigatória para tarefas de projeto`) e rejeita etapa de outro projeto (`Etapa do projeto inválida para esta tarefa`); a validação é de aplicação, no serviço, e vale para criação e atualização.
- Tarefa sem projeto **e** sem etapa continua válida. Na criação, informar etapa sem projeto é rejeitado com mensagem explícita (`Não é possível informar uma etapa do projeto sem informar o projeto.`).
- Na atualização, o projeto não é trocado: `TarefaAtualizarRequest` não tem `ProjetoId` e `AtualizarAsync` não escreve `t.ProjetoId`. A etapa enviada é validada contra o projeto já persistido e, em tarefa sem projeto, é gravada como `null`.
- A sincronização por tarefas ignora tarefas arquivadas, calcula percentual por tarefas concluídas, reabre somente a etapa afetada quando uma tarefa reabre, conclui automaticamente quando todas as tarefas da etapa estão concluídas e libera a próxima etapa pendente.
- O retorno manual aceita ordem alvo 1–8, reseta as etapas posteriores e mantém o checklist da etapa alvo. Não foi localizada regra que restrinja esse retorno por responsável.
- Existem duas rotinas de progresso: `ProjetoJornadaService` calcula média dos percentuais das etapas, enquanto `ProjetoEtapaService` calcula `(etapasConcluídas * 100 + percentualAtual) / 9`. A atualização direta de projeto ainda aceita `Progresso` e `Status` na requisição. Não há uma fórmula única garantida para todo fluxo.

## Propriedade, perfis e permissões

**Situação: parcial; há autenticação, mas não há propriedade uniforme.**

- Os controllers de Agenda, Acessos, RagProxy, Banco de Dados, Projetos, Tarefas e Dashboard exigem Bearer. Tipos de projeto e colunas exigem Bearer; suas operações de escrita exigem o papel `Administrador`. O dashboard administrativo exige `Administrador` no backend.
- `AuthService` mapeia `SeAdmin=true` ou `PerfilId="A"` para `Administrador`, `PerfilId="S"` para `Suporte` e os demais para `Usuario`.
- `CriarAsync` e `AtualizarAsync` verificam o responsável principal (`ResponsavelId` ou o primeiro item de `ResponsavelIds` quando o principal é omitido): se for diferente do operador autenticado, chamam `PodeAtribuirTerceiroAsync`.
- A lista `ResponsavelIds` não tem uma regra uniforme: na criação, cada item é apenas consultado quanto à existência e somente os existentes são adicionados, sem a autorização de atribuição usada no responsável principal; na atualização, quando a lista é enviada, cada item diferente do operador passa pela mesma autorização de atribuição. Se a lista é omitida, a autorização considera apenas o caminho do responsável principal. Portanto, não se deve afirmar que todos os responsáveis adicionais são igualmente verificados em ambos os fluxos.
- A autorização de atribuição permite `SeAdmin=true`, `PerfilId=A`, `PerfilId=S`, `PerfilId=F` ou `FuncaoId=1`; não é uma autorização de propriedade do recurso.
- Em Agenda, o responsável ou administrador pode alterar, mover ou excluir o evento. A transferência de responsabilidade para outro operador é negada para não administrador, salvo se o destino for o próprio usuário.
- Não foi localizada regra de propriedade para projeto, tarefa, apontamento, comentário, vínculo de chamado ou exclusão de tarefa. Em tarefas, a checagem de responsável é a autorização de atribuição descrita acima, não uma autorização de acesso ou propriedade; um usuário autenticado pode alcançar as demais operações se passar pelas validações do controller.
- `ProjetoService` não valida o `ResponsavelId` enviado no cadastro/atualização; a referência é persistida como identificador lógico.
- Vários campos de identidade vêm do payload quando não estão vazios: `CriadorId`, `UsuarioAlteracao` e `AutorId` podem ser enviados pelo cliente. O servidor não os força de forma universal ao claim atual.
- O perfil `F` recebe regras especiais de atribuição no serviço, mas `MapearPerfil` não o mapeia para um papel JWT específico.
- No frontend, `AuthService.hasRole` considera `F` como papel especial (`user.perfil === 'F'`), embora o JWT emitido pelo backend não receba o papel `F`; essa é uma divergência entre autorização visual e claims do backend.
- `adminGuard` é proteção de navegação no frontend; a proteção efetiva continua sendo os `[Authorize]` do backend.

## Conflitos de agenda

**Situação: implementada no serviço, com lacunas de concorrência e participantes.**

- A sobreposição usa intervalos semiabertos: `inicio < fimExistente` e `fimExistente > inicio`. Eventos que apenas se tocam no limite não conflitam.
- Para dia inteiro sem `DataFim`, o fim efetivo é o início do dia seguinte; para evento pontual sem fim, o fim efetivo é o próprio início.
- A checagem é feita para o `OperadorId` responsável. Ela não é feita para cada participante.
- `ListarEventosAsync` filtra intervalo, responsável e função, mas não filtra `Visibilidade`; `ObterEventoAsync` também não verifica visibilidade nem propriedade. Assim, `AgendaItem.Visibilidade` é persistido, porém eventos privados podem ser listados ou obtidos por qualquer usuário autenticado. A restrição de responsável/admin existe apenas nas mutações de alterar, mover e excluir.
- `Férias` exige retorno em data posterior e é normalizada como dia inteiro; `Treinamento`/`Daily` não permitem dia inteiro e exigem horário; `Reunião`/`Atendimento` também exigem horário e não permitem span de vários dias; `Pessoal`, `Outro` e ausência de tipo ficam livres.
- Criar, atualizar e mover devolvem `409` quando há conflito, com `mensagem`, lista `conflitos` e `code` (por padrão `CONFLICT_HORARIOS`). O lote valida cada ocorrência antes de salvar.
- Não há restrição de banco que impeja duas requisições concorrentes de criarem sobreposição; a validação é de aplicação. O lote também não demonstra transação atômica entre a validação e a gravação.

## Código global de projeto `PRJ`

**Situação: parcial; é global, mas não é uma sequência segura para concorrência.**

- `ProximoCodigoAsync` lê todos os códigos `IMPL_Projeto` que começam com `PRJ-`, extrai o sufixo numérico, encontra o maior e devolve `PRJ-` com quatro dígitos.
- O código é gerado no serviço de criação, sem escopo por cliente, tipo, equipe ou usuário. A rota `GET /api/v1/implantacao/projetos/proximo-codigo` apenas mostra a prévia.
- `PRJ_Codigo` possui índice único no modelo. Ainda assim, duas criações simultâneas podem calcular o mesmo sufixo; o índice pode rejeitar uma delas em vez de garantir nova geração.
- O campo `TipoProjeto.ClienteObrigatorio` existe, mas `ProjetoService.CriarAsync` não verifica esse sinalizador quando `ClienteId` é ausente. Não documentar “cliente obrigatório” como regra aplicada.

## Dados sensíveis

**Situação: parcial; há controles, mas a superfície de dados é ampla.**

- Empresas de Acessos vêm do Google Sheets, não de `AppDbContext`. O serviço usa API quando configurada e tenta exportação CSV como alternativa; mantém cache de dez minutos e não implementa escrita.
- `GET /api/v1/acessos` só lista nome e id. `POST /api/v1/acessos/visualizar` exige Bearer e revalidação da senha do operador (cache de cinco minutos) e então devolve campos de acesso, banco, VPN e observações. O DTO não mascara esses campos.
- A visualização registra `AuditoriaAcessos` com operador, empresa, data/hora, IP e user-agent; falha de auditoria é registrada no log, mas não impede a resposta.
- O Database Explorer usa uma conexão SQL separada, configurada por variáveis de ambiente ou seção `DatabaseExplorer`. O DTO de configuração mascara a senha, porém todos os endpoints são apenas `Authorize`, sem papel específico; endpoints de procedimentos e gatilhos podem devolver o corpo completo.
- O `RagProxyService` usa configuração externa do AnythingLLM e pode habilitar resposta simulada. A rota é autenticada, mas o serviço não deve ser considerado uma fronteira de sigilo para conteúdo externo.
- Há valores de desenvolvimento preenchidos em [appsettings.Development.json](../backend/Central_BackEnd/appsettings.Development.json), incluindo chaves de configuração sensíveis. Este documento não os reproduz; mova-os para ambiente/user-secrets e rotacione qualquer valor real usado.

## Divergências e correções sugeridas

As correções abaixo não foram implementadas; são pontos de atenção verificados no código.

| Achado | Correção sugerida |
|---|---|
| `cc_refresh` com `Secure=false` | habilitar `Secure` em HTTPS e validar o comportamento local sem expor o cookie em trânsito. |
| Refresh, cache de validação e defesa contra força bruta têm controles em memória | avaliar estado compartilhado, rotação de chaves e impacto entre instâncias. |
| `Admin`/`PerfilId` não coincidem com claims emitidas | centralizar a autorização administrativa e testar admin, suporte e perfil F. |
| `F` é papel especial no `hasRole` do frontend, mas não é papel JWT emitido | alinhar a autorização de frontend e backend antes de tratar `F` como papel garantido. |
| Identidade pode ser aceita pelo payload | derivar autor, criador e usuário de alteração do claim, ignorando campos do cliente. |
| Tarefa–agenda não tem vínculo/regra de concorrência | adicionar idempotência, transação e teste de corrida, ou declarar a sincronização como apenas melhor esforço. |
| Agenda persiste `Visibilidade`, mas leituras não a filtram | aplicar a visibilidade e a autorização de leitura no serviço ou registrar a exposição como limitação aceita. |
| Alerta “Bloqueadas” não usa `Bloqueada` | corrigir a consulta ou renomear o alerta. |
| `ClienteObrigatorio` não é validado | implementar a regra ou retirar o campo da descrição de negócio. |
| Configuração de desenvolvimento contém segredos potenciais | externalizar, rotacionar e não redistribuir o arquivo preenchido. |

**Planejados/recomendados:** não há implementação confirmada para propriedade estrita por projeto/tarefa, hash de senha adaptativo, criptografia dos dados retornados por Acessos ou proteção por papel no Database Explorer. Esses itens só podem ser marcados como planejados após decisão de produto/segurança.

## Contagens e fatos confirmados

- A fórmula de atraso de tarefa usa `DataEntrega ?? DataPrevisao`; a comparação de atraso de projeto exige `Projeto.DataPrevisao` anterior a `DateTime.Today` e exclui `Concluido`/`Cancelado`.
- O refresh é rotacionado, revogado e substituído; o cookie chama-se `cc_refresh`, o campo JSON permanece presente como `refreshToken: ""` e o token de acesso fica em memória no frontend.
- A criação/edição de tarefa verifica o responsável principal; a lista `ResponsavelIds` não tem uma autorização uniforme entre os dois fluxos.
- `F` não é papel JWT, embora `hasRole` do frontend o trate como papel especial.
- A agenda valida conflito do responsável e retorna `409`; não valida conflitos de participantes, não filtra `Visibilidade` e não restringe propriedade nas leituras.
- A sincronização tarefa–agenda é chamada na mudança de coluna e não é bidirecional.
- O código de projeto é global, começa por `PRJ-` e termina com quatro dígitos; não há sequência transacional.
- A etapa do projeto é obrigatória na tarefa com projeto e precisa pertencer a ele; etapa sem projeto é rejeitada na criação e zera na atualização de tarefa sem projeto; o `PUT` de tarefa não altera o projeto. Essa regra é executada pelo serviço e **não tem suíte de testes no backend**: a cobertura automatizada existente em [`tarefa-form.component.spec.ts`](../frontend/src/app/features/implantacao/pages/tarefas/tarefa-form.component.spec.ts) exercita somente o gating e o payload do cliente, não a validação do serviço.
- Nenhuma regra de UI foi inferida; as correções listadas são apenas recomendações.

