using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class TarefaEvolucaoResponsaveisChamadosHoras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "TRF_DataEntrega",
                table: "IMPL_Tarefa",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TRF_TipoTarefa",
                table: "IMPL_Tarefa",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "IMPL_TarefaApontamento",
                columns: table => new
                {
                    APT_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TRF_Id = table.Column<int>(type: "int", nullable: false),
                    OPERADOR_ID = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    APT_Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                    APT_Horas = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    APT_Observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    APT_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    APT_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_TarefaApontamento", x => x.APT_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_TarefaApontamento_IMPL_Tarefa_TRF_Id",
                        column: x => x.TRF_Id,
                        principalTable: "IMPL_Tarefa",
                        principalColumn: "TRF_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_TarefaChamado",
                columns: table => new
                {
                    TRF_Id = table.Column<int>(type: "int", nullable: false),
                    CHAMADO_ID = table.Column<int>(type: "int", nullable: false),
                    TRF_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TRF_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_TarefaChamado", x => new { x.TRF_Id, x.CHAMADO_ID });
                    table.ForeignKey(
                        name: "FK_IMPL_TarefaChamado_IMPL_Tarefa_TRF_Id",
                        column: x => x.TRF_Id,
                        principalTable: "IMPL_Tarefa",
                        principalColumn: "TRF_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_TarefaResponsavel",
                columns: table => new
                {
                    TRF_Id = table.Column<int>(type: "int", nullable: false),
                    OPERADOR_ID = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TRF_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TRF_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_TarefaResponsavel", x => new { x.TRF_Id, x.OPERADOR_ID });
                    table.ForeignKey(
                        name: "FK_IMPL_TarefaResponsavel_IMPL_Tarefa_TRF_Id",
                        column: x => x.TRF_Id,
                        principalTable: "IMPL_Tarefa",
                        principalColumn: "TRF_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TarefaApontamento_TRF_Id_APT_Data",
                table: "IMPL_TarefaApontamento",
                columns: new[] { "TRF_Id", "APT_Data" });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TarefaChamado_CHAMADO_ID",
                table: "IMPL_TarefaChamado",
                column: "CHAMADO_ID");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TarefaResponsavel_OPERADOR_ID",
                table: "IMPL_TarefaResponsavel",
                column: "OPERADOR_ID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMPL_TarefaApontamento");

            migrationBuilder.DropTable(
                name: "IMPL_TarefaChamado");

            migrationBuilder.DropTable(
                name: "IMPL_TarefaResponsavel");

            migrationBuilder.DropColumn(
                name: "TRF_DataEntrega",
                table: "IMPL_Tarefa");

            migrationBuilder.DropColumn(
                name: "TRF_TipoTarefa",
                table: "IMPL_Tarefa");
        }
    }
}
