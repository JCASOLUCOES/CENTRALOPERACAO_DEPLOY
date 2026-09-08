using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IEquipeService
{
    Task<List<EquipeResumo>> ListarAsync(bool apenasAtivas, CancellationToken ct = default);
    Task<EquipeDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<EquipeDetalhe> CriarAsync(EquipeCriarRequest req, CancellationToken ct = default);
    Task<EquipeDetalhe?> AtualizarAsync(int id, EquipeAtualizarRequest req, CancellationToken ct = default);
    Task<bool> AdicionarMembroAsync(int equipeId, MembroAdicionarRequest req, CancellationToken ct = default);
    Task<bool> RemoverMembroAsync(int equipeId, int membroId, CancellationToken ct = default);
}

public class EquipeService : IEquipeService
{
    private readonly AppDbContext _db;
    public EquipeService(AppDbContext db) { _db = db; }

    public async Task<List<EquipeResumo>> ListarAsync(bool apenasAtivas, CancellationToken ct = default)
    {
        var q = _db.Equipes.AsNoTracking().AsQueryable();
        if (apenasAtivas) q = q.Where(e => e.Ativa);
        return await q
            .OrderBy(e => e.Nome)
            .Select(e => new EquipeResumo(
                e.Id,
                e.Nome,
                e.PrefixoCodigo,
                e.Ativa,
                _db.MembrosEquipe.Count(m => m.EquipeId == e.Id)))
            .ToListAsync(ct);
    }

    public async Task<EquipeDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.Equipes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return null;
        var membros = await _db.MembrosEquipe.AsNoTracking()
            .Where(m => m.EquipeId == id)
            .Join(_db.Operadores, m => m.OperadorId, o => o.OperadorId, (m, o) => new MembroEquipeResumo(m.Id, m.OperadorId, o.Nome, m.DataInclusao))
            .OrderBy(m => m.OperadorNome)
            .ToListAsync(ct);
        return new EquipeDetalhe(e.Id, e.Nome, e.Descricao, e.PrefixoCodigo, e.Ativa, membros, e.DataInclusao);
    }

    public async Task<EquipeDetalhe> CriarAsync(EquipeCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Nome))
            throw new ArgumentException("Nome obrigatorio");
        if (string.IsNullOrWhiteSpace(req.PrefixoCodigo))
            throw new ArgumentException("PrefixoCodigo obrigatorio");
        if (await _db.Equipes.AnyAsync(x => x.Nome == req.Nome, ct))
            throw new ArgumentException("Ja existe equipe com este nome");

        var e = new Equipe
        {
            Nome = req.Nome.Trim(),
            Descricao = req.Descricao,
            PrefixoCodigo = req.PrefixoCodigo.Trim().ToUpper(),
            Ativa = true,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.Equipes.Add(e);
        await _db.SaveChangesAsync(ct);
        return (await ObterAsync(e.Id, ct))!;
    }

    public async Task<EquipeDetalhe?> AtualizarAsync(int id, EquipeAtualizarRequest req, CancellationToken ct = default)
    {
        var e = await _db.Equipes.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return null;
        e.Nome = req.Nome.Trim();
        e.Descricao = req.Descricao;
        e.PrefixoCodigo = req.PrefixoCodigo.Trim().ToUpper();
        e.Ativa = req.Ativa;
        await _db.SaveChangesAsync(ct);
        return await ObterAsync(e.Id, ct);
    }

    public async Task<bool> AdicionarMembroAsync(int equipeId, MembroAdicionarRequest req, CancellationToken ct = default)
    {
        if (!await _db.Equipes.AnyAsync(e => e.Id == equipeId, ct)) return false;
        if (!await _db.Operadores.AnyAsync(o => o.OperadorId == req.OperadorId, ct))
            throw new ArgumentException("Operador inexistente");
        if (await _db.MembrosEquipe.AnyAsync(m => m.EquipeId == equipeId && m.OperadorId == req.OperadorId, ct))
            return true;
        _db.MembrosEquipe.Add(new MembroEquipe
        {
            EquipeId = equipeId,
            OperadorId = req.OperadorId,
            DataInclusao = DateTime.Now
        });
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> RemoverMembroAsync(int equipeId, int membroId, CancellationToken ct = default)
    {
        var m = await _db.MembrosEquipe.FirstOrDefaultAsync(x => x.Id == membroId && x.EquipeId == equipeId, ct);
        if (m == null) return false;
        _db.MembrosEquipe.Remove(m);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
