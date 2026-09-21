-- KanbanCustomizavelEArquivamento (idempotente)
-- Adiciona TRF_Arquivada (bit) em IMPL_Tarefa + indice + 2 colunas EM DESENVOLVIMENTO e BLOQUEADO.

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    IF COL_LENGTH(N'[IMPL_Tarefa]', N'TRF_Arquivada') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Tarefa] ADD [TRF_Arquivada] bit NOT NULL DEFAULT 0;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IMPL_Tarefa_Arquivada_Coluna' AND object_id = OBJECT_ID(N'[IMPL_Tarefa]'))
    BEGIN
        CREATE INDEX [IX_IMPL_Tarefa_Arquivada_Coluna] ON [IMPL_Tarefa] ([TRF_Arquivada], [TRF_ColunaKanbanId]);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [IMPL_ColunaKanban] WHERE [CLK_Nome] = N'EM DESENVOLVIMENTO')
    BEGIN
        UPDATE [IMPL_ColunaKanban] SET [CLK_Ordem] = 7 WHERE [CLK_Nome] = N'CONCLUIDO';
        UPDATE [IMPL_ColunaKanban] SET [CLK_Ordem] = 5 WHERE [CLK_Nome] = N'HOMOLOGACAO';
        UPDATE [IMPL_ColunaKanban] SET [CLK_Ordem] = 4 WHERE [CLK_Nome] = N'EM ANDAMENTO';
        INSERT INTO [IMPL_ColunaKanban] ([CLK_Nome], [CLK_Ordem], [CLK_Cor], [CLK_Padrao], [CLK_Ativa], [CLK_UsuarioInclusao], [CLK_DataInclusao])
        VALUES (N'EM DESENVOLVIMENTO', 3, N'#f59e0b', 1, 1, N'migration', GETDATE());
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [IMPL_ColunaKanban] WHERE [CLK_Nome] = N'BLOQUEADO')
    BEGIN
        INSERT INTO [IMPL_ColunaKanban] ([CLK_Nome], [CLK_Ordem], [CLK_Cor], [CLK_Padrao], [CLK_Ativa], [CLK_UsuarioInclusao], [CLK_DataInclusao])
        VALUES (N'BLOQUEADO', 6, N'#ef4444', 1, 1, N'migration', GETDATE());
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260916001540_KanbanCustomizavelEArquivamento', N'8.0.31');
END;
GO

COMMIT;
GO
