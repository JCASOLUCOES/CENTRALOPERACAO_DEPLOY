using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddProjetoEtapas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbprojetoEtapa",
                columns: table => new
                {
                    PEP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PEP_ProjetoId = table.Column<int>(type: "int", nullable: false),
                    PEP_Ordem = table.Column<int>(type: "int", nullable: false),
                    PEP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PEP_Estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PEP_Percentual = table.Column<int>(type: "int", nullable: false),
                    PEP_DataInicio = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PEP_DataFimPrevista = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PEP_DataFimReal = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PEP_AtrasoDias = table.Column<int>(type: "int", nullable: true),
                    PEP_ResponsavelId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PEP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PEP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PEP_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PEP_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbprojetoEtapa", x => x.PEP_Id);
                    table.ForeignKey(
                        name: "FK_tbprojetoEtapa_IMPL_Projeto_PEP_ProjetoId",
                        column: x => x.PEP_ProjetoId,
                        principalTable: "IMPL_Projeto",
                        principalColumn: "PRJ_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbprojetoEtapaChecklist",
                columns: table => new
                {
                    PEC_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PEC_ProjetoEtapaId = table.Column<int>(type: "int", nullable: false),
                    PEC_Descricao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PEC_Concluido = table.Column<bool>(type: "bit", nullable: false),
                    PEC_DataConclusao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PEC_UsuarioConclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PEC_Ordem = table.Column<int>(type: "int", nullable: false),
                    PEC_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PEC_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PEC_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PEC_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbprojetoEtapaChecklist", x => x.PEC_Id);
                    table.ForeignKey(
                        name: "FK_tbprojetoEtapaChecklist_tbprojetoEtapa_PEC_ProjetoEtapaId",
                        column: x => x.PEC_ProjetoEtapaId,
                        principalTable: "tbprojetoEtapa",
                        principalColumn: "PEP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbprojetoEtapaComentario",
                columns: table => new
                {
                    PEC_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PEC_ProjetoEtapaId = table.Column<int>(type: "int", nullable: false),
                    PEC_Texto = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    PEC_Usuario = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PEC_Data = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbprojetoEtapaComentario", x => x.PEC_Id);
                    table.ForeignKey(
                        name: "FK_tbprojetoEtapaComentario_tbprojetoEtapa_PEC_ProjetoEtapaId",
                        column: x => x.PEC_ProjetoEtapaId,
                        principalTable: "tbprojetoEtapa",
                        principalColumn: "PEP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbprojetoEtapaDocumento",
                columns: table => new
                {
                    PED_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PED_ProjetoEtapaId = table.Column<int>(type: "int", nullable: false),
                    PED_Nome = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PED_Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    PED_Descricao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PED_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PED_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbprojetoEtapaDocumento", x => x.PED_Id);
                    table.ForeignKey(
                        name: "FK_tbprojetoEtapaDocumento_tbprojetoEtapa_PED_ProjetoEtapaId",
                        column: x => x.PED_ProjetoEtapaId,
                        principalTable: "tbprojetoEtapa",
                        principalColumn: "PEP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tbprojetoEtapaHistorico",
                columns: table => new
                {
                    PEH_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PEH_ProjetoEtapaId = table.Column<int>(type: "int", nullable: false),
                    PEH_Acao = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    PEH_Detalhes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    PEH_Usuario = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PEH_Data = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tbprojetoEtapaHistorico", x => x.PEH_Id);
                    table.ForeignKey(
                        name: "FK_tbprojetoEtapaHistorico_tbprojetoEtapa_PEH_ProjetoEtapaId",
                        column: x => x.PEH_ProjetoEtapaId,
                        principalTable: "tbprojetoEtapa",
                        principalColumn: "PEP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem",
                table: "tbprojetoEtapa",
                columns: new[] { "PEP_ProjetoId", "PEP_Ordem" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId",
                table: "tbprojetoEtapaChecklist",
                column: "PEC_ProjetoEtapaId");

            migrationBuilder.CreateIndex(
                name: "IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId",
                table: "tbprojetoEtapaComentario",
                column: "PEC_ProjetoEtapaId");

            migrationBuilder.CreateIndex(
                name: "IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId",
                table: "tbprojetoEtapaDocumento",
                column: "PED_ProjetoEtapaId");

            migrationBuilder.CreateIndex(
                name: "IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId",
                table: "tbprojetoEtapaHistorico",
                column: "PEH_ProjetoEtapaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tbprojetoEtapaChecklist");

            migrationBuilder.DropTable(
                name: "tbprojetoEtapaComentario");

            migrationBuilder.DropTable(
                name: "tbprojetoEtapaDocumento");

            migrationBuilder.DropTable(
                name: "tbprojetoEtapaHistorico");

            migrationBuilder.DropTable(
                name: "tbprojetoEtapa");
        }
    }
}
