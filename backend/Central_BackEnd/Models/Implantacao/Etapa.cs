using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("IMPL_Etapa")]
public class Etapa
{
    [Key]
    [Column("ETP_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("ETP_Nome")]
    public string Nome { get; set; } = string.Empty;

    [Column("ETP_Ordem")]
    public int Ordem { get; set; } = 0;

    [Column("ETP_TipoProjetoId")]
    public int? TipoProjetoId { get; set; }

    [ForeignKey("TipoProjetoId")]
    public TipoProjeto? TipoProjeto { get; set; }

    [Column("ETP_Concluida")]
    public bool Concluida { get; set; } = false;

    [MaxLength(20)]
    [Column("ETP_Cor")]
    public string? Cor { get; set; }

    [Column("ETP_Ativa")]
    public bool Ativa { get; set; } = true;

    [Required]
    [MaxLength(50)]
    [Column("ETP_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("ETP_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
