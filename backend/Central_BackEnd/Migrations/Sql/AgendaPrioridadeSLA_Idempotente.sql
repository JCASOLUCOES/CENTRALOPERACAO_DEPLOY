-- AgendaPrioridadeSLA (idempotente)
-- Adiciona AGD_Prioridade (0=Normal, 1=Alta, 2=Critica) e AGD_SLAMinutos (NULL) em IMPL_Agenda.

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915134729_AgendaPrioridadeSLA'
)
BEGIN
    IF COL_LENGTH(N'[IMPL_Agenda]', N'AGD_Prioridade') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Agenda] ADD [AGD_Prioridade] int NOT NULL DEFAULT 0;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915134729_AgendaPrioridadeSLA'
)
BEGIN
    IF COL_LENGTH(N'[IMPL_Agenda]', N'AGD_SLAMinutos') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Agenda] ADD [AGD_SLAMinutos] int NULL;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915134729_AgendaPrioridadeSLA'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260915134729_AgendaPrioridadeSLA', N'8.0.31');
END;
GO

COMMIT;
GO
