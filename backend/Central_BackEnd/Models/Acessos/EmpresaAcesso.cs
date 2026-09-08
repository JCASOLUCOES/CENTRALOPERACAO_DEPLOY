namespace Central_BackEnd.Models.Acessos;

public class EmpresaAcesso
{
    public int Id { get; set; }
    public string NomeEmpresa { get; set; } = string.Empty;
    public string TsAcesso { get; set; } = string.Empty;
    public string TsIP { get; set; } = string.Empty;
    public string TsCredenciais { get; set; } = string.Empty;
    public string BancoIP { get; set; } = string.Empty;
    public string BancoCredenciais { get; set; } = string.Empty;
    public string VpnTipo { get; set; } = string.Empty;
    public string VpnNome { get; set; } = string.Empty;
    public string VpnGateway { get; set; } = string.Empty;
    public string VpnCredenciais { get; set; } = string.Empty;
    public string BancoNome { get; set; } = string.Empty;
    public string Versao { get; set; } = string.Empty;
    public string Rede { get; set; } = string.Empty;
    public string AcessoActyonWeb { get; set; } = string.Empty;
    public string AnyDesk { get; set; } = string.Empty;
    public string Observacoes { get; set; } = string.Empty;
}
