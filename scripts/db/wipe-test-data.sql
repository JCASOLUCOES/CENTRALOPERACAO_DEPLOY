/* ============================================================================
   WIPE-TEST-DATA — Limpeza total para testes (base limpa)
   Banco alvo: Central_Conhecimento (SQL Server)
   Execute de uma máquina com acesso ao banco: SSMS ou
     sqlcmd -S <servidor> -d Central_Conhecimento -E -C -i wipe-test-data.sql

   APAGA   : projetos, etapas de projeto (+checklist/docs/histórico/
             comentários), tarefas (+responsáveis/chamados/apontamentos/
             comentários), agenda (+participantes) e auditoria.
   PRESERVA: tipos de projeto, etapas-base, colunas kanban, tipos de evento,
             operadores, funções, clientes, tabelas legadas (tbchamado,
             tbcliente, tbfuncionario) e auth (tokens/auditoria de acesso).
   RESEED  : IDENTITY das tabelas limpas volta a 0 (IDs recomeçam do 1).
             Códigos PRJ-0001 recomeçam sozinhos (geração MAX-based).

   !!! FAÇA BACKUP DO BANCO ANTES (BACKUP DATABASE) — irreversível sem ele.
   ============================================================================ */

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRY
    BEGIN TRAN;

    PRINT '--- CONTAGEM ANTES ---';
    SELECT 'IMPL_Projeto' AS tabela, COUNT(*) AS qtd FROM dbo.IMPL_Projeto
    UNION ALL SELECT 'tbprojetoEtapa', COUNT(*) FROM dbo.tbprojetoEtapa
    UNION ALL SELECT 'IMPL_Tarefa', COUNT(*) FROM dbo.IMPL_Tarefa
    UNION ALL SELECT 'IMPL_Agenda', COUNT(*) FROM dbo.IMPL_Agenda
    UNION ALL SELECT 'IMPL_Auditoria', COUNT(*) FROM dbo.IMPL_Auditoria;

    PRINT '--- APAGANDO (ordem FK-segura: filhos -> pais) ---';
    DELETE FROM dbo.CC_AgendaParticipante;
    DELETE FROM dbo.IMPL_Agenda;

    DELETE FROM dbo.IMPL_TarefaResponsavel;
    DELETE FROM dbo.IMPL_TarefaChamado;
    DELETE FROM dbo.IMPL_TarefaApontamento;
    DELETE FROM dbo.IMPL_ComentarioTarefa;
    DELETE FROM dbo.IMPL_Tarefa;

    DELETE FROM dbo.tbprojetoEtapaChecklist;
    DELETE FROM dbo.tbprojetoEtapaDocumento;
    DELETE FROM dbo.tbprojetoEtapaHistorico;
    DELETE FROM dbo.tbprojetoEtapaComentario;
    DELETE FROM dbo.tbprojetoEtapa;
    DELETE FROM dbo.IMPL_Projeto;

    DELETE FROM dbo.IMPL_Auditoria;

    PRINT '--- RESEED IDENTITY ---';
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.CC_AgendaParticipante')) DBCC CHECKIDENT ('dbo.CC_AgendaParticipante', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_Agenda')) DBCC CHECKIDENT ('dbo.IMPL_Agenda', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_TarefaApontamento')) DBCC CHECKIDENT ('dbo.IMPL_TarefaApontamento', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_ComentarioTarefa')) DBCC CHECKIDENT ('dbo.IMPL_ComentarioTarefa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_Tarefa')) DBCC CHECKIDENT ('dbo.IMPL_Tarefa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoEtapaChecklist')) DBCC CHECKIDENT ('dbo.tbprojetoEtapaChecklist', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoEtapaDocumento')) DBCC CHECKIDENT ('dbo.tbprojetoEtapaDocumento', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoEtapaHistorico')) DBCC CHECKIDENT ('dbo.tbprojetoEtapaHistorico', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoEtapaComentario')) DBCC CHECKIDENT ('dbo.tbprojetoEtapaComentario', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoEtapa')) DBCC CHECKIDENT ('dbo.tbprojetoEtapa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_Projeto')) DBCC CHECKIDENT ('dbo.IMPL_Projeto', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.IMPL_Auditoria')) DBCC CHECKIDENT ('dbo.IMPL_Auditoria', RESEED, 0);

    PRINT '--- CONTAGEM DEPOIS (esperado: tudo 0) ---';
    SELECT 'IMPL_Projeto' AS tabela, COUNT(*) AS qtd FROM dbo.IMPL_Projeto
    UNION ALL SELECT 'tbprojetoEtapa', COUNT(*) FROM dbo.tbprojetoEtapa
    UNION ALL SELECT 'IMPL_Tarefa', COUNT(*) FROM dbo.IMPL_Tarefa
    UNION ALL SELECT 'IMPL_Agenda', COUNT(*) FROM dbo.IMPL_Agenda
    UNION ALL SELECT 'IMPL_Auditoria', COUNT(*) FROM dbo.IMPL_Auditoria;

    PRINT '--- PRESERVADOS (devem continuar populados) ---';
    SELECT 'IMPL_TipoProjeto' AS tabela, COUNT(*) AS qtd FROM dbo.IMPL_TipoProjeto
    UNION ALL SELECT 'IMPL_Etapa', COUNT(*) FROM dbo.IMPL_Etapa
    UNION ALL SELECT 'IMPL_ColunaKanban', COUNT(*) FROM dbo.IMPL_ColunaKanban
    UNION ALL SELECT 'CC_TipoEvento', COUNT(*) FROM dbo.CC_TipoEvento;

    COMMIT;
    PRINT 'WIPE CONCLUÍDO COM SUCESSO.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT 'ERRO — ROLLBACK EXECUTADO.';
    THROW;
END CATCH;
