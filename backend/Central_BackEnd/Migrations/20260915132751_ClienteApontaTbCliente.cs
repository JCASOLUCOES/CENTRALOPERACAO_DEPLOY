using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class ClienteApontaTbCliente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId",
                table: "IMPL_Projeto");

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Projeto_tbcliente_PRJ_ClienteId",
                table: "IMPL_Projeto",
                column: "PRJ_ClienteId",
                principalTable: "tbcliente",
                principalColumn: "CLIENTE_ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Projeto_tbcliente_PRJ_ClienteId",
                table: "IMPL_Projeto");

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Projeto_IMPL_Cliente_PRJ_ClienteId",
                table: "IMPL_Projeto",
                column: "PRJ_ClienteId",
                principalTable: "IMPL_Cliente",
                principalColumn: "CLI_Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
