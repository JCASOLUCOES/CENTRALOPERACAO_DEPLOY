using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models;

[Table("TBOPERADOR")]
public class Operador
{
    [Key]
    [Column("OPERADOR_ID")]
    [MaxLength(15)]
    public string OperadorId { get; set; } = string.Empty;

    [Column("NOME")]
    [MaxLength(50)]
    public string? Nome { get; set; }

    [Column("SENHA")]
    [MaxLength(10)]
    public string? Senha { get; set; }

    [Column("EMAIL")]
    [MaxLength(100)]
    public string? Email { get; set; }

    [Column("SE_ADMIN")]
    public bool? SeAdmin { get; set; }

    [Column("SE_ATIVO")]
    [MaxLength(1)]
    public string? SeAtivo { get; set; }

    [Column("PERFIL_SKIN")]
    [MaxLength(20)]
    public string? PerfilSkin { get; set; }

    [Column("DATA_ULTIMO_ACESSO")]
    public DateTime? DataUltimoAcesso { get; set; }

    [Column("DATA_INCLUSAO")]
    public DateTime? DataInclusao { get; set; }

    [Column("USUARIO_INCLUSAO")]
    [MaxLength(15)]
    public string? UsuarioInclusao { get; set; }

    [Column("DATA_ALTERACAO")]
    public DateTime? DataAlteracao { get; set; }

    [Column("USUARIO_ALTERACAO")]
    [MaxLength(15)]
    public string? UsuarioAlteracao { get; set; }

    [Column("PERFIL_ID")]
    [MaxLength(1)]
    public string? PerfilId { get; set; }
}
