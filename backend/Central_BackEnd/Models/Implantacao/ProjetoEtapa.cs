using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

[Table("tbprojetoetapa")]
public class ProjetoEtapa
{
    [Key]
    [Column("PEP_Id")]
    public int Id { get; set; }

    [Required]
    [Column("PEP_ProjetoId")]
    public int ProjetoId { get; set; }

    [ForeignKey("ProjetoId")]
    public Projeto? Projeto { get; set; }

    [Column("PEP_Ordem")]
    public int Ordem { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("PEP_Nome")]
    public string Nome { get; set; } = string.Empty;

    [MaxLength(20)]
    [Column("PEP_Estado")]
    public string Estado { get; set; } = "Pendente";

    [Column("PEP_Percentual")]
    public int Percentual { get; set; } = 0;

    [Column("PEP_DataInicio")]
    public DateTime? DataInicio { get; set; }

    [Column("PEP_DataFimPrevista")]
    public DateTime? DataFimPrevista { get; set; }

    [Column("PEP_DataFimReal")]
    public DateTime? DataFimReal { get; set; }

    [Column("PEP_AtrasoDias")]
    public int? AtrasoDias { get; set; }

    [MaxLength(50)]
    [Column("PEP_ResponsavelId")]
    public string? ResponsavelId { get; set; }

    [MaxLength(50)]
    [Column("PEP_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("PEP_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("PEP_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("PEP_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }

    public List<ProjetoEtapaChecklist> Checklist { get; set; } = new();
    public List<ProjetoEtapaDocumento> Documentos { get; set; } = new();
    public List<ProjetoEtapaHistorico> Historico { get; set; } = new();
    public List<ProjetoEtapaComentario> Comentarios { get; set; } = new();
}

[Table("tbprojetoetapachecklist")]
public class ProjetoEtapaChecklist
{
    [Key]
    [Column("PEC_Id")]
    public int Id { get; set; }

    [Required]
    [Column("PEC_ProjetoEtapaId")]
    public int ProjetoEtapaId { get; set; }

    [ForeignKey("ProjetoEtapaId")]
    public ProjetoEtapa? ProjetoEtapa { get; set; }

    [Required]
    [MaxLength(500)]
    [Column("PEC_Descricao")]
    public string Descricao { get; set; } = string.Empty;

    [Column("PEC_Concluido")]
    public bool Concluido { get; set; } = false;

    [Column("PEC_DataConclusao")]
    public DateTime? DataConclusao { get; set; }

    [MaxLength(50)]
    [Column("PEC_UsuarioConclusao")]
    public string? UsuarioConclusao { get; set; }

    [Column("PEC_Ordem")]
    public int Ordem { get; set; } = 0;

    [MaxLength(50)]
    [Column("PEC_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("PEC_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;

    [MaxLength(50)]
    [Column("PEC_UsuarioAlteracao")]
    public string? UsuarioAlteracao { get; set; }

    [Column("PEC_DataAlteracao")]
    public DateTime? DataAlteracao { get; set; }
}

[Table("tbprojetoetapadocumento")]
public class ProjetoEtapaDocumento
{
    [Key]
    [Column("PED_Id")]
    public int Id { get; set; }

    [Required]
    [Column("PED_ProjetoEtapaId")]
    public int ProjetoEtapaId { get; set; }

    [ForeignKey("ProjetoEtapaId")]
    public ProjetoEtapa? ProjetoEtapa { get; set; }

    [Required]
    [MaxLength(200)]
    [Column("PED_Nome")]
    public string Nome { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    [Column("PED_Url")]
    public string Url { get; set; } = string.Empty;

    [MaxLength(500)]
    [Column("PED_Descricao")]
    public string? Descricao { get; set; }

    [MaxLength(50)]
    [Column("PED_UsuarioInclusao")]
    public string UsuarioInclusao { get; set; } = string.Empty;

    [Column("PED_DataInclusao")]
    public DateTime DataInclusao { get; set; } = DateTime.Now;
}

[Table("tbprojetoetahistorico")]
public class ProjetoEtapaHistorico
{
    [Key]
    [Column("PEH_Id")]
    public int Id { get; set; }

    [Required]
    [Column("PEH_ProjetoEtapaId")]
    public int ProjetoEtapaId { get; set; }

    [ForeignKey("ProjetoEtapaId")]
    public ProjetoEtapa? ProjetoEtapa { get; set; }

    [Required]
    [MaxLength(1000)]
    [Column("PEH_Acao")]
    public string Acao { get; set; } = string.Empty;

    [MaxLength(2000)]
    [Column("PEH_Detalhes")]
    public string? Detalhes { get; set; }

    [MaxLength(50)]
    [Column("PEH_Usuario")]
    public string Usuario { get; set; } = string.Empty;

    [Column("PEH_Data")]
    public DateTime Data { get; set; } = DateTime.Now;
}

[Table("tbprojetoetapacomentario")]
public class ProjetoEtapaComentario
{
    [Key]
    [Column("PEC_Id")]
    public int Id { get; set; }

    [Required]
    [Column("PEC_ProjetoEtapaId")]
    public int ProjetoEtapaId { get; set; }

    [ForeignKey("ProjetoEtapaId")]
    public ProjetoEtapa? ProjetoEtapa { get; set; }

    [Required]
    [MaxLength(4000)]
    [Column("PEC_Texto")]
    public string Texto { get; set; } = string.Empty;

    [MaxLength(50)]
    [Column("PEC_Usuario")]
    public string Usuario { get; set; } = string.Empty;

    [Column("PEC_Data")]
    public DateTime Data { get; set; } = DateTime.Now;
}