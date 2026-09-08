using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Auditoria de alterações nas entidades do módulo IMPLANTACAO.
/// Registra: quem, quando, o quê (entidade/id), ação, antes/depois (JSON).
/// </summary>
[Table("IMPL_Auditoria")]
public class AuditoriaImplantacao
{
    [Key]
    [Column("AUD_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("AUD_Entidade")]
    public string Entidade { get; set; } = string.Empty; // ex: "Projeto", "Tarefa", "Agenda", "Cliente"

    [Column("AUD_EntidadeId")]
    public int EntidadeId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("AUD_Acao")]
    public string Acao { get; set; } = string.Empty; // "CREATE", "UPDATE", "DELETE"

    [Column("AUD_AntesJson")]
    public string? AntesJson { get; set; } // JSON com estado anterior (null para CREATE)

    [Column("AUD_DepoisJson")]
    public string? DepoisJson { get; set; } // JSON com estado posterior (null para DELETE)

    [MaxLength(15)]
    [Column("AUD_Usuario")]
    public string? Usuario { get; set; } // OperadorId que fez a ação

    [Column("AUD_Data")]
    public DateTime Data { get; set; } = DateTime.Now;

    [MaxLength(500)]
    [Column("AUD_Observacao")]
    public string? Observacao { get; set; } // Info extra: ex: "Status: Backlog → EmAndamento"
}