using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IClienteService
{
    Task<List<ClienteResumo>> ListarAsync(string? buscar, bool apenasAtivos, CancellationToken ct = default);
    Task<ClienteDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<ClienteDetalhe> CriarAsync(ClienteCriarRequest req, CancellationToken ct = default);
    Task<ClienteDetalhe?> AtualizarAsync(int id, ClienteAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
}

public class ClienteService : IClienteService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;
    public ClienteService(AppDbContext db, IAuditoriaImplantacaoService auditoria)
    {
        _db = db;
        _auditoria = auditoria;
    }

    public async Task<List<ClienteResumo>> ListarAsync(string? buscar, bool apenasAtivos, CancellationToken ct = default)
    {
        var q = _db.Clientes.AsNoTracking().AsQueryable();
        if (apenasAtivos) q = q.Where(c => c.Ativo);
        if (!string.IsNullOrWhiteSpace(buscar))
            q = q.Where(c => EF.Functions.Like(c.Nome, $"%{buscar}%") || (c.Cnpj != null && EF.Functions.Like(c.Cnpj, $"%{buscar}%")));

        return await q
            .OrderBy(c => c.Nome)
            .Select(c => new ClienteResumo(c.Id, c.Nome, c.Cnpj, c.Ativo))
            .ToListAsync(ct);
    }

    public async Task<ClienteDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.Clientes.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return null;
        var totalProjetos = await _db.Projetos.CountAsync(p => p.ClienteId == id, ct);
        return new ClienteDetalhe(c.Id, c.Nome, c.Cnpj, c.Contato, c.Observacao, c.Ativo, totalProjetos, c.DataInclusao, c.UsuarioInclusao);
    }

    public async Task<ClienteDetalhe> CriarAsync(ClienteCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Nome))
            throw new ArgumentException("Nome obrigatorio");

        var c = new Cliente
        {
            Nome = req.Nome.Trim(),
            Cnpj = string.IsNullOrWhiteSpace(req.Cnpj) ? null : req.Cnpj.Trim(),
            Contato = req.Contato,
            Observacao = req.Observacao,
            Ativo = true,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.Clientes.Add(c);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Cliente", c.Id, "CREATE", null, c, req.UsuarioInclusao, $"Cliente criado: {c.Nome}", ct);
        return (await ObterAsync(c.Id, ct))!;
    }

    public async Task<ClienteDetalhe?> AtualizarAsync(int id, ClienteAtualizarRequest req, CancellationToken ct = default)
    {
        var c = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return null;

        var antes = new { c.Nome, c.Cnpj, c.Contato, c.Observacao, c.Ativo };
        c.Nome = req.Nome.Trim();
        c.Cnpj = string.IsNullOrWhiteSpace(req.Cnpj) ? null : req.Cnpj.Trim();
        c.Contato = req.Contato;
        c.Observacao = req.Observacao;
        c.Ativo = req.Ativo;
        c.UsuarioAlteracao = req.UsuarioAlteracao;
        c.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Cliente", id, "UPDATE", antes, new { c.Nome, c.Cnpj, c.Contato, c.Observacao, c.Ativo }, req.UsuarioAlteracao, "Cliente atualizado", ct);
        return await ObterAsync(c.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.Clientes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return false;
        var temProjetos = await _db.Projetos.AnyAsync(p => p.ClienteId == id, ct);
        if (temProjetos)
        {
            var antesDesativar = new { c.Nome, c.Cnpj, c.Ativo };
            c.Ativo = false;
            c.UsuarioAlteracao = "sistema";
            c.DataAlteracao = DateTime.Now;
            await _db.SaveChangesAsync(ct);
            await _auditoria.RegistrarAsync("Cliente", id, "UPDATE", antesDesativar, new { c.Nome, c.Cnpj, c.Ativo }, "sistema", "Cliente desativado (tem projetos vinculados)", ct);
            return true;
        }
        var antesExcluir = new { c.Nome, c.Cnpj, c.Contato, c.Observacao, c.Ativo };
        _db.Clientes.Remove(c);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Cliente", id, "DELETE", antesExcluir, null, "sistema", "Cliente excluído", ct);
        return true;
    }
}
