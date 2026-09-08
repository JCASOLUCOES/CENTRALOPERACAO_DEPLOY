using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("IMPL_ColunaKanban")]
public class ColunaKanban
{
    [Key]
    [Column("CLK_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("CLK_Nome")]
    public string Nome { get; set; } = string.Empty;

    [Column("CLK_Ordem")]
    public int Ordem { get; set; } = 0;

    [Column("CLK_LimiteWip")]
    public int? LimiteWip { get; set; }

    [MaxLength(20)]
    [Column("CLK_Cor")]
    public string? Cor { get; set; }

    [Column("CLK_Padrao")]
    public bool Padrao { get; set; } = true;

    [Column("CLK_Ativa")]
    public bool Ativa { get; set; } = true;

    [Required]
    [MaxLength(50)]
    [Column("CLK_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("CLK_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
