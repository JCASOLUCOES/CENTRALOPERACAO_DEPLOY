-- ============================================================================
--  conferencia-padrao-tb.sql
--  Confere a contagem de linhas e a estrutura para validar o padrao de
--  nomenclatura tb* (prefixo "tb" + nome da entidade em minusculas, colado).
--
--  Como usar:
--    ANTES  -> sqlcmd ... -i conferencia-padrao-tb.sql -o antes.txt
--    DEPOIS -> sqlcmd ... -i conferencia-padrao-tb.sql -o depois.txt
--    Comparar as secoes 1 e 2: as contagens NAO podem ter mudado.
--
--  Nao grava nada no banco: somente SELECT. Seguro para rodar em homolog.
--  Aceita os nomes antigos (IMPL_*/CC_*) e os novos (tb*), por isso o mesmo
--  arquivo serve antes e depois da migration PadraoTabelasTb.
-- ============================================================================

SET NOCOUNT ON;

-- Logico -> nome antigo -> nome novo. Resolve qual existe no banco agora.
IF OBJECT_ID('tempdb..#tbMapa') IS NOT NULL DROP TABLE #tbMapa;
CREATE TABLE #tbMapa (ordem int IDENTITY(1,1), logico varchar(60), antigo varchar(60), novo varchar(60));
INSERT INTO #tbMapa (logico, antigo, novo) VALUES
    ('agenda',                'IMPL_Agenda',              'tbagenda'),
    ('agenda_participante',   'CC_AgendaParticipante',    'tbagendaparticipante'),
    ('auditoria_acesso',      'AuditoriaAcessos',         'tbauditoriaacesso'),
    ('auditoria_implantacao', 'IMPL_Auditoria',           'tbauditoriaimplantacao'),
    ('coluna_kanban',         'IMPL_ColunaKanban',        'tbcolunakanban'),
    ('comentario_tarefa',     'IMPL_ComentarioTarefa',    'tbcomentariotarefa'),
    ('funcao',                'CC_Funcao',                'tbfuncao'),
    ('projeto',               'IMPL_Projeto',             'tbprojeto'),
    ('projeto_etapa',         'tbprojetoEtapa',           'tbprojetoetapa'),
    ('projeto_etapa_coment',  'tbprojetoEtapaComentario', 'tbprojetoetapacomentario'),
    ('projeto_etapa_doc',     'tbprojetoEtapaDocumento',  'tbprojetoetapadocumento'),
    ('projeto_etapa_check',   'tbprojetoEtapaChecklist',  'tbprojetoetapachecklist'),
    ('projeto_etapa_hist',    'tbprojetoEtapaHistorico',  'tbprojetoetahistorico'),
    ('refresh_token',         'RefreshTokens',            'tbrefreshtoken'),
    ('tarefa',                'IMPL_Tarefa',              'tbtarefa'),
    ('tarefa_apontamento',    'IMPL_TarefaApontamento',   'tbtarefaapontamento'),
    ('tarefa_chamado',        'IMPL_TarefaChamado',       'tbtarefachamado'),
    ('tarefa_responsavel',    'IMPL_TarefaResponsavel',   'tbtarefareponsavel'),
    ('tipo_projeto',          'IMPL_TipoProjeto',         'tbtipoprojeto'),
    ('tipo_evento',           'CC_TipoEvento',            'tbtipoevento');

PRINT '=== 1. CONTAGEM DE LINHAS (logico | tabela encontrada | linhas) ===';
DECLARE @logico varchar(60), @atual varchar(60), @sql nvarchar(max), @i int = 1;
WHILE @i <= (SELECT COUNT(*) FROM #tbMapa)
BEGIN
    SELECT @logico = logico, @atual = COALESCE(
        (SELECT t.name FROM sys.tables t WHERE t.name = N'' + (SELECT novo  FROM #tbMapa m WHERE m.ordem = @i) ),
        (SELECT t.name FROM sys.tables t WHERE t.name = N'' + (SELECT antigo FROM #tbMapa m WHERE m.ordem = @i) ))
    FROM #tbMapa WHERE ordem = @i;

    IF @atual IS NULL
        PRINT '  ' + @logico + ' | (ausente) | -';
    ELSE
    BEGIN
        SET @sql = N'SELECT ''  ' + @logico + ' | ' + @atual + ' | '' + CAST(COUNT_BIG(*) AS varchar(30)) FROM dbo.' + QUOTENAME(@atual) + ';';
        EXEC sp_executesql @sql;
    END
    SET @i = @i + 1;
END

PRINT '';
PRINT '=== 2. NOMES ANTIGOS QUE AINDA EXISTEM (esperado: ZERO linhas) ===';
SELECT t.name AS nome_antigo
FROM sys.tables AS t
WHERE t.is_ms_shipped = 0
  AND (   t.name LIKE 'IMPL[_]%'
       OR t.name LIKE 'CC[_]%'
       OR t.name IN ('RefreshTokens', 'AuditoriaAcessos') )
ORDER BY t.name;

PRINT '';
PRINT '=== 3. TABELAS QUE DEVEM SUMIR (esperado: ZERO linhas) ===';
SELECT t.name AS tabela_removida
FROM sys.tables AS t
WHERE t.is_ms_shipped = 0
  AND t.name IN ('IMPL_Cliente', 'CC_Funcao', 'AgendaEvento', 'AgendaEventoParticipante')
ORDER BY t.name;

PRINT '';
PRINT '=== 4. tbfuncao (unificada com a legada) ===';
-- CLASSIFICACAO/ATIVO so existem depois da migration PadraoTabelasTb.
-- sp_executesql e obrigatorio: sem ele o SQL Server compila o lote inteiro
-- e falha com "Nome de coluna invalido" mesmo dentro de IF/ELSE.
IF COL_LENGTH('dbo.tbfuncao', 'CLASSIFICACAO') IS NULL
    PRINT '  (ainda sem CLASSIFICACAO/ATIVO - migration PadraoTabelasTb nao aplicada)';
ELSE
    EXEC sp_executesql N'SELECT FUNCAO_ID, DESCRICAO, CLASSIFICACAO, ATIVO FROM dbo.tbfuncao ORDER BY FUNCAO_ID;';

PRINT '';
PRINT '=== 5. FKs QUE APONTAM PARA AS TABELAS RENOMEADAS (as FKs devem acompanhar) ===';
SELECT OBJECT_NAME(fk.parent_object_id)     AS tabela_filho,
       fk.name                              AS nome_fk,
       OBJECT_NAME(fk.referenced_object_id) AS tabela_pai
FROM sys.foreign_keys AS fk
WHERE fk.referenced_object_id IN (
        SELECT object_id FROM sys.tables
        WHERE name LIKE 'tbprojet%' OR name LIKE 'tbtarefa%' OR name LIKE 'tbagenda%'
           OR name LIKE 'tbcolunakanban' OR name LIKE 'tbtipoprojeto' OR name LIKE 'tbfuncao'
           OR name LIKE 'tbtipoevento' OR name LIKE 'tboperador')
ORDER BY tabela_pai, tabela_filho;

PRINT '';
PRINT '=== 6. TABELAS SEM PREFIXO tb (fora do padrao, para conferencia) ===';
SELECT t.name AS tabela
FROM sys.tables AS t
WHERE t.is_ms_shipped = 0
  AND t.name NOT LIKE 'tb%'
ORDER BY t.name;
