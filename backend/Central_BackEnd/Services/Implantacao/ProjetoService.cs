using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IProjetoService
{
    Task<List<ProjetoResumo>> ListarAsync(ProjetoFiltro filtro, CancellationToken ct = default);
    Task<ProjetoDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<ProjetoDetalhe> CriarAsync(ProjetoCriarRequest req, CancellationToken ct = default);
    Task<ProjetoDetalhe?> AtualizarAsync(int id, ProjetoAtualizarRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task<string> ProximoCodigoAsync(CancellationToken ct = default);
    Task<List<ClienteResumo>> ListarClientesAsync(CancellationToken ct = default);
}

public class ProjetoService : IProjetoService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;

    public ProjetoService(AppDbContext db, IAuditoriaImplantacaoService auditoria)
    {
        _db = db;
        _auditoria = auditoria;
    }

    public async Task<List<ProjetoResumo>> ListarAsync(ProjetoFiltro f, CancellationToken ct = default)
    {
        var q = _db.Projetos.AsNoTracking()
            .Include(p => p.TipoProjeto)
            .Include(p => p.Cliente)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(f.Buscar))
            q = q.Where(p => EF.Functions.Like(p.Nome, $"%{f.Buscar}%") || EF.Functions.Like(p.Codigo, $"%{f.Buscar}%"));
        if (!string.IsNullOrWhiteSpace(f.Tipo))
            q = q.Where(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == f.Tipo);
        if (f.ClienteId.HasValue) q = q.Where(p => p.ClienteId == f.ClienteId);
        if (!string.IsNullOrEmpty(f.ResponsavelId))
            q = q.Where(p => p.ResponsavelId == f.ResponsavelId);
        if (!string.IsNullOrWhiteSpace(f.Status) && Enum.TryParse<StatusProjeto>(f.Status, out var st))
            q = q.Where(p => p.Status == st);
        if (!string.IsNullOrWhiteSpace(f.PerfilId))
        {
            var perfilId = f.PerfilId;
            // Compatibilidade SQL 2008 (compat 100): EXISTS correlacionado em vez de Contains em lista.
            q = q.Where(p => p.ResponsavelId != null && _db.Operadores.Any(o => o.OperadorId == p.ResponsavelId && o.PerfilId == perfilId));
        }

        return await q
            .OrderByDescending(p => p.DataInclusao)
            .Take(500)
            .Select(p => new ProjetoResumo(
                p.Id, p.Codigo, p.Nome,
                p.TipoProjeto != null ? p.TipoProjeto.Nome : "",
                p.ClienteId, p.Cliente != null ? p.Cliente.Fantasia : null,
                p.ClienteLegadoId, null,
                p.Status.ToString(), (int)p.Prioridade, p.Progresso,
                p.ResponsavelId,
                _db.Operadores.Where(o => o.OperadorId == p.ResponsavelId).Select(o => o.Nome).FirstOrDefault(),
                p.DataPrevisao, p.DataConclusao, p.DataInclusao))
            .ToListAsync(ct);
    }

    public async Task<ProjetoDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var p = await _db.Projetos.AsNoTracking()
            .Include(x => x.TipoProjeto).Include(x => x.Cliente)
            .Include(x => x.ColunaKanban)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return null;

        var responsavelNome = p.ResponsavelId == null ? null :
            await _db.Operadores.Where(o => o.OperadorId == p.ResponsavelId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var criadorNome = await _db.Operadores.Where(o => o.OperadorId == p.CriadorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var totalTarefas = await _db.Tarefas.CountAsync(t => t.ProjetoId == id && !t.Arquivada, ct);
        var tarefasConcluidas = await _db.Tarefas.CountAsync(t => t.ProjetoId == id && !t.Arquivada && t.Status == StatusTarefa.Concluida, ct);
        var hoje = DateTime.Today;
        var tarefasAtrasadas = await _db.Tarefas
            .Where(t => t.ProjetoId == id && !t.Arquivada)
            .OndeAtrasadas(hoje)
            .CountAsync(ct);

        return new ProjetoDetalhe(
            p.Id, p.Codigo, p.Nome, p.Descricao,
            p.TipoProjetoId, p.TipoProjeto?.Nome ?? "",
            p.ClienteId, p.Cliente?.Fantasia,
            p.ClienteLegadoId, null, null,
            p.ResponsavelId, responsavelNome,
            p.CriadorId, criadorNome ?? "",
            p.Status.ToString(),
            p.ColunaKanbanId, p.ColunaKanban?.Nome,
            (int)p.Prioridade, p.Progresso,
            p.DataInicio, p.DataPrevisao, p.DataConclusao,
            p.DataGoLivePrevista, p.DataGoLiveReal,
            p.HorasPlanejadas, p.HorasRealizadas, p.Observacao,
            totalTarefas, tarefasConcluidas, tarefasAtrasadas,
            p.DataInclusao, p.UsuarioInclusao, p.DataAlteracao, p.UsuarioAlteracao);
    }

    public async Task<ProjetoDetalhe> CriarAsync(ProjetoCriarRequest req, CancellationToken ct = default)
    {
        if (!Enum.IsDefined(typeof(PrioridadeProjeto), req.Prioridade))
            throw new ArgumentException("Prioridade inválida");
        if (!await _db.TiposProjeto.AnyAsync(t => t.Id == req.TipoProjetoId && t.Ativo, ct))
            throw new ArgumentException("TipoProjeto inexistente ou inativo");
        if (req.ClienteId.HasValue && !await _db.ClientesLegado.AnyAsync(c => c.Id == req.ClienteId.Value && c.Ativo == "S", ct))
            throw new ArgumentException("Cliente inexistente ou inativo");

        var p = new Projeto
        {
            Codigo = await ProximoCodigoAsync(ct),
            Nome = req.Nome.Trim(),
            Descricao = req.Descricao,
            TipoProjetoId = req.TipoProjetoId,
            ClienteId = req.ClienteId,
            ClienteLegadoId = req.ClienteLegadoId,
            ResponsavelId = req.ResponsavelId,
            CriadorId = req.CriadorId,
            ColunaKanbanId = req.ColunaKanbanId,
            Status = StatusProjeto.Backlog,
            Prioridade = (PrioridadeProjeto)req.Prioridade,
            Progresso = 0,
            DataInicio = req.DataInicio,
            DataPrevisao = req.DataPrevisao,
            DataGoLivePrevista = req.DataGoLivePrevista,
            HorasPlanejadas = req.HorasPlanejadas,
            Observacao = req.Observacao,
            UsuarioInclusao = req.CriadorId,
            DataInclusao = DateTime.Now
        };
        _db.Projetos.Add(p);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", p.Id, "CREATE", null, p, req.CriadorId, $"Projeto criado: {p.Codigo}", ct);
        return (await ObterAsync(p.Id, ct))!;
    }

    public async Task<ProjetoDetalhe?> AtualizarAsync(int id, ProjetoAtualizarRequest req, CancellationToken ct = default)
    {
        var p = await _db.Projetos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return null;
        if (req.TipoProjetoId.HasValue && !await _db.TiposProjeto.AnyAsync(t => t.Id == req.TipoProjetoId.Value && t.Ativo, ct))
            throw new ArgumentException("TipoProjeto inexistente");
        if (req.ClienteId.HasValue && !await _db.ClientesLegado.AnyAsync(c => c.Id == req.ClienteId.Value && c.Ativo == "S", ct))
            throw new ArgumentException("Cliente inexistente");
        if (req.Prioridade.HasValue && !Enum.IsDefined(typeof(PrioridadeProjeto), req.Prioridade.Value))
            throw new ArgumentException("Prioridade inválida");

        var antes = new { p.Nome, p.Descricao, p.TipoProjetoId, p.ClienteId, p.ClienteLegadoId, p.ResponsavelId, p.ColunaKanbanId, p.Prioridade, p.Progresso, p.DataInicio, p.DataPrevisao, p.DataConclusao, p.DataGoLivePrevista, p.DataGoLiveReal, p.HorasPlanejadas, p.HorasRealizadas, p.Observacao, p.Status };
        if (req.Nome != null) p.Nome = req.Nome.Trim();
        p.Descricao = req.Descricao;
        if (req.TipoProjetoId.HasValue) p.TipoProjetoId = req.TipoProjetoId.Value;
        if (req.ClienteId.HasValue) p.ClienteId = req.ClienteId.Value;
        if (req.ClienteLegadoId.HasValue) p.ClienteLegadoId = req.ClienteLegadoId.Value;
        if (req.ResponsavelId != null) p.ResponsavelId = req.ResponsavelId;
        if (req.ColunaKanbanId.HasValue) p.ColunaKanbanId = req.ColunaKanbanId;
        if (req.Prioridade.HasValue) p.Prioridade = (PrioridadeProjeto)req.Prioridade.Value;
        if (req.Progresso.HasValue) p.Progresso = req.Progresso.Value;
        if (req.DataInicio.HasValue) p.DataInicio = req.DataInicio.Value;
        if (req.DataPrevisao.HasValue) p.DataPrevisao = req.DataPrevisao.Value;
        if (req.DataConclusao.HasValue) p.DataConclusao = req.DataConclusao.Value;
        if (req.DataGoLivePrevista.HasValue) p.DataGoLivePrevista = req.DataGoLivePrevista.Value;
        if (req.DataGoLiveReal.HasValue) p.DataGoLiveReal = req.DataGoLiveReal.Value;
        if (req.HorasPlanejadas.HasValue) p.HorasPlanejadas = req.HorasPlanejadas.Value;
        if (req.HorasRealizadas.HasValue) p.HorasRealizadas = req.HorasRealizadas.Value;
        if (req.Observacao != null) p.Observacao = req.Observacao;
        if (req.Status != null && Enum.TryParse<StatusProjeto>(req.Status, out var novoStatusReq)) p.Status = novoStatusReq;
        p.UsuarioAlteracao = req.UsuarioAlteracao;
        p.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", id, "UPDATE", null, p, req.UsuarioAlteracao, "Projeto atualizado", ct);
        return await ObterAsync(p.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var p = await _db.Projetos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return false;
        var antes = new { p.Codigo, p.Nome, p.TipoProjetoId, p.ClienteId, p.ClienteLegadoId, p.Status };
        _db.Projetos.Remove(p);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", id, "DELETE", antes, null, "system", "Projeto excluído", ct);
        return true;
    }

    public async Task<List<ClienteResumo>> ListarClientesAsync(CancellationToken ct = default)
    {
        // Fonte única: tbcliente (legada, somente leitura). Exibe FANTASIA em ordem alfabética.
        return await _db.ClientesLegado.AsNoTracking()
            .Where(c => c.Ativo == "S")
            .OrderBy(c => c.Fantasia)
            .Select(c => new ClienteResumo(
                c.Id,
                c.Fantasia ?? c.RazaoSocial ?? string.Empty,
                c.Cnpj,
                c.Ativo == "S"))
            .ToListAsync(ct);
    }

    public async Task<string> ProximoCodigoAsync(CancellationToken ct = default)
    {
        var prefixo = "PRJ";
        var ultimosCodigos = await _db.Projetos
            .Where(p => p.Codigo.StartsWith(prefixo + "-"))
            .Select(p => p.Codigo)
            .ToListAsync(ct);
        int max = 0;
        foreach (var c in ultimosCodigos)
        {
            var parte = c.Substring(prefixo.Length + 1);
            if (int.TryParse(parte, out var n) && n > max) max = n;
        }
        return $"{prefixo}-{(max + 1):D4}";
    }
}