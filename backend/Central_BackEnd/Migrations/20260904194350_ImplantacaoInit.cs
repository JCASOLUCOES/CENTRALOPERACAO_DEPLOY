using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class ImplantacaoInit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditoriaAcessos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Usuario = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Empresa = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false),
                    TipoInformacao = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    DataAcesso = table.Column<DateTime>(type: "datetime2", nullable: false),
                    HoraAcesso = table.Column<TimeSpan>(type: "time", nullable: false),
                    EnderecoIP = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Navegador = table.Column<string>(type: "varchar(200)", unicode: false, maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditoriaAcessos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_Cliente",
                columns: table => new
                {
                    CLI_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CLI_Nome = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CLI_Cnpj = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CLI_Contato = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CLI_Observacao = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CLI_Ativo = table.Column<bool>(type: "bit", nullable: false),
                    CLI_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CLI_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CLI_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CLI_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Cliente", x => x.CLI_Id);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_ColunaKanban",
                columns: table => new
                {
                    CLK_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CLK_Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CLK_Ordem = table.Column<int>(type: "int", nullable: false),
                    CLK_LimiteWip = table.Column<int>(type: "int", nullable: true),
                    CLK_Cor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CLK_Padrao = table.Column<bool>(type: "bit", nullable: false),
                    CLK_Ativa = table.Column<bool>(type: "bit", nullable: false),
                    CLK_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CLK_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_ColunaKanban", x => x.CLK_Id);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_Equipe",
                columns: table => new
                {
                    EQP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EQP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EQP_Descricao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EQP_PrefixoCodigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EQP_Ativa = table.Column<bool>(type: "bit", nullable: false),
                    EQP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EQP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Equipe", x => x.EQP_Id);
                });

            migrationBuilder.CreateTable(
                name: "TBOPERADOR",
                columns: table => new
                {
                    OPERADOR_ID = table.Column<string>(type: "varchar(15)", unicode: false, maxLength: 15, nullable: false),
                    NOME = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    SENHA = table.Column<string>(type: "varchar(10)", unicode: false, maxLength: 10, nullable: true),
                    EMAIL = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: true),
                    SE_ADMIN = table.Column<bool>(type: "bit", nullable: true),
                    SE_ATIVO = table.Column<string>(type: "varchar(1)", unicode: false, maxLength: 1, nullable: true),
                    PERFIL_SKIN = table.Column<string>(type: "varchar(20)", unicode: false, maxLength: 20, nullable: true),
                    DATA_ULTIMO_ACESSO = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DATA_INCLUSAO = table.Column<DateTime>(type: "datetime2", nullable: true),
                    USUARIO_INCLUSAO = table.Column<string>(type: "varchar(15)", unicode: false, maxLength: 15, nullable: true),
                    DATA_ALTERACAO = table.Column<DateTime>(type: "datetime2", nullable: true),
                    USUARIO_ALTERACAO = table.Column<string>(type: "varchar(15)", unicode: false, maxLength: 15, nullable: true),
                    PERFIL_ID = table.Column<string>(type: "varchar(1)", unicode: false, maxLength: 1, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TBOPERADOR", x => x.OPERADOR_ID);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_MembroEquipe",
                columns: table => new
                {
                    MBE_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MBE_EquipeId = table.Column<int>(type: "int", nullable: false),
                    MBE_OperadorId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    MBE_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_MembroEquipe", x => x.MBE_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_MembroEquipe_IMPL_Equipe_MBE_EquipeId",
                        column: x => x.MBE_EquipeId,
                        principalTable: "IMPL_Equipe",
                        principalColumn: "EQP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_TipoProjeto",
                columns: table => new
                {
                    TPP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TPP_Codigo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TPP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    TPP_EquipeId = table.Column<int>(type: "int", nullable: true),
                    TPP_ClienteObrigatorio = table.Column<bool>(type: "bit", nullable: false),
                    TPP_Ordem = table.Column<int>(type: "int", nullable: false),
                    TPP_Ativo = table.Column<bool>(type: "bit", nullable: false),
                    TPP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TPP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_TipoProjeto", x => x.TPP_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_TipoProjeto_IMPL_Equipe_TPP_EquipeId",
                        column: x => x.TPP_EquipeId,
                        principalTable: "IMPL_Equipe",
                        principalColumn: "EQP_Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TokenHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OperadorId = table.Column<string>(type: "varchar(15)", unicode: false, maxLength: 15, nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Revogado = table.Column<bool>(type: "bit", nullable: false),
                    SubstituidoPor = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_TBOPERADOR_OperadorId",
                        column: x => x.OperadorId,
                        principalTable: "TBOPERADOR",
                        principalColumn: "OPERADOR_ID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_Etapa",
                columns: table => new
                {
                    ETP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ETP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ETP_Ordem = table.Column<int>(type: "int", nullable: false),
                    ETP_TipoProjetoId = table.Column<int>(type: "int", nullable: true),
                    ETP_Concluida = table.Column<bool>(type: "bit", nullable: false),
                    ETP_Cor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ETP_Ativa = table.Column<bool>(type: "bit", nullable: false),
                    ETP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ETP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Etapa", x => x.ETP_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_Etapa_IMPL_TipoProjeto_ETP_TipoProjetoId",
                        column: x => x.ETP_TipoProjetoId,
                        principalTable: "IMPL_TipoProjeto",
                        principalColumn: "TPP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_Projeto",
                columns: table => new
                {
                    PRJ_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PRJ_Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PRJ_Nome = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PRJ_Descricao = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    PRJ_EquipeId = table.Column<int>(type: "int", nullable: false),
                    PRJ_TipoProjetoId = table.Column<int>(type: "int", nullable: false),
                    PRJ_ClienteId = table.Column<int>(type: "int", nullable: true),
                    PRJ_ResponsavelId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PRJ_CriadorId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PRJ_Status = table.Column<int>(type: "int", nullable: false),
                    PRJ_ColunaKanbanId = table.Column<int>(type: "int", nullable: true),
                    PRJ_Prioridade = table.Column<int>(type: "int", nullable: false),
                    PRJ_Progresso = table.Column<int>(type: "int", nullable: false),
                    PRJ_DataInicio = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PRJ_DataPrevisao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PRJ_DataConclusao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PRJ_DataGoLivePrevista = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PRJ_DataGoLiveReal = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PRJ_HorasPlanejadas = table.Column<int>(type: "int", nullable: true),
                    PRJ_HorasRealizadas = table.Column<int>(type: "int", nullable: true),
                    PRJ_Observacao = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PRJ_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PRJ_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PRJ_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PRJ_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Projeto", x => x.PRJ_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId",
                        column: x => x.PRJ_ClienteId,
                        principalTable: "IMPL_Cliente",
                        principalColumn: "CLI_Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IMPL_Projeto_IMPL_ColunaKanban_PRJ_ColunaKanbanId",
                        column: x => x.PRJ_ColunaKanbanId,
                        principalTable: "IMPL_ColunaKanban",
                        principalColumn: "CLK_Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IMPL_Projeto_IMPL_Equipe_PRJ_EquipeId",
                        column: x => x.PRJ_EquipeId,
                        principalTable: "IMPL_Equipe",
                        principalColumn: "EQP_Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId",
                        column: x => x.PRJ_TipoProjetoId,
                        principalTable: "IMPL_TipoProjeto",
                        principalColumn: "TPP_Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_Tarefa",
                columns: table => new
                {
                    TRF_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TRF_ProjetoId = table.Column<int>(type: "int", nullable: false),
                    TRF_EtapaId = table.Column<int>(type: "int", nullable: true),
                    TRF_ColunaKanbanId = table.Column<int>(type: "int", nullable: true),
                    TRF_Titulo = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    TRF_Descricao = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    TRF_ResponsavelId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TRF_CriadorId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TRF_Status = table.Column<int>(type: "int", nullable: false),
                    TRF_Prioridade = table.Column<int>(type: "int", nullable: false),
                    TRF_Ordem = table.Column<int>(type: "int", nullable: false),
                    TRF_DataPrevisao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TRF_DataConclusao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TRF_HorasEstimadas = table.Column<int>(type: "int", nullable: true),
                    TRF_HorasRealizadas = table.Column<int>(type: "int", nullable: true),
                    TRF_Bloqueada = table.Column<bool>(type: "bit", nullable: false),
                    TRF_MotivoBloqueio = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TRF_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TRF_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TRF_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    TRF_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Tarefa", x => x.TRF_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_Tarefa_IMPL_ColunaKanban_TRF_ColunaKanbanId",
                        column: x => x.TRF_ColunaKanbanId,
                        principalTable: "IMPL_ColunaKanban",
                        principalColumn: "CLK_Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IMPL_Tarefa_IMPL_Etapa_TRF_EtapaId",
                        column: x => x.TRF_EtapaId,
                        principalTable: "IMPL_Etapa",
                        principalColumn: "ETP_Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_IMPL_Tarefa_IMPL_Projeto_TRF_ProjetoId",
                        column: x => x.TRF_ProjetoId,
                        principalTable: "IMPL_Projeto",
                        principalColumn: "PRJ_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_ComentarioTarefa",
                columns: table => new
                {
                    CMT_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CMT_TarefaId = table.Column<int>(type: "int", nullable: false),
                    CMT_AutorId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CMT_Texto = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CMT_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_ComentarioTarefa", x => x.CMT_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_ComentarioTarefa_IMPL_Tarefa_CMT_TarefaId",
                        column: x => x.CMT_TarefaId,
                        principalTable: "IMPL_Tarefa",
                        principalColumn: "TRF_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Cliente_CLI_Nome",
                table: "IMPL_Cliente",
                column: "CLI_Nome");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_ComentarioTarefa_CMT_TarefaId",
                table: "IMPL_ComentarioTarefa",
                column: "CMT_TarefaId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Equipe_EQP_Nome",
                table: "IMPL_Equipe",
                column: "EQP_Nome",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Etapa_ETP_TipoProjetoId",
                table: "IMPL_Etapa",
                column: "ETP_TipoProjetoId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_MembroEquipe_MBE_EquipeId_MBE_OperadorId",
                table: "IMPL_MembroEquipe",
                columns: new[] { "MBE_EquipeId", "MBE_OperadorId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_ClienteId",
                table: "IMPL_Projeto",
                column: "PRJ_ClienteId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_Codigo",
                table: "IMPL_Projeto",
                column: "PRJ_Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_ColunaKanbanId",
                table: "IMPL_Projeto",
                column: "PRJ_ColunaKanbanId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_EquipeId",
                table: "IMPL_Projeto",
                column: "PRJ_EquipeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_TipoProjetoId",
                table: "IMPL_Projeto",
                column: "PRJ_TipoProjetoId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_TRF_ColunaKanbanId",
                table: "IMPL_Tarefa",
                column: "TRF_ColunaKanbanId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_TRF_EtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_EtapaId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_TRF_ProjetoId",
                table: "IMPL_Tarefa",
                column: "TRF_ProjetoId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TipoProjeto_TPP_Codigo",
                table: "IMPL_TipoProjeto",
                column: "TPP_Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TipoProjeto_TPP_EquipeId",
                table: "IMPL_TipoProjeto",
                column: "TPP_EquipeId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_OperadorId",
                table: "RefreshTokens",
                column: "OperadorId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditoriaAcessos");

            migrationBuilder.DropTable(
                name: "IMPL_ComentarioTarefa");

            migrationBuilder.DropTable(
                name: "IMPL_MembroEquipe");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "IMPL_Tarefa");

            migrationBuilder.DropTable(
                name: "TBOPERADOR");

            migrationBuilder.DropTable(
                name: "IMPL_Etapa");

            migrationBuilder.DropTable(
                name: "IMPL_Projeto");

            migrationBuilder.DropTable(
                name: "IMPL_Cliente");

            migrationBuilder.DropTable(
                name: "IMPL_ColunaKanban");

            migrationBuilder.DropTable(
                name: "IMPL_TipoProjeto");

            migrationBuilder.DropTable(
                name: "IMPL_Equipe");
        }
    }
}
