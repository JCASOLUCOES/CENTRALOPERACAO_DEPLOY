using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddFuncaoTableAndRelation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tbfuncao",
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
                    table.PrimaryKey("PK_tbfuncao", x => x.FUNCAO_ID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TBOPERADOR_FUNCAO_ID",
                table: "TBOPERADOR",
                column: "FUNCAO_ID");

            migrationBuilder.AddForeignKey(
                name: "FK_TBOPERADOR_tbfuncao_FUNCAO_ID",
                table: "TBOPERADOR",
                column: "FUNCAO_ID",
                principalTable: "tbfuncao",
                principalColumn: "FUNCAO_ID",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TBOPERADOR_tbfuncao_FUNCAO_ID",
                table: "TBOPERADOR");

            migrationBuilder.DropTable(
                name: "tbfuncao");

            migrationBuilder.DropIndex(
                name: "IX_TBOPERADOR_FUNCAO_ID",
                table: "TBOPERADOR");
        }
    }
}
