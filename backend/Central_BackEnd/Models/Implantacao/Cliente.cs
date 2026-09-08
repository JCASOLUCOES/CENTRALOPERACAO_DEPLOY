using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("IMPL_Cliente")]
public class Cliente
{
    [Key]
    [Column("CLI_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("CLI_Nome")]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("CLI_Cnpj")]
    public string? Cnpj { get; set; }

    [MaxLength(200)]
    [Column("CLI_Contato")]
    public string? Contato { get; set; }

    [MaxLength(2000)]
    [Column("CLI_Observacao")]
    public string? Observacao { get; set; }

    [Column("CLI_Ativo")]
    public bool Ativo { get; set; } = true;

    [Required]
    [MaxLength(50)]
    [Column("CLI_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("CLI_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("CLI_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("CLI_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}
