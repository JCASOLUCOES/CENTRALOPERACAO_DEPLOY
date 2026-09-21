using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IEtapaService
{
    Task<List<EtapaResumo>> ListarAsync(int? tipoProjetoId = null, bool apenasAtivas = true, CancellationToken ct = default);
    Task<EtapaDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<EtapaDetalhe> CriarAsync(EtapaCriarRequest req, CancellationToken ct = default);
    Task<EtapaDetalhe?> AtualizarAsync(int id, EtapaAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
}

public class EtapaService : IEtapaService
{
    private readonly AppDbContext _db;

    public EtapaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<EtapaResumo>> ListarAsync(int? tipoProjetoId = null, bool apenasAtivas = true, CancellationToken ct = default)
    {
        var q = _db.Etapas.AsNoTracking().AsQueryable();
        if (tipoProjetoId.HasValue)
            q = q.Where(e => e.TipoProjetoId == null || e.TipoProjetoId == tipoProjetoId.Value);
        if (apenasAtivas)
            q = q.Where(e => e.Ativa);
        return await q
            .OrderBy(e => e.Ordem)
            .Select(e => new EtapaResumo(e.Id, e.Nome, e.Ordem, e.TipoProjetoId, e.Cor, e.Concluida, e.Ativa))
            .ToListAsync(ct);
    }

    public async Task<EtapaDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.Etapas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return e == null ? null : new EtapaDetalhe(e.Id, e.Nome, e.Ordem, e.TipoProjetoId, e.Cor, e.Concluida, e.Ativa, e.UsuarioInclusao, e.DataInclusao, e.UsuarioAlteracao, e.DataAlteracao);
    }

    public async Task<EtapaDetalhe> CriarAsync(EtapaCriarRequest req, CancellationToken ct = default)
    {
        var e = new Etapa
        {
            Nome = req.Nome.Trim(),
            Ordem = req.Ordem,
            TipoProjetoId = req.TipoProjetoId,
            Cor = req.Cor,
            Concluida = false,
            Ativa = true,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.Etapas.Add(e);
        await _db.SaveChangesAsync(ct);
        return (await ObterAsync(e.Id, ct))!;
    }

    public async Task<EtapaDetalhe?> AtualizarAsync(int id, EtapaAtualizarRequest req, CancellationToken ct = default)
    {
        var e = await _db.Etapas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return null;

        e.Nome = req.Nome?.Trim() ?? e.Nome;
        if (req.Ordem.HasValue) e.Ordem = req.Ordem.Value;
        if (req.TipoProjetoId.HasValue) e.TipoProjetoId = req.TipoProjetoId.Value;
        e.Cor = req.Cor;
        if (req.Concluida.HasValue) e.Concluida = req.Concluida.Value;
        if (req.Ativa.HasValue) e.Ativa = req.Ativa.Value;
        e.UsuarioAlteracao = req.UsuarioAlteracao;
        e.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);
        return await ObterAsync(e.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.Etapas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return false;
        if (await _db.Tarefas.AnyAsync(t => t.EtapaId == id, ct))
            throw new InvalidOperationException("Não é possível excluir: existem tarefas vinculadas a esta etapa.");
        _db.Etapas.Remove(e);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}