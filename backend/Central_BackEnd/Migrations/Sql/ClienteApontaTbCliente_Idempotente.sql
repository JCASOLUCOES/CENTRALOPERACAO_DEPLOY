-- ClienteApontaTbCliente (idempotente)
-- Reponta PRJ_ClienteId (IMPL_Projeto) de IMPL_Cliente.CLI_Id para tbcliente.CLIENTE_ID.
-- tbcliente NAO e alterada: somente leitura (nenhum INSERT/UPDATE/DELETE aqui).
-- FK com ON DELETE SET NULL (coluna anulavel; sem CASCADE).

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915132751_ClienteApontaTbCliente'
)
BEGIN
    IF OBJECT_ID(N'[dbo].[FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId]', N'F') IS NOT NULL
    BEGIN
        ALTER TABLE [IMPL_Projeto] DROP CONSTRAINT [FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId];
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915132751_ClienteApontaTbCliente'
)
BEGIN
    IF OBJECT_ID(N'[dbo].[FK_IMPL_Projeto_tbcliente_PRJ_ClienteId]', N'F') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Projeto] WITH CHECK ADD CONSTRAINT [FK_IMPL_Projeto_tbcliente_PRJ_ClienteId]
        FOREIGN KEY ([PRJ_ClienteId]) REFERENCES [tbcliente] ([CLIENTE_ID]) ON DELETE SET NULL;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915132751_ClienteApontaTbCliente'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260915132751_ClienteApontaTbCliente', N'8.0.31');
END;
GO

COMMIT;
GO
