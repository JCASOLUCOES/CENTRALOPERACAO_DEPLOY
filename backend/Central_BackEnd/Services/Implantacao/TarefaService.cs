using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface ITarefaService
{
    Task<List<TarefaResumo>> ListarAsync(TarefaFiltro f, string? operadorLogado, CancellationToken ct = default);
    Task<TarefaDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<TarefaDetalhe> CriarAsync(TarefaCriarRequest req, CancellationToken ct = default);
    Task<TarefaDetalhe?> AtualizarAsync(int id, TarefaAtualizarRequest req, CancellationToken ct = default);
    Task<TarefaDetalhe?> MudarColunaAsync(int id, TarefaMudarColunaRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task<ComentarioTarefaResumo> AdicionarComentarioAsync(int tarefaId, ComentarioCriarRequest req, CancellationToken ct = default);
}

public class TarefaService : ITarefaService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;
    public TarefaService(AppDbContext db, IAuditoriaImplantacaoService auditoria)
    {
        _db = db;
        _auditoria = auditoria;
    }

    public async Task<List<TarefaResumo>> ListarAsync(TarefaFiltro f, string? operadorLogado, CancellationToken ct = default)
    {
        var q = _db.Tarefas.AsNoTracking()
            .Include(t => t.Projeto).ThenInclude(p => p.Equipe)
            .AsQueryable();

        if (f.ProjetoId.HasValue) q = q.Where(t => t.ProjetoId == f.ProjetoId);
        if (!string.IsNullOrWhiteSpace(f.Equipe))
            q = q.Where(t => t.Projeto != null && t.Projeto.Equipe != null && t.Projeto.Equipe.Nome == f.Equipe);
        if (!string.IsNullOrWhiteSpace(f.ResponsavelId))
            q = q.Where(t => t.ResponsavelId == f.ResponsavelId);
        if (!string.IsNullOrWhiteSpace(f.Status) && Enum.TryParse<StatusTarefa>(f.Status, out var st))
            q = q.Where(t => t.Status == st);
        if (f.Prioridade.HasValue) q = q.Where(t => (int)t.Prioridade == f.Prioridade);
        if (!string.IsNullOrWhiteSpace(f.Buscar))
            q = q.Where(t => EF.Functions.Like(t.Titulo, $"%{f.Buscar}%"));
        if (f.ApenasAtrasadas == true)
        {
            var hoje = DateTime.Today;
            q = q.Where(t => t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada &&
                              t.DataPrevisao != null && t.DataPrevisao.Value.Date < hoje);
        }
        if (f.ApenasEmAndamento == true) q = q.Where(t => t.Status == StatusTarefa.EmAndamento);
        if (f.ApenasConcluidas == true) q = q.Where(t => t.Status == StatusTarefa.Concluida);

        return await q
            .OrderBy(t => t.Ordem).ThenByDescending(t => t.Prioridade).ThenBy(t => t.DataPrevisao)
            .Take(500)
            .Select(t => new TarefaResumo(
                t.Id, t.ProjetoId,
                t.Projeto != null ? t.Projeto.Codigo : "",
                t.Projeto != null ? t.Projeto.Nome : "",
                t.Titulo,
                t.ResponsavelId,
                _db.Operadores.Where(o => o.OperadorId == t.ResponsavelId).Select(o => o.Nome).FirstOrDefault(),
                t.Status.ToString(), (int)t.Prioridade, t.ColunaKanbanId, t.ChamadoLegadoId, t.Ordem,
                t.DataPrevisao, t.DataConclusao, t.Bloqueada, t.MotivoBloqueio, t.HorasEstimadas, t.HorasRealizadas, t.DataInclusao))
            .ToListAsync(ct);
    }

    public async Task<TarefaDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.AsNoTracking()
            .Include(x => x.Projeto)
            .Include(x => x.Etapa).Include(x => x.ColunaKanban)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        var respNome = t.ResponsavelId == null ? null :
            await _db.Operadores.Where(o => o.OperadorId == t.ResponsavelId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var criadorNome = await _db.Operadores.Where(o => o.OperadorId == t.CriadorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var comentarios = await _db.ComentariosTarefa.AsNoTracking()
            .Where(c => c.TarefaId == id)
            .OrderBy(c => c.DataInclusao)
            .Join(_db.Operadores, c => c.AutorId, o => o.OperadorId, (c, o) =>
                new ComentarioTarefaResumo(c.Id, c.AutorId, o.Nome, c.Texto, c.DataInclusao))
            .ToListAsync(ct);

        return new TarefaDetalhe(
            t.Id, t.ProjetoId, t.Projeto?.Codigo ?? "", t.Projeto?.Nome ?? "",
            t.EtapaId, t.Etapa?.Nome, t.ColunaKanbanId, t.ColunaKanban?.Nome,
            t.Titulo, t.Descricao, t.ResponsavelId, respNome,
            t.CriadorId, criadorNome ?? "",
            t.Status.ToString(), (int)t.Prioridade, t.Ordem,
            t.DataPrevisao, t.DataConclusao,
            t.HorasEstimadas, t.HorasRealizadas, t.Bloqueada, t.MotivoBloqueio,
            comentarios, t.DataInclusao, t.UsuarioInclusao, t.DataAlteracao, t.UsuarioAlteracao);
    }

    public async Task<TarefaDetalhe> CriarAsync(TarefaCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Titulo)) throw new ArgumentException("Titulo obrigatorio");
        if (!await _db.Projetos.AnyAsync(p => p.Id == req.ProjetoId, ct))
            throw new ArgumentException("Projeto inexistente");
        if (req.ColunaKanbanId.HasValue && !await _db.ColunasKanban.AnyAsync(c => c.Id == req.ColunaKanbanId, ct))
            throw new ArgumentException("Coluna inexistente");
        if (!string.IsNullOrEmpty(req.ResponsavelId) && !await _db.Operadores.AnyAsync(o => o.OperadorId == req.ResponsavelId, ct))
            throw new ArgumentException("Responsavel inexistente");

        var t = new Tarefa
        {
            ProjetoId = req.ProjetoId,
            EtapaId = req.EtapaId,
            ColunaKanbanId = req.ColunaKanbanId,
            ChamadoLegadoId = req.ChamadoLegadoId,
            Titulo = req.Titulo.Trim(),
            Descricao = req.Descricao,
            ResponsavelId = req.ResponsavelId,
            CriadorId = req.CriadorId,
            Status = StatusTarefa.AFazer,
            Prioridade = (PrioridadeTarefa)req.Prioridade,
            Ordem = req.Ordem,
            DataPrevisao = req.DataPrevisao,
            HorasEstimadas = req.HorasEstimadas,
            UsuarioInclusao = req.CriadorId,
            DataInclusao = DateTime.Now
        };
        _db.Tarefas.Add(t);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", t.Id, "CREATE", null, t, req.CriadorId, $"Tarefa criada: {t.Titulo}", ct);
        return (await ObterAsync(t.Id, ct))!;
    }

    public async Task<TarefaDetalhe?> AtualizarAsync(int id, TarefaAtualizarRequest req, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        var antes = new { t.Titulo, t.Descricao, t.EtapaId, t.ColunaKanbanId, t.ChamadoLegadoId, t.ResponsavelId, t.Prioridade, t.Ordem, t.DataPrevisao, t.DataConclusao, t.HorasEstimadas, t.HorasRealizadas, t.Bloqueada, t.MotivoBloqueio, t.Status };
        t.EtapaId = req.EtapaId;
        t.ColunaKanbanId = req.ColunaKanbanId;
        t.ChamadoLegadoId = req.ChamadoLegadoId;
        t.Titulo = req.Titulo.Trim();
        t.Descricao = req.Descricao;
        t.ResponsavelId = req.ResponsavelId;
        t.Prioridade = (PrioridadeTarefa)req.Prioridade;
        t.Ordem = req.Ordem;
        t.DataPrevisao = req.DataPrevisao;
        t.DataConclusao = req.DataConclusao;
        t.HorasEstimadas = req.HorasEstimadas;
        t.HorasRealizadas = req.HorasRealizadas;
        t.Bloqueada = req.Bloqueada;
        t.MotivoBloqueio = req.MotivoBloqueio;
        t.UsuarioAlteracao = req.UsuarioAlteracao;
        t.DataAlteracao = DateTime.Now;
        if (req.Bloqueada == false) t.MotivoBloqueio = null;
        if (req.DataConclusao.HasValue && t.Status != StatusTarefa.Concluida)
            t.Status = StatusTarefa.Concluida;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", new { t.Titulo, t.Descricao, t.EtapaId, t.ColunaKanbanId, t.ChamadoLegadoId, t.ResponsavelId, t.Prioridade, t.Ordem, t.DataPrevisao, t.DataConclusao, t.HorasEstimadas, t.HorasRealizadas, t.Bloqueada, t.MotivoBloqueio, t.Status }, new { t.Titulo, t.Descricao, t.EtapaId, t.ColunaKanbanId, t.ChamadoLegadoId, t.ResponsavelId, t.Prioridade, t.Ordem, t.DataPrevisao, t.DataConclusao, t.HorasEstimadas, t.HorasRealizadas, t.Bloqueada, t.MotivoBloqueio, t.Status }, "system", "Tarefa atualizada", ct);
        return await ObterAsync(t.Id, ct);
    }

    public async Task<TarefaDetalhe?> MudarColunaAsync(int id, TarefaMudarColunaRequest req, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        var antes = new { t.ColunaKanbanId, t.Ordem, t.Status };
        if (req.ColunaKanbanId.HasValue && !await _db.ColunasKanban.AnyAsync(c => c.Id == req.ColunaKanbanId, ct))
            throw new ArgumentException("Coluna inexistente");
        t.ColunaKanbanId = req.ColunaKanbanId;
        t.Ordem = req.NovaOrdem;
        if (req.ColunaKanbanId.HasValue)
        {
            var col = await _db.ColunasKanban.FirstOrDefaultAsync(c => c.Id == req.ColunaKanbanId, ct);
            if (col != null)
            {
                var nome = col.Nome.ToUpper();
                if (nome.Contains("CONCLUID")) t.Status = StatusTarefa.Concluida;
                else if (nome.Contains("ANDAMENTO") || nome.Contains("HOMOLOG")) t.Status = StatusTarefa.EmAndamento;
                else if (nome.Contains("A FAZER") || nome.Contains("BACKLOG")) t.Status = StatusTarefa.AFazer;
            }
        }
        t.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", antes, new { t.ColunaKanbanId, t.Ordem, t.Status }, "system", "Tarefa movida para outra coluna", ct);
        return await ObterAsync(t.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return false;
        var antes = new { t.Titulo, t.ProjetoId, t.Status, t.ColunaKanbanId };
        _db.Tarefas.Remove(t);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "DELETE", antes, null, "system", "Tarefa excluída", ct);
        return true;
    }

    public async Task<ComentarioTarefaResumo> AdicionarComentarioAsync(int tarefaId, ComentarioCriarRequest req, CancellationToken ct = default)
    {
        if (!await _db.Tarefas.AnyAsync(t => t.Id == tarefaId, ct))
            throw new ArgumentException("Tarefa inexistente");
        var c = new ComentarioTarefa
        {
            TarefaId = tarefaId,
            AutorId = req.AutorId,
            Texto = req.Texto.Trim(),
            DataInclusao = DateTime.Now
        };
        _db.ComentariosTarefa.Add(c);
        await _db.SaveChangesAsync(ct);
        var autorNome = await _db.Operadores.Where(o => o.OperadorId == c.AutorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        return new ComentarioTarefaResumo(c.Id, c.AutorId, autorNome ?? "", c.Texto, c.DataInclusao);
    }
}
