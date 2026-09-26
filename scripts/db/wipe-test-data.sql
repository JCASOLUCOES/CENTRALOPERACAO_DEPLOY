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
    SELECT 'tbprojeto' AS tabela, COUNT(*) AS qtd FROM dbo.tbprojeto
    UNION ALL SELECT 'tbprojetoetapa', COUNT(*) FROM dbo.tbprojetoetapa
    UNION ALL SELECT 'tbtarefa', COUNT(*) FROM dbo.tbtarefa
    UNION ALL SELECT 'tbagenda', COUNT(*) FROM dbo.tbagenda
    UNION ALL SELECT 'tbauditoriaimplantacao', COUNT(*) FROM dbo.tbauditoriaimplantacao;

    PRINT '--- APAGANDO (ordem FK-segura: filhos -> pais) ---';
    DELETE FROM dbo.tbagendaparticipante;
    DELETE FROM dbo.tbagenda;

    DELETE FROM dbo.tbtarefareponsavel;
    DELETE FROM dbo.tbtarefachamado;
    DELETE FROM dbo.tbtarefaapontamento;
    DELETE FROM dbo.tbcomentariotarefa;
    DELETE FROM dbo.tbtarefa;

    DELETE FROM dbo.tbprojetoetapachecklist;
    DELETE FROM dbo.tbprojetoetapadocumento;
    DELETE FROM dbo.tbprojetoetahistorico;
    DELETE FROM dbo.tbprojetoetapacomentario;
    DELETE FROM dbo.tbprojetoetapa;
    DELETE FROM dbo.tbprojeto;

    DELETE FROM dbo.tbauditoriaimplantacao;

    PRINT '--- RESEED IDENTITY ---';
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbagendaparticipante')) DBCC CHECKIDENT ('dbo.tbagendaparticipante', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbagenda')) DBCC CHECKIDENT ('dbo.tbagenda', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbtarefaapontamento')) DBCC CHECKIDENT ('dbo.tbtarefaapontamento', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbcomentariotarefa')) DBCC CHECKIDENT ('dbo.tbcomentariotarefa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbtarefa')) DBCC CHECKIDENT ('dbo.tbtarefa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoetapachecklist')) DBCC CHECKIDENT ('dbo.tbprojetoetapachecklist', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoetapadocumento')) DBCC CHECKIDENT ('dbo.tbprojetoetapadocumento', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoetahistorico')) DBCC CHECKIDENT ('dbo.tbprojetoetahistorico', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoetapacomentario')) DBCC CHECKIDENT ('dbo.tbprojetoetapacomentario', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojetoetapa')) DBCC CHECKIDENT ('dbo.tbprojetoetapa', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbprojeto')) DBCC CHECKIDENT ('dbo.tbprojeto', RESEED, 0);
    IF EXISTS (SELECT 1 FROM sys.identity_columns WHERE object_id = OBJECT_ID('dbo.tbauditoriaimplantacao')) DBCC CHECKIDENT ('dbo.tbauditoriaimplantacao', RESEED, 0);

    PRINT '--- CONTAGEM DEPOIS (esperado: tudo 0) ---';
    SELECT 'tbprojeto' AS tabela, COUNT(*) AS qtd FROM dbo.tbprojeto
    UNION ALL SELECT 'tbprojetoetapa', COUNT(*) FROM dbo.tbprojetoetapa
    UNION ALL SELECT 'tbtarefa', COUNT(*) FROM dbo.tbtarefa
    UNION ALL SELECT 'tbagenda', COUNT(*) FROM dbo.tbagenda
    UNION ALL SELECT 'tbauditoriaimplantacao', COUNT(*) FROM dbo.tbauditoriaimplantacao;

    PRINT '--- PRESERVADOS (devem continuar populados) ---';
    SELECT 'tbtipoprojeto' AS tabela, COUNT(*) AS qtd FROM dbo.tbtipoprojeto
    UNION ALL SELECT 'tbcolunakanban', COUNT(*) FROM dbo.tbcolunakanban
    UNION ALL SELECT 'tbtipoevento', COUNT(*) FROM dbo.tbtipoevento
    UNION ALL SELECT 'tbfuncao', COUNT(*) FROM dbo.tbfuncao;

    COMMIT;
    PRINT 'WIPE CONCLUÍDO COM SUCESSO.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK;
    PRINT 'ERRO — ROLLBACK EXECUTADO.';
    THROW;
END CATCH;
