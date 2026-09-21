using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class KanbanCustomizavelEArquivamento : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "TRF_Arquivada",
                table: "IMPL_Tarefa",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_IMPL_Tarefa_Arquivada_Coluna",
                table: "IMPL_Tarefa",
                columns: new[] { "TRF_Arquivada", "TRF_ColunaKanbanId" });

            // Seed das 2 novas colunas + reordenacao (idempotente)
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM IMPL_ColunaKanban WHERE CLK_Nome = 'EM DESENVOLVIMENTO')
                BEGIN
                    -- Abre espaco: desloca EM ANDAMENTO (3->4), HOMOLOGACAO (4->5), CONCLUIDO (5->7)
                    UPDATE IMPL_ColunaKanban SET CLK_Ordem = 7 WHERE CLK_Nome = 'CONCLUIDO';
                    UPDATE IMPL_ColunaKanban SET CLK_Ordem = 5 WHERE CLK_Nome = 'HOMOLOGACAO';
                    UPDATE IMPL_ColunaKanban SET CLK_Ordem = 4 WHERE CLK_Nome = 'EM ANDAMENTO';
                    INSERT INTO IMPL_ColunaKanban (CLK_Nome, CLK_Ordem, CLK_Cor, CLK_Padrao, CLK_Ativa, CLK_UsuarioInclusao, CLK_DataInclusao)
                    VALUES ('EM DESENVOLVIMENTO', 3, '#f59e0b', 1, 1, 'migration', GETDATE());
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM IMPL_ColunaKanban WHERE CLK_Nome = 'BLOQUEADO')
                BEGIN
                    INSERT INTO IMPL_ColunaKanban (CLK_Nome, CLK_Ordem, CLK_Cor, CLK_Padrao, CLK_Ativa, CLK_UsuarioInclusao, CLK_DataInclusao)
                    VALUES ('BLOQUEADO', 6, '#ef4444', 1, 1, 'migration', GETDATE());
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_IMPL_Tarefa_Arquivada_Coluna",
                table: "IMPL_Tarefa");

            migrationBuilder.Sql("DELETE FROM IMPL_ColunaKanban WHERE CLK_Nome IN ('EM DESENVOLVIMENTO', 'BLOQUEADO');");
            migrationBuilder.Sql(@"
                UPDATE IMPL_ColunaKanban SET CLK_Ordem = 3 WHERE CLK_Nome = 'EM ANDAMENTO';
                UPDATE IMPL_ColunaKanban SET CLK_Ordem = 4 WHERE CLK_Nome = 'HOMOLOGACAO';
                UPDATE IMPL_ColunaKanban SET CLK_Ordem = 5 WHERE CLK_Nome = 'CONCLUIDO';
            ");

            migrationBuilder.DropColumn(
                name: "TRF_Arquivada",
                table: "IMPL_Tarefa");
        }
    }
}
