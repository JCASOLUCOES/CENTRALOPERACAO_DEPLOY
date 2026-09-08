using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddLegadoLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TRF_ChamadoLegadoId",
                table: "IMPL_Tarefa",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PRJ_ClienteLegadoId",
                table: "IMPL_Projeto",
                type: "int",
                nullable: true);

            // Indices para joins rapidos (sem FK constraint formal para nao
            // bloquear inserts quando o ID legado for removido). A integridade
            // referencial e validada em tempo de execucao no BackendService.
            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_ChamadoLegadoId",
                table: "IMPL_Tarefa",
                column: "TRF_ChamadoLegadoId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_ClienteLegadoId",
                table: "IMPL_Projeto",
                column: "PRJ_ClienteLegadoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IMPL_Tarefa_ChamadoLegadoId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_Projeto_ClienteLegadoId",
                table: "IMPL_Projeto");

            migrationBuilder.DropColumn(
                name: "TRF_ChamadoLegadoId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropColumn(
                name: "PRJ_ClienteLegadoId",
                table: "IMPL_Projeto");
        }
    }
}
