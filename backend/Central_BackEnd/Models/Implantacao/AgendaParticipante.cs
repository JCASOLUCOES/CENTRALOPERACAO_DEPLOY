using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("CC_AgendaParticipante")]
public class AgendaParticipante
{
    [Key]
    [Column("Id")]
    public int Id { get; set; }

    [Column("AgendaId")]
    public int AgendaId { get; set; }

    [ForeignKey("AgendaId")]
    public AgendaItem? Agenda { get; set; }

    [Required]
    [MaxLength(15)]
    [Column("ParticipanteId")]
    public string ParticipanteId { get; set; } = string.Empty;

    [ForeignKey("ParticipanteId")]
    public Operador? Participante { get; set; }

    [Column("CriadoEm")]
    public DateTime CriadoEm { get; set; } = DateTime.Now;
}