using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models;

[Table("tbfuncao")]
public class Funcao
{
    [Key]
    [Column("FUNCAO_ID")]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("DESCRICAO")]
    public string Descricao { get; set; } = string.Empty;

    [Column("CLASSIFICACAO")]
    [MaxLength(50)]
    public string? Classificacao { get; set; }

    [Column("ATIVO")]
    public bool Ativo { get; set; } = true;
}