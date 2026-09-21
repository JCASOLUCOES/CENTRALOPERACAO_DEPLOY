using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IColunaKanbanService
{
    Task<List<ColunaKanbanResumo>> ListarAsync(bool apenasAtivas = true, CancellationToken ct = default);
    Task<ColunaKanbanDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<ColunaKanbanDetalhe> CriarAsync(ColunaKanbanCriarRequest req, CancellationToken ct = default);
    Task<ColunaKanbanDetalhe?> AtualizarAsync(int id, ColunaKanbanAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task ReordenarAsync(ColunaKanbanReordenarRequest req, CancellationToken ct = default);
}

public class ColunaKanbanService : IColunaKanbanService
{
    private readonly AppDbContext _db;

    public ColunaKanbanService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<ColunaKanbanResumo>> ListarAsync(bool apenasAtivas = true, CancellationToken ct = default)
    {
        var q = _db.ColunasKanban.AsNoTracking().AsQueryable();
        if (apenasAtivas) q = q.Where(c => c.Ativa);
        return await q.OrderBy(c => c.Ordem)
            .Select(c => new ColunaKanbanResumo(c.Id, c.Nome, c.Ordem, c.Cor, c.Padrao, c.Ativa, c.LimiteWip))
            .ToListAsync(ct);
    }

    public async Task<ColunaKanbanDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.ColunasKanban.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c == null ? null : new ColunaKanbanDetalhe(c.Id, c.Nome, c.Ordem, c.Cor, c.Padrao, c.Ativa, c.LimiteWip, c.UsuarioInclusao, c.DataInclusao, c.UsuarioAlteracao, c.DataAlteracao);
    }

    public async Task<ColunaKanbanDetalhe> CriarAsync(ColunaKanbanCriarRequest req, CancellationToken ct = default)
    {
        var c = new ColunaKanban
        {
            Nome = req.Nome.Trim(),
            Ordem = req.Ordem,
            Cor = req.Cor,
            LimiteWip = req.LimiteWip,
            Padrao = false,
            Ativa = true,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.ColunasKanban.Add(c);
        await _db.SaveChangesAsync(ct);
        return (await ObterAsync(c.Id, ct))!;
    }

    public async Task<ColunaKanbanDetalhe?> AtualizarAsync(int id, ColunaKanbanAtualizarRequest req, CancellationToken ct = default)
    {
        var c = await _db.ColunasKanban.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return null;

        c.Nome = req.Nome?.Trim() ?? c.Nome;
        if (req.Ordem.HasValue) c.Ordem = req.Ordem.Value;
        c.Cor = req.Cor;
        if (req.Ativa.HasValue) c.Ativa = req.Ativa.Value;
        if (req.LimiteWip.HasValue) c.LimiteWip = req.LimiteWip.Value;
        c.UsuarioAlteracao = req.UsuarioAlteracao;
        c.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);
        return await ObterAsync(c.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.ColunasKanban.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return false;
        if (c.Padrao) throw new InvalidOperationException("Não é possível excluir coluna padrão");
        if (await _db.Tarefas.AnyAsync(t => t.ColunaKanbanId == id, ct))
            throw new InvalidOperationException("Não é possível excluir: existem tarefas nesta coluna.");
        _db.ColunasKanban.Remove(c);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task ReordenarAsync(ColunaKanbanReordenarRequest req, CancellationToken ct = default)
    {
        // Filtro em memória: Contains sobre coleção local gera OPENJSON,
        // incompatível com o compatibility level do banco de produção.
        // Tabela de colunas é minúscula (<= 8 linhas), sem impacto.
        var colunas = await _db.ColunasKanban.ToListAsync(ct);
        for (int i = 0; i < req.IdsEmOrdem.Count; i++)
        {
            var c = colunas.FirstOrDefault(c => c.Id == req.IdsEmOrdem[i]);
            if (c != null) c.Ordem = i + 1;
        }
        await _db.SaveChangesAsync(ct);
    }
}