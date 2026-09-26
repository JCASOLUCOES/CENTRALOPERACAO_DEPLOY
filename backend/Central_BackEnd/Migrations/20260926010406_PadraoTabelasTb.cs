using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class PadraoTabelasTb : Migration
    {
        /// <summary>
        /// Padrao de nomenclatura tb*: "tb" + nome da entidade em minusculas, colado.
        /// Ex.: tbprojeto, tbtarefa, tbagenda, tbcolunakanban.
        ///
        /// Migracao escrita a mao (e nao pelo scaffold do EF) por tres motivos:
        ///  1. tbfuncao ja existe como tabela legada; o EF geraria RenameTable e
        ///     falharia com "already exists". Aqui a tabela legada e enriquecida
        ///     (CLASSIFICACAO/ATIVO) e a CC_Funcao e descartada.
        ///  2. As tabelas orfas AgendaEvento/AgendaEventoParticipante nao fazem
        ///     parte do modelo, logo o EF nunca as removeria.
        ///  3. O scaffold emite Drop/Add de todas as PKs, FKs e indices. Como
        ///     toda renomeacao e feita por sp_rename (apenas metadados, sem mover
        ///     dados nem derrubar constraint), nao ha necessidade de recriar nada.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ------------------------------------------------------------------
            // 1. tbfuncao: unifica a CC_Funcao na tabela legada que ja existe.
            //    3 registros identicos (1=Analista de Sistemas, 2=Suporte,
            //    3=Programador); a legada so ganha CLASSIFICACAO e ATIVO.
            //    tboperador.FUNCAO_ID e int, entao FUNCAO_ID precisa virar int.
            //    Nenhuma FK de outro sistema referencia tbfuncao (verificado).
            //
            //    Cada passo e um migrationBuilder.Sql() separado de proposito:
            //    o SQL Server compila o lote inteiro antes de executar, entao um
            //    unico Sql() com ADD seguido de UPDATE falha com
            //    "Nome de coluna 'CLASSIFICACAO' invalido".
            // ------------------------------------------------------------------
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.tbfuncao', 'CLASSIFICACAO') IS NULL
    ALTER TABLE dbo.tbfuncao ADD CLASSIFICACAO varchar(50) NULL;");
            migrationBuilder.Sql(@"
IF COL_LENGTH('dbo.tbfuncao', 'ATIVO') IS NULL
    ALTER TABLE dbo.tbfuncao ADD ATIVO bit NOT NULL CONSTRAINT DF_tbfuncao_ATIVO DEFAULT 1;");

            // O widening smallint -> int exige derrubar a PK: o SQL Server recusa
            // ALTER COLUMN enquanto a PK depender da coluna (erro 5074/4922).
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes
           WHERE object_id = OBJECT_ID('dbo.tbfuncao') AND name = 'PK_tbfuncao')
    ALTER TABLE dbo.tbfuncao DROP CONSTRAINT PK_tbfuncao;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao ALTER COLUMN FUNCAO_ID int NOT NULL;");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.indexes
               WHERE object_id = OBJECT_ID('dbo.tbfuncao') AND name = 'PK_tbfuncao')
    ALTER TABLE dbo.tbfuncao ADD CONSTRAINT PK_tbfuncao PRIMARY KEY (FUNCAO_ID);");

            migrationBuilder.Sql(@"
UPDATE dbo.tbfuncao SET
    CLASSIFICACAO = CASE FUNCAO_ID
        WHEN 1 THEN 'Implantador'
        WHEN 2 THEN 'Atendimento'
        WHEN 3 THEN 'Desenvolvimento'
        ELSE 'Implantador' END
WHERE CLASSIFICACAO IS NULL;
");

            // ------------------------------------------------------------------
            // 2. Remove as tabelas que nao entram no padrao tb*.
            //    Preservadas de proposito: chamado_bkp, chamado_itens_bkp,
            //    funcionarios, tb_testes (nao pertencem ao projeto).
            //    Ordem importa: AgendaEventoParticipante tem FK para AgendaEvento,
            //    e tboperador tem FK para CC_Funcao.
            // ------------------------------------------------------------------
            migrationBuilder.Sql("IF OBJECT_ID('dbo.AgendaEventoParticipante', 'U') IS NOT NULL DROP TABLE dbo.AgendaEventoParticipante;");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.AgendaEvento', 'U') IS NOT NULL DROP TABLE dbo.AgendaEvento;");

            // tboperador -> CC_Funcao precisa cair junto com a tabela e voltar
            // apontando para a tbfuncao enriquecida.
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys
           WHERE name = 'FK_TBOPERADOR_CC_Funcao_FUNCAO_ID'
             AND referenced_object_id = OBJECT_ID('dbo.CC_Funcao'))
    ALTER TABLE dbo.tboperador DROP CONSTRAINT FK_TBOPERADOR_CC_Funcao_FUNCAO_ID;");
            migrationBuilder.Sql("IF OBJECT_ID('dbo.CC_Funcao', 'U') IS NOT NULL DROP TABLE dbo.CC_Funcao;");
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys
               WHERE parent_object_id = OBJECT_ID('dbo.tboperador')
                 AND referenced_object_id = OBJECT_ID('dbo.tbfuncao'))
    ALTER TABLE dbo.tboperador ADD CONSTRAINT FK_tboperador_tbfuncao_FUNCAO_ID
        FOREIGN KEY (FUNCAO_ID) REFERENCES dbo.tbfuncao (FUNCAO_ID) ON DELETE SET NULL;");

            migrationBuilder.Sql("IF OBJECT_ID('dbo.IMPL_Cliente', 'U') IS NOT NULL DROP TABLE dbo.IMPL_Cliente;");

            // ------------------------------------------------------------------
            // 3. Renomeia as tabelas (sp_rename = so metadados).
            //    Ordem: filhas antes dos pais, para manter o script legivel.
            // ------------------------------------------------------------------
            RenameTable(migrationBuilder, "IMPL_ComentarioTarefa",   "tbcomentariotarefa");
            RenameTable(migrationBuilder, "IMPL_TarefaApontamento", "tbtarefaapontamento");
            RenameTable(migrationBuilder, "IMPL_TarefaChamado",     "tbtarefachamado");
            RenameTable(migrationBuilder, "IMPL_TarefaResponsavel", "tbtarefareponsavel");
            RenameTable(migrationBuilder, "IMPL_Tarefa",            "tbtarefa");
            RenameTable(migrationBuilder, "IMPL_Auditoria",         "tbauditoriaimplantacao");
            RenameTable(migrationBuilder, "IMPL_ColunaKanban",      "tbcolunakanban");
            RenameTable(migrationBuilder, "IMPL_TipoProjeto",       "tbtipoprojeto");
            RenameTable(migrationBuilder, "IMPL_Projeto",           "tbprojeto");
            RenameTable(migrationBuilder, "IMPL_Agenda",            "tbagenda");
            RenameTable(migrationBuilder, "CC_TipoEvento",          "tbtipoevento");
            RenameTable(migrationBuilder, "CC_AgendaParticipante",  "tbagendaparticipante");
            RenameTable(migrationBuilder, "AuditoriaAcessos",       "tbauditoriaacesso");
            RenameTable(migrationBuilder, "RefreshTokens",          "tbrefreshtoken");

            // Normaliza a caixa das 5 tabelas de etapa e do tboperador.
            RenameTable(migrationBuilder, "tbprojetoEtapa",           "tbprojetoetapa");
            RenameTable(migrationBuilder, "tbprojetoEtapaChecklist",  "tbprojetoetapachecklist");
            RenameTable(migrationBuilder, "tbprojetoEtapaDocumento",  "tbprojetoetapadocumento");
            RenameTable(migrationBuilder, "tbprojetoEtapaHistorico",  "tbprojetoetahistorico");
            RenameTable(migrationBuilder, "tbprojetoEtapaComentario", "tbprojetoetapacomentario");
            RenameTable(migrationBuilder, "TBOPERADOR",               "tboperador");

            // ------------------------------------------------------------------
            // 4. Adequa os nomes de PK ao prefixo tb*.
            //    As FKs nao sao renomeadas: sp_rename de tabela ja reescreve o
            //    objeto referenciado e o nome da constraint e apenas cosmetico.
            //    Os 33 indices e as 5 PKs auto-geradas ficam para a migration
            //    seguinte (RenomeiaIndicesPkTb).
            // ------------------------------------------------------------------
            RenameConstraint(migrationBuilder, "PK_IMPL_Projeto",           "PK_tbprojeto");
            RenameConstraint(migrationBuilder, "PK_IMPL_Tarefa",            "PK_tbtarefa");
            RenameConstraint(migrationBuilder, "PK_IMPL_ComentarioTarefa",  "PK_tbcomentariotarefa");
            RenameConstraint(migrationBuilder, "PK_IMPL_TarefaResponsavel", "PK_tbtarefareponsavel");
            RenameConstraint(migrationBuilder, "PK_IMPL_TarefaChamado",     "PK_tbtarefachamado");
            RenameConstraint(migrationBuilder, "PK_IMPL_TarefaApontamento", "PK_tbtarefaapontamento");
            RenameConstraint(migrationBuilder, "PK_IMPL_ColunaKanban",      "PK_tbcolunakanban");
            RenameConstraint(migrationBuilder, "PK_IMPL_TipoProjeto",       "PK_tbtipoprojeto");
            RenameConstraint(migrationBuilder, "PK_IMPL_Agenda",            "PK_tbagenda");
            RenameConstraint(migrationBuilder, "PK_IMPL_Auditoria",         "PK_tbauditoriaimplantacao");
            RenameConstraint(migrationBuilder, "PK_AuditoriaAcessos",       "PK_tbauditoriaacesso");
            RenameConstraint(migrationBuilder, "PK_RefreshTokens",          "PK_tbrefreshtoken");
            RenameConstraint(migrationBuilder, "PK_CC_TipoEvento",          "PK_tbtipoevento");
            RenameConstraint(migrationBuilder, "PK_CC_AgendaParticipante",  "PK_tbagendaparticipante");
            RenameConstraint(migrationBuilder, "PK_tbprojetoEtapa",         "PK_tbprojetoetapa");
            RenameConstraint(migrationBuilder, "PK_tbprojetoEtapaChecklist", "PK_tbprojetoetapachecklist");
            RenameConstraint(migrationBuilder, "PK_tbprojetoEtapaDocumento", "PK_tbprojetoetapadocumento");
            RenameConstraint(migrationBuilder, "PK_tbprojetoEtapaHistorico", "PK_tbprojetoetahistorico");
            RenameConstraint(migrationBuilder, "PK_tbprojetoEtapaComentario", "PK_tbprojetoetapacomentario");
            RenameConstraint(migrationBuilder, "PK_TBOPERADOR",             "PK_tboperador");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverte CC_Funcao a partir da tbfuncao enriquecida.
            // Passos separados: o SQL Server compila o lote antes de executar.
            migrationBuilder.Sql("IF OBJECT_ID('dbo.CC_Funcao', 'U') IS NOT NULL DROP TABLE dbo.CC_Funcao;");
            migrationBuilder.Sql(@"
CREATE TABLE dbo.CC_Funcao (
    FUNCAO_ID     int           NOT NULL CONSTRAINT PK_CC_Funcao PRIMARY KEY,
    DESCRICAO     varchar(100)  NULL,
    CLASSIFICACAO varchar(50)   NULL,
    ATIVO         bit           NOT NULL CONSTRAINT DF_CC_Funcao_ATIVO DEFAULT 1
);");
            migrationBuilder.Sql(@"
INSERT INTO dbo.CC_Funcao (FUNCAO_ID, DESCRICAO, CLASSIFICACAO, ATIVO)
SELECT FUNCAO_ID, DESCRICAO, CLASSIFICACAO, ATIVO FROM dbo.tbfuncao;");
            migrationBuilder.Sql("ALTER TABLE dbo.tboperador DROP CONSTRAINT FK_tboperador_tbfuncao_FUNCAO_ID;");
            migrationBuilder.Sql(@"
ALTER TABLE dbo.tboperador ADD CONSTRAINT FK_TBOPERADOR_CC_Funcao_FUNCAO_ID
    FOREIGN KEY (FUNCAO_ID) REFERENCES dbo.CC_Funcao (FUNCAO_ID) ON DELETE SET NULL;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao DROP CONSTRAINT DF_tbfuncao_ATIVO;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao DROP COLUMN ATIVO;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao DROP COLUMN CLASSIFICACAO;");
            // Mesma razao do Up: a PK impede o narrowing para smallint.
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao DROP CONSTRAINT PK_tbfuncao;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao ALTER COLUMN FUNCAO_ID smallint NOT NULL;");
            migrationBuilder.Sql("ALTER TABLE dbo.tbfuncao ADD CONSTRAINT PK_tbfuncao PRIMARY KEY (FUNCAO_ID);");

            RenameTable(migrationBuilder, "tbrefreshtoken",            "RefreshTokens");
            RenameTable(migrationBuilder, "tbauditoriaacesso",        "AuditoriaAcessos");
            RenameTable(migrationBuilder, "tbagendaparticipante",     "CC_AgendaParticipante");
            RenameTable(migrationBuilder, "tbtipoevento",             "CC_TipoEvento");
            RenameTable(migrationBuilder, "tbagenda",                 "IMPL_Agenda");
            RenameTable(migrationBuilder, "tbprojeto",                "IMPL_Projeto");
            RenameTable(migrationBuilder, "tbtipoprojeto",            "IMPL_TipoProjeto");
            RenameTable(migrationBuilder, "tbcolunakanban",         "IMPL_ColunaKanban");
            RenameTable(migrationBuilder, "tbauditoriaimplantacao",  "IMPL_Auditoria");
            RenameTable(migrationBuilder, "tbtarefa",                 "IMPL_Tarefa");
            RenameTable(migrationBuilder, "tbtarefareponsavel",       "IMPL_TarefaResponsavel");
            RenameTable(migrationBuilder, "tbtarefachamado",          "IMPL_TarefaChamado");
            RenameTable(migrationBuilder, "tbtarefaapontamento",      "IMPL_TarefaApontamento");
            RenameTable(migrationBuilder, "tbcomentariotarefa",       "IMPL_ComentarioTarefa");
            RenameTable(migrationBuilder, "tboperador",               "TBOPERADOR");
            RenameTable(migrationBuilder, "tbprojetoetapacomentario", "tbprojetoEtapaComentario");
            RenameTable(migrationBuilder, "tbprojetoetahistorico",    "tbprojetoEtapaHistorico");
            RenameTable(migrationBuilder, "tbprojetoetapadocumento",  "tbprojetoEtapaDocumento");
            RenameTable(migrationBuilder, "tbprojetoetapachecklist",  "tbprojetoEtapaChecklist");
            RenameTable(migrationBuilder, "tbprojetoetapa",           "tbprojetoEtapa");

            // Down nao recria IMPL_Cliente, AgendaEvento nem AgendaEventoParticipante:
            // o Down precisa devolver o schema, nao os dados de um cadastro morto.
        }

        /// <summary>sp_rename de tabela: altera apenas metadados, sem mover dados.</summary>
        private static void RenameTable(MigrationBuilder migrationBuilder, string de, string para)
        {
            migrationBuilder.Sql(
                $@"IF OBJECT_ID(N'dbo.{de}', N'U') IS NOT NULL
                       EXEC sp_rename N'dbo.{de}', N'{para}';");
        }

        /// <summary>
        /// Renomeia PK ou unique constraint. Sem filtro de tipo no OBJECT_ID,
        /// porque PK e 'PK' e FK e 'F' — filtrar por 'U' faria o rename ser pulado.
        /// </summary>
        private static void RenameConstraint(MigrationBuilder migrationBuilder, string de, string para)
        {
            migrationBuilder.Sql(
                $@"IF OBJECT_ID(N'dbo.{de}') IS NOT NULL
                       EXEC sp_rename N'dbo.{de}', N'{para}';");
        }
    }
}
