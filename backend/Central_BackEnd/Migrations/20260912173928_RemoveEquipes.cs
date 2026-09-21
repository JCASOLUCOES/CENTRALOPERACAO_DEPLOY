using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEquipes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Projeto_IMPL_Equipe_PRJ_EquipeId",
                table: "IMPL_Projeto");

            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId",
                table: "IMPL_Projeto");

            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_TipoProjeto_IMPL_Equipe_TPP_EquipeId",
                table: "IMPL_TipoProjeto");

            migrationBuilder.DropTable(
                name: "IMPL_MembroEquipe");

            migrationBuilder.DropTable(
                name: "IMPL_Equipe");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_TipoProjeto_TPP_EquipeId",
                table: "IMPL_TipoProjeto");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_Projeto_PRJ_EquipeId",
                table: "IMPL_Projeto");

            migrationBuilder.DropColumn(
                name: "TPP_EquipeId",
                table: "IMPL_TipoProjeto");

            migrationBuilder.DropColumn(
                name: "PRJ_EquipeId",
                table: "IMPL_Projeto");

            migrationBuilder.AddColumn<DateTime>(
                name: "TPP_DataAlteracao",
                table: "IMPL_TipoProjeto",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TPP_UsuarioAlteracao",
                table: "IMPL_TipoProjeto",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ETP_DataAlteracao",
                table: "IMPL_Etapa",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ETP_UsuarioAlteracao",
                table: "IMPL_Etapa",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CLK_DataAlteracao",
                table: "IMPL_ColunaKanban",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CLK_UsuarioAlteracao",
                table: "IMPL_ColunaKanban",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId",
                table: "IMPL_Projeto",
                column: "PRJ_TipoProjetoId",
                principalTable: "IMPL_TipoProjeto",
                principalColumn: "TPP_Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId",
                table: "IMPL_Projeto");

            migrationBuilder.DropColumn(
                name: "TPP_DataAlteracao",
                table: "IMPL_TipoProjeto");

            migrationBuilder.DropColumn(
                name: "TPP_UsuarioAlteracao",
                table: "IMPL_TipoProjeto");

            migrationBuilder.DropColumn(
                name: "ETP_DataAlteracao",
                table: "IMPL_Etapa");

            migrationBuilder.DropColumn(
                name: "ETP_UsuarioAlteracao",
                table: "IMPL_Etapa");

            migrationBuilder.DropColumn(
                name: "CLK_DataAlteracao",
                table: "IMPL_ColunaKanban");

            migrationBuilder.DropColumn(
                name: "CLK_UsuarioAlteracao",
                table: "IMPL_ColunaKanban");

            migrationBuilder.AddColumn<int>(
                name: "TPP_EquipeId",
                table: "IMPL_TipoProjeto",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PRJ_EquipeId",
                table: "IMPL_Projeto",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "IMPL_Equipe",
                columns: table => new
                {
                    EQP_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EQP_Ativa = table.Column<bool>(type: "bit", nullable: false),
                    EQP_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EQP_Descricao = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    EQP_Nome = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EQP_PrefixoCodigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EQP_UsuarioInclusao = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_Equipe", x => x.EQP_Id);
                });

            migrationBuilder.CreateTable(
                name: "IMPL_MembroEquipe",
                columns: table => new
                {
                    MBE_Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MBE_EquipeId = table.Column<int>(type: "int", nullable: false),
                    MBE_DataInclusao = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MBE_OperadorId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_IMPL_MembroEquipe", x => x.MBE_Id);
                    table.ForeignKey(
                        name: "FK_IMPL_MembroEquipe_IMPL_Equipe_MBE_EquipeId",
                        column: x => x.MBE_EquipeId,
                        principalTable: "IMPL_Equipe",
                        principalColumn: "EQP_Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_TipoProjeto_TPP_EquipeId",
                table: "IMPL_TipoProjeto",
                column: "TPP_EquipeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Projeto_PRJ_EquipeId",
                table: "IMPL_Projeto",
                column: "PRJ_EquipeId");

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Equipe_EQP_Nome",
                table: "IMPL_Equipe",
                column: "EQP_Nome",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_MembroEquipe_MBE_EquipeId_MBE_OperadorId",
                table: "IMPL_MembroEquipe",
                columns: new[] { "MBE_EquipeId", "MBE_OperadorId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Projeto_IMPL_Equipe_PRJ_EquipeId",
                table: "IMPL_Projeto",
                column: "PRJ_EquipeId",
                principalTable: "IMPL_Equipe",
                principalColumn: "EQP_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId",
                table: "IMPL_Projeto",
                column: "PRJ_TipoProjetoId",
                principalTable: "IMPL_TipoProjeto",
                principalColumn: "TPP_Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_TipoProjeto_IMPL_Equipe_TPP_EquipeId",
                table: "IMPL_TipoProjeto",
                column: "TPP_EquipeId",
                principalTable: "IMPL_Equipe",
                principalColumn: "EQP_Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
