using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

public enum AgendaTipo
{
    [Display(Name = "Reunião")]
    Reuniao = 0,
    [Display(Name = "Treinamento")]
    Treinamento = 1,
    [Display(Name = "Atendimento")]
    Atendimento = 2,
    [Display(Name = "Pessoal")]
    Pessoal = 3,
    [Display(Name = "Outro")]
    Outro = 4
}

public enum AgendaVisibilidade
{
    [Display(Name = "Público")]
    Publico = 0,
    [Display(Name = "Equipe")]
    Equipe = 1,
    [Display(Name = "Privado")]
    Privado = 2
}

public enum AgendaRecorrencia
{
    Nenhuma = 0,
    [Display(Name = "Diário")]
    Diario = 1,
    [Display(Name = "Semanal")]
    Semanal = 2,
    [Display(Name = "Mensal")]
    Mensal = 3
}

[Table("IMPL_Agenda")]
public class AgendaItem
{
    [Key]
    [Column("AGD_Id")]
    public int Id { get; set; }

    [Required]
    [MaxLength(15)]
    [Column("AGD_OperadorId")]
    public string OperadorId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    [Column("AGD_Titulo")]
    public string Titulo { get; set; } = string.Empty;

    [MaxLength(2000)]
    [Column("AGD_Descricao")]
    public string? Descricao { get; set; }

    [MaxLength(200)]
    [Column("AGD_Local")]
    public string? Local { get; set; }

    [Required]
    [Column("AGD_DataInicio")]
    public DateTime DataInicio { get; set; }

    [Column("AGD_DataFim")]
    public DateTime? DataFim { get; set; }

    [Column("AGD_DiaInteiro")]
    public bool DiaInteiro { get; set; }

    [MaxLength(20)]
    [Column("AGD_Cor")]
    public string? Cor { get; set; }

    [Column("AGD_Tipo")]
    public AgendaTipo Tipo { get; set; } = AgendaTipo.Reuniao;

    [Column("AGD_Visibilidade")]
    public AgendaVisibilidade Visibilidade { get; set; } = AgendaVisibilidade.Publico;

    [Column("AGD_ProjetoId")]
    public int? ProjetoId { get; set; }

    [ForeignKey("ProjetoId")]
    public Projeto? Projeto { get; set; }

    [Column("AGD_Recorrente")]
    public bool Recorrente { get; set; }

    [Column("AGD_PadraoRecorrencia")]
    public AgendaRecorrencia PadraoRecorrencia { get; set; } = AgendaRecorrencia.Nenhuma;

    [MaxLength(15)]
    [Column("AGD_UsuarioInclusao")]
    public string? UsuarioInclusao { get; set; }

    [Column("AGD_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(15)]
    [Column("AGD_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("AGD_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}
