using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Vínculo N:N Tarefa x Chamado legado (tbchamado).
/// Chave composta configurada via Fluent API em AppDbContext.
/// </summary>
[Table("IMPL_TarefaChamado")]
public class TarefaChamado
{
    [Column("TRF_Id")]
    public int TarefaId { get; set; }

    [ForeignKey("TarefaId")]
    public Tarefa? Tarefa { get; set; }

    [Column("CHAMADO_ID")]
    public int ChamadoId { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("TRF_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("TRF_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
