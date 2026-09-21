BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] DROP CONSTRAINT [FK_IMPL_Projeto_IMPL_Equipe_PRJ_EquipeId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] DROP CONSTRAINT [FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_TipoProjeto] DROP CONSTRAINT [FK_IMPL_TipoProjeto_IMPL_Equipe_TPP_EquipeId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DROP TABLE [IMPL_MembroEquipe];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DROP TABLE [IMPL_Equipe];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DROP INDEX [IX_IMPL_TipoProjeto_TPP_EquipeId] ON [IMPL_TipoProjeto];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DROP INDEX [IX_IMPL_Projeto_PRJ_EquipeId] ON [IMPL_Projeto];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[IMPL_TipoProjeto]') AND [c].[name] = N'TPP_EquipeId');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [IMPL_TipoProjeto] DROP CONSTRAINT [' + @var0 + '];');
    ALTER TABLE [IMPL_TipoProjeto] DROP COLUMN [TPP_EquipeId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[IMPL_Projeto]') AND [c].[name] = N'PRJ_EquipeId');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [IMPL_Projeto] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [IMPL_Projeto] DROP COLUMN [PRJ_EquipeId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_TipoProjeto] ADD [TPP_DataAlteracao] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_TipoProjeto] ADD [TPP_UsuarioAlteracao] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_Etapa] ADD [ETP_DataAlteracao] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_Etapa] ADD [ETP_UsuarioAlteracao] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_ColunaKanban] ADD [CLK_DataAlteracao] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_ColunaKanban] ADD [CLK_UsuarioAlteracao] nvarchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] ADD CONSTRAINT [FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId] FOREIGN KEY ([PRJ_TipoProjetoId]) REFERENCES [IMPL_TipoProjeto] ([TPP_Id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260912173928_RemoveEquipes'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260912173928_RemoveEquipes', N'8.0.31');
END;
GO

COMMIT;
GO

