using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddFuncao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FUNCAO_ID",
                table: "TBOPERADOR",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CC_Funcao",
                columns: table => new
                {
                    FUNCAO_ID = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DESCRICAO = table.Column<string>(type: "varchar(100)", unicode: false, maxLength: 100, nullable: false),
                    CLASSIFICACAO = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: true),
                    ATIVO = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CC_Funcao", x => x.FUNCAO_ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TBOPERADOR_FUNCAO_ID",
                table: "TBOPERADOR",
                column: "FUNCAO_ID");

            migrationBuilder.AddForeignKey(
                name: "FK_TBOPERADOR_CC_Funcao_FUNCAO_ID",
                table: "TBOPERADOR",
                column: "FUNCAO_ID",
                principalTable: "CC_Funcao",
                principalColumn: "FUNCAO_ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TBOPERADOR_CC_Funcao_FUNCAO_ID",
                table: "TBOPERADOR");

            migrationBuilder.DropTable(
                name: "CC_Funcao");

            migrationBuilder.DropIndex(
                name: "IX_TBOPERADOR_FUNCAO_ID",
                table: "TBOPERADOR");

            migrationBuilder.DropColumn(
                name: "FUNCAO_ID",
                table: "TBOPERADOR");
        }
    }
}
