using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class TarefaProjetoEtapaId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_ProjetoEtapaId");

            // NO ACTION (não SET NULL): SQL Server barra múltiplos caminhos em
            // cascata (IMPL_Projeto → IMPL_Tarefa direto + via tbprojetoEtapa).
            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa",
                column: "TRF_ProjetoEtapaId",
                principalTable: "tbprojetoEtapa",
                principalColumn: "PEP_Id",
                onDelete: ReferentialAction.NoAction);

            // Backfill: liga tarefas existentes à etapa fixa do mesmo projeto
            // por nome conhecido. Demais casos ficam NULL (sem card fixo).
            migrationBuilder.Sql(@"
                UPDATE t
                SET t.TRF_ProjetoEtapaId = pe.PEP_Id
                FROM IMPL_Tarefa t
                JOIN IMPL_Etapa e ON e.ETP_Id = t.TRF_EtapaId
                JOIN tbprojetoEtapa pe ON pe.PEP_ProjetoId = t.TRF_ProjetoId
                    AND (e.ETP_Nome = pe.PEP_Nome
                         OR (e.ETP_Nome = 'HOMOLOGACAO' AND pe.PEP_Nome = 'HOMOLOGAÇÃO'))
                WHERE t.TRF_ProjetoId IS NOT NULL
                  AND t.TRF_ProjetoEtapaId IS NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_Tarefa_TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa");

            migrationBuilder.DropColumn(
                name: "TRF_ProjetoEtapaId",
                table: "IMPL_Tarefa");
        }
    }
}
