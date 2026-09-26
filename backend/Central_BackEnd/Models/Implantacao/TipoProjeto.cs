using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("tbtipoprojeto")]
public class TipoProjeto
{
    [Key]
    [Column("TPP_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("TPP_Codigo")]
    public string Codigo { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    [Column("TPP_Nome")]
    public string Nome { get; set; } = string.Empty;

    [Column("TPP_ClienteObrigatorio")]
    public bool ClienteObrigatorio { get; set; } = true;

    [Column("TPP_Ordem")]
    public int Ordem { get; set; } = 0;

    [Column("TPP_Ativo")]
    public bool Ativo { get; set; } = true;

    [Required]
    [MaxLength(50)]
    [Column("TPP_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("TPP_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("TPP_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("TPP_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}