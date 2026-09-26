using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Vínculo N:N Tarefa x Operador (responsáveis adicionais além do ResponsavelId principal).
/// Chave composta configurada via Fluent API em AppDbContext.
/// </summary>
[Table("tbtarefareponsavel")]
public class TarefaResponsavel
{
    [Column("TRF_Id")]
    public int TarefaId { get; set; }

    [ForeignKey("TarefaId")]
    public Tarefa? Tarefa { get; set; }

    [MaxLength(50)]
    [Column("OPERADOR_ID")]
    public string? OperadorId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("TRF_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("TRF_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
