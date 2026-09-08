-- ============================================================================
-- SCRIPT DE SEED: 2 projetos fakes para homologacao
-- Banco: dbBUSINESS_HML (192.168.2.154)
-- Pre-requisito: rodar Migrations/Sql/ImplantacaoInit.sql antes
-- ============================================================================

PRINT 'Iniciando seed IMPLANTACAO/PROJETOS...';

-- 1. EQUIPES
IF NOT EXISTS (SELECT 1 FROM IMPL_Equipe WHERE EQP_Nome = 'IMPLANTACAO')
BEGIN
  INSERT IMPL_Equipe (EQP_Nome, EQP_Descricao, EQP_PrefixoCodigo, EQP_Ativa, EQP_UsuarioInclusao, EQP_DataInclusao)
  VALUES ('IMPLANTACAO', 'Equipe responsavel por implantacoes em clientes', 'IMP', 1, 'admin', GETDATE());
END
IF NOT EXISTS (SELECT 1 FROM IMPL_Equipe WHERE EQP_Nome = 'CIAA')
BEGIN
  INSERT IMPL_Equipe (EQP_Nome, EQP_Descricao, EQP_PrefixoCodigo, EQP_Ativa, EQP_UsuarioInclusao, EQP_DataInclusao)
  VALUES ('CIAA', 'Centro de Inovacao, Automacao e IA', 'CIAA', 1, 'admin', GETDATE());
END

DECLARE @eqImpl INT = (SELECT TOP 1 EQP_Id FROM IMPL_Equipe WHERE EQP_Nome = 'IMPLANTACAO');
DECLARE @eqCiaa INT = (SELECT TOP 1 EQP_Id FROM IMPL_Equipe WHERE EQP_Nome = 'CIAA');

-- 2. COLUNAS KANBAN
IF NOT EXISTS (SELECT 1 FROM IMPL_ColunaKanban WHERE CLK_Nome = 'BACKLOG')
BEGIN
  INSERT IMPL_ColunaKanban (CLK_Nome, CLK_Ordem, CLK_Cor, CLK_Padrao, CLK_Ativa, CLK_UsuarioInclusao, CLK_DataInclusao) VALUES
    ('BACKLOG',        1, '#94a3b8', 1, 1, 'admin', GETDATE()),
    ('A FAZER',        2, '#60a5fa', 1, 1, 'admin', GETDATE()),
    ('EM ANDAMENTO',   3, '#fbbf24', 1, 1, 'admin', GETDATE()),
    ('HOMOLOGACAO',    4, '#a78bfa', 1, 1, 'admin', GETDATE()),
    ('CONCLUIDO',      5, '#34d399', 1, 1, 'admin', GETDATE());
END

DECLARE @colBacklog INT = (SELECT TOP 1 CLK_Id FROM IMPL_ColunaKanban WHERE CLK_Nome = 'BACKLOG');
DECLARE @colAFazer INT = (SELECT TOP 1 CLK_Id FROM IMPL_ColunaKanban WHERE CLK_Nome = 'A FAZER');
DECLARE @colAndamento INT = (SELECT TOP 1 CLK_Id FROM IMPL_ColunaKanban WHERE CLK_Nome = 'EM ANDAMENTO');
DECLARE @colHomologacao INT = (SELECT TOP 1 CLK_Id FROM IMPL_ColunaKanban WHERE CLK_Nome = 'HOMOLOGACAO');
DECLARE @colConcluido INT = (SELECT TOP 1 CLK_Id FROM IMPL_ColunaKanban WHERE CLK_Nome = 'CONCLUIDO');

-- 3. TIPOS DE PROJETO
IF NOT EXISTS (SELECT 1 FROM IMPL_TipoProjeto WHERE TPP_Codigo = 'CLIENTE')
BEGIN
  INSERT IMPL_TipoProjeto (TPP_Codigo, TPP_Nome, TPP_EquipeId, TPP_ClienteObrigatorio, TPP_Ordem, TPP_Ativo, TPP_UsuarioInclusao, TPP_DataInclusao) VALUES
    ('CLIENTE',      'Cliente',     @eqImpl, 1, 1, 1, 'admin', GETDATE()),
    ('CARTEIRA',     'Carteira',    @eqImpl, 1, 2, 1, 'admin', GETDATE()),
    ('INTEGRACAO',   'Integracao',  @eqImpl, 1, 3, 1, 'admin', GETDATE()),
    ('PROJETO_CIAA', 'Projeto CIAA', @eqCiaa, 0, 1, 1, 'admin', GETDATE());
END

DECLARE @tipoClienteId INT = (SELECT TOP 1 TPP_Id FROM IMPL_TipoProjeto WHERE TPP_Codigo = 'CLIENTE');
DECLARE @tipoCiaaId INT = (SELECT TOP 1 TPP_Id FROM IMPL_TipoProjeto WHERE TPP_Codigo = 'PROJETO_CIAA');

-- 4. ETAPAS
IF NOT EXISTS (SELECT 1 FROM IMPL_Etapa WHERE ETP_Nome = 'KICKOFF')
BEGIN
  INSERT IMPL_Etapa (ETP_Nome, ETP_Ordem, ETP_TipoProjetoId, ETP_Concluida, ETP_Cor, ETP_Ativa, ETP_UsuarioInclusao, ETP_DataInclusao) VALUES
    ('KICKOFF',         1, @tipoClienteId, 0, '#0f4c81', 'admin', GETDATE()),
    ('PARAMETRIZACAO',  2, @tipoClienteId, 0, '#2563eb', 'admin', GETDATE()),
    ('TREINAMENTO',     3, @tipoClienteId, 0, '#0ea5e9', 'admin', GETDATE()),
    ('HOMOLOGACAO',     4, @tipoClienteId, 0, '#7c3aed', 'admin', GETDATE()),
    ('GO LIVE',         5, @tipoClienteId, 0, '#16a34a', 'admin', GETDATE()),
    ('ACEITE',          6, @tipoClienteId, 0, '#15803d', 'admin', GETDATE()),
    ('LEVANTAMENTO',    1, @tipoCiaaId,   0, '#7c3aed', 'admin', GETDATE()),
    ('DESENHO',         2, @tipoCiaaId,   0, '#a855f7', 'admin', GETDATE()),
    ('DESENVOLVIMENTO', 3, @tipoCiaaId,   0, '#d97706', 'admin', GETDATE()),
    ('TESTES',          4, @tipoCiaaId,   0, '#0891b2', 'admin', GETDATE()),
    ('PUBLICACAO',      6, @tipoCiaaId,   0, '#16a34a', 'admin', GETDATE()),
    ('MONITORAMENTO',   7, @tipoCiaaId,   0, '#0d9488', 'admin', GETDATE());
END

DECLARE @etapaKickoff INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'KICKOFF');
DECLARE @etapaParam INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'PARAMETRIZACAO');
DECLARE @etapaTreinam INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'TREINAMENTO');
DECLARE @etapaHomolog INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'HOMOLOGACAO');
DECLARE @etapaGoLive INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'GO LIVE');
DECLARE @etapaLevant INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'LEVANTAMENTO');
DECLARE @etapaDesenho INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'DESENHO');
DECLARE @etapaDesenv INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'DESENVOLVIMENTO');
DECLARE @etapaTestes INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'TESTES');
DECLARE @etapaPublic INT = (SELECT TOP 1 ETP_Id FROM IMPL_Etapa WHERE ETP_Nome = 'PUBLICACAO');

-- 5. CLIENTES
IF NOT EXISTS (SELECT 1 FROM IMPL_Cliente WHERE CLI_Nome = 'Tech Solutions S/A')
BEGIN
  INSERT IMPL_Cliente (CLI_Nome, CLI_Cnpj, CLI_Contato, CLI_Observacao, CLI_Ativo, CLI_UsuarioInclusao, CLI_DataInclusao) VALUES
    ('Tech Solutions S/A',     '12.345.678/0001-90', 'contato@techsolutions.com.br', 'Cliente do segmento de tecnologia. Contrato de 36 meses.', 1, 'admin', GETDATE()),
    ('Indústria Aurora Ltda',  '98.765.432/0001-10', 'implantacao@aurora.ind.br',  'Foco em módulos de cobrança. Implantação em fases.',       1, 'admin', GETDATE()),
    ('Grupo Vértice',          '11.222.333/0001-44', 'ti@vertice.com',              'Cliente novo, em fase de kickoff.',                        1, 'admin', GETDATE());
END

DECLARE @clienteTech INT = (SELECT TOP 1 CLI_Id FROM IMPL_Cliente WHERE CLI_Nome = 'Tech Solutions S/A');

-- 6. PROJETO IMP-0001
IF NOT EXISTS (SELECT 1 FROM IMPL_Projeto WHERE PRJ_Codigo = 'IMP-0001')
BEGIN
  INSERT IMPL_Projeto (
    PRJ_Codigo, PRJ_Nome, PRJ_Descricao,
    PRJ_EquipeId, PRJ_TipoProjetoId, PRJ_ClienteId,
    PRJ_ResponsavelId, PRJ_CriadorId,
    PRJ_Status, PRJ_ColunaKanbanId, PRJ_Prioridade, PRJ_Progresso,
    PRJ_DataInicio, PRJ_DataPrevisao, PRJ_HorasPlanejadas, PRJ_HorasRealizadas,
    PRJ_Observacao, PRJ_UsuarioInclusao, PRJ_DataInclusao
  ) VALUES (
    'IMP-0001', 'Implantação Tech Solutions S/A',
    'Implantação completa do Actyon no cliente Tech Solutions.\n\nFases: kickoff → parametrização → treinamento → homologação → go live.\nEscopo inclui 3 carteiras (Cobrança, Financeiro, RH) e 2 integrações bancárias.',
    @eqImpl, @tipoClienteId, @clienteTech,
    'admin', 'admin',
    2, @colAndamento, 2, 60,
    DATEADD(DAY, -45, GETDATE()), DATEADD(DAY, 20, GETDATE()), 320, 192,
    'Cliente receptivo. Parametrização avançando bem. Próximo: agendar treinamento com a equipe financeira.',
    'admin', DATEADD(DAY, -45, GETDATE())
  );

  DECLARE @p1 INT = SCOPE_IDENTITY();

  INSERT IMPL_Tarefa (TRF_ProjetoId, TRF_EtapaId, TRF_ColunaKanbanId, TRF_Ordem, TRF_Titulo, TRF_Descricao, TRF_ResponsavelId, TRF_CriadorId, TRF_Status, TRF_Prioridade, TRF_DataPrevisao, TRF_DataConclusao, TRF_HorasEstimadas, TRF_HorasRealizadas, TRF_Bloqueada, TRF_MotivoBloqueio, TRF_UsuarioInclusao, TRF_DataInclusao) VALUES
    (@p1, @etapaKickoff,  @colConcluido, 1, 'Kickoff com a diretoria', 'Alinhamento de objetivos, cronograma e stakeholders do projeto.', 'admin', 'admin', 4, 2, DATEADD(DAY, -40, GETDATE()), DATEADD(DAY, -42, GETDATE()), 8, 8, 0, NULL, 'admin', DATEADD(DAY, -45, GETDATE())),
    (@p1, @etapaParam,    @colConcluido, 2, 'Levantar parâmetros da carteira de cobrança', 'Mapear regras de negócio: faixas de atraso, juros, descontos, distribuição.', 'admin', 'admin', 4, 2, DATEADD(DAY, -25, GETDATE()), DATEADD(DAY, -22, GETDATE()), 24, 28, 0, NULL, 'admin', DATEADD(DAY, -40, GETDATE())),
    (@p1, @etapaParam,    @colConcluido, 3, 'Importar títulos iniciais (abertura)', 'Carga inicial de 2.500 títulos via planilha de migração.', 'admin', 'admin', 4, 1, DATEADD(DAY, -15, GETDATE()), DATEADD(DAY, -12, GETDATE()), 12, 10, 0, NULL, 'admin', DATEADD(DAY, -30, GETDATE())),
    (@p1, @etapaParam,    @colAndamento, 4, 'Configurar integrações com Sicoob e Caixa', 'Homologar remessa CNAB 240 e retorno. Validar arquivos com o banco.', 'admin', 'admin', 2, 3, DATEADD(DAY, -3, GETDATE()), NULL, 40, 28, 1, 'Aguardando retorno do banco sobre layout do arquivo de retorno.', 'admin', DATEADD(DAY, -15, GETDATE())),
    (@p1, @etapaTreinam,  @colAFazer,    5, 'Agendar treinamento com equipe financeira', '2 turmas, 4h cada, focadas em carteira de cobrança e fechamento diário.', 'admin', 'admin', 1, 2, DATEADD(DAY, 10, GETDATE()), NULL, 16, NULL, 0, NULL, 'admin', DATEADD(DAY, -5, GETDATE())),
    (@p1, @etapaHomolog,  @colAFazer,    6, 'Homologar fluxo completo com cliente', 'Roda 5 títulos do início ao fim, com cliente acompanhando.', 'admin', 'admin', 1, 1, DATEADD(DAY, 15, GETDATE()), NULL, 12, NULL, 0, NULL, 'admin', DATEADD(DAY, -5, GETDATE())),
    (@p1, @etapaGoLive,   @colBacklog,   7, 'Definir data do go live', 'Confirmar com diretoria a data de entrada em produção.', 'admin', 'admin', 1, 1, DATEADD(DAY, 20, GETDATE()), NULL, 4, NULL, 0, NULL, 'admin', DATEADD(DAY, -2, GETDATE()));

  DECLARE @t1 INT = (SELECT TOP 1 TRF_Id FROM IMPL_Tarefa WHERE TRF_Titulo = 'Kickoff com a diretoria' AND TRF_ProjetoId = @p1);
  DECLARE @t4 INT = (SELECT TOP 1 TRF_Id FROM IMPL_Tarefa WHERE TRF_Titulo = 'Configurar integrações com Sicoob e Caixa' AND TRF_ProjetoId = @p1);

  INSERT IMPL_ComentarioTarefa (CMT_TarefaId, CMT_AutorId, CMT_Texto, CMT_DataInclusao) VALUES
    (@t1, 'admin', 'Cliente aprovou cronograma. Stakeholders definidos: CFO (patrocinador), Controller (gestor), 2 analistas (operadores).', DATEADD(DAY, -42, GETDATE())),
    (@t4, 'admin', 'Sicoob enviou layout do CNAB 240 em 02/09. Iniciando homologação do arquivo de remessa. Retorno ainda pendente — aberto chamado #4521 com o banco.', DATEADD(DAY, -1, GETDATE()));
END

-- 7. PROJETO CIAA-0001
IF NOT EXISTS (SELECT 1 FROM IMPL_Projeto WHERE PRJ_Codigo = 'CIAA-0001')
BEGIN
  INSERT IMPL_Projeto (
    PRJ_Codigo, PRJ_Nome, PRJ_Descricao,
    PRJ_EquipeId, PRJ_TipoProjetoId, PRJ_ClienteId,
    PRJ_ResponsavelId, PRJ_CriadorId,
    PRJ_Status, PRJ_ColunaKanbanId, PRJ_Prioridade, PRJ_Progresso,
    PRJ_DataInicio, PRJ_DataPrevisao, PRJ_HorasPlanejadas, PRJ_HorasRealizadas,
    PRJ_Observacao, PRJ_UsuarioInclusao, PRJ_DataInclusao
  ) VALUES (
    'CIAA-0001', 'Agente IA — Classificação de Chamados',
    'Projeto de automação com IA para classificar e rotear chamados automaticamente.\n\nObjetivo: reduzir tempo de triagem em 60% e melhorar a assertividade do primeiro atendimento.\nStack: n8n + API Actyon + prompt engineering + integração com sistema de tickets.',
    @eqCiaa, @tipoCiaaId, NULL,
    'admin', 'admin',
    2, @colAndamento, 2, 35,
    DATEADD(DAY, -30, GETDATE()), DATEADD(DAY, 45, GETDATE()), 200, 70,
    'MVP em validação. Prompt principal com acurácia de 78% em testes.',
    'admin', DATEADD(DAY, -30, GETDATE())
  );

  DECLARE @p2 INT = SCOPE_IDENTITY();

  INSERT IMPL_Tarefa (TRF_ProjetoId, TRF_EtapaId, TRF_ColunaKanbanId, TRF_Ordem, TRF_Titulo, TRF_Descricao, TRF_ResponsavelId, TRF_CriadorId, TRF_Status, TRF_Prioridade, TRF_DataPrevisao, TRF_DataConclusao, TRF_HorasEstimadas, TRF_HorasRealizadas, TRF_Bloqueada, TRF_MotivoBloqueio, TRF_UsuarioInclusao, TRF_DataInclusao) VALUES
    (@p2, @etapaLevant, @colConcluido, 1, 'Mapear categorias de chamados dos últimos 6 meses', 'Amostra de 2.000 chamados para identificar padrões de classificação.', 'admin', 'admin', 4, 2, DATEADD(DAY, -25, GETDATE()), DATEADD(DAY, -23, GETDATE()), 16, 14, 0, NULL, 'admin', DATEADD(DAY, -30, GETDATE())),
    (@p2, @etapaDesenho, @colConcluido, 2, 'Definir arquitetura do agente (n8n + LLM)', 'Fluxo: webhook → LLM → classificação → router → ticket. Latência alvo: 3s.', 'admin', 'admin', 4, 2, DATEADD(DAY, -20, GETDATE()), DATEADD(DAY, -18, GETDATE()), 12, 14, 0, NULL, 'admin', DATEADD(DAY, -25, GETDATE())),
    (@p2, @etapaDesenv,  @colAndamento, 3, 'Implementar fluxo principal no n8n', 'Webhook + LLM + tratamento de erros + retry. Logs estruturados.', 'admin', 'admin', 2, 2, DATEADD(DAY, -5, GETDATE()), NULL, 40, 30, 0, NULL, 'admin', DATEADD(DAY, -20, GETDATE())),
    (@p2, @etapaDesenv,  @colAFazer,    4, 'Construir prompt com few-shot examples', 'Iterar prompt principal até atingir acurácia >85% em validação.', 'admin', 'admin', 1, 2, DATEADD(DAY, 5, GETDATE()), NULL, 20, NULL, 0, NULL, 'admin', DATEADD(DAY, -15, GETDATE())),
    (@p2, @etapaTestes,  @colAFazer,    5, 'Rodar suite de 200 chamados históricos', 'Comparar classificação do agente vs classificação humana (ground truth).', 'admin', 'admin', 1, 1, DATEADD(DAY, 20, GETDATE()), NULL, 16, NULL, 0, NULL, 'admin', DATEADD(DAY, -10, GETDATE())),
    (@p2, @etapaPublic,  @colBacklog,   6, 'Publicar agente em produção', 'Deploy com feature flag. Monitorar 1 semana antes de expandir.', 'admin', 'admin', 1, 1, DATEADD(DAY, 40, GETDATE()), NULL, 8, NULL, 0, NULL, 'admin', DATEADD(DAY, -5, GETDATE()));

  DECLARE @t10 INT = (SELECT TOP 1 TRF_Id FROM IMPL_Tarefa WHERE TRF_Titulo = 'Implementar fluxo principal no n8n' AND TRF_ProjetoId = @p2);

  INSERT IMPL_ComentarioTarefa (CMT_TarefaId, CMT_AutorId, CMT_Texto, CMT_DataInclusao) VALUES
    (@t10, 'admin', 'Acurácia subiu de 62% → 78% depois do ajuste no few-shot. Próximo passo: incluir mais exemplos negativos (chamados ambíguos).', DATEADD(DAY, -2, GETDATE()));
END

PRINT 'Seed IMPLANTACAO/PROJETOS aplicado com sucesso.';
GO
