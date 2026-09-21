using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AgendaConflitoHorarios : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Agenda_Operador_DataInicio_DataFim",
                table: "IMPL_Agenda",
                columns: new[] { "AGD_OperadorId", "AGD_DataInicio", "AGD_DataFim" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IMPL_Agenda_Operador_DataInicio_DataFim",
                table: "IMPL_Agenda");
        }
    }
}
