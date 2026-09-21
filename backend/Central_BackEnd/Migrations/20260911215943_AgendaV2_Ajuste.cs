using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class AgendaV2_Ajuste : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AGD_TipoId",
                table: "IMPL_Agenda",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CC_AgendaParticipante",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AgendaId = table.Column<int>(type: "int", nullable: false),
                    ParticipanteId = table.Column<string>(type: "varchar(15)", maxLength: 15, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CC_AgendaParticipante", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CC_AgendaParticipante_IMPL_Agenda_AgendaId",
                        column: x => x.AgendaId,
                        principalTable: "IMPL_Agenda",
                        principalColumn: "AGD_Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CC_AgendaParticipante_TBOPERADOR_ParticipanteId",
                        column: x => x.ParticipanteId,
                        principalTable: "TBOPERADOR",
                        principalColumn: "OPERADOR_ID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CC_TipoEvento",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nome = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Cor = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    Ativo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CC_TipoEvento", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Agenda_AGD_TipoId",
                table: "IMPL_Agenda",
                column: "AGD_TipoId");

            migrationBuilder.CreateIndex(
                name: "IX_CC_AgendaParticipante_AgendaId_ParticipanteId",
                table: "CC_AgendaParticipante",
                columns: new[] { "AgendaId", "ParticipanteId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CC_AgendaParticipante_ParticipanteId",
                table: "CC_AgendaParticipante",
                column: "ParticipanteId");

            migrationBuilder.CreateIndex(
                name: "IX_CC_TipoEvento_Nome",
                table: "CC_TipoEvento",
                column: "Nome",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_IMPL_Agenda_CC_TipoEvento_AGD_TipoId",
                table: "IMPL_Agenda",
                column: "AGD_TipoId",
                principalTable: "CC_TipoEvento",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_IMPL_Agenda_CC_TipoEvento_AGD_TipoId",
                table: "IMPL_Agenda");

            migrationBuilder.DropTable(
                name: "CC_AgendaParticipante");

            migrationBuilder.DropTable(
                name: "CC_TipoEvento");

            migrationBuilder.DropIndex(
                name: "IX_IMPL_Agenda_AGD_TipoId",
                table: "IMPL_Agenda");

            migrationBuilder.DropColumn(
                name: "AGD_TipoId",
                table: "IMPL_Agenda");
        }
    }
}
