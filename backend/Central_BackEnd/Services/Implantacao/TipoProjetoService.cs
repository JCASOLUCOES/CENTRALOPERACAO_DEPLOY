using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface ITipoProjetoService
{
    Task<List<TipoProjetoResumo>> ListarAsync(bool apenasAtivos = true, CancellationToken ct = default);
    Task<TipoProjetoDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<TipoProjetoDetalhe> CriarAsync(TipoProjetoCriarRequest req, CancellationToken ct = default);
    Task<TipoProjetoDetalhe?> AtualizarAsync(int id, TipoProjetoAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
}

public class TipoProjetoService : ITipoProjetoService
{
    private readonly AppDbContext _db;

    public TipoProjetoService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<TipoProjetoResumo>> ListarAsync(bool apenasAtivos = true, CancellationToken ct = default)
    {
        var q = _db.TiposProjeto.AsNoTracking().AsQueryable();
        if (apenasAtivos) q = q.Where(t => t.Ativo);
        return await q.OrderBy(t => t.Ordem).ThenBy(t => t.Nome)
            .Select(t => new TipoProjetoResumo(t.Id, t.Codigo, t.Nome, t.ClienteObrigatorio, t.Ordem, t.Ativo))
            .ToListAsync(ct);
    }

    public async Task<TipoProjetoDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.TiposProjeto.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return t == null ? null : new TipoProjetoDetalhe(t.Id, t.Codigo, t.Nome, t.ClienteObrigatorio, t.Ativo, t.Ordem, t.UsuarioInclusao, t.DataInclusao, t.UsuarioAlteracao, t.DataAlteracao);
    }

    public async Task<TipoProjetoDetalhe> CriarAsync(TipoProjetoCriarRequest req, CancellationToken ct = default)
    {
        var t = new TipoProjeto
        {
            Codigo = req.Codigo.Trim(),
            Nome = req.Nome.Trim(),
            ClienteObrigatorio = req.ClienteObrigatorio,
            Ordem = req.Ordem,
            Ativo = true,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.TiposProjeto.Add(t);
        await _db.SaveChangesAsync(ct);
        return (await ObterAsync(t.Id, ct))!;
    }

    public async Task<TipoProjetoDetalhe?> AtualizarAsync(int id, TipoProjetoAtualizarRequest req, CancellationToken ct = default)
    {
        var t = await _db.TiposProjeto.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;

        t.Codigo = req.Codigo?.Trim() ?? t.Codigo;
        t.Nome = req.Nome?.Trim() ?? t.Nome;
        t.ClienteObrigatorio = req.ClienteObrigatorio ?? t.ClienteObrigatorio;
        if (req.Ordem != null) t.Ordem = req.Ordem.Value;
        if (req.Ativo != null) t.Ativo = req.Ativo.Value;
        t.UsuarioAlteracao = req.UsuarioAlteracao;
        t.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);
        return await ObterAsync(t.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.TiposProjeto.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return false;
        if (await _db.Projetos.AnyAsync(p => p.TipoProjetoId == id, ct))
            throw new InvalidOperationException("Não é possível excluir: existem projetos vinculados a este tipo.");
        _db.TiposProjeto.Remove(t);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}