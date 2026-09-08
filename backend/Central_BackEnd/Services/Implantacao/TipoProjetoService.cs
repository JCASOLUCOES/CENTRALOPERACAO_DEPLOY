using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface ITipoProjetoService
{
    Task<List<TipoProjetoResumo>> ListarAsync(int? equipeId, bool apenasAtivos, CancellationToken ct = default);
    Task<TipoProjetoResumo?> ObterAsync(int id, CancellationToken ct = default);
    Task<TipoProjetoResumo> CriarAsync(TipoProjetoCriarRequest req, CancellationToken ct = default);
    Task<TipoProjetoResumo?> AtualizarAsync(int id, TipoProjetoAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
}

public class TipoProjetoService : ITipoProjetoService
{
    private readonly AppDbContext _db;
    public TipoProjetoService(AppDbContext db) { _db = db; }

    public async Task<List<TipoProjetoResumo>> ListarAsync(int? equipeId, bool apenasAtivos, CancellationToken ct = default)
    {
        var q = _db.TiposProjeto.AsNoTracking().AsQueryable();
        if (equipeId.HasValue) q = q.Where(t => t.EquipeId == equipeId.Value);
        if (apenasAtivos) q = q.Where(t => t.Ativo);
        return await q
            .OrderBy(t => t.Ordem).ThenBy(t => t.Nome)
            .Select(t => new TipoProjetoResumo(t.Id, t.Codigo, t.Nome, t.EquipeId,
                t.Equipe != null ? t.Equipe.Nome : null, t.ClienteObrigatorio, t.Ordem, t.Ativo))
            .ToListAsync(ct);
    }

    public async Task<TipoProjetoResumo?> ObterAsync(int id, CancellationToken ct = default)
    {
        return await _db.TiposProjeto.AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new TipoProjetoResumo(t.Id, t.Codigo, t.Nome, t.EquipeId,
                t.Equipe != null ? t.Equipe.Nome : null, t.ClienteObrigatorio, t.Ordem, t.Ativo))
            .FirstOrDefaultAsync(ct);
    }

    public async Task<TipoProjetoResumo> CriarAsync(TipoProjetoCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Codigo)) throw new ArgumentException("Codigo obrigatorio");
        if (await _db.TiposProjeto.AnyAsync(t => t.Codigo == req.Codigo, ct))
            throw new ArgumentException("Ja existe tipo com este codigo");
        var t = new TipoProjeto
        {
            Codigo = req.Codigo.Trim().ToUpper(),
            Nome = req.Nome.Trim(),
            EquipeId = req.EquipeId,
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

    public async Task<TipoProjetoResumo?> AtualizarAsync(int id, TipoProjetoAtualizarRequest req, CancellationToken ct = default)
    {
        var t = await _db.TiposProjeto.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        t.Codigo = req.Codigo.Trim().ToUpper();
        t.Nome = req.Nome.Trim();
        t.EquipeId = req.EquipeId;
        t.ClienteObrigatorio = req.ClienteObrigatorio;
        t.Ordem = req.Ordem;
        t.Ativo = req.Ativo;
        await _db.SaveChangesAsync(ct);
        return await ObterAsync(t.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.TiposProjeto.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return false;
        var temProjetos = await _db.Projetos.AnyAsync(p => p.TipoProjetoId == id, ct);
        if (temProjetos) { t.Ativo = false; await _db.SaveChangesAsync(ct); return true; }
        _db.TiposProjeto.Remove(t);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

public interface IEtapaService
{
    Task<List<EtapaResumo>> ListarAsync(int? tipoProjetoId, CancellationToken ct = default);
    Task<EtapaResumo> CriarAsync(EtapaCriarRequest req, CancellationToken ct = default);
    Task<EtapaResumo?> AtualizarAsync(int id, EtapaAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
}

public class EtapaService : IEtapaService
{
    private readonly AppDbContext _db;
    public EtapaService(AppDbContext db) { _db = db; }

    public async Task<List<EtapaResumo>> ListarAsync(int? tipoProjetoId, CancellationToken ct = default)
    {
        var q = _db.Etapas.AsNoTracking().AsQueryable();
        if (tipoProjetoId.HasValue) q = q.Where(e => e.TipoProjetoId == tipoProjetoId.Value || e.TipoProjetoId == null);
        return await q.OrderBy(e => e.Ordem).ThenBy(e => e.Nome)
            .Select(e => new EtapaResumo(e.Id, e.Nome, e.Ordem, e.TipoProjetoId, e.Cor, e.Concluida, e.Ativa))
            .ToListAsync(ct);
    }

    public async Task<EtapaResumo> CriarAsync(EtapaCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Nome)) throw new ArgumentException("Nome obrigatorio");
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
        return new EtapaResumo(e.Id, e.Nome, e.Ordem, e.TipoProjetoId, e.Cor, e.Concluida, e.Ativa);
    }

    public async Task<EtapaResumo?> AtualizarAsync(int id, EtapaAtualizarRequest req, CancellationToken ct = default)
    {
        var e = await _db.Etapas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return null;
        e.Nome = req.Nome.Trim();
        e.Ordem = req.Ordem;
        e.TipoProjetoId = req.TipoProjetoId;
        e.Cor = req.Cor;
        e.Concluida = req.Concluida;
        e.Ativa = req.Ativa;
        await _db.SaveChangesAsync(ct);
        return new EtapaResumo(e.Id, e.Nome, e.Ordem, e.TipoProjetoId, e.Cor, e.Concluida, e.Ativa);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var e = await _db.Etapas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (e == null) return false;
        _db.Etapas.Remove(e);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}

public interface IColunaKanbanService
{
    Task<List<ColunaKanbanResumo>> ListarAsync(bool apenasAtivas, CancellationToken ct = default);
    Task<ColunaKanbanResumo> CriarAsync(ColunaKanbanCriarRequest req, CancellationToken ct = default);
    Task<ColunaKanbanResumo?> AtualizarAsync(int id, ColunaKanbanAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task<bool> ReordenarAsync(ColunaKanbanReordenarRequest req, CancellationToken ct = default);
}

public class ColunaKanbanService : IColunaKanbanService
{
    private const int MaxColunas = 8;
    private readonly AppDbContext _db;
    public ColunaKanbanService(AppDbContext db) { _db = db; }

    public async Task<List<ColunaKanbanResumo>> ListarAsync(bool apenasAtivas, CancellationToken ct = default)
    {
        var q = _db.ColunasKanban.AsNoTracking().AsQueryable();
        if (apenasAtivas) q = q.Where(c => c.Ativa);
        return await q.OrderBy(c => c.Ordem)
            .Select(c => new ColunaKanbanResumo(c.Id, c.Nome, c.Ordem, c.Cor, c.Padrao, c.Ativa, c.LimiteWip))
            .ToListAsync(ct);
    }

    public async Task<ColunaKanbanResumo> CriarAsync(ColunaKanbanCriarRequest req, CancellationToken ct = default)
    {
        var total = await _db.ColunasKanban.CountAsync(ct);
        if (total >= MaxColunas)
            throw new InvalidOperationException($"Limite maximo de {MaxColunas} colunas atingido");
        if (string.IsNullOrWhiteSpace(req.Nome)) throw new ArgumentException("Nome obrigatorio");
        var c = new ColunaKanban
        {
            Nome = req.Nome.Trim().ToUpper(),
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
        return new ColunaKanbanResumo(c.Id, c.Nome, c.Ordem, c.Cor, c.Padrao, c.Ativa, c.LimiteWip);
    }

    public async Task<ColunaKanbanResumo?> AtualizarAsync(int id, ColunaKanbanAtualizarRequest req, CancellationToken ct = default)
    {
        var c = await _db.ColunasKanban.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return null;
        c.Nome = req.Nome.Trim().ToUpper();
        c.Ordem = req.Ordem;
        c.Cor = req.Cor;
        c.Ativa = req.Ativa;
        c.LimiteWip = req.LimiteWip;
        await _db.SaveChangesAsync(ct);
        return new ColunaKanbanResumo(c.Id, c.Nome, c.Ordem, c.Cor, c.Padrao, c.Ativa, c.LimiteWip);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var c = await _db.ColunasKanban.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c == null) return false;
        if (c.Padrao) throw new InvalidOperationException("Colunas padrao nao podem ser excluidas");
        _db.ColunasKanban.Remove(c);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ReordenarAsync(ColunaKanbanReordenarRequest req, CancellationToken ct = default)
    {
        if (req.IdsEmOrdem.Count > MaxColunas) return false;
        for (int i = 0; i < req.IdsEmOrdem.Count; i++)
        {
            var c = await _db.ColunasKanban.FirstOrDefaultAsync(x => x.Id == req.IdsEmOrdem[i], ct);
            if (c == null) continue;
            c.Ordem = i + 1;
        }
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
