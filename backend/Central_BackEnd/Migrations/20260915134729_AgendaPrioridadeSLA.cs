using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AgendaPrioridadeSLA : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AGD_Prioridade",
                table: "IMPL_Agenda",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "AGD_SLAMinutos",
                table: "IMPL_Agenda",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AGD_Prioridade",
                table: "IMPL_Agenda");

            migrationBuilder.DropColumn(
                name: "AGD_SLAMinutos",
                table: "IMPL_Agenda");
        }
    }
}
