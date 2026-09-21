-- TarefaEvolucaoResponsaveisChamadosHoras (idempotente)
-- Adiciona TRF_DataEntrega (date) + TRF_TipoTarefa (0=Feature,1=Bug) em IMPL_Tarefa
-- e cria IMPL_TarefaResponsavel, IMPL_TarefaChamado, IMPL_TarefaApontamento.
-- Backfill: responsáveis atuais (TRF_ResponsavelId) viram linha em IMPL_TarefaResponsavel.

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF COL_LENGTH(N'[IMPL_Tarefa]', N'TRF_DataEntrega') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Tarefa] ADD [TRF_DataEntrega] datetime2 NULL;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF COL_LENGTH(N'[IMPL_Tarefa]', N'TRF_TipoTarefa') IS NULL
    BEGIN
        ALTER TABLE [IMPL_Tarefa] ADD [TRF_TipoTarefa] int NOT NULL DEFAULT 0;
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF OBJECT_ID(N'[IMPL_TarefaApontamento]', N'U') IS NULL
    BEGIN
        CREATE TABLE [IMPL_TarefaApontamento] (
            [APT_Id] int NOT NULL IDENTITY,
            [TRF_Id] int NOT NULL,
            [OPERADOR_ID] nvarchar(50) NOT NULL,
            [APT_Data] datetime2 NOT NULL,
            [APT_Horas] decimal(5,2) NOT NULL,
            [APT_Observacao] nvarchar(500) NULL,
            [APT_UsuarioInclusao] nvarchar(50) NOT NULL,
            [APT_DataInclusao] datetime2 NOT NULL,
            CONSTRAINT [PK_IMPL_TarefaApontamento] PRIMARY KEY ([APT_Id]),
            CONSTRAINT [FK_IMPL_TarefaApontamento_IMPL_Tarefa_TRF_Id] FOREIGN KEY ([TRF_Id]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
        );
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF OBJECT_ID(N'[IMPL_TarefaChamado]', N'U') IS NULL
    BEGIN
        CREATE TABLE [IMPL_TarefaChamado] (
            [TRF_Id] int NOT NULL,
            [CHAMADO_ID] int NOT NULL,
            [TRF_UsuarioInclusao] nvarchar(50) NOT NULL,
            [TRF_DataInclusao] datetime2 NOT NULL,
            CONSTRAINT [PK_IMPL_TarefaChamado] PRIMARY KEY ([TRF_Id], [CHAMADO_ID]),
            CONSTRAINT [FK_IMPL_TarefaChamado_IMPL_Tarefa_TRF_Id] FOREIGN KEY ([TRF_Id]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
        );
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF OBJECT_ID(N'[IMPL_TarefaResponsavel]', N'U') IS NULL
    BEGIN
        CREATE TABLE [IMPL_TarefaResponsavel] (
            [TRF_Id] int NOT NULL,
            [OPERADOR_ID] nvarchar(50) NOT NULL,
            [TRF_UsuarioInclusao] nvarchar(50) NOT NULL,
            [TRF_DataInclusao] datetime2 NOT NULL,
            CONSTRAINT [PK_IMPL_TarefaResponsavel] PRIMARY KEY ([TRF_Id], [OPERADOR_ID]),
            CONSTRAINT [FK_IMPL_TarefaResponsavel_IMPL_Tarefa_TRF_Id] FOREIGN KEY ([TRF_Id]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
        );
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IMPL_TarefaApontamento_TRF_Id_APT_Data' AND object_id = OBJECT_ID(N'[IMPL_TarefaApontamento]'))
    BEGIN
        CREATE INDEX [IX_IMPL_TarefaApontamento_TRF_Id_APT_Data] ON [IMPL_TarefaApontamento] ([TRF_Id], [APT_Data]);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IMPL_TarefaChamado_CHAMADO_ID' AND object_id = OBJECT_ID(N'[IMPL_TarefaChamado]'))
    BEGIN
        CREATE INDEX [IX_IMPL_TarefaChamado_CHAMADO_ID] ON [IMPL_TarefaChamado] ([CHAMADO_ID]);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IMPL_TarefaResponsavel_OPERADOR_ID' AND object_id = OBJECT_ID(N'[IMPL_TarefaResponsavel]'))
    BEGIN
        CREATE INDEX [IX_IMPL_TarefaResponsavel_OPERADOR_ID] ON [IMPL_TarefaResponsavel] ([OPERADOR_ID]);
    END
END;
GO

-- Backfill: responsável principal atual vira vínculo N:N (idempotente via NOT EXISTS).
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    INSERT INTO [IMPL_TarefaResponsavel] ([TRF_Id], [OPERADOR_ID], [TRF_UsuarioInclusao], [TRF_DataInclusao])
    SELECT t.[TRF_Id], t.[TRF_ResponsavelId], ISNULL(t.[TRF_UsuarioAlteracao], t.[TRF_UsuarioInclusao]), GETDATE()
    FROM [IMPL_Tarefa] t
    WHERE t.[TRF_ResponsavelId] IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM [IMPL_TarefaResponsavel] r
          WHERE r.[TRF_Id] = t.[TRF_Id] AND r.[OPERADOR_ID] = t.[TRF_ResponsavelId]
      );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras', N'8.0.31');
END;
GO

COMMIT;
GO
