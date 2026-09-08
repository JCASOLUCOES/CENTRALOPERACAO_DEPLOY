using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddAgendaAndPerfis : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IMPL_Agenda",
                columns: table => new
                {
                    AGD_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AGD_OperadorId = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    AGD_Titulo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AGD_Descricao = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AGD_Local = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AGD_DataInicio = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AGD_DataFim = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AGD_DiaInteiro = table.Column<bool>(type: "bit", nullable: false),
                    AGD_Cor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    AGD_Tipo = table.Column<int>(type: "int", nullable: false),
                    AGD_Visibilidade = table.Column<int>(type: "int", nullable: false),
                    AGD_ProjetoId = table.Column<int>(type: "int", nullable: true),
                    AGD_Recorrente = table.Column<bool>(type: "bit", nullable: false),
                    AGD_PadraoRecorrencia = table.Column<int>(type: "int", nullable: false),
                    AGD_UsuarioInclusao = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    AGD_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AGD_UsuarioAlteracao = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    AGD_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Agenda", x => x.AGD_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_Agenda_IMPL_Projeto_AGD_ProjetoId",
                        column: x => x.AGD_ProjetoId,
                        principalTable: "IMPL_Projeto",
                        principalColumn: "PRJ_Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Agenda_AGD_DataInicio",
                table: "IMPL_Agenda",
                column: "AGD_DataInicio");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Agenda_AGD_OperadorId",
                table: "IMPL_Agenda",
                column: "AGD_OperadorId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Agenda_AGD_ProjetoId",
                table: "IMPL_Agenda",
                column: "AGD_ProjetoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMPL_Agenda");
        }
    }
}
