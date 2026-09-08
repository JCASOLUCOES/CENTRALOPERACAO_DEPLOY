using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

public enum StatusProjeto
{
    [Display(Name = "Backlog")]
    Backlog = 0,
    [Display(Name = "A Fazer")]
    AFazer = 1,
    [Display(Name = "Em Andamento")]
    EmAndamento = 2,
    [Display(Name = "Homologação")]
    Homologacao = 3,
    [Display(Name = "Concluído")]
    Concluido = 4,
    [Display(Name = "Cancelado")]
    Cancelado = 5,
    [Display(Name = "Bloqueado")]
    Bloqueado = 6
}

public enum PrioridadeProjeto
{
    Baixa = 0,
    Media = 1,
    Alta = 2,
    Urgente = 3
}

[Table("IMPL_Projeto")]
public class Projeto
{
    [Key]
    [Column("PRJ_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("PRJ_Codigo")]
    public string Codigo { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [Column("PRJ_Nome")]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(4000)]
    [Column("PRJ_Descricao")]
    public string? Descricao { get; set; }

    [Column("PRJ_EquipeId")]
    public int EquipeId { get; set; }

    [ForeignKey("EquipeId")]
    public Equipe? Equipe { get; set; }

    [Column("PRJ_TipoProjetoId")]
    public int TipoProjetoId { get; set; }

    [ForeignKey("TipoProjetoId")]
    public TipoProjeto? TipoProjeto { get; set; }

    [Column("PRJ_ClienteId")]
    public int? ClienteId { get; set; }

    [ForeignKey("ClienteId")]
    public Cliente? Cliente { get; set; }

    /// <summary>
    /// FK para tbcliente.CLIENTE_ID do banco legado (dbBUSINESS_HML).
    /// Permite amarrar um projeto a um cliente real do sistema principal.
    /// </summary>
    [Column("PRJ_ClienteLegadoId")]
    public int? ClienteLegadoId { get; set; }

    [MaxLength(50)]
    [Column("PRJ_ResponsavelId")]
    public string? ResponsavelId { get; set; }

    [MaxLength(50)]
    [Column("PRJ_CriadorId")]
    public string CriadorId { get; set; } = string.Empty;

    [Column("PRJ_Status")]
    public StatusProjeto Status { get; set; } = StatusProjeto.Backlog;

    [Column("PRJ_ColunaKanbanId")]
    public int? ColunaKanbanId { get; set; }

    [ForeignKey("ColunaKanbanId")]
    public ColunaKanban? ColunaKanban { get; set; }

    [Column("PRJ_Prioridade")]
    public PrioridadeProjeto Prioridade { get; set; } = PrioridadeProjeto.Media;

    [Column("PRJ_Progresso")]
    public int Progresso { get; set; } = 0;

    [Column("PRJ_DataInicio")]
    public DateTime? DataInicio { get; set; }

    [Column("PRJ_DataPrevisao")]
    public DateTime? DataPrevisao { get; set; }

    [Column("PRJ_DataConclusao")]
    public DateTime? DataConclusao { get; set; }

    [Column("PRJ_DataGoLivePrevista")]
    public DateTime? DataGoLivePrevista { get; set; }

    [Column("PRJ_DataGoLiveReal")]
    public DateTime? DataGoLiveReal { get; set; }

    [Column("PRJ_HorasPlanejadas")]
    public int? HorasPlanejadas { get; set; }

    [Column("PRJ_HorasRealizadas")]
    public int? HorasRealizadas { get; set; }

    [MaxLength(2000)]
    [Column("PRJ_Observacao")]
    public string? Observacao { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("PRJ_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("PRJ_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("PRJ_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("PRJ_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}
