namespace Central_BackEnd.Models.Acessos;

public class EmpresaDetalheResponse
{
    public int Id { get; set; }
    public string NomeEmpresa { get; set; } = string.Empty;
    public string TsAcesso { get; set; } = string.Empty;
    public string TsEndereco { get; set; } = string.Empty;
    public string TsUsuarioSenha { get; set; } = string.Empty;
    public string BancoNome { get; set; } = string.Empty;
    public string BancoIP { get; set; } = string.Empty;
    public string BancoUsuarioSenha { get; set; } = string.Empty;
    public string Vpn { get; set; } = string.Empty;
    public string VpnNome { get; set; } = string.Empty;
    public string VpnGateway { get; set; } = string.Empty;
    public string VpnUsuarioSenha { get; set; } = string.Empty;
    public string VersaoCob { get; set; } = string.Empty;
    public string AcessoConfigActyonCob { get; set; } = string.Empty;
    public string AcessoActyonWeb { get; set; } = string.Empty;
    public string AnyDesk { get; set; } = string.Empty;
    public string Observacoes { get; set; } = string.Empty;
}