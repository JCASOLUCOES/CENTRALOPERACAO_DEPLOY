using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditoriaImplantacao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "IMPL_Auditoria",
                columns: table => new
                {
                    AUD_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AUD_Entidade = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AUD_EntidadeId = table.Column<int>(type: "int", nullable: false),
                    AUD_Acao = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AUD_AntesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AUD_DepoisJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AUD_Usuario = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: true),
                    AUD_Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AUD_Observacao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Auditoria", x => x.AUD_Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Auditoria_AUD_Data",
                table: "IMPL_Auditoria",
                column: "AUD_Data");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId",
                table: "IMPL_Auditoria",
                columns: new[] { "AUD_Entidade", "AUD_EntidadeId" });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Auditoria_AUD_Usuario",
                table: "IMPL_Auditoria",
                column: "AUD_Usuario");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "IMPL_Auditoria");
        }
    }
}
