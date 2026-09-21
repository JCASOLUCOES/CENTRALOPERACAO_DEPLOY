using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Espelho somente-leitura da tabela legada tbchamado (mesmo banco/servidor).
/// Escrita proibida: nenhum código deve inserir/alterar/excluir nesta tabela.
/// Demais colunas da tabela são ignoradas.
/// </summary>
[Table("tbchamado")]
public class ChamadoLegado
{
    [Key]
    [Column("CHAMADO_ID")]
    public int Id { get; set; }

    [Column("CLIENTE_ID")]
    public int? ClienteId { get; set; }

    [Column("TITULO")]
    public string? Titulo { get; set; }

    [Column("STATUS")]
    public string? Status { get; set; }

    [Column("DATA_PREVISAO")]
    public DateTime? DataPrevisao { get; set; }

    [Column("DATA_FECHAMENTO")]
    public DateTime? DataFechamento { get; set; }
}
