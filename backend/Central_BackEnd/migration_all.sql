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
    VALUES (N'20260904194350_ImplantacaoInit', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905195554_AddLegadoLinks'
)
BEGIN
    ALTER TABLE [IMPL_Tarefa] ADD [TRF_ChamadoLegadoId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905195554_AddLegadoLinks'
)
BEGIN
    ALTER TABLE [IMPL_Projeto] ADD [PRJ_ClienteLegadoId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905195554_AddLegadoLinks'
)
BEGIN
    CREATE INDEX [IX_IMPL_Tarefa_ChamadoLegadoId] ON [IMPL_Tarefa] ([TRF_ChamadoLegadoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905195554_AddLegadoLinks'
)
BEGIN
    CREATE INDEX [IX_IMPL_Projeto_ClienteLegadoId] ON [IMPL_Projeto] ([PRJ_ClienteLegadoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905195554_AddLegadoLinks'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260905195554_AddLegadoLinks', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905203422_AddAgendaAndPerfis'
)
BEGIN
    CREATE TABLE [IMPL_Agenda] (
        [AGD_Id] int NOT NULL IDENTITY,
        [AGD_OperadorId] nvarchar(15) NOT NULL,
        [AGD_Titulo] nvarchar(200) NOT NULL,
        [AGD_Descricao] nvarchar(2000) NULL,
        [AGD_Local] nvarchar(200) NULL,
        [AGD_DataInicio] datetime2 NOT NULL,
        [AGD_DataFim] datetime2 NULL,
        [AGD_DiaInteiro] bit NOT NULL,
        [AGD_Cor] nvarchar(20) NULL,
        [AGD_Tipo] int NOT NULL,
        [AGD_Visibilidade] int NOT NULL,
        [AGD_ProjetoId] int NULL,
        [AGD_Recorrente] bit NOT NULL,
        [AGD_PadraoRecorrencia] int NOT NULL,
        [AGD_UsuarioInclusao] nvarchar(15) NULL,
        [AGD_DataInclusao] datetime2 NOT NULL,
        [AGD_UsuarioAlteracao] nvarchar(15) NULL,
        [AGD_DataAlteracao] datetime2 NULL,
        CONSTRAINT [PK_IMPL_Agenda] PRIMARY KEY ([AGD_Id]),
        CONSTRAINT [FK_IMPL_Agenda_IMPL_Projeto_AGD_ProjetoId] FOREIGN KEY ([AGD_ProjetoId]) REFERENCES [IMPL_Projeto] ([PRJ_Id]) ON DELETE SET NULL
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905203422_AddAgendaAndPerfis'
)
BEGIN
    CREATE INDEX [IX_IMPL_Agenda_AGD_DataInicio] ON [IMPL_Agenda] ([AGD_DataInicio]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905203422_AddAgendaAndPerfis'
)
BEGIN
    CREATE INDEX [IX_IMPL_Agenda_AGD_OperadorId] ON [IMPL_Agenda] ([AGD_OperadorId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905203422_AddAgendaAndPerfis'
)
BEGIN
    CREATE INDEX [IX_IMPL_Agenda_AGD_ProjetoId] ON [IMPL_Agenda] ([AGD_ProjetoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260905203422_AddAgendaAndPerfis'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260905203422_AddAgendaAndPerfis', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260906033406_AddAuditoriaImplantacao'
)
BEGIN
    CREATE TABLE [IMPL_Auditoria] (
        [AUD_Id] int NOT NULL IDENTITY,
        [AUD_Entidade] nvarchar(50) NOT NULL,
        [AUD_EntidadeId] int NOT NULL,
        [AUD_Acao] nvarchar(20) NOT NULL,
        [AUD_AntesJson] nvarchar(max) NULL,
        [AUD_DepoisJson] nvarchar(max) NULL,
        [AUD_Usuario] nvarchar(15) NULL,
        [AUD_Data] datetime2 NOT NULL,
        [AUD_Observacao] nvarchar(500) NULL,
        CONSTRAINT [PK_IMPL_Auditoria] PRIMARY KEY ([AUD_Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260906033406_AddAuditoriaImplantacao'
)
BEGIN
    CREATE INDEX [IX_IMPL_Auditoria_AUD_Data] ON [IMPL_Auditoria] ([AUD_Data]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260906033406_AddAuditoriaImplantacao'
)
BEGIN
    CREATE INDEX [IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId] ON [IMPL_Auditoria] ([AUD_Entidade], [AUD_EntidadeId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260906033406_AddAuditoriaImplantacao'
)
BEGIN
    CREATE INDEX [IX_IMPL_Auditoria_AUD_Usuario] ON [IMPL_Auditoria] ([AUD_Usuario]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260906033406_AddAuditoriaImplantacao'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260906033406_AddAuditoriaImplantacao', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260910163216_AddFuncao'
)
BEGIN
    ALTER TABLE [TBOPERADOR] ADD [FUNCAO_ID] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260910163216_AddFuncao'
)
BEGIN
    CREATE TABLE [CC_Funcao] (
        [FUNCAO_ID] int NOT NULL IDENTITY,
        [DESCRICAO] varchar(100) NOT NULL,
        [CLASSIFICACAO] varchar(50) NULL,
        [ATIVO] bit NOT NULL,
        CONSTRAINT [PK_CC_Funcao] PRIMARY KEY ([FUNCAO_ID])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260910163216_AddFuncao'
)
BEGIN
    CREATE INDEX [IX_TBOPERADOR_FUNCAO_ID] ON [TBOPERADOR] ([FUNCAO_ID]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260910163216_AddFuncao'
)
BEGIN
    ALTER TABLE [TBOPERADOR] ADD CONSTRAINT [FK_TBOPERADOR_CC_Funcao_FUNCAO_ID] FOREIGN KEY ([FUNCAO_ID]) REFERENCES [CC_Funcao] ([FUNCAO_ID]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260910163216_AddFuncao'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260910163216_AddFuncao', N'8.0.31');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    ALTER TABLE [IMPL_Agenda] ADD [AGD_TipoId] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE TABLE [CC_AgendaParticipante] (
        [Id] int NOT NULL IDENTITY,
        [AgendaId] int NOT NULL,
        [ParticipanteId] varchar(15) NOT NULL,
        [CriadoEm] datetime2 NOT NULL,
        CONSTRAINT [PK_CC_AgendaParticipante] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_CC_AgendaParticipante_IMPL_Agenda_AgendaId] FOREIGN KEY ([AgendaId]) REFERENCES [IMPL_Agenda] ([AGD_Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_CC_AgendaParticipante_TBOPERADOR_ParticipanteId] FOREIGN KEY ([ParticipanteId]) REFERENCES [TBOPERADOR] ([OPERADOR_ID]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE TABLE [CC_TipoEvento] (
        [Id] int NOT NULL IDENTITY,
        [Nome] nvarchar(50) NOT NULL,
        [Cor] nvarchar(7) NULL,
        [Ativo] bit NOT NULL,
        CONSTRAINT [PK_CC_TipoEvento] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE INDEX [IX_IMPL_Agenda_AGD_TipoId] ON [IMPL_Agenda] ([AGD_TipoId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CC_AgendaParticipante_AgendaId_ParticipanteId] ON [CC_AgendaParticipante] ([AgendaId], [ParticipanteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE INDEX [IX_CC_AgendaParticipante_ParticipanteId] ON [CC_AgendaParticipante] ([ParticipanteId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    CREATE UNIQUE INDEX [IX_CC_TipoEvento_Nome] ON [CC_TipoEvento] ([Nome]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    ALTER TABLE [IMPL_Agenda] ADD CONSTRAINT [FK_IMPL_Agenda_CC_TipoEvento_AGD_TipoId] FOREIGN KEY ([AGD_TipoId]) REFERENCES [CC_TipoEvento] ([Id]) ON DELETE SET NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260911215943_AgendaV2_Ajuste'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260911215943_AgendaV2_Ajuste', N'8.0.31');
END;
GO

COMMIT;
GO

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
    DECLARE @var2 sysname;
    SELECT @var2 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[IMPL_Tarefa]') AND [c].[name] = N'TRF_ProjetoId');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [IMPL_Tarefa] DROP CONSTRAINT [' + @var2 + '];');
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

