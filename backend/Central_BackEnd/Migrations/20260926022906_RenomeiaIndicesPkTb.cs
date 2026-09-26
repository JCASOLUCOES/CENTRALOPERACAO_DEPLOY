using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Central_BackEnd.Migrations
{
    /// <inheritdoc />
    public partial class RenomeiaIndicesPkTb : Migration
    {

        /// <summary>
        /// Complemento da PadraoTabelasTb: alinha os NOMES de indice, PK e unique
        /// constraint ao padrao tb*.
        ///
        /// A PadraoTabelasTb ja renomeou 20 PKs com sucesso, mas 5 ficaram com
        /// nome auto-gerado (PK__IMPL_Age__88C1ACD33B197A62 etc.) porque o EF nunca
        /// lhes deu nome explicito, e 33 indices ficaram com o prefixo antigo.
        ///
        /// Causa raiz do silencio na migration anterior: sp_rename de INDICE exige
        /// o itemtype INDEX. Sem esse argumento, OBJECT_ID("dbo.<indice>") retorna
        /// NULL (indice nao vive no namespace de schema), o guard IF NOT EXISTS
        /// da passava e o rename era pulado sem erro. Constraint (PK/UQ), ao
        /// contrario, aceita OBJECT_ID e o itemtype default.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            RenameIndex(migrationBuilder, "tbagenda", "IX_IMPL_Agenda_DataInicio", "IX_tbagenda_AGD_DataInicio");
            RenameIndex(migrationBuilder, "tbagenda", "IX_IMPL_Agenda_Operador_DataInicio_DataFim", "IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim");
            RenameIndex(migrationBuilder, "tbagenda", "IX_IMPL_Agenda_OperadorId", "IX_tbagenda_AGD_OperadorId");
            RenameIndex(migrationBuilder, "tbagenda", "IX_IMPL_Agenda_ProjetoId", "IX_tbagenda_AGD_ProjetoId");
            RenameIndex(migrationBuilder, "tbagenda", "IX_IMPL_Agenda_TipoId", "IX_tbagenda_AGD_TipoId");
            RenameIndex(migrationBuilder, "tbagendaparticipante", "IX_CC_AgendaParticipante_AgendaId_ParticipanteId", "IX_tbagendaparticipante_AgendaId_ParticipanteId");
            RenameIndex(migrationBuilder, "tbagendaparticipante", "IX_CC_AgendaParticipante_ParticipanteId", "IX_tbagendaparticipante_ParticipanteId");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_IMPL_Auditoria_AUD_Data", "IX_tbauditoriaimplantacao_AUD_Data");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId", "IX_tbauditoriaimplantacao_AUD_Entidade_AUD_EntidadeId");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_IMPL_Auditoria_AUD_Usuario", "IX_tbauditoriaimplantacao_AUD_Usuario");
            RenameIndex(migrationBuilder, "tbcomentariotarefa", "IX_IMPL_ComentarioTarefa_CMT_TarefaId", "IX_tbcomentariotarefa_CMT_TarefaId");
            RenameIndex(migrationBuilder, "tboperador", "IX_TBOPERADOR_FUNCAO_ID", "IX_tboperador_FUNCAO_ID");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_IMPL_Projeto_ClienteLegadoId", "IX_tbprojeto_PRJ_ClienteLegadoId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_IMPL_Projeto_PRJ_ClienteId", "IX_tbprojeto_PRJ_ClienteId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_IMPL_Projeto_PRJ_Codigo", "IX_tbprojeto_PRJ_Codigo");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_IMPL_Projeto_PRJ_ColunaKanbanId", "IX_tbprojeto_PRJ_ColunaKanbanId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_IMPL_Projeto_PRJ_TipoProjetoId", "IX_tbprojeto_PRJ_TipoProjetoId");
            RenameIndex(migrationBuilder, "tbprojetoetahistorico", "IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId", "IX_tbprojetoetahistorico_PEH_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapa", "IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem", "IX_tbprojetoetapa_PEP_ProjetoId_PEP_Ordem");
            RenameIndex(migrationBuilder, "tbprojetoetapachecklist", "IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId", "IX_tbprojetoetapachecklist_PEC_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapacomentario", "IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId", "IX_tbprojetoetapacomentario_PEC_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapadocumento", "IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId", "IX_tbprojetoetapadocumento_PED_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbrefreshtoken", "IX_RefreshTokens_OperadorId", "IX_tbrefreshtoken_OperadorId");
            RenameIndex(migrationBuilder, "tbrefreshtoken", "IX_RefreshTokens_TokenHash", "IX_tbrefreshtoken_TokenHash");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_IMPL_Tarefa_Arquivada_Coluna", "IX_tbtarefa_TRF_Arquivada_TRF_ColunaKanbanId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_IMPL_Tarefa_ChamadoLegadoId", "IX_tbtarefa_TRF_ChamadoLegadoId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_IMPL_Tarefa_TRF_ColunaKanbanId", "IX_tbtarefa_TRF_ColunaKanbanId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_IMPL_Tarefa_TRF_ProjetoEtapaId", "IX_tbtarefa_TRF_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_IMPL_Tarefa_TRF_ProjetoId", "IX_tbtarefa_TRF_ProjetoId");
            RenameIndex(migrationBuilder, "tbtarefaapontamento", "IX_IMPL_TarefaApontamento_TRF_Id_APT_Data", "IX_tbtarefaapontamento_TRF_Id_APT_Data");
            RenameIndex(migrationBuilder, "tbtarefachamado", "IX_IMPL_TarefaChamado_CHAMADO_ID", "IX_tbtarefachamado_CHAMADO_ID");
            RenameIndex(migrationBuilder, "tbtarefareponsavel", "IX_IMPL_TarefaResponsavel_OPERADOR_ID", "IX_tbtarefareponsavel_OPERADOR_ID");
            RenameIndex(migrationBuilder, "tbtipoprojeto", "IX_IMPL_TipoProjeto_TPP_Codigo", "IX_tbtipoprojeto_TPP_Codigo");
            RenameConstraint(migrationBuilder, "PK__IMPL_Age__88C1ACD33B197A62", "PK_tbagenda");
            RenameConstraint(migrationBuilder, "PK__CC_Agend__3214EC07BEE1D346", "PK_tbagendaparticipante");
            RenameConstraint(migrationBuilder, "PK__Auditori__3214EC079B76F480", "PK_tbauditoriaacesso");
            RenameConstraint(migrationBuilder, "PK__RefreshT__3214EC07377A72D4", "PK_tbrefreshtoken");
            RenameConstraint(migrationBuilder, "PK__CC_TipoE__3214EC076E297786", "PK_tbtipoevento");
            RenameConstraint(migrationBuilder, "UQ__CC_TipoE__7D8FE3B22A85213B", "AK_tbtipoevento_Nome");
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Down reverte: troca os argumentos (de <-> para) de cada rename do Up.
            RenameIndex(migrationBuilder, "tbagenda", "IX_tbagenda_AGD_DataInicio", "IX_IMPL_Agenda_DataInicio");
            RenameIndex(migrationBuilder, "tbagenda", "IX_tbagenda_AGD_OperadorId_AGD_DataInicio_AGD_DataFim", "IX_IMPL_Agenda_Operador_DataInicio_DataFim");
            RenameIndex(migrationBuilder, "tbagenda", "IX_tbagenda_AGD_OperadorId", "IX_IMPL_Agenda_OperadorId");
            RenameIndex(migrationBuilder, "tbagenda", "IX_tbagenda_AGD_ProjetoId", "IX_IMPL_Agenda_ProjetoId");
            RenameIndex(migrationBuilder, "tbagenda", "IX_tbagenda_AGD_TipoId", "IX_IMPL_Agenda_TipoId");
            RenameIndex(migrationBuilder, "tbagendaparticipante", "IX_tbagendaparticipante_AgendaId_ParticipanteId", "IX_CC_AgendaParticipante_AgendaId_ParticipanteId");
            RenameIndex(migrationBuilder, "tbagendaparticipante", "IX_tbagendaparticipante_ParticipanteId", "IX_CC_AgendaParticipante_ParticipanteId");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_tbauditoriaimplantacao_AUD_Data", "IX_IMPL_Auditoria_AUD_Data");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_tbauditoriaimplantacao_AUD_Entidade_AUD_EntidadeId", "IX_IMPL_Auditoria_AUD_Entidade_AUD_EntidadeId");
            RenameIndex(migrationBuilder, "tbauditoriaimplantacao", "IX_tbauditoriaimplantacao_AUD_Usuario", "IX_IMPL_Auditoria_AUD_Usuario");
            RenameIndex(migrationBuilder, "tbcomentariotarefa", "IX_tbcomentariotarefa_CMT_TarefaId", "IX_IMPL_ComentarioTarefa_CMT_TarefaId");
            RenameIndex(migrationBuilder, "tboperador", "IX_tboperador_FUNCAO_ID", "IX_TBOPERADOR_FUNCAO_ID");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_tbprojeto_PRJ_ClienteLegadoId", "IX_IMPL_Projeto_ClienteLegadoId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_tbprojeto_PRJ_ClienteId", "IX_IMPL_Projeto_PRJ_ClienteId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_tbprojeto_PRJ_Codigo", "IX_IMPL_Projeto_PRJ_Codigo");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_tbprojeto_PRJ_ColunaKanbanId", "IX_IMPL_Projeto_PRJ_ColunaKanbanId");
            RenameIndex(migrationBuilder, "tbprojeto", "IX_tbprojeto_PRJ_TipoProjetoId", "IX_IMPL_Projeto_PRJ_TipoProjetoId");
            RenameIndex(migrationBuilder, "tbprojetoetahistorico", "IX_tbprojetoetahistorico_PEH_ProjetoEtapaId", "IX_tbprojetoEtapaHistorico_PEH_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapa", "IX_tbprojetoetapa_PEP_ProjetoId_PEP_Ordem", "IX_tbprojetoEtapa_PEP_ProjetoId_PEP_Ordem");
            RenameIndex(migrationBuilder, "tbprojetoetapachecklist", "IX_tbprojetoetapachecklist_PEC_ProjetoEtapaId", "IX_tbprojetoEtapaChecklist_PEC_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapacomentario", "IX_tbprojetoetapacomentario_PEC_ProjetoEtapaId", "IX_tbprojetoEtapaComentario_PEC_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbprojetoetapadocumento", "IX_tbprojetoetapadocumento_PED_ProjetoEtapaId", "IX_tbprojetoEtapaDocumento_PED_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbrefreshtoken", "IX_tbrefreshtoken_OperadorId", "IX_RefreshTokens_OperadorId");
            RenameIndex(migrationBuilder, "tbrefreshtoken", "IX_tbrefreshtoken_TokenHash", "IX_RefreshTokens_TokenHash");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_tbtarefa_TRF_Arquivada_TRF_ColunaKanbanId", "IX_IMPL_Tarefa_Arquivada_Coluna");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_tbtarefa_TRF_ChamadoLegadoId", "IX_IMPL_Tarefa_ChamadoLegadoId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_tbtarefa_TRF_ColunaKanbanId", "IX_IMPL_Tarefa_TRF_ColunaKanbanId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_tbtarefa_TRF_ProjetoEtapaId", "IX_IMPL_Tarefa_TRF_ProjetoEtapaId");
            RenameIndex(migrationBuilder, "tbtarefa", "IX_tbtarefa_TRF_ProjetoId", "IX_IMPL_Tarefa_TRF_ProjetoId");
            RenameIndex(migrationBuilder, "tbtarefaapontamento", "IX_tbtarefaapontamento_TRF_Id_APT_Data", "IX_IMPL_TarefaApontamento_TRF_Id_APT_Data");
            RenameIndex(migrationBuilder, "tbtarefachamado", "IX_tbtarefachamado_CHAMADO_ID", "IX_IMPL_TarefaChamado_CHAMADO_ID");
            RenameIndex(migrationBuilder, "tbtarefareponsavel", "IX_tbtarefareponsavel_OPERADOR_ID", "IX_IMPL_TarefaResponsavel_OPERADOR_ID");
            RenameIndex(migrationBuilder, "tbtipoprojeto", "IX_tbtipoprojeto_TPP_Codigo", "IX_IMPL_TipoProjeto_TPP_Codigo");
            RenameConstraint(migrationBuilder, "PK_tbagenda", "PK__IMPL_Age__88C1ACD33B197A62");
            RenameConstraint(migrationBuilder, "PK_tbagendaparticipante", "PK__CC_Agend__3214EC07BEE1D346");
            RenameConstraint(migrationBuilder, "PK_tbauditoriaacesso", "PK__Auditori__3214EC079B76F480");
            RenameConstraint(migrationBuilder, "PK_tbrefreshtoken", "PK__RefreshT__3214EC07377A72D4");
            RenameConstraint(migrationBuilder, "PK_tbtipoevento", "PK__CC_TipoE__3214EC076E297786");
            RenameConstraint(migrationBuilder, "AK_tbtipoevento_Nome", "UQ__CC_TipoE__7D8FE3B22A85213B");
        }

        /// <summary>
        /// Renomeia indice. Dois cuidados: o guard consulta sys.indexes (indice nao e
        /// objeto de schema, entao OBJECT_ID retornaria NULL) e o sp_rename recebe o
        /// nome qualificado com a tabela, no formato "tabela.indice" — tanto "dbo.indice"
        /// quanto "indice" falham com o erro 15248.
        /// </summary>
        private static void RenameIndex(MigrationBuilder migrationBuilder, string tabela, string de, string para)
        {
            migrationBuilder.Sql(
                $@"IF EXISTS (SELECT 1 FROM sys.indexes
                            WHERE object_id = OBJECT_ID(N'dbo.{tabela}') AND name = N'{de}')
                       EXEC sp_rename N'{tabela}.{de}', N'{para}', N'INDEX';");
        }

        /// <summary>
        /// Renomeia PK ou unique constraint. Constraint e objeto de schema (tipo
        /// PK/UQ), entao o guard por OBJECT_ID funciona e o itemtype default basta.
        /// </summary>
        private static void RenameConstraint(MigrationBuilder migrationBuilder, string de, string para)
        {
            migrationBuilder.Sql(
                $@"IF OBJECT_ID(N'dbo.{de}') IS NOT NULL
                       EXEC sp_rename N'dbo.{de}', N'{para}';");
        }
    }
}
