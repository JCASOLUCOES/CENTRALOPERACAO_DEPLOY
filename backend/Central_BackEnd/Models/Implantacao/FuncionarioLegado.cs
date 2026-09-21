using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Espelho somente-leitura da tabela legada tbfuncionario (mesmo banco).
/// Fonte real da função do operador: FUNCAO_ID (1/2/3 → CC_Funcao),
/// ligada a TBOPERADOR pelo OPERADOR_ID exato (ex.: 'FELIPE GOMES').
/// TBOPERADOR.FUNCAO_ID não é preenchido (coluna criada sem backfill) —
/// filtros por função devem usar esta entidade, nunca Operador.FuncaoId.
/// Demais colunas da tabela são ignoradas.
/// </summary>
[Table("tbfuncionario")]
public class FuncionarioLegado
{
    [Key]
    [Column("FUNCIONARIO_ID")]
    public int FuncionarioId { get; set; }

    [Column("FUNCAO_ID")]
    public int? FuncaoId { get; set; }

    [MaxLength(50)]
    [Column("OPERADOR_ID")]
    public string? OperadorId { get; set; }

    [MaxLength(1)]
    [Column("ATIVO")]
    public string? Ativo { get; set; }
}
