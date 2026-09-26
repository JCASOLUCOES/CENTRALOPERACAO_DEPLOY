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

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915132751_ClienteApontaTbCliente'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] DROP CONSTRAINT [FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915132751_ClienteApontaTbCliente'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] ADD CONSTRAINT [FK_IMPL_Projeto_tbcliente_PRJ_ClienteId] FOREIGN KEY ([PRJ_ClienteId]) REFERENCES [tbcliente] ([CLIENTE_ID]) ON DELETE SET NULL;
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

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915134729_AgendaPrioridadeSLA'
)
BEGIN
    ALTER TABLE [IMPL_Agenda] ADD [AGD_Prioridade] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260915134729_AgendaPrioridadeSLA'
)
BEGIN
    ALTER TABLE [IMPL_Agenda] ADD [AGD_SLAMinutos] int NULL;
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

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD [TRF_Arquivada] bit NOT NULL DEFAULT CAST(0 AS bit);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_Arquivada_Coluna] ON [IMPL_Tarefa] ([TRF_Arquivada], [TRF_ColunaKanbanId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN

                    IF NOT EXISTS (SELECT 1 FROM IMPL_ColunaKanban WHERE CLK_Nome = 'EM DESENVOLVIMENTO')
                    BEGIN
                        -- Abre espaco: desloca EM ANDAMENTO (3->4), HOMOLOGACAO (4->5), CONCLUIDO (5->7)
                        UPDATE IMPL_ColunaKanban SET CLK_Ordem = 7 WHERE CLK_Nome = 'CONCLUIDO';
                        UPDATE IMPL_ColunaKanban SET CLK_Ordem = 5 WHERE CLK_Nome = 'HOMOLOGACAO';
                        UPDATE IMPL_ColunaKanban SET CLK_Ordem = 4 WHERE CLK_Nome = 'EM ANDAMENTO';
                        INSERT INTO IMPL_ColunaKanban (CLK_Nome, CLK_Ordem, CLK_Cor, CLK_Padrao, CLK_Ativa, CLK_UsuarioInclusao, CLK_DataInclusao)
                        VALUES ('EM DESENVOLVIMENTO', 3, '#f59e0b', 1, 1, 'migration', GETDATE());
                    END
                
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260916001540_KanbanCustomizavelEArquivamento'
)
BEGIN

                    IF NOT EXISTS (SELECT 1 FROM IMPL_ColunaKanban WHERE CLK_Nome = 'BLOQUEADO')
                    BEGIN
                        INSERT INTO IMPL_ColunaKanban (CLK_Nome, CLK_Ordem, CLK_Cor, CLK_Padrao, CLK_Ativa, CLK_UsuarioInclusao, CLK_DataInclusao)
                        VALUES ('BLOQUEADO', 6, '#ef4444', 1, 1, 'migration', GETDATE());
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

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD [TRF_DataEntrega] datetime2 NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD [TRF_TipoTarefa] int NOT NULL DEFAULT 0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
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
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    CREATE TABLE [IMPL_TarefaChamado] (
        [TRF_Id] int NOT NULL,
        [CHAMADO_ID] int NOT NULL,
        [TRF_UsuarioInclusao] nvarchar(50) NOT NULL,
        [TRF_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_TarefaChamado] PRIMARY KEY ([TRF_Id], [CHAMADO_ID]),
        CONSTRAINT [FK_IMPL_TarefaChamado_IMPL_Tarefa_TRF_Id] FOREIGN KEY ([TRF_Id]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    CREATE TABLE [IMPL_TarefaResponsavel] (
        [TRF_Id] int NOT NULL,
        [OPERADOR_ID] nvarchar(50) NOT NULL,
        [TRF_UsuarioInclusao] nvarchar(50) NOT NULL,
        [TRF_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_TarefaResponsavel] PRIMARY KEY ([TRF_Id], [OPERADOR_ID]),
        CONSTRAINT [FK_IMPL_TarefaResponsavel_IMPL_Tarefa_TRF_Id] FOREIGN KEY ([TRF_Id]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    CREATE INDEX [IX_IMPL_TarefaApontamento_TRF_Id_APT_Data] ON [IMPL_TarefaApontamento] ([TRF_Id], [APT_Data]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    CREATE INDEX [IX_IMPL_TarefaChamado_CHAMADO_ID] ON [IMPL_TarefaChamado] ([CHAMADO_ID]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917170249_TarefaEvolucaoResponsaveisChamadosHoras'
)
BEGIN
    CREATE INDEX [IX_IMPL_TarefaResponsavel_OPERADOR_ID] ON [IMPL_TarefaResponsavel] ([OPERADOR_ID]);
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

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917202045_TarefaProjetoOpcional'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[IMPL_Tarefa]') AND [c].[name] = N'TRF_ProjetoId');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [IMPL_Tarefa] DROP CONSTRAINT [' + @var0 + '];');
    ALTER TABLE [IMPL_Tarefa] ALTER COLUMN [TRF_ProjetoId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260917202045_TarefaProjetoOpcional'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260917202045_TarefaProjetoOpcional', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE TABLE [tbprojetoEtapa] (
        [PEP_Id] int NOT NULL IDENTITY,
        [PEP_ProjetoId] int NOT NULL,
        [PEP_Ordem] int NOT NULL,
        [PEP_Nome] nvarchar(100) NOT NULL,
        [PEP_Estado] nvarchar(20) NOT NULL,
        [PEP_Percentual] int NOT NULL,
        [PEP_DataInicio] datetime2 NULL,
        [PEP_DataFimPrevista] datetime2 NULL,
        [PEP_DataFimReal] datetime2 NULL,
        [PEP_AtrasoDias] int NULL,
        [PEP_ResponsavelId] nvarchar(50) NULL,
        [PEP_UsuarioInclusao] nvarchar(50) NOT NULL,
        [PEP_DataInclusao] datetime2 NOT NULL,
        [PEP_UsuarioAlteracao] nvarchar(50) NULL,
        [PEP_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_tbprojetoEtapa] PRIMARY KEY ([PEP_Id]),
        CONSTRAINT [FK_tbprojetoEtapa_IMPL_Projeto_PEP_ProjetoId] FOREIGN KEY ([PEP_ProjetoId]) REFERENCES [IMPL_Projeto] ([PRJ_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE TABLE [tbprojetoEtapaChecklist] (
        [PEC_Id] int NOT NULL IDENTITY,
        [PEC_ProjetoEtapaId] int NOT NULL,
        [PEC_Descricao] nvarchar(500) NOT NULL,
        [PEC_Concluido] bit NOT NULL,
        [PEC_DataConclusao] datetime2 NULL,
        [PEC_UsuarioConclusao] nvarchar(50) NULL,
        [PEC_Ordem] int NOT NULL,
        [PEC_UsuarioInclusao] nvarchar(50) NOT NULL,
        [PEC_DataInclusao] datetime2 NOT NULL,
        [PEC_UsuarioAlteracao] nvarchar(50) NULL,
        [PEC_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_tbprojetoEtapaChecklist] PRIMARY KEY ([PEC_Id]),
        CONSTRAINT [FK_tbprojetoEtapaChecklist_tbprojetoEtapa_PEC_ProjetoEtapaId] FOREIGN KEY ([PEC_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE TABLE [tbprojetoEtapaComentario] (
        [PEC_Id] int NOT NULL IDENTITY,
        [PEC_ProjetoEtapaId] int NOT NULL,
        [PEC_Texto] nvarchar(4000) NOT NULL,
        [PEC_Usuario] nvarchar(50) NOT NULL,
        [PEC_Data] datetime2 NOT NULL,
        CONSTRAINT [PK_tbprojetoEtapaComentario] PRIMARY KEY ([PEC_Id]),
        CONSTRAINT [FK_tbprojetoEtapaComentario_tbprojetoEtapa_PEC_ProjetoEtapaId] FOREIGN KEY ([PEC_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE TABLE [tbprojetoEtapaDocumento] (
        [PED_Id] int NOT NULL IDENTITY,
        [PED_ProjetoEtapaId] int NOT NULL,
        [PED_Nome] nvarchar(200) NOT NULL,
        [PED_Url] nvarchar(500) NOT NULL,
        [PED_Descricao] nvarchar(500) NULL,
        [PED_UsuarioInclusao] nvarchar(50) NOT NULL,
        [PED_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_tbprojetoEtapaDocumento] PRIMARY KEY ([PED_Id]),
        CONSTRAINT [FK_tbprojetoEtapaDocumento_tbprojetoEtapa_PED_ProjetoEtapaId] FOREIGN KEY ([PED_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE TABLE [tbprojetoEtapaHistorico] (
        [PEH_Id] int NOT NULL IDENTITY,
        [PEH_ProjetoEtapaId] int NOT NULL,
        [PEH_Acao] nvarchar(1000) NOT NULL,
        [PEH_Detalhes] nvarchar(2000) NULL,
        [PEH_Usuario] nvarchar(50) NOT NULL,
        [PEH_Data] datetime2 NOT NULL,
        CONSTRAINT [PK_tbprojetoEtapaHistorico] PRIMARY KEY ([PEH_Id]),
        CONSTRAINT [FK_tbprojetoEtapaHistorico_tbprojetoEtapa_PEH_ProjetoEtapaId] FOREIGN KEY ([PEH_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE UNIQUE INDEX [IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem] ON [tbprojetoEtapa] ([PEP_ProjetoId], [PEP_Ordem]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE INDEX [IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId] ON [tbprojetoEtapaChecklist] ([PEC_ProjetoEtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE INDEX [IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId] ON [tbprojetoEtapaComentario] ([PEC_ProjetoEtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE INDEX [IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId] ON [tbprojetoEtapaDocumento] ([PED_ProjetoEtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    CREATE INDEX [IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId] ON [tbprojetoEtapaHistorico] ([PEH_ProjetoEtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260918211919_AddProjetoEtapas'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260918211919_AddProjetoEtapas', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920185734_TarefaProjetoEtapaId'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD [TRF_ProjetoEtapaId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920185734_TarefaProjetoEtapaId'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_TRF_ProjetoEtapaId] ON [IMPL_Tarefa] ([TRF_ProjetoEtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920185734_TarefaProjetoEtapaId'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD CONSTRAINT [FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId] FOREIGN KEY ([TRF_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920185734_TarefaProjetoEtapaId'
)
BEGIN

                    UPDATE t
                    SET t.TRF_ProjetoEtapaId = pe.PEP_Id
                    FROM IMPL_Tarefa t
                    JOIN IMPL_Etapa e ON e.ETP_Id = t.TRF_EtapaId
                    JOIN tbprojetoEtapa pe ON pe.PEP_ProjetoId = t.TRF_ProjetoId
                        AND (e.ETP_Nome = pe.PEP_Nome
                             OR (e.ETP_Nome = 'HOMOLOGACAO' AND pe.PEP_Nome = 'HOMOLOGAÇÃO'))
                    WHERE t.TRF_ProjetoId IS NOT NULL
                      AND t.TRF_ProjetoEtapaId IS NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260920185734_TarefaProjetoEtapaId'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260920185734_TarefaProjetoEtapaId', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] DROP CONSTRAINT [FK_IMPL_Tarefa_IMPL_Etapa_TRF_EtapaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] DROP CONSTRAINT [FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    DROP TABLE [IMPL_Etapa];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    DROP INDEX [IX_IMPL_Tarefa_TRF_EtapaId] ON [IMPL_Tarefa];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    DECLARE @var1 sysname;
    SELECT @var1 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[IMPL_Tarefa]') AND [c].[name] = N'TRF_EtapaId');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [IMPL_Tarefa] DROP CONSTRAINT [' + @var1 + '];');
    ALTER TABLE [IMPL_Tarefa] DROP COLUMN [TRF_EtapaId];
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD CONSTRAINT [FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId] FOREIGN KEY ([TRF_ProjetoEtapaId]) REFERENCES [tbprojetoEtapa] ([PEP_Id]) ON DELETE NO ACTION;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260922154202_RemoveEtapaAntiga'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260922154202_RemoveEtapaAntiga', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF COL_LENGTH('dbo.tbfuncao', 'CLASSIFICACAO') IS NULL
        ALTER TABLE dbo.tbfuncao ADD CLASSIFICACAO varchar(50) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF COL_LENGTH('dbo.tbfuncao', 'ATIVO') IS NULL
        ALTER TABLE dbo.tbfuncao ADD ATIVO bit NOT NULL CONSTRAINT DF_tbfuncao_ATIVO DEFAULT 1;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.tbfuncao') AND name = 'PK_tbfuncao')
        ALTER TABLE dbo.tbfuncao DROP CONSTRAINT PK_tbfuncao;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    ALTER TABLE dbo.tbfuncao ALTER COLUMN FUNCAO_ID int NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE object_id = OBJECT_ID('dbo.tbfuncao') AND name = 'PK_tbfuncao')
        ALTER TABLE dbo.tbfuncao ADD CONSTRAINT PK_tbfuncao PRIMARY KEY (FUNCAO_ID);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    UPDATE dbo.tbfuncao SET
        CLASSIFICACAO = CASE FUNCAO_ID
            WHEN 1 THEN 'Implantador'
            WHEN 2 THEN 'Atendimento'
            WHEN 3 THEN 'Desenvolvimento'
            ELSE 'Implantador' END
    WHERE CLASSIFICACAO IS NULL;

END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID('dbo.AgendaEventoParticipante', 'U') IS NOT NULL DROP TABLE dbo.AgendaEventoParticipante;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID('dbo.AgendaEvento', 'U') IS NOT NULL DROP TABLE dbo.AgendaEvento;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF EXISTS (SELECT 1 FROM sys.foreign_keys
               WHERE name = 'FK_TBOPERADOR_CC_Funcao_FUNCAO_ID'
                 AND referenced_object_id = OBJECT_ID('dbo.CC_Funcao'))
        ALTER TABLE dbo.tboperador DROP CONSTRAINT FK_TBOPERADOR_CC_Funcao_FUNCAO_ID;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID('dbo.CC_Funcao', 'U') IS NOT NULL DROP TABLE dbo.CC_Funcao;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN

    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys
                   WHERE parent_object_id = OBJECT_ID('dbo.tboperador')
                     AND referenced_object_id = OBJECT_ID('dbo.tbfuncao'))
        ALTER TABLE dbo.tboperador ADD CONSTRAINT FK_tboperador_tbfuncao_FUNCAO_ID
            FOREIGN KEY (FUNCAO_ID) REFERENCES dbo.tbfuncao (FUNCAO_ID) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID('dbo.IMPL_Cliente', 'U') IS NOT NULL DROP TABLE dbo.IMPL_Cliente;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_ComentarioTarefa', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_ComentarioTarefa', N'tbcomentariotarefa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_TarefaApontamento', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_TarefaApontamento', N'tbtarefaapontamento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_TarefaChamado', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_TarefaChamado', N'tbtarefachamado';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_TarefaResponsavel', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_TarefaResponsavel', N'tbtarefareponsavel';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_Tarefa', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_Tarefa', N'tbtarefa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_Auditoria', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_Auditoria', N'tbauditoriaimplantacao';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_ColunaKanban', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_ColunaKanban', N'tbcolunakanban';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_TipoProjeto', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_TipoProjeto', N'tbtipoprojeto';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_Projeto', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_Projeto', N'tbprojeto';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.IMPL_Agenda', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.IMPL_Agenda', N'tbagenda';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.CC_TipoEvento', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.CC_TipoEvento', N'tbtipoevento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.CC_AgendaParticipante', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.CC_AgendaParticipante', N'tbagendaparticipante';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.AuditoriaAcessos', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.AuditoriaAcessos', N'tbauditoriaacesso';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.RefreshTokens', N'tbrefreshtoken';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.tbprojetoEtapa', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.tbprojetoEtapa', N'tbprojetoetapa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.tbprojetoEtapaChecklist', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.tbprojetoEtapaChecklist', N'tbprojetoetapachecklist';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.tbprojetoEtapaDocumento', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.tbprojetoEtapaDocumento', N'tbprojetoetapadocumento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.tbprojetoEtapaHistorico', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.tbprojetoEtapaHistorico', N'tbprojetoetahistorico';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.tbprojetoEtapaComentario', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.tbprojetoEtapaComentario', N'tbprojetoetapacomentario';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.TBOPERADOR', N'U') IS NOT NULL
                           EXEC sp_rename N'dbo.TBOPERADOR', N'tboperador';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_Projeto') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_Projeto', N'PK_tbprojeto';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_Tarefa') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_Tarefa', N'PK_tbtarefa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_ComentarioTarefa') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_ComentarioTarefa', N'PK_tbcomentariotarefa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_TarefaResponsavel') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_TarefaResponsavel', N'PK_tbtarefareponsavel';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_TarefaChamado') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_TarefaChamado', N'PK_tbtarefachamado';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_TarefaApontamento') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_TarefaApontamento', N'PK_tbtarefaapontamento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_ColunaKanban') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_ColunaKanban', N'PK_tbcolunakanban';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_TipoProjeto') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_TipoProjeto', N'PK_tbtipoprojeto';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_Agenda') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_Agenda', N'PK_tbagenda';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_IMPL_Auditoria') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_IMPL_Auditoria', N'PK_tbauditoriaimplantacao';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_AuditoriaAcessos') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_AuditoriaAcessos', N'PK_tbauditoriaacesso';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_RefreshTokens') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_RefreshTokens', N'PK_tbrefreshtoken';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_CC_TipoEvento') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_CC_TipoEvento', N'PK_tbtipoevento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_CC_AgendaParticipante') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_CC_AgendaParticipante', N'PK_tbagendaparticipante';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_tbprojetoEtapa') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_tbprojetoEtapa', N'PK_tbprojetoetapa';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_tbprojetoEtapaChecklist') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_tbprojetoEtapaChecklist', N'PK_tbprojetoetapachecklist';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_tbprojetoEtapaDocumento') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_tbprojetoEtapaDocumento', N'PK_tbprojetoetapadocumento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_tbprojetoEtapaHistorico') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_tbprojetoEtapaHistorico', N'PK_tbprojetoetahistorico';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_tbprojetoEtapaComentario') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_tbprojetoEtapaComentario', N'PK_tbprojetoetapacomentario';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK_TBOPERADOR') IS NOT NULL
                           EXEC sp_rename N'dbo.PK_TBOPERADOR', N'PK_tboperador';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926010406_PadraoTabelasTb'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260926010406_PadraoTabelasTb', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagenda') AND name = N'IX_IMPL_Agenda_DataInicio')
                           EXEC sp_rename N'tbagenda.IX_IMPL_Agenda_DataInicio', N'IX_tbagenda_AGD_DataInicio', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagenda') AND name = N'IX_IMPL_Agenda_Operador_DataInicio_DataFim')
                           EXEC sp_rename N'tbagenda.IX_IMPL_Agenda_Operador_DataInicio_DataFim', N'IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagenda') AND name = N'IX_IMPL_Agenda_OperadorId')
                           EXEC sp_rename N'tbagenda.IX_IMPL_Agenda_OperadorId', N'IX_tbagenda_AGD_OperadorId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagenda') AND name = N'IX_IMPL_Agenda_ProjetoId')
                           EXEC sp_rename N'tbagenda.IX_IMPL_Agenda_ProjetoId', N'IX_tbagenda_AGD_ProjetoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagenda') AND name = N'IX_IMPL_Agenda_TipoId')
                           EXEC sp_rename N'tbagenda.IX_IMPL_Agenda_TipoId', N'IX_tbagenda_AGD_TipoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagendaparticipante') AND name = N'IX_CC_AgendaParticipante_AgendaId_ParticipanteId')
                           EXEC sp_rename N'tbagendaparticipante.IX_CC_AgendaParticipante_AgendaId_ParticipanteId', N'IX_tbagendaparticipante_AgendaId_ParticipanteId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbagendaparticipante') AND name = N'IX_CC_AgendaParticipante_ParticipanteId')
                           EXEC sp_rename N'tbagendaparticipante.IX_CC_AgendaParticipante_ParticipanteId', N'IX_tbagendaparticipante_ParticipanteId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbauditoriaimplantacao') AND name = N'IX_IMPL_Auditoria_AUD_Data')
                           EXEC sp_rename N'tbauditoriaimplantacao.IX_IMPL_Auditoria_AUD_Data', N'IX_tbauditoriaimplantacao_AUD_Data', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbauditoriaimplantacao') AND name = N'IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId')
                           EXEC sp_rename N'tbauditoriaimplantacao.IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId', N'IX_tbauditoriaimplantacao_AUD_Entidade_AUD_EntidadeId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbauditoriaimplantacao') AND name = N'IX_IMPL_Auditoria_AUD_Usuario')
                           EXEC sp_rename N'tbauditoriaimplantacao.IX_IMPL_Auditoria_AUD_Usuario', N'IX_tbauditoriaimplantacao_AUD_Usuario', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbcomentariotarefa') AND name = N'IX_IMPL_ComentarioTarefa_CMT_TarefaId')
                           EXEC sp_rename N'tbcomentariotarefa.IX_IMPL_ComentarioTarefa_CMT_TarefaId', N'IX_tbcomentariotarefa_CMT_TarefaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tboperador') AND name = N'IX_TBOPERADOR_FUNCAO_ID')
                           EXEC sp_rename N'tboperador.IX_TBOPERADOR_FUNCAO_ID', N'IX_tboperador_FUNCAO_ID', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojeto') AND name = N'IX_IMPL_Projeto_ClienteLegadoId')
                           EXEC sp_rename N'tbprojeto.IX_IMPL_Projeto_ClienteLegadoId', N'IX_tbprojeto_PRJ_ClienteLegadoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojeto') AND name = N'IX_IMPL_Projeto_PRJ_ClienteId')
                           EXEC sp_rename N'tbprojeto.IX_IMPL_Projeto_PRJ_ClienteId', N'IX_tbprojeto_PRJ_ClienteId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojeto') AND name = N'IX_IMPL_Projeto_PRJ_Codigo')
                           EXEC sp_rename N'tbprojeto.IX_IMPL_Projeto_PRJ_Codigo', N'IX_tbprojeto_PRJ_Codigo', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojeto') AND name = N'IX_IMPL_Projeto_PRJ_ColunaKanbanId')
                           EXEC sp_rename N'tbprojeto.IX_IMPL_Projeto_PRJ_ColunaKanbanId', N'IX_tbprojeto_PRJ_ColunaKanbanId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojeto') AND name = N'IX_IMPL_Projeto_PRJ_TipoProjetoId')
                           EXEC sp_rename N'tbprojeto.IX_IMPL_Projeto_PRJ_TipoProjetoId', N'IX_tbprojeto_PRJ_TipoProjetoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojetoetahistorico') AND name = N'IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId')
                           EXEC sp_rename N'tbprojetoetahistorico.IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId', N'IX_tbprojetoetahistorico_PEH_ProjetoEtapaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojetoetapa') AND name = N'IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem')
                           EXEC sp_rename N'tbprojetoetapa.IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem', N'IX_tbprojetoetapa_PEP_ProjetoId_PEP_Ordem', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojetoetapachecklist') AND name = N'IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId')
                           EXEC sp_rename N'tbprojetoetapachecklist.IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId', N'IX_tbprojetoetapachecklist_PEC_ProjetoEtapaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojetoetapacomentario') AND name = N'IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId')
                           EXEC sp_rename N'tbprojetoetapacomentario.IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId', N'IX_tbprojetoetapacomentario_PEC_ProjetoEtapaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbprojetoetapadocumento') AND name = N'IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId')
                           EXEC sp_rename N'tbprojetoetapadocumento.IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId', N'IX_tbprojetoetapadocumento_PED_ProjetoEtapaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbrefreshtoken') AND name = N'IX_RefreshTokens_OperadorId')
                           EXEC sp_rename N'tbrefreshtoken.IX_RefreshTokens_OperadorId', N'IX_tbrefreshtoken_OperadorId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbrefreshtoken') AND name = N'IX_RefreshTokens_TokenHash')
                           EXEC sp_rename N'tbrefreshtoken.IX_RefreshTokens_TokenHash', N'IX_tbrefreshtoken_TokenHash', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefa') AND name = N'IX_IMPL_Tarefa_Arquivada_Coluna')
                           EXEC sp_rename N'tbtarefa.IX_IMPL_Tarefa_Arquivada_Coluna', N'IX_tbtarefa_TRF_Arquivada_TRF_ColunaKanbanId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefa') AND name = N'IX_IMPL_Tarefa_ChamadoLegadoId')
                           EXEC sp_rename N'tbtarefa.IX_IMPL_Tarefa_ChamadoLegadoId', N'IX_tbtarefa_TRF_ChamadoLegadoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefa') AND name = N'IX_IMPL_Tarefa_TRF_ColunaKanbanId')
                           EXEC sp_rename N'tbtarefa.IX_IMPL_Tarefa_TRF_ColunaKanbanId', N'IX_tbtarefa_TRF_ColunaKanbanId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefa') AND name = N'IX_IMPL_Tarefa_TRF_ProjetoEtapaId')
                           EXEC sp_rename N'tbtarefa.IX_IMPL_Tarefa_TRF_ProjetoEtapaId', N'IX_tbtarefa_TRF_ProjetoEtapaId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefa') AND name = N'IX_IMPL_Tarefa_TRF_ProjetoId')
                           EXEC sp_rename N'tbtarefa.IX_IMPL_Tarefa_TRF_ProjetoId', N'IX_tbtarefa_TRF_ProjetoId', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefaapontamento') AND name = N'IX_IMPL_TarefaApontamento_TRF_Id_APT_Data')
                           EXEC sp_rename N'tbtarefaapontamento.IX_IMPL_TarefaApontamento_TRF_Id_APT_Data', N'IX_tbtarefaapontamento_TRF_Id_APT_Data', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefachamado') AND name = N'IX_IMPL_TarefaChamado_CHAMADO_ID')
                           EXEC sp_rename N'tbtarefachamado.IX_IMPL_TarefaChamado_CHAMADO_ID', N'IX_tbtarefachamado_CHAMADO_ID', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtarefareponsavel') AND name = N'IX_IMPL_TarefaResponsavel_OPERADOR_ID')
                           EXEC sp_rename N'tbtarefareponsavel.IX_IMPL_TarefaResponsavel_OPERADOR_ID', N'IX_tbtarefareponsavel_OPERADOR_ID', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF EXISTS (SELECT 1 FROM sys.indexes
                                WHERE object_id = OBJECT_ID(N'dbo.tbtipoprojeto') AND name = N'IX_IMPL_TipoProjeto_TPP_Codigo')
                           EXEC sp_rename N'tbtipoprojeto.IX_IMPL_TipoProjeto_TPP_Codigo', N'IX_tbtipoprojeto_TPP_Codigo', N'INDEX';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK__IMPL_Age__88C1ACD33B197A62') IS NOT NULL
                           EXEC sp_rename N'dbo.PK__IMPL_Age__88C1ACD33B197A62', N'PK_tbagenda';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK__CC_Agend__3214EC07BEE1D346') IS NOT NULL
                           EXEC sp_rename N'dbo.PK__CC_Agend__3214EC07BEE1D346', N'PK_tbagendaparticipante';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK__Auditori__3214EC079B76F480') IS NOT NULL
                           EXEC sp_rename N'dbo.PK__Auditori__3214EC079B76F480', N'PK_tbauditoriaacesso';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK__RefreshT__3214EC07377A72D4') IS NOT NULL
                           EXEC sp_rename N'dbo.PK__RefreshT__3214EC07377A72D4', N'PK_tbrefreshtoken';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.PK__CC_TipoE__3214EC076E297786') IS NOT NULL
                           EXEC sp_rename N'dbo.PK__CC_TipoE__3214EC076E297786', N'PK_tbtipoevento';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    IF OBJECT_ID(N'dbo.UQ__CC_TipoE__7D8FE3B22A85213B') IS NOT NULL
                           EXEC sp_rename N'dbo.UQ__CC_TipoE__7D8FE3B22A85213B', N'AK_tbtipoevento_Nome';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260926022906_RenomeiaIndicesPkTb'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260926022906_RenomeiaIndicesPkTb', N'8.0.31');
END;
GO

COMMIT;
GO

