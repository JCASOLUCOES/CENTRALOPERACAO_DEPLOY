using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

public enum StatusTarefa
{
    [Display(Name = "Backlog")]
    Backlog = 0,
    [Display(Name = "A Fazer")]
    AFazer = 1,
    [Display(Name = "Em Andamento")]
    EmAndamento = 2,
    [Display(Name = "Em Homologação")]
    EmHomologacao = 3,
    [Display(Name = "Concluída")]
    Concluida = 4,
    [Display(Name = "Cancelada")]
    Cancelada = 5
}

public enum PrioridadeTarefa
{
    Baixa = 0,
    Media = 1,
    Alta = 2,
    Urgente = 3
}

[Table("IMPL_Tarefa")]
public class Tarefa
{
    [Key]
    [Column("TRF_Id")]
    public int Id { get; set; }

    [Column("TRF_ProjetoId")]
    public int ProjetoId { get; set; }

    [ForeignKey("ProjetoId")]
    public Projeto? Projeto { get; set; }

    /// <summary>
    /// FK para tbchamado.CHAMADO_ID do banco legado (dbBUSINESS_HML).
    /// Opcional — permite vincular a tarefa a um chamado real do sistema principal.
    /// </summary>
    [Column("TRF_ChamadoLegadoId")]
    public int? ChamadoLegadoId { get; set; }

    [Column("TRF_EtapaId")]
    public int? EtapaId { get; set; }

    [ForeignKey("EtapaId")]
    public Etapa? Etapa { get; set; }

    [Column("TRF_ColunaKanbanId")]
    public int? ColunaKanbanId { get; set; }

    [ForeignKey("ColunaKanbanId")]
    public ColunaKanban? ColunaKanban { get; set; }

    [Required]
    [MaxLength(300)]
    [Column("TRF_Titulo")]
    public string Titulo { get; set; } = string.Empty;

    [MaxLength(4000)]
    [Column("TRF_Descricao")]
    public string? Descricao { get; set; }

    [MaxLength(50)]
    [Column("TRF_ResponsavelId")]
    public string? ResponsavelId { get; set; }

    [MaxLength(50)]
    [Column("TRF_CriadorId")]
    public string CriadorId { get; set; } = string.Empty;

    [Column("TRF_Status")]
    public StatusTarefa Status { get; set; } = StatusTarefa.AFazer;

    [Column("TRF_Prioridade")]
    public PrioridadeTarefa Prioridade { get; set; } = PrioridadeTarefa.Media;

    [Column("TRF_Ordem")]
    public int Ordem { get; set; } = 0;

    [Column("TRF_DataPrevisao")]
    public DateTime? DataPrevisao { get; set; }

    [Column("TRF_DataConclusao")]
    public DateTime? DataConclusao { get; set; }

    [Column("TRF_HorasEstimadas")]
    public int? HorasEstimadas { get; set; }

    [Column("TRF_HorasRealizadas")]
    public int? HorasRealizadas { get; set; }

    [Column("TRF_Bloqueada")]
    public bool Bloqueada { get; set; } = false;

    [MaxLength(500)]
    [Column("TRF_MotivoBloqueio")]
    public string? MotivoBloqueio { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("TRF_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("TRF_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("TRF_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("TRF_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}

[Table("IMPL_ComentarioTarefa")]
public class ComentarioTarefa
{
    [Key]
    [Column("CMT_Id")]
    public int Id { get; set; }

    [Column("CMT_TarefaId")]
    public int TarefaId { get; set; }

    [ForeignKey("TarefaId")]
    public Tarefa? Tarefa { get; set; }

    [MaxLength(50)]
    [Column("CMT_AutorId")]
    public string AutorId { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    [Column("CMT_Texto")]
    public string Texto { get; set; } = string.Empty;

    [Column("CMT_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
