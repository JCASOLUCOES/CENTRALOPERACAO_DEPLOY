using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("tbtipoevento")]
public class TipoEvento
{
    [Key]
    [Column("Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    [Column("Nome")]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(7)]
    [Column("Cor")]
    public string? Cor { get; set; }

    [Column("Ativo")]
    public bool Ativo { get; set; } = true;
}