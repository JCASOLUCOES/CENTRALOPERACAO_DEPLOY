using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("IMPL_Equipe")]
public class Equipe
{
    [Key]
    [Column("EQP_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("EQP_Nome")]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("EQP_Descricao")]
    public string? Descricao { get; set; }

    [MaxLength(20)]
    [Column("EQP_PrefixoCodigo")]
    public string PrefixoCodigo { get; set; } = "PRJ";

    [Column("EQP_Ativa")]
    public bool Ativa { get; set; } = true;

    [Required]
    [MaxLength(50)]
    [Column("EQP_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("EQP_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}

[Table("IMPL_MembroEquipe")]
public class MembroEquipe
{
    [Key]
    [Column("MBE_Id")]
    public int Id { get; set; }

    [Column("MBE_EquipeId")]
    public int EquipeId { get; set; }

    [ForeignKey("EquipeId")]
    public Equipe? Equipe { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("MBE_OperadorId")]
    public string OperadorId { get; set; } = string.Empty;

    [Column("MBE_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}
