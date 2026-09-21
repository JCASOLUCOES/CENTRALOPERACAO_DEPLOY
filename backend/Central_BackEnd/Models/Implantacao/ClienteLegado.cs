using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Central_BackEnd.Models.Implantacao;

/// <summary>
/// Espelho somente-leitura da tabela legada tbcliente (mesmo banco/servidor).
/// Fonte única de clientes do módulo Implantação: o dropdown de Cliente
/// exibe FANTASIA em ordem alfabética, direto do banco — nunca fixo no código.
/// Escrita proibida: nenhum código deve inserir/alterar/excluir nesta tabela.
/// Demais colunas da tabela são ignoradas.
/// </summary>
[Table("tbcliente")]
public class ClienteLegado
{
    [Key]
    [Column("CLIENTE_ID")]
    public int Id { get; set; }

    [Column("CNPJ")]
    public string? Cnpj { get; set; }

    [Column("RAZAO_SOCIAL")]
    public string? RazaoSocial { get; set; }

    [Column("FANTASIA")]
    public string? Fantasia { get; set; }

    /// <summary>Flag 'S'/'N'.</summary>
    [Column("ATIVO")]
    public string? Ativo { get; set; }
}
