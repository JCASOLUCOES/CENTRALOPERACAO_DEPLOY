using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface ITarefaService
{
    Task<List<TarefaResumo>> ListarAsync(TarefaFiltro f, string? operadorLogado, CancellationToken ct = default);
    Task<TarefaDetalhe?> ObterAsync(int id, CancellationToken ct = default);
    Task<TarefaDetalhe> CriarAsync(TarefaCriarRequest req, string operadorLogado, CancellationToken ct = default);
    Task<TarefaDetalhe?> AtualizarAsync(int id, TarefaAtualizarRequest req, string operadorLogado, CancellationToken ct = default);
    Task<TarefaDetalhe?> MudarColunaAsync(int id, TarefaMudarColunaRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task<ComentarioTarefaResumo> AdicionarComentarioAsync(int tarefaId, ComentarioCriarRequest req, CancellationToken ct = default);
    Task<TarefaDetalhe?> ArquivarAsync(int id, CancellationToken ct = default);
    Task<TarefaDetalhe?> DesarquivarAsync(int id, CancellationToken ct = default);
    Task<List<ChamadoLegadoResumo>> BuscarChamadosAsync(string? buscar, int take, CancellationToken ct = default);
    Task<TarefaDetalhe?> VincularChamadoAsync(int id, int chamadoId, string usuario, CancellationToken ct = default);
    Task<TarefaDetalhe?> DesvincularChamadoAsync(int id, int chamadoId, CancellationToken ct = default);
    Task<ApontamentoResumo> AdicionarApontamentoAsync(int tarefaId, ApontamentoCriarRequest req, string usuario, CancellationToken ct = default);
    Task<ApontamentoResumo?> AtualizarApontamentoAsync(int apontamentoId, ApontamentoAtualizarRequest req, string operadorLogado, bool ehAdmin, CancellationToken ct = default);
    Task<bool> ExcluirApontamentoAsync(int apontamentoId, string operadorLogado, bool ehAdmin, CancellationToken ct = default);
    Task<List<HistoricoMovimentacao>> HistoricoAsync(int id, CancellationToken ct = default);
}

public class TarefaService : ITarefaService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;
    private readonly IProjetoJornadaService _jornada;
    private readonly IProjetoEtapaService _etapasFixas;
    private readonly ILogger<TarefaService> _logger;
    public TarefaService(AppDbContext db, IAuditoriaImplantacaoService auditoria, IProjetoJornadaService jornada, IProjetoEtapaService etapasFixas, ILogger<TarefaService> logger)
    {
        _db = db;
        _auditoria = auditoria;
        _jornada = jornada;
        _etapasFixas = etapasFixas;
        _logger = logger;
    }

    public async Task<List<TarefaResumo>> ListarAsync(TarefaFiltro f, string? operadorLogado, CancellationToken ct = default)
    {
        var q = _db.Tarefas.AsNoTracking()
            .Include(t => t.Projeto)
            .Include(t => t.Etapa)
            .Include(t => t.ProjetoEtapa)
            .Include(t => t.Responsaveis)
            .AsQueryable();

        if (f.ProjetoId.HasValue) q = q.Where(t => t.ProjetoId == f.ProjetoId);
        if (f.EtapaId.HasValue) q = q.Where(t => t.EtapaId == f.EtapaId);
        if (!string.IsNullOrWhiteSpace(f.ResponsavelId))
            q = q.Where(t => t.ResponsavelId == f.ResponsavelId || t.Responsaveis.Any(r => r.OperadorId == f.ResponsavelId));
        if (!string.IsNullOrWhiteSpace(f.Status) && Enum.TryParse<StatusTarefa>(f.Status, out var st))
            q = q.Where(t => t.Status == st);
        if (f.Prioridade.HasValue) q = q.Where(t => (int)t.Prioridade == f.Prioridade);
        if (f.Tipo.HasValue) q = q.Where(t => (int)t.Tipo == f.Tipo);
        if (!string.IsNullOrWhiteSpace(f.Buscar))
            q = q.Where(t => EF.Functions.Like(t.Titulo, $"%{f.Buscar}%"));
        if (f.FuncaoId.HasValue)
        {
            var funcaoId = f.FuncaoId.Value;
            // Compatibilidade SQL 2008 (compat 100): sem Contains em lista capturada (OPENJSON).
            // Usa EXISTS correlacionado, traduzível em qualquer nível de compatibilidade.
            q = q.Where(t => (t.ResponsavelId != null && _db.Operadores.Any(o => o.OperadorId == t.ResponsavelId && o.FuncaoId == funcaoId && o.SeAtivo == "S"))
                || t.Responsaveis.Any(r => _db.Operadores.Any(o => o.OperadorId == r.OperadorId && o.FuncaoId == funcaoId && o.SeAtivo == "S")));
        }
        if (!string.IsNullOrWhiteSpace(f.PerfilId))
        {
            var perfilId = f.PerfilId;
            q = q.Where(t => (t.ResponsavelId != null && _db.Operadores.Any(o => o.OperadorId == t.ResponsavelId && o.PerfilId == perfilId))
                || t.Responsaveis.Any(r => _db.Operadores.Any(o => o.OperadorId == r.OperadorId && o.PerfilId == perfilId)));
        }
        if (f.ApenasAtrasadas == true)
        {
            var hoje = DateTime.Today;
            q = q.Where(t => t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada &&
                              (t.DataEntrega ?? t.DataPrevisao) != null && (t.DataEntrega ?? t.DataPrevisao)!.Value.Date < hoje);
        }
        if (f.ApenasVenceHoje == true)
        {
            var hoje = DateTime.Today;
            q = q.Where(t => t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada &&
                              (t.DataEntrega ?? t.DataPrevisao) != null && (t.DataEntrega ?? t.DataPrevisao)!.Value.Date == hoje);
        }
        if (f.ApenasEmAndamento == true) q = q.Where(t => t.Status == StatusTarefa.EmAndamento);
        if (f.ApenasConcluidas == true) q = q.Where(t => t.Status == StatusTarefa.Concluida);
        if (f.IncluirArquivadas != true) q = q.Where(t => !t.Arquivada);

        var tarefas = await q
            .OrderBy(t => t.Ordem).ThenByDescending(t => t.Prioridade).ThenBy(t => t.DataPrevisao)
            .Take(500)
            .ToListAsync(ct);

        var operadorIds = tarefas.SelectMany(t => t.Responsaveis.Select(r => r.OperadorId))
            .Concat(tarefas.Select(t => t.ResponsavelId).Where(id => id != null)!)
            .Distinct().ToList();

        // Compatibilidade SQL 2008 (compat 100): TBOPERADOR é pequena, carrega tudo
        // e filtra em memória em vez de Contains em lista capturada (OPENJSON).
        var idsDesejados = new HashSet<string>(operadorIds.OfType<string>());
        var operadoresMap = (await _db.Operadores.AsNoTracking()
            .Select(o => new { o.OperadorId, o.Nome })
            .ToListAsync(ct))
            .Where(o => idsDesejados.Contains(o.OperadorId))
            .ToDictionary(o => o.OperadorId, o => o.Nome);

        return tarefas.Select(t => new TarefaResumo(
            t.Id, t.ProjetoId,
            t.Projeto?.Codigo ?? "",
            t.Projeto?.Nome ?? "",
            t.Titulo,
            t.ResponsavelId,
            t.ResponsavelId != null && operadoresMap.TryGetValue(t.ResponsavelId, out var rNome) ? rNome : null,
            t.Status.ToString(), (int)t.Prioridade, t.ColunaKanbanId, t.ChamadoLegadoId, t.Ordem,
            t.DataPrevisao, t.DataEntrega, (int)t.Tipo, t.DataConclusao, t.Bloqueada, t.MotivoBloqueio,
            t.HorasEstimadas, t.HorasRealizadas,
            t.Responsaveis.Select(r => new ResponsavelResumo(r.OperadorId, operadoresMap.TryGetValue(r.OperadorId, out var n) ? n : r.OperadorId)).ToList(),
            t.DataInclusao, t.Arquivada, t.EtapaId, t.Etapa != null ? t.Etapa.Nome : null,
            t.ProjetoEtapaId, t.ProjetoEtapa != null ? t.ProjetoEtapa.Nome : null)).ToList();
    }

    public async Task<TarefaDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.AsNoTracking()
            .Include(x => x.Projeto)
            .Include(x => x.Etapa)
            .Include(x => x.ProjetoEtapa)
            .Include(x => x.ColunaKanban)
            .Include(x => x.Responsaveis)
            .Include(x => x.Chamados)
            .Include(x => x.Apontamentos)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (t == null) return null;

        var operadorIds = t.Responsaveis.Select(r => r.OperadorId)
            .Concat(new[] { t.ResponsavelId, t.CriadorId })
            .Concat(t.Apontamentos.Select(a => a.OperadorId))
            .Where(x => x != null)
            .Distinct().ToList();

        var idsDesejados = new HashSet<string>(operadorIds!);
        var operadoresMap = (await _db.Operadores.AsNoTracking()
            .Select(o => new { o.OperadorId, o.Nome })
            .ToListAsync(ct))
            .Where(o => idsDesejados.Contains(o.OperadorId))
            .ToDictionary(o => o.OperadorId, o => o.Nome);

        var chamadoIds = t.Chamados.Select(c => c.ChamadoId).ToList();
        if (t.ChamadoLegadoId.HasValue) chamadoIds.Add(t.ChamadoLegadoId.Value);
        chamadoIds = chamadoIds.Distinct().ToList();

        // Só consulta tbchamado quando há ids (evita OPENJSON e toque em tabela legada à toa).
        var chamadosLegadoMap = new Dictionary<int, ChamadoResumo>();
        foreach (var cid in chamadoIds)
        {
            var ch = await _db.Set<ChamadoLegado>().AsNoTracking()
                .Where(c => c.Id == cid)
                .Select(c => new ChamadoResumo(c.Id, c.Titulo, c.Status))
                .FirstOrDefaultAsync(ct);
            if (ch != null) chamadosLegadoMap[cid] = ch;
        }

        var responsaveisList = t.Responsaveis.Select(r => new ResponsavelResumo(
            r.OperadorId,
            operadoresMap.TryGetValue(r.OperadorId, out var nome) ? nome : r.OperadorId
        )).ToList();

        // Garante que o responsável principal esteja na lista se não estiver
        if (!string.IsNullOrEmpty(t.ResponsavelId) && !responsaveisList.Any(r => r.OperadorId == t.ResponsavelId))
        {
            responsaveisList.Insert(0, new ResponsavelResumo(
                t.ResponsavelId,
                operadoresMap.TryGetValue(t.ResponsavelId, out var nomeP) ? nomeP : t.ResponsavelId
            ));
        }

        var chamadosList = t.Chamados.Select(c =>
            chamadosLegadoMap.TryGetValue(c.ChamadoId, out var ch) ? ch : new ChamadoResumo(c.ChamadoId, $"Chamado #{c.ChamadoId}", null)
        ).ToList();

        if (t.ChamadoLegadoId.HasValue && !chamadosList.Any(c => c.ChamadoId == t.ChamadoLegadoId.Value))
        {
            if (chamadosLegadoMap.TryGetValue(t.ChamadoLegadoId.Value, out var chLeg))
                chamadosList.Insert(0, chLeg);
            else
                chamadosList.Insert(0, new ChamadoResumo(t.ChamadoLegadoId.Value, $"Chamado #{t.ChamadoLegadoId.Value}", null));
        }

        var apontamentosList = t.Apontamentos
            .OrderByDescending(a => a.Data)
            .Select(a => new ApontamentoResumo(
                a.Id,
                a.OperadorId,
                operadoresMap.TryGetValue(a.OperadorId, out var opNome) ? opNome : a.OperadorId,
                a.Data,
                a.Horas,
                a.Observacao
            )).ToList();

        var comentarios = await _db.ComentariosTarefa.AsNoTracking()
            .Where(c => c.TarefaId == id)
            .OrderBy(c => c.DataInclusao)
            .Join(_db.Operadores, c => c.AutorId, o => o.OperadorId, (c, o) =>
                new ComentarioTarefaResumo(c.Id, c.AutorId, o.Nome, c.Texto, c.DataInclusao))
            .ToListAsync(ct);

        var respPrincipalNome = t.ResponsavelId != null && operadoresMap.TryGetValue(t.ResponsavelId, out var rName) ? rName : null;
        var criadorName = operadoresMap.TryGetValue(t.CriadorId, out var cName) ? cName : t.CriadorId;

        return new TarefaDetalhe(
            t.Id, t.ProjetoId, t.Projeto?.Codigo ?? "", t.Projeto?.Nome ?? "",
            t.ChamadoLegadoId,
            t.EtapaId, t.Etapa?.Nome, t.ProjetoEtapaId, t.ProjetoEtapa?.Nome, t.ColunaKanbanId, t.ColunaKanban?.Nome,
            t.Titulo, t.Descricao, t.ResponsavelId, respPrincipalNome,
            t.CriadorId, criadorName,
            t.Status.ToString(), (int)t.Prioridade, t.Ordem,
            t.DataPrevisao, t.DataEntrega, (int)t.Tipo, t.DataConclusao,
            t.HorasEstimadas, t.HorasRealizadas, t.Bloqueada, t.MotivoBloqueio, t.Arquivada,
            responsaveisList, chamadosList, apontamentosList,
            comentarios, t.DataInclusao, t.UsuarioInclusao, t.DataAlteracao, t.UsuarioAlteracao);
    }

    /// <summary>
    /// Tarefa com projeto exige etapa do fluxo (etapas ativas do TipoProjeto ou globais).
    /// Sem projeto, a etapa é opcional.
    /// </summary>
    private async Task ValidarEtapaDoFluxoAsync(int? tipoProjetoId, int? etapaId, CancellationToken ct)
    {
        if (!etapaId.HasValue)
            throw new ArgumentException("Etapa obrigatória para tarefas de projeto");
        var etapa = await _db.Etapas.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == etapaId.Value, ct);
        if (etapa == null)
            throw new ArgumentException("Etapa inexistente");
        if (!etapa.Ativa)
            throw new ArgumentException("Etapa inativa para novas tarefas");
        if (etapa.TipoProjetoId.HasValue && etapa.TipoProjetoId != tipoProjetoId)
            throw new ArgumentException("Etapa não pertence ao fluxo do projeto");
    }

    /// <summary>
    /// Etapa fixa informada deve pertencer ao mesmo projeto da tarefa.
    /// NULL = sem card fixo (conta só nos totais do projeto/jornada).
    /// </summary>
    private async Task ValidarEtapaFixaAsync(int? projetoId, int? projetoEtapaId, CancellationToken ct)
    {
        if (!projetoEtapaId.HasValue) return;
        var ok = await _db.ProjetoEtapas.AsNoTracking()
            .AnyAsync(e => e.Id == projetoEtapaId.Value && e.ProjetoId == projetoId, ct);
        if (!ok)
            throw new ArgumentException("Etapa do projeto inválida para esta tarefa");
    }

    /// <summary>Recalcula PRJ_Progresso sem quebrar a operação principal em caso de falha.</summary>
    private async Task RecalcularJornadaAsync(int? projetoId, CancellationToken ct)
    {
        if (!projetoId.HasValue) return;
        try
        {
            await _jornada.RecalcularProgressoAsync(projetoId.Value, ct);
            // Sincroniza os 9 cards fixos com as tarefas (contador + transição
            // automática) e deixa PRJ_Progresso no fórmula-fixa por último.
            await _etapasFixas.SincronizarEtapasPorTarefasAsync(projetoId.Value, "sistema", ct);
        }
        catch (Exception ex) { _logger.LogError(ex, "Falha ao recalcular jornada do projeto {ProjetoId}", projetoId); }
    }

    public async Task<TarefaDetalhe> CriarAsync(TarefaCriarRequest req, string operadorLogado, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Titulo)) throw new ArgumentException("Titulo obrigatorio");
        if (!Enum.IsDefined(typeof(PrioridadeTarefa), req.Prioridade))
            throw new ArgumentException("Prioridade inválida");
        if (!Enum.IsDefined(typeof(TipoTarefa), req.Tipo))
            throw new ArgumentException("Tipo de tarefa inválido");
        if (req.ColunaKanbanId.HasValue && !await _db.ColunasKanban.AnyAsync(c => c.Id == req.ColunaKanbanId, ct))
            throw new ArgumentException("Coluna inexistente");

        // ProjetoId é opcional - permite tarefas sem projeto (requisito perfil F).
        // Com projeto, a etapa é obrigatória e deve pertencer ao fluxo do projeto.
        int? tipoProjetoId = null;
        if (req.ProjetoId.HasValue)
        {
            var projeto = await _db.Projetos.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == req.ProjetoId, ct);
            if (projeto == null)
                throw new ArgumentException("Projeto inexistente");
            tipoProjetoId = projeto.TipoProjetoId;
            await ValidarEtapaDoFluxoAsync(tipoProjetoId, req.EtapaId, ct);
            await ValidarEtapaFixaAsync(req.ProjetoId, req.ProjetoEtapaId, ct);
        }

        var respPrincipal = req.ResponsavelId;
        if (string.IsNullOrEmpty(respPrincipal) && req.ResponsavelIds != null && req.ResponsavelIds.Count > 0)
            respPrincipal = req.ResponsavelIds[0];

        // Validar permissão para atribuir a terceiros
        if (!string.IsNullOrEmpty(respPrincipal) && respPrincipal != operadorLogado)
        {
            if (!await PodeAtribuirTerceiroAsync(operadorLogado, ct))
                throw new ArgumentException("Você não possui permissão para atribuir tarefas a outros usuários");
        }

        if (!string.IsNullOrEmpty(respPrincipal) && !await _db.Operadores.AnyAsync(o => o.OperadorId == respPrincipal, ct))
            throw new ArgumentException("Responsavel inexistente");

        var t = new Tarefa
        {
            ProjetoId = req.ProjetoId,
            EtapaId = req.EtapaId,
            ProjetoEtapaId = req.ProjetoEtapaId,
            ColunaKanbanId = req.ColunaKanbanId,
            ChamadoLegadoId = req.ChamadoLegadoId,
            Titulo = req.Titulo.Trim(),
            Descricao = req.Descricao,
            ResponsavelId = respPrincipal,
            CriadorId = req.CriadorId,
            Status = StatusTarefa.AFazer,
            Prioridade = (PrioridadeTarefa)req.Prioridade,
            Tipo = (TipoTarefa)req.Tipo,
            Ordem = req.Ordem,
            DataPrevisao = req.DataPrevisao,
            DataEntrega = req.DataEntrega,
            HorasEstimadas = req.HorasEstimadas,
            UsuarioInclusao = req.CriadorId,
            DataInclusao = DateTime.Now
        };

        if (req.ResponsavelIds != null && req.ResponsavelIds.Count > 0)
        {
            foreach (var opId in req.ResponsavelIds.Distinct())
            {
                if (await _db.Operadores.AnyAsync(o => o.OperadorId == opId, ct))
                {
                    t.Responsaveis.Add(new TarefaResponsavel
                    {
                        OperadorId = opId,
                        UsuarioInclusao = req.CriadorId,
                        DataInclusao = DateTime.Now
                    });
                }
            }
        }
        else if (!string.IsNullOrEmpty(respPrincipal))
        {
            t.Responsaveis.Add(new TarefaResponsavel
            {
                OperadorId = respPrincipal,
                UsuarioInclusao = req.CriadorId,
                DataInclusao = DateTime.Now
            });
        }

        if (req.ChamadoLegadoId.HasValue)
        {
            t.Chamados.Add(new TarefaChamado
            {
                ChamadoId = req.ChamadoLegadoId.Value,
                UsuarioInclusao = req.CriadorId,
                DataInclusao = DateTime.Now
            });
        }

        _db.Tarefas.Add(t);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", t.Id, "CREATE", null, t, req.CriadorId, $"Tarefa criada: {t.Titulo}", ct);
        await RecalcularJornadaAsync(t.ProjetoId, ct);
        return (await ObterAsync(t.Id, ct))!;
    }

    public async Task<TarefaDetalhe?> AtualizarAsync(int id, TarefaAtualizarRequest req, string operadorLogado, CancellationToken ct = default)
    {
        var t = await _db.Tarefas
            .Include(x => x.Responsaveis)
            .Include(x => x.Chamados)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;

        if (!Enum.IsDefined(typeof(PrioridadeTarefa), req.Prioridade))
            throw new ArgumentException("Prioridade inválida");
        if (!Enum.IsDefined(typeof(TipoTarefa), req.Tipo))
            throw new ArgumentException("Tipo de tarefa inválido");

        StatusTarefa? novoStatus = null;
        if (!string.IsNullOrWhiteSpace(req.Status))
        {
            if (!Enum.TryParse<StatusTarefa>(req.Status, out var statusInformado))
                throw new ArgumentException("Status inválido");
            novoStatus = statusInformado;
        }

        var respPrincipal = req.ResponsavelId;
        if (string.IsNullOrEmpty(respPrincipal) && req.ResponsavelIds != null && req.ResponsavelIds.Count > 0)
            respPrincipal = req.ResponsavelIds[0];

        // Validar permissão para atribuir a terceiros
        if (!string.IsNullOrEmpty(respPrincipal) && respPrincipal != operadorLogado)
        {
            if (!await PodeAtribuirTerceiroAsync(operadorLogado, ct))
                throw new ArgumentException("Você não possui permissão para atribuir tarefas a outros usuários");
        }
        if (req.ResponsavelIds != null)
        {
            foreach (var opId in req.ResponsavelIds.Distinct())
            {
                if (opId != operadorLogado && !await PodeAtribuirTerceiroAsync(operadorLogado, ct))
                    throw new ArgumentException("Você não possui permissão para atribuir tarefas a outros usuários");
            }
        }

        // Com projeto, a etapa é obrigatória e deve ser do fluxo do projeto.
        if (t.ProjetoId.HasValue)
        {
            var tipoProjetoId = await _db.Projetos.AsNoTracking()
                .Where(p => p.Id == t.ProjetoId.Value)
                .Select(p => (int?)p.TipoProjetoId)
                .FirstOrDefaultAsync(ct);
            await ValidarEtapaDoFluxoAsync(tipoProjetoId, req.EtapaId, ct);
            await ValidarEtapaFixaAsync(t.ProjetoId, req.ProjetoEtapaId, ct);
        }

        t.EtapaId = req.EtapaId;
        t.ProjetoEtapaId = req.ProjetoEtapaId;
        t.ColunaKanbanId = req.ColunaKanbanId;
        t.ChamadoLegadoId = req.ChamadoLegadoId;
        t.Titulo = req.Titulo.Trim();
        t.Descricao = req.Descricao;
        t.ResponsavelId = respPrincipal;
        t.Prioridade = (PrioridadeTarefa)req.Prioridade;
        t.Tipo = (TipoTarefa)req.Tipo;
        t.Ordem = req.Ordem;
        t.DataPrevisao = req.DataPrevisao;
        t.DataEntrega = req.DataEntrega;
        t.DataConclusao = req.DataConclusao;
        t.HorasEstimadas = req.HorasEstimadas;
        // HorasRealizadas SEMPRE calculada automaticamente (soma dos apontamentos)
        t.Bloqueada = req.Bloqueada;
        t.MotivoBloqueio = req.MotivoBloqueio;
        t.UsuarioAlteracao = req.UsuarioAlteracao;
        t.DataAlteracao = DateTime.Now;

        if (req.Bloqueada == false) t.MotivoBloqueio = null;

        if (novoStatus.HasValue)
        {
            t.Status = novoStatus.Value;
            if (novoStatus.Value == StatusTarefa.Concluida && !req.DataConclusao.HasValue)
                t.DataConclusao ??= DateTime.Now;
        }
        else if (req.DataConclusao.HasValue && t.Status != StatusTarefa.Concluida)
            t.Status = StatusTarefa.Concluida;

        // Atualiza múltiplos responsáveis
        if (req.ResponsavelIds != null)
        {
            _db.Set<TarefaResponsavel>().RemoveRange(t.Responsaveis);
            t.Responsaveis.Clear();
            foreach (var opId in req.ResponsavelIds.Distinct())
            {
                if (await _db.Operadores.AnyAsync(o => o.OperadorId == opId, ct))
                {
                    t.Responsaveis.Add(new TarefaResponsavel
                    {
                        TarefaId = t.Id,
                        OperadorId = opId,
                        UsuarioInclusao = req.UsuarioAlteracao,
                        DataInclusao = DateTime.Now
                    });
                }
            }
        }
        else if (!string.IsNullOrEmpty(respPrincipal) && !t.Responsaveis.Any(r => r.OperadorId == respPrincipal))
        {
            _db.Set<TarefaResponsavel>().RemoveRange(t.Responsaveis);
            t.Responsaveis.Clear();
            t.Responsaveis.Add(new TarefaResponsavel
            {
                TarefaId = t.Id,
                OperadorId = respPrincipal,
                UsuarioInclusao = req.UsuarioAlteracao,
                DataInclusao = DateTime.Now
            });
        }

        // Garante chamado legado na N:N se houver
        if (req.ChamadoLegadoId.HasValue && !t.Chamados.Any(c => c.ChamadoId == req.ChamadoLegadoId.Value))
        {
            t.Chamados.Add(new TarefaChamado
            {
                TarefaId = t.Id,
                ChamadoId = req.ChamadoLegadoId.Value,
                UsuarioInclusao = req.UsuarioAlteracao,
                DataInclusao = DateTime.Now
            });
        }

        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", null, t, req.UsuarioAlteracao, "Tarefa atualizada", ct);
        await RecalcularJornadaAsync(t.ProjetoId, ct);
        return await ObterAsync(t.Id, ct);
    }

    public async Task<TarefaDetalhe?> MudarColunaAsync(int id, TarefaMudarColunaRequest req, CancellationToken ct = default)
    {
        var t = await _db.Tarefas
            .Include(x => x.Projeto)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        var antes = new { t.ColunaKanbanId, t.Ordem, t.Status };
        if (req.ColunaKanbanId.HasValue && !await _db.ColunasKanban.AnyAsync(c => c.Id == req.ColunaKanbanId, ct))
            throw new ArgumentException("Coluna inexistente");
        t.ColunaKanbanId = req.ColunaKanbanId;
        t.Ordem = req.NovaOrdem;

        // WIP Limit enforcement (Fase 4)
        if (req.ColunaKanbanId.HasValue)
        {
            var col = await _db.ColunasKanban.FirstOrDefaultAsync(c => c.Id == req.ColunaKanbanId, ct);
            if (col != null && col.LimiteWip.HasValue && col.LimiteWip.Value > 0)
            {
                var qtdAtual = await _db.Tarefas.CountAsync(x => x.ColunaKanbanId == req.ColunaKanbanId && x.Id != id, ct);
                if (qtdAtual >= col.LimiteWip.Value)
                {
                    throw new ArgumentException($"Limite WIP excedido: a coluna '{col.Nome}' permite no máximo {col.LimiteWip.Value} tarefas.");
                }
            }
        }

        if (req.ColunaKanbanId.HasValue)
        {
            var col = await _db.ColunasKanban.FirstOrDefaultAsync(c => c.Id == req.ColunaKanbanId, ct);
            if (col != null)
            {
                var nome = col.Nome.ToUpper().Trim();
                if (nome == "BLOQUEADO" || nome.Contains("BLOQUEAD"))
                {
                    var motivo = req.MotivoBloqueio?.Trim();
                    if (string.IsNullOrWhiteSpace(motivo) && string.IsNullOrWhiteSpace(t.MotivoBloqueio))
                        throw new ArgumentException("Motivo do bloqueio é obrigatório ao mover para BLOQUEADO.");
                    t.Bloqueada = true;
                    if (!string.IsNullOrWhiteSpace(motivo)) t.MotivoBloqueio = motivo;
                }
                else
                {
                    if (t.Bloqueada) { t.Bloqueada = false; t.MotivoBloqueio = null; }

                    if (nome.Contains("CONCLUID")) { t.Status = StatusTarefa.Concluida; t.DataConclusao ??= DateTime.Now; }
                    else if (nome.Contains("DESENVOLVIMENTO") || nome.Contains("ANDAMENTO") || nome.Contains("HOMOLOG")) t.Status = StatusTarefa.EmAndamento;
                    else if (nome.Contains("A FAZER") || nome.Contains("BACKLOG")) t.Status = StatusTarefa.AFazer;
                }
                await SincronizarAgendaAsync(t, col, ct);
            }
        }
        t.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", antes, new { t.ColunaKanbanId, t.Ordem, t.Status }, "system", "Tarefa movida para outra coluna", ct);
        await RecalcularJornadaAsync(t.ProjetoId, ct);
        return await ObterAsync(t.Id, ct);
    }

    private async Task SincronizarAgendaAsync(Tarefa tarefa, ColunaKanban coluna, CancellationToken ct)
    {
        var nomeColuna = coluna.Nome.ToUpper();
        AgendaTipo? tipoAgenda = null;

        if (nomeColuna.Contains("REUNIAO") || nomeColuna.Contains("REUNIÃO"))
            tipoAgenda = AgendaTipo.Reuniao;
        else if (nomeColuna.Contains("TREINAMENTO") || nomeColuna.Contains("CAPACITACAO"))
            tipoAgenda = AgendaTipo.Treinamento;
        else if (nomeColuna.Contains("MARCO") || nomeColuna.Contains("ENTREGA") || nomeColuna.Contains("MILESTONE"))
            tipoAgenda = AgendaTipo.Outro;

        if (!tipoAgenda.HasValue) return;

        var agendaExistente = await _db.Agenda
            .FirstOrDefaultAsync(a => a.ProjetoId == tarefa.ProjetoId && a.Titulo.Contains(tarefa.Titulo), ct);

        var dataInicio = tarefa.DataPrevisao ?? DateTime.Now;
        var dataFim = dataInicio.AddHours(1);

        if (agendaExistente != null)
        {
            agendaExistente.Titulo = $"{tipoAgenda.Value}: {tarefa.Titulo}";
            agendaExistente.Descricao = tarefa.Descricao;
            agendaExistente.DataInicio = dataInicio;
            agendaExistente.DataFim = dataFim;
            agendaExistente.Tipo = tipoAgenda.Value;
            agendaExistente.Visibilidade = AgendaVisibilidade.Publico;
            agendaExistente.UsuarioAlteracao = tarefa.UsuarioAlteracao ?? "system";
            agendaExistente.DataAlteracao = DateTime.Now;
        }
        else
        {
            var novoEvento = new AgendaItem
            {
                OperadorId = tarefa.ResponsavelId ?? tarefa.CriadorId,
                Titulo = $"{tipoAgenda.Value}: {tarefa.Titulo}",
                Descricao = tarefa.Descricao,
                DataInicio = dataInicio,
                DataFim = dataFim,
                Tipo = tipoAgenda.Value,
                Visibilidade = AgendaVisibilidade.Publico,
                ProjetoId = tarefa.ProjetoId,
                Recorrente = false,
                PadraoRecorrencia = AgendaRecorrencia.Nenhuma,
                UsuarioInclusao = tarefa.CriadorId,
                DataInclusao = DateTime.Now
            };
            _db.Agenda.Add(novoEvento);
        }
    }

    public async Task<TarefaDetalhe?> ArquivarAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        if (t.Status != StatusTarefa.Concluida)
            throw new ArgumentException("Apenas tarefas com status Concluída podem ser arquivadas.");
        if (t.Arquivada) return await ObterAsync(id, ct);
        var antes = new { t.Arquivada };
        t.Arquivada = true;
        t.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", antes, new { t.Arquivada }, "system", "Tarefa arquivada", ct);
        await RecalcularJornadaAsync(t.ProjetoId, ct);
        return await ObterAsync(id, ct);
    }

    public async Task<TarefaDetalhe?> DesarquivarAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        if (!t.Arquivada) return await ObterAsync(id, ct);
        var antes = new { t.Arquivada };
        t.Arquivada = false;
        var colConcluido = await _db.ColunasKanban.FirstOrDefaultAsync(c => c.Nome.ToUpper().Contains("CONCLUID"), ct);
        if (colConcluido != null) t.ColunaKanbanId = colConcluido.Id;
        t.Status = StatusTarefa.Concluida;
        t.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", antes, new { t.Arquivada, t.ColunaKanbanId }, "system", "Tarefa desarquivada", ct);
        await RecalcularJornadaAsync(t.ProjetoId, ct);
        return await ObterAsync(id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return false;
        var antes = new { t.Titulo, t.ProjetoId, t.Status, t.ColunaKanbanId };
        var projetoId = t.ProjetoId;
        _db.Tarefas.Remove(t);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "DELETE", antes, null, "system", "Tarefa excluída", ct);
        await RecalcularJornadaAsync(projetoId, ct);
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

    public async Task<List<ChamadoLegadoResumo>> BuscarChamadosAsync(string? buscar, int take, CancellationToken ct = default)
    {
        var q = _db.Set<ChamadoLegado>().AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            if (int.TryParse(buscar, out var idBusca))
                q = q.Where(c => c.Id == idBusca || (c.Titulo != null && EF.Functions.Like(c.Titulo, $"%{buscar}%")));
            else
                q = q.Where(c => c.Titulo != null && EF.Functions.Like(c.Titulo, $"%{buscar}%"));
        }
        return await q
            .OrderByDescending(c => c.Id)
            .Take(take <= 0 ? 20 : take)
            .Select(c => new ChamadoLegadoResumo(c.Id, c.Titulo, c.Status, c.DataPrevisao))
            .ToListAsync(ct);
    }

    public async Task<TarefaDetalhe?> VincularChamadoAsync(int id, int chamadoId, string usuario, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.Include(x => x.Chamados).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (t == null) return null;
        if (!await _db.Set<ChamadoLegado>().AnyAsync(c => c.Id == chamadoId, ct))
            throw new ArgumentException("Chamado legado inexistente");

        if (!t.Chamados.Any(c => c.ChamadoId == chamadoId))
        {
            t.Chamados.Add(new TarefaChamado
            {
                TarefaId = id,
                ChamadoId = chamadoId,
                UsuarioInclusao = usuario,
                DataInclusao = DateTime.Now
            });
            await _db.SaveChangesAsync(ct);
            await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", null, new { ChamadoId = chamadoId }, usuario, $"Chamado #{chamadoId} vinculado", ct);
        }
        return await ObterAsync(id, ct);
    }

    public async Task<TarefaDetalhe?> DesvincularChamadoAsync(int id, int chamadoId, CancellationToken ct = default)
    {
        var tc = await _db.Set<TarefaChamado>().FirstOrDefaultAsync(x => x.TarefaId == id && x.ChamadoId == chamadoId, ct);
        if (tc == null) return await ObterAsync(id, ct);
        _db.Set<TarefaChamado>().Remove(tc);
        var tObj = await _db.Tarefas.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (tObj != null && tObj.ChamadoLegadoId == chamadoId) tObj.ChamadoLegadoId = null;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", id, "UPDATE", new { ChamadoId = chamadoId }, null, "system", $"Chamado #{chamadoId} desvinculado", ct);
        return await ObterAsync(id, ct);
    }

    public async Task<ApontamentoResumo> AdicionarApontamentoAsync(int tarefaId, ApontamentoCriarRequest req, string usuario, CancellationToken ct = default)
    {
        var t = await _db.Tarefas.Include(x => x.Apontamentos).FirstOrDefaultAsync(x => x.Id == tarefaId, ct);
        if (t == null) throw new ArgumentException("Tarefa inexistente");
        if (req.Horas <= 0) throw new ArgumentException("Horas devem ser maiores que zero");

        var apt = new TarefaApontamento
        {
            TarefaId = tarefaId,
            OperadorId = string.IsNullOrWhiteSpace(req.OperadorId) ? usuario : req.OperadorId,
            Data = req.Data == default ? DateTime.Today : req.Data,
            Horas = req.Horas,
            Observacao = req.Observacao?.Trim(),
            UsuarioInclusao = usuario,
            DataInclusao = DateTime.Now
        };
        _db.Set<TarefaApontamento>().Add(apt);

        // Recalcula HorasRealizadas
        t.HorasRealizadas = (t.Apontamentos.Sum(a => (int?)a.Horas) ?? 0) + (int)Math.Ceiling(req.Horas);
        t.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Tarefa", tarefaId, "UPDATE", null, apt, usuario, $"Apontamento de {req.Horas}h adicionado", ct);

        var opNome = await _db.Operadores.Where(o => o.OperadorId == apt.OperadorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        return new ApontamentoResumo(apt.Id, apt.OperadorId, opNome ?? apt.OperadorId, apt.Data, apt.Horas, apt.Observacao);
    }

    public async Task<ApontamentoResumo?> AtualizarApontamentoAsync(int apontamentoId, ApontamentoAtualizarRequest req, string operadorLogado, bool ehAdmin, CancellationToken ct = default)
    {
        var apt = await _db.Set<TarefaApontamento>().Include(a => a.Tarefa).FirstOrDefaultAsync(a => a.Id == apontamentoId, ct);
        if (apt == null) return null;

        if (!ehAdmin && apt.OperadorId != operadorLogado)
            throw new UnauthorizedAccessException("Você só pode editar seus próprios apontamentos.");
        if (req.Horas <= 0) throw new ArgumentException("Horas devem ser maiores que zero");

        apt.Data = req.Data == default ? apt.Data : req.Data;
        apt.Horas = req.Horas;
        apt.Observacao = req.Observacao?.Trim();

        if (apt.Tarefa != null)
        {
            var todosApt = await _db.Set<TarefaApontamento>().Where(a => a.TarefaId == apt.TarefaId).ToListAsync(ct);
            apt.Tarefa.HorasRealizadas = (int)Math.Ceiling(todosApt.Sum(a => a.Horas));
            apt.Tarefa.DataAlteracao = DateTime.Now;
        }

        await _db.SaveChangesAsync(ct);
        var opNome = await _db.Operadores.Where(o => o.OperadorId == apt.OperadorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        return new ApontamentoResumo(apt.Id, apt.OperadorId, opNome ?? apt.OperadorId, apt.Data, apt.Horas, apt.Observacao);
    }

    public async Task<bool> ExcluirApontamentoAsync(int apontamentoId, string operadorLogado, bool ehAdmin, CancellationToken ct = default)
    {
        var apt = await _db.Set<TarefaApontamento>().Include(a => a.Tarefa).FirstOrDefaultAsync(a => a.Id == apontamentoId, ct);
        if (apt == null) return false;

        if (!ehAdmin && apt.OperadorId != operadorLogado)
            throw new UnauthorizedAccessException("Você só pode excluir seus próprios apontamentos.");

        var tarefaId = apt.TarefaId;
        _db.Set<TarefaApontamento>().Remove(apt);

        if (apt.Tarefa != null)
        {
            var todosApt = await _db.Set<TarefaApontamento>().Where(a => a.TarefaId == tarefaId && a.Id != apontamentoId).ToListAsync(ct);
            apt.Tarefa.HorasRealizadas = (int)Math.Ceiling(todosApt.Sum(a => a.Horas));
            apt.Tarefa.DataAlteracao = DateTime.Now;
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<List<HistoricoMovimentacao>> HistoricoAsync(int id, CancellationToken ct = default)
    {
        var audits = await _db.Set<AuditoriaImplantacao>().AsNoTracking()
            .Where(a => a.Entidade == "Tarefa" && a.EntidadeId == id)
            .OrderByDescending(a => a.Data)
            .ToListAsync(ct);

        return audits.Select(a => new HistoricoMovimentacao(
            id,
            null,
            null,
            a.Usuario,
            a.Data,
            $"{a.Acao}: {a.Observacao}"
        )).ToList();
    }

    private async Task<bool> PodeAtribuirTerceiroAsync(string operadorLogado, CancellationToken ct = default)
    {
        var operador = await _db.Operadores.AsNoTracking()
            .FirstOrDefaultAsync(o => o.OperadorId == operadorLogado, ct);

        if (operador == null) return false;

        // Admin (SeAdmin = true ou PerfilId = "A") pode atribuir a qualquer um
        if (operador.SeAdmin == true || operador.PerfilId == "A")
            return true;

        // Suporte (PerfilId = "S") pode atribuir a qualquer um
        if (operador.PerfilId == "S")
            return true;

        // Perfil F (implantação) - pode atribuir a terceiros (regra específica)
        if (operador.PerfilId == "F")
            return true;

        // Implantador (FuncaoId = 1 = Analista de Sistemas) pode atribuir
        if (operador.FuncaoId == 1)
            return true;

        // Demais usuários não podem atribuir a terceiros
        return false;
    }
}
