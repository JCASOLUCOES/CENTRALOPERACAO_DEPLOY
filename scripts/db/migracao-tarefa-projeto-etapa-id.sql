/* ============================================================================
   MIGRACAO TarefaProjetoEtapaId — Contador dinâmico de tarefas por etapa
   Equivalente manual da migration EF `20260920185734_TarefaProjetoEtapaId`.
   Use se `dotnet ef database update` não for executado no servidor.

   Banco alvo: Central_Conhecimento (SQL Server)
     sqlcmd -S <servidor> -d Central_Conhecimento -E -C -i migracao-tarefa-projeto-etapa-id.sql

   1) Adiciona IMPL_Tarefa.TRF_ProjetoEtapaId (NULL) + índice + FK SET NULL
      para tbprojetoEtapa.PEP_Id.
   2) Backfill: liga tarefas existentes à etapa fixa do mesmo projeto por
      nome conhecido. Casos sem par (PARAMETRIZACAO, ACEITE, DESENHO, TESTES,
      PUBLICACAO, MONITORAMENTO...) ficam NULL = contam só nos totais.
   Idempotente: pode rodar mais de uma vez com segurança.
   ============================================================================ */

SET NOCOUNT ON;

IF COL_LENGTH('dbo.IMPL_Tarefa', 'TRF_ProjetoEtapaId') IS NULL
BEGIN
    ALTER TABLE dbo.IMPL_Tarefa ADD TRF_ProjetoEtapaId INT NULL;
    PRINT 'Coluna TRF_ProjetoEtapaId criada.';
END
ELSE
    PRINT 'Coluna TRF_ProjetoEtapaId já existe.';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_IMPL_Tarefa_TRF_ProjetoEtapaId' AND object_id = OBJECT_ID('dbo.IMPL_Tarefa'))
BEGIN
    CREATE INDEX IX_IMPL_Tarefa_TRF_ProjetoEtapaId ON dbo.IMPL_Tarefa (TRF_ProjetoEtapaId);
    PRINT 'Índice criado.';
END
ELSE
    PRINT 'Índice já existe.';

-- NO ACTION (não SET NULL): SQL Server barra múltiplos caminhos em cascata
-- (IMPL_Projeto → IMPL_Tarefa direto + via tbprojetoEtapa). Excluir projeto
-- continua funcionando (cascatas apagam ambos os lados na mesma instrução).
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId')
BEGIN
    ALTER TABLE dbo.IMPL_Tarefa
        ADD CONSTRAINT FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId
        FOREIGN KEY (TRF_ProjetoEtapaId) REFERENCES dbo.tbprojetoEtapa (PEP_Id)
        ON DELETE NO ACTION;
    PRINT 'FK criada.';
END
ELSE
    PRINT 'FK já existe.';

UPDATE t
SET t.TRF_ProjetoEtapaId = pe.PEP_Id
FROM dbo.IMPL_Tarefa t
JOIN dbo.IMPL_Etapa e ON e.ETP_Id = t.TRF_EtapaId
JOIN dbo.tbprojetoEtapa pe ON pe.PEP_ProjetoId = t.TRF_ProjetoId
    AND (e.ETP_Nome = pe.PEP_Nome
         OR (e.ETP_Nome = 'HOMOLOGACAO' AND pe.PEP_Nome = 'HOMOLOGAÇÃO'))
WHERE t.TRF_ProjetoId IS NOT NULL
  AND t.TRF_ProjetoEtapaId IS NULL;

PRINT CONCAT('Backfill: ', @@ROWCOUNT, ' tarefa(s) vinculada(s).');
PRINT 'MIGRACAO CONCLUÍDA.';
