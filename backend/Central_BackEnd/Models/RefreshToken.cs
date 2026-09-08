using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models;

[Table("RefreshTokens")]
public class RefreshToken
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required]
    [Column("TokenHash")]
    public string TokenHash { get; set; } = string.Empty;

    [Required]
    [Column("OperadorId")]
    [MaxLength(15)]
    public string OperadorId { get; set; } = string.Empty;

    [Column("ExpiraEm")]
    public DateTime ExpiraEm { get; set; }

    [Column("CriadoEm")]
    public DateTime CriadoEm { get; set; }

    [Column("Revogado")]
    public bool Revogado { get; set; }

    [Column("SubstituidoPor")]
    public string? SubstituidoPor { get; set; }

    [ForeignKey("OperadorId")]
    public Operador? Operador { get; set; }
}
