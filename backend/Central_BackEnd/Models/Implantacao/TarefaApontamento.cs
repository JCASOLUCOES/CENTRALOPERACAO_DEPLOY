using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Apontamento de horas de um operador em uma tarefa.
/// TRF_HorasRealizadas é derivado: SUM destes apontamentos (sincronizado pelo service).
/// </summary>
[Table("IMPL_TarefaApontamento")]
public class TarefaApontamento
{
    [Key]
    [Column("APT_Id")]
    public int Id { get; set; }

    [Column("TRF_Id")]
    public int TarefaId { get; set; }

    [ForeignKey("TarefaId")]
    public Tarefa? Tarefa { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("OPERADOR_ID")]
    public string OperadorId { get; set; } = string.Empty;

    [Column("APT_Data")]
    public DateTime Data { get; set; }

    [Column("APT_Horas")]
    public decimal Horas { get; set; }

    [MaxLength(500)]
    [Column("APT_Observacao")]
    public string? Observacao { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("APT_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("APT_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
