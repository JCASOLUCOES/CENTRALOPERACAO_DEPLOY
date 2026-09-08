using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Acessos;

[Table("AuditoriaAcessos")]
public class AuditoriaAcesso
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("Usuario")]
    [MaxLength(50)]
    public string Usuario { get; set; } = string.Empty;

    [Column("Empresa")]
    [MaxLength(200)]
    public string Empresa { get; set; } = string.Empty;

    [Column("TipoInformacao")]
    [MaxLength(50)]
    public string TipoInformacao { get; set; } = string.Empty;

    [Column("DataAcesso")]
    public DateTime DataAcesso { get; set; }

    [Column("HoraAcesso")]
    public TimeSpan HoraAcesso { get; set; }

    [Column("EnderecoIP")]
    [MaxLength(50)]
    public string EnderecoIP { get; set; } = string.Empty;

    [Column("Navegador")]
    [MaxLength(200)]
    public string Navegador { get; set; } = string.Empty;
}
