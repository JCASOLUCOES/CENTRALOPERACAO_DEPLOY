IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [AuditoriaAcessos] (
        [Id] int NOT NULL IDENTITY,
        [Usuario] varchar(50) NOT NULL,
        [Empresa] varchar(200) NOT NULL,
        [TipoInformacao] varchar(50) NOT NULL,
        [DataAcesso] datetime2 NOT NULL,
        [HoraAcesso] time NOT NULL,
        [EnderecoIP] varchar(50) NOT NULL,
        [Navegador] varchar(200) NOT NULL,
        CONSTRAINT [PK_AuditoriaAcessos] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_Cliente] (
        [CLI_Id] int NOT NULL IDENTITY,
        [CLI_Nome] nvarchar(200) NOT NULL,
        [CLI_Cnpj] nvarchar(20) NULL,
        [CLI_Contato] nvarchar(200) NULL,
        [CLI_Observacao] nvarchar(2000) NULL,
        [CLI_Ativo] bit NOT NULL,
        [CLI_UsuarioInclusao] nvarchar(50) NOT NULL,
        [CLI_DataInclusao] datetime2 NOT NULL,
        [CLI_UsuarioAlteracao] nvarchar(50) NULL,
        [CLI_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_IMPL_Cliente] PRIMARY KEY ([CLI_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_ColunaKanban] (
        [CLK_Id] int NOT NULL IDENTITY,
        [CLK_Nome] nvarchar(50) NOT NULL,
        [CLK_Ordem] int NOT NULL,
        [CLK_LimiteWip] int NULL,
        [CLK_Cor] nvarchar(20) NULL,
        [CLK_Padrao] bit NOT NULL,
        [CLK_Ativa] bit NOT NULL,
        [CLK_UsuarioInclusao] nvarchar(50) NOT NULL,
        [CLK_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_ColunaKanban] PRIMARY KEY ([CLK_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_Equipe] (
        [EQP_Id] int NOT NULL IDENTITY,
        [EQP_Nome] nvarchar(100) NOT NULL,
        [EQP_Descricao] nvarchar(500) NULL,
        [EQP_PrefixoCodigo] nvarchar(20) NOT NULL,
        [EQP_Ativa] bit NOT NULL,
        [EQP_UsuarioInclusao] nvarchar(50) NOT NULL,
        [EQP_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_Equipe] PRIMARY KEY ([EQP_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [TBOPERADOR] (
        [OPERADOR_ID] varchar(15) NOT NULL,
        [NOME] varchar(50) NULL,
        [SENHA] varchar(10) NULL,
        [EMAIL] varchar(100) NULL,
        [SE_ADMIN] bit NULL,
        [SE_ATIVO] varchar(1) NULL,
        [PERFIL_SKIN] varchar(20) NULL,
        [DATA_ULTIMO_ACESSO] datetime2 NULL,
        [DATA_INCLUSAO] datetime2 NULL,
        [USUARIO_INCLUSAO] varchar(15) NULL,
        [DATA_ALTERACAO] datetime2 NULL,
        [USUARIO_ALTERACAO] varchar(15) NULL,
        [PERFIL_ID] varchar(1) NULL,
        CONSTRAINT [PK_TBOPERADOR] PRIMARY KEY ([OPERADOR_ID])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_MembroEquipe] (
        [MBE_Id] int NOT NULL IDENTITY,
        [MBE_EquipeId] int NOT NULL,
        [MBE_OperadorId] nvarchar(50) NOT NULL,
        [MBE_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_MembroEquipe] PRIMARY KEY ([MBE_Id]),
        CONSTRAINT [FK_IMPL_MembroEquipe_IMPL_Equipe_MBE_EquipeId] FOREIGN KEY ([MBE_EquipeId]) REFERENCES [IMPL_Equipe] ([EQP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_TipoProjeto] (
        [TPP_Id] int NOT NULL IDENTITY,
        [TPP_Codigo] nvarchar(50) NOT NULL,
        [TPP_Nome] nvarchar(100) NOT NULL,
        [TPP_EquipeId] int NULL,
        [TPP_ClienteObrigatorio] bit NOT NULL,
        [TPP_Ordem] int NOT NULL,
        [TPP_Ativo] bit NOT NULL,
        [TPP_UsuarioInclusao] nvarchar(50) NOT NULL,
        [TPP_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_TipoProjeto] PRIMARY KEY ([TPP_Id]),
        CONSTRAINT [FK_IMPL_TipoProjeto_IMPL_Equipe_TPP_EquipeId] FOREIGN KEY ([TPP_EquipeId]) REFERENCES [IMPL_Equipe] ([EQP_Id]) ON DELETE SET NULL
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [RefreshTokens] (
        [Id] int NOT NULL IDENTITY,
        [TokenHash] nvarchar(500) NOT NULL,
        [OperadorId] varchar(15) NOT NULL,
        [ExpiraEm] datetime2 NOT NULL,
        [CriadoEm] datetime2 NOT NULL,
        [Revogado] bit NOT NULL,
        [SubstituidoPor] nvarchar(max) NULL,
        CONSTRAINT [PK_RefreshTokens] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_RefreshTokens_TBOPERADOR_OperadorId] FOREIGN KEY ([OperadorId]) REFERENCES [TBOPERADOR] ([OPERADOR_ID]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_Etapa] (
        [ETP_Id] int NOT NULL IDENTITY,
        [ETP_Nome] nvarchar(100) NOT NULL,
        [ETP_Ordem] int NOT NULL,
        [ETP_TipoProjetoId] int NULL,
        [ETP_Concluida] bit NOT NULL,
        [ETP_Cor] nvarchar(20) NULL,
        [ETP_Ativa] bit NOT NULL,
        [ETP_UsuarioInclusao] nvarchar(50) NOT NULL,
        [ETP_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_Etapa] PRIMARY KEY ([ETP_Id]),
        CONSTRAINT [FK_IMPL_Etapa_IMPL_TipoProjeto_ETP_TipoProjetoId] FOREIGN KEY ([ETP_TipoProjetoId]) REFERENCES [IMPL_TipoProjeto] ([TPP_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_Projeto] (
        [PRJ_Id] int NOT NULL IDENTITY,
        [PRJ_Codigo] nvarchar(20) NOT NULL,
        [PRJ_Nome] nvarchar(200) NOT NULL,
        [PRJ_Descricao] nvarchar(4000) NULL,
        [PRJ_EquipeId] int NOT NULL,
        [PRJ_TipoProjetoId] int NOT NULL,
        [PRJ_ClienteId] int NULL,
        [PRJ_ResponsavelId] nvarchar(50) NULL,
        [PRJ_CriadorId] nvarchar(50) NOT NULL,
        [PRJ_Status] int NOT NULL,
        [PRJ_ColunaKanbanId] int NULL,
        [PRJ_Prioridade] int NOT NULL,
        [PRJ_Progresso] int NOT NULL,
        [PRJ_DataInicio] datetime2 NULL,
        [PRJ_DataPrevisao] datetime2 NULL,
        [PRJ_DataConclusao] datetime2 NULL,
        [PRJ_DataGoLivePrevista] datetime2 NULL,
        [PRJ_DataGoLiveReal] datetime2 NULL,
        [PRJ_HorasPlanejadas] int NULL,
        [PRJ_HorasRealizadas] int NULL,
        [PRJ_Observacao] nvarchar(2000) NULL,
        [PRJ_UsuarioInclusao] nvarchar(50) NOT NULL,
        [PRJ_DataInclusao] datetime2 NOT NULL,
        [PRJ_UsuarioAlteracao] nvarchar(50) NULL,
        [PRJ_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_IMPL_Projeto] PRIMARY KEY ([PRJ_Id]),
        CONSTRAINT [FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId] FOREIGN KEY ([PRJ_ClienteId]) REFERENCES [IMPL_Cliente] ([CLI_Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_IMPL_Projeto_IMPL_ColunaKanban_PRJ_ColunaKanbanId] FOREIGN KEY ([PRJ_ColunaKanbanId]) REFERENCES [IMPL_ColunaKanban] ([CLK_Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_IMPL_Projeto_IMPL_Equipe_PRJ_EquipeId] FOREIGN KEY ([PRJ_EquipeId]) REFERENCES [IMPL_Equipe] ([EQP_Id]) ON DELETE NO ACTION,
        CONSTRAINT [FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId] FOREIGN KEY ([PRJ_TipoProjetoId]) REFERENCES [IMPL_TipoProjeto] ([TPP_Id]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_Tarefa] (
        [TRF_Id] int NOT NULL IDENTITY,
        [TRF_ProjetoId] int NOT NULL,
        [TRF_EtapaId] int NULL,
        [TRF_ColunaKanbanId] int NULL,
        [TRF_Titulo] nvarchar(300) NOT NULL,
        [TRF_Descricao] nvarchar(4000) NULL,
        [TRF_ResponsavelId] nvarchar(50) NULL,
        [TRF_CriadorId] nvarchar(50) NOT NULL,
        [TRF_Status] int NOT NULL,
        [TRF_Prioridade] int NOT NULL,
        [TRF_Ordem] int NOT NULL,
        [TRF_DataPrevisao] datetime2 NULL,
        [TRF_DataConclusao] datetime2 NULL,
        [TRF_HorasEstimadas] int NULL,
        [TRF_HorasRealizadas] int NULL,
        [TRF_Bloqueada] bit NOT NULL,
        [TRF_MotivoBloqueio] nvarchar(500) NULL,
        [TRF_UsuarioInclusao] nvarchar(50) NOT NULL,
        [TRF_DataInclusao] datetime2 NOT NULL,
        [TRF_UsuarioAlteracao] nvarchar(50) NULL,
        [TRF_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_IMPL_Tarefa] PRIMARY KEY ([TRF_Id]),
        CONSTRAINT [FK_IMPL_Tarefa_IMPL_ColunaKanban_TRF_ColunaKanbanId] FOREIGN KEY ([TRF_ColunaKanbanId]) REFERENCES [IMPL_ColunaKanban] ([CLK_Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_IMPL_Tarefa_IMPL_Etapa_TRF_EtapaId] FOREIGN KEY ([TRF_EtapaId]) REFERENCES [IMPL_Etapa] ([ETP_Id]) ON DELETE SET NULL,
        CONSTRAINT [FK_IMPL_Tarefa_IMPL_Projeto_TRF_ProjetoId] FOREIGN KEY ([TRF_ProjetoId]) REFERENCES [IMPL_Projeto] ([PRJ_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE TABLE [IMPL_ComentarioTarefa] (
        [CMT_Id] int NOT NULL IDENTITY,
        [CMT_TarefaId] int NOT NULL,
        [CMT_AutorId] nvarchar(50) NOT NULL,
        [CMT_Texto] nvarchar(4000) NOT NULL,
        [CMT_DataInclusao] datetime2 NOT NULL,
        CONSTRAINT [PK_IMPL_ComentarioTarefa] PRIMARY KEY ([CMT_Id]),
        CONSTRAINT [FK_IMPL_ComentarioTarefa_IMPL_Tarefa_CMT_TarefaId] FOREIGN KEY ([CMT_TarefaId]) REFERENCES [IMPL_Tarefa] ([TRF_Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Cliente_CLI_Nome] ON [IMPL_Cliente] ([CLI_Nome]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_ComentarioTarefa_CMT_TarefaId] ON [IMPL_ComentarioTarefa] ([CMT_TarefaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IMPL_Equipe_EQP_Nome] ON [IMPL_Equipe] ([EQP_Nome]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Etapa_ETP_TipoProjetoId] ON [IMPL_Etapa] ([ETP_TipoProjetoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IMPL_MembroEquipe_MBE_EquipeId_MBE_OperadorId] ON [IMPL_MembroEquipe] ([MBE_EquipeId], [MBE_OperadorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Projeto_PRJ_ClienteId] ON [IMPL_Projeto] ([PRJ_ClienteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IMPL_Projeto_PRJ_Codigo] ON [IMPL_Projeto] ([PRJ_Codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Projeto_PRJ_ColunaKanbanId] ON [IMPL_Projeto] ([PRJ_ColunaKanbanId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Projeto_PRJ_EquipeId] ON [IMPL_Projeto] ([PRJ_EquipeId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Projeto_PRJ_TipoProjetoId] ON [IMPL_Projeto] ([PRJ_TipoProjetoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_TRF_ColunaKanbanId] ON [IMPL_Tarefa] ([TRF_ColunaKanbanId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_TRF_EtapaId] ON [IMPL_Tarefa] ([TRF_EtapaId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_TRF_ProjetoId] ON [IMPL_Tarefa] ([TRF_ProjetoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE UNIQUE INDEX [IX_IMPL_TipoProjeto_TPP_Codigo] ON [IMPL_TipoProjeto] ([TPP_Codigo]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_IMPL_TipoProjeto_TPP_EquipeId] ON [IMPL_TipoProjeto] ([TPP_EquipeId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_OperadorId] ON [RefreshTokens] ([OperadorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    CREATE INDEX [IX_RefreshTokens_TokenHash] ON [RefreshTokens] ([TokenHash]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260904194350_ImplantacaoInit'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260904194350_ImplantacaoInit', N'8.0.30');
END;
GO

COMMIT;
GO

