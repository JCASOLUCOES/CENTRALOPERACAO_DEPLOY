BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260914144751_AgendaConflitoHorarios'
)
BEGIN
    CREATE INDEX [IX_IMPL_Agenda_Operador_DataInicio_DataFim] ON [IMPL_Agenda] ([AGD_OperadorId], [AGD_DataInicio], [AGD_DataFim]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260914144751_AgendaConflitoHorarios'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260914144751_AgendaConflitoHorarios', N'8.0.31');
END;
GO

COMMIT;
GO

