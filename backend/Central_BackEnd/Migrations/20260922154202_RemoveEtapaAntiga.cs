using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEtapaAntiga : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Tarefa_IMPL_Etapa_TRF_EtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropTable(
                name: "IMPL_Etapa");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_Tarefa_TRF_EtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropColumn(
                name: "TRF_EtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_ProjetoEtapaId",
                principalTable: "tbprojetoEtapa",
                principalColumn: "PEP_Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.AddColumn<int>(
                name: "TRF_EtapaId",
                table: "IMPL_Tarefa",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "IMPL_Etapa",
                columns: table => new
                {
                    ETP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ETP_TipoProjetoId = table.Column<int>(type: "int", nullable: true),
                    ETP_Ativa = table.Column<bool>(type: "bit", nullable: false),
                    ETP_Concluida = table.Column<bool>(type: "bit", nullable: false),
                    ETP_Cor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ETP_DataAlteracao = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ETP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ETP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ETP_Ordem = table.Column<int>(type: "int", nullable: false),
                    ETP_UsuarioAlteracao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    ETP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
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

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_TRF_EtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_EtapaId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Etapa_ETP_TipoProjetoId",
                table: "IMPL_Etapa",
                column: "ETP_TipoProjetoId");

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Tarefa_IMPL_Etapa_TRF_EtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_EtapaId",
                principalTable: "IMPL_Etapa",
                principalColumn: "ETP_Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_ProjetoEtapaId",
                principalTable: "tbprojetoEtapa",
                principalColumn: "PEP_Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
