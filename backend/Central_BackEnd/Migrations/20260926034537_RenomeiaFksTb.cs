using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class RenomeiaFksTb : Migration
    {

        /// <summary>
        /// Terceira etapa da padronizacao tb*: alinha os NOMES das 20 foreign keys.
        /// As duas migrations anteriores renomearam tabelas, PKs e indices, mas deixaram
        /// as FKs com os prefixos antigos (FK_IMPL_Projeto_tbcliente_PRJ_ClienteId etc.).
        ///
        /// Nome novo segue a convencao ja presente no banco:
        /// FK_<tabela dependente>_<tabela principal>_<colunas dependentes>.
        ///
        /// sp_rename de FK NAO aceita @objtype FOREIGNKEY nem F ("@objtype explicito
        /// nao foi reconhecido"). FK e objeto de schema, entao o itemtype default (OBJECT)
        /// resolve - o mesmo caminho usado para PK e unique constraint.
        ///
        /// As FKs de tabelas legadas de outros sistemas (tbcliente_contato, tbcontrato,
        /// tbfaturamento, tbcliente_menu) NAO sao renomeadas.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            RenameForeignKey(migrationBuilder, "FK_CC_AgendaParticipante_IMPL_Agenda", "FK_tbagendaparticipante_tbagenda_AgendaId");
            RenameForeignKey(migrationBuilder, "FK_CC_AgendaParticipante_TBOPERADOR", "FK_tbagendaparticipante_tboperador_ParticipanteId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Agenda_CC_TipoEvento", "FK_tbagenda_tbtipoevento_AGD_TipoId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Agenda_IMPL_Projeto", "FK_tbagenda_tbprojeto_AGD_ProjetoId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_ComentarioTarefa_IMPL_Tarefa_CMT_TarefaId", "FK_tbcomentariotarefa_tbtarefa_CMT_TarefaId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Projeto_IMPL_ColunaKanban_PRJ_ColunaKanbanId", "FK_tbprojeto_tbcolunakanban_PRJ_ColunaKanbanId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId", "FK_tbprojeto_tbtipoprojeto_PRJ_TipoProjetoId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Projeto_tbcliente_PRJ_ClienteId", "FK_tbprojeto_tbcliente_PRJ_ClienteId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Tarefa_IMPL_ColunaKanban_TRF_ColunaKanbanId", "FK_tbtarefa_tbcolunakanban_TRF_ColunaKanbanId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Tarefa_IMPL_Projeto_TRF_ProjetoId", "FK_tbtarefa_tbprojeto_TRF_ProjetoId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId", "FK_tbtarefa_tbprojetoetapa_TRF_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_IMPL_TarefaApontamento_IMPL_Tarefa_TRF_Id", "FK_tbtarefaapontamento_tbtarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_IMPL_TarefaChamado_IMPL_Tarefa_TRF_Id", "FK_tbtarefachamado_tbtarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_IMPL_TarefaResponsavel_IMPL_Tarefa_TRF_Id", "FK_tbtarefareponsavel_tbtarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_RefreshTokens_TBOPERADOR", "FK_tbrefreshtoken_tboperador_OperadorId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoEtapa_IMPL_Projeto_PEP_ProjetoId", "FK_tbprojetoetapa_tbprojeto_PEP_ProjetoId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoEtapaChecklist_tbprojetoEtapa_PEC_ProjetoEtapaId", "FK_tbprojetoetapachecklist_tbprojetoetapa_PEC_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoEtapaComentario_tbprojetoEtapa_PEC_ProjetoEtapaId", "FK_tbprojetoetapacomentario_tbprojetoetapa_PEC_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoEtapaDocumento_tbprojetoEtapa_PED_ProjetoEtapaId", "FK_tbprojetoetapadocumento_tbprojetoetapa_PED_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoEtapaHistorico_tbprojetoEtapa_PEH_ProjetoEtapaId", "FK_tbprojetoetahistorico_tbprojetoetapa_PEH_ProjetoEtapaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            RenameForeignKey(migrationBuilder, "FK_tbagendaparticipante_tbagenda_AgendaId", "FK_CC_AgendaParticipante_IMPL_Agenda");
            RenameForeignKey(migrationBuilder, "FK_tbagendaparticipante_tboperador_ParticipanteId", "FK_CC_AgendaParticipante_TBOPERADOR");
            RenameForeignKey(migrationBuilder, "FK_tbagenda_tbtipoevento_AGD_TipoId", "FK_IMPL_Agenda_CC_TipoEvento");
            RenameForeignKey(migrationBuilder, "FK_tbagenda_tbprojeto_AGD_ProjetoId", "FK_IMPL_Agenda_IMPL_Projeto");
            RenameForeignKey(migrationBuilder, "FK_tbcomentariotarefa_tbtarefa_CMT_TarefaId", "FK_IMPL_ComentarioTarefa_IMPL_Tarefa_CMT_TarefaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojeto_tbcolunakanban_PRJ_ColunaKanbanId", "FK_IMPL_Projeto_IMPL_ColunaKanban_PRJ_ColunaKanbanId");
            RenameForeignKey(migrationBuilder, "FK_tbprojeto_tbtipoprojeto_PRJ_TipoProjetoId", "FK_IMPL_Projeto_IMPL_TipoProjeto_PRJ_TipoProjetoId");
            RenameForeignKey(migrationBuilder, "FK_tbprojeto_tbcliente_PRJ_ClienteId", "FK_IMPL_Projeto_tbcliente_PRJ_ClienteId");
            RenameForeignKey(migrationBuilder, "FK_tbtarefa_tbcolunakanban_TRF_ColunaKanbanId", "FK_IMPL_Tarefa_IMPL_ColunaKanban_TRF_ColunaKanbanId");
            RenameForeignKey(migrationBuilder, "FK_tbtarefa_tbprojeto_TRF_ProjetoId", "FK_IMPL_Tarefa_IMPL_Projeto_TRF_ProjetoId");
            RenameForeignKey(migrationBuilder, "FK_tbtarefa_tbprojetoetapa_TRF_ProjetoEtapaId", "FK_IMPL_Tarefa_tbprojetoEtapa_TRF_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbtarefaapontamento_tbtarefa_TRF_Id", "FK_IMPL_TarefaApontamento_IMPL_Tarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_tbtarefachamado_tbtarefa_TRF_Id", "FK_IMPL_TarefaChamado_IMPL_Tarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_tbtarefareponsavel_tbtarefa_TRF_Id", "FK_IMPL_TarefaResponsavel_IMPL_Tarefa_TRF_Id");
            RenameForeignKey(migrationBuilder, "FK_tbrefreshtoken_tboperador_OperadorId", "FK_RefreshTokens_TBOPERADOR");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoetapa_tbprojeto_PEP_ProjetoId", "FK_tbprojetoEtapa_IMPL_Projeto_PEP_ProjetoId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoetapachecklist_tbprojetoetapa_PEC_ProjetoEtapaId", "FK_tbprojetoEtapaChecklist_tbprojetoEtapa_PEC_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoetapacomentario_tbprojetoetapa_PEC_ProjetoEtapaId", "FK_tbprojetoEtapaComentario_tbprojetoEtapa_PEC_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoetapadocumento_tbprojetoetapa_PED_ProjetoEtapaId", "FK_tbprojetoEtapaDocumento_tbprojetoEtapa_PED_ProjetoEtapaId");
            RenameForeignKey(migrationBuilder, "FK_tbprojetoetahistorico_tbprojetoetapa_PEH_ProjetoEtapaId", "FK_tbprojetoEtapaHistorico_tbprojetoEtapa_PEH_ProjetoEtapaId");
        }

        /// <summary>
        /// Renomeia FK. O guard usa OBJECT_ID com o tipo F, que e assim que o objeto
        /// e resolvido; o sp_rename vai sem @objtype, que e o que funciona.
        /// </summary>
        private static void RenameForeignKey(MigrationBuilder migrationBuilder, string de, string para)
        {
            migrationBuilder.Sql(
                $@"IF OBJECT_ID(N'dbo.{de}', N'F') IS NOT NULL
                       EXEC sp_rename N'dbo.{de}', N'{para}';");
        }
    }
}
