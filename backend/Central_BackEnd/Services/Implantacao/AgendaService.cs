using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Exceptions;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Central_BackEnd.Services.Implantacao;

public interface IAgendaService
{
    Task<List<AgendaResumo>> ListarEventosAsync(DateTime inicio, DateTime fim, string? responsavelId = null, int? funcaoId = null, CancellationToken ct = default);
    Task<List<FuncaoResumo>> ListarFuncoesAsync(CancellationToken ct = default);
    Task<AgendaDetalhe?> ObterEventoAsync(int id, CancellationToken ct = default);
    Task<AgendaDetalhe> CriarEventoAsync(AgendaCriarRequest request, string usuarioId, CancellationToken ct = default);
    Task<AgendaDetalhe?> AtualizarEventoAsync(int id, AgendaAtualizarRequest request, string usuarioId, bool isAdmin, CancellationToken ct = default);
    Task<bool> ExcluirEventoAsync(int id, string usuarioId, bool isAdmin, CancellationToken ct = default);
    Task<AgendaDetalhe?> MoverEventoAsync(int id, AgendaMoverRequest request, string usuarioId, bool isAdmin, CancellationToken ct = default);
    Task<List<AgendaResumo>> ObterConflitosAsync(string operadorId, DateTime inicio, DateTime fimEfetivo, int? idExcluir = null, CancellationToken ct = default);
    Task<List<OperadorResumo>> ListarOperadoresAtivosAsync(CancellationToken ct = default);
    Task<List<TipoEventoResponse>> ListarTiposAsync(CancellationToken ct = default);
    Task<AgendaLoteResponse> CriarEventosLoteAsync(AgendaCriarLoteRequest request, string usuarioId, CancellationToken ct = default);
}

public class AgendaService : IAgendaService
{
    private readonly AppDbContext _db;
    private readonly ILogger<AgendaService> _logger;

    public AgendaService(AppDbContext db, ILogger<AgendaService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<AgendaResumo>> ListarEventosAsync(DateTime inicio, DateTime fim, string? responsavelId = null, int? funcaoId = null, CancellationToken ct = default)
    {
        try
        {
            var query = _db.Agenda.AsNoTracking()
                .Where(a => a.DataInicio < fim && (a.DataFim == null || a.DataFim > inicio));

            if (!string.IsNullOrWhiteSpace(responsavelId))
            {
                query = query.Where(a => a.OperadorId == responsavelId);
            }

            if (funcaoId.HasValue)
            {
                // Função real no legado (TBOPERADOR.FUNCAO_ID não é preenchido).
                // Subquery correlata (sem Contains local — ver restrição OPENJSON acima).
                query = query.Where(a => _db.FuncionariosLegado.Any(f =>
                    f.OperadorId == a.OperadorId && f.FuncaoId == funcaoId.Value && f.Ativo == "S"));
            }

            // Query única com subquery correlata para o nome do operador:
            // evita Contains sobre coleção local (OPENJSON exige
            // compatibility level >= 130, indisponível no banco de produção).
            var eventos = await query
                .OrderBy(a => a.DataInicio)
                .Select(a => new AgendaResumo(
                    a.Id,
                    a.OperadorId,
                    _db.Operadores.Where(o => o.OperadorId == a.OperadorId).Select(o => o.Nome).FirstOrDefault(),
                    a.Titulo,
                    TimeZoneHelper.UtcParaBrasilia(a.DataInicio),
                    TimeZoneHelper.UtcParaBrasilia(a.DataFim),
                    a.DiaInteiro,
                    a.Cor,
                    a.Tipo,
                    a.TipoId,
                    a.TipoEvento != null ? a.TipoEvento.Nome : null,
                    a.TipoEvento != null ? a.TipoEvento.Cor : null,
                    a.ProjetoId,
                    a.Projeto != null ? a.Projeto.Codigo : null,
                    a.Prioridade,
                    a.SLAMinutos
                ))
                .ToListAsync(ct);

            return eventos;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AgendaService.ListarEventosAsync] inicio={Inicio} fim={Fim} responsavelId={ResponsavelId}",
                inicio, fim, responsavelId);
            throw; // Re-throw to let controller handle it
        }
    }

    public async Task<AgendaDetalhe?> ObterEventoAsync(int id, CancellationToken ct = default)
    {
        var a = await _db.Agenda.AsNoTracking()
            .Include(e => e.TipoEvento)
            .Include(e => e.Projeto)
            .Include(e => e.Participantes)
                .ThenInclude(p => p.Participante)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

        if (a == null) return null;

        var operador = await _db.Operadores.AsNoTracking()
            .Where(o => o.OperadorId == a.OperadorId)
            .Select(o => new { o.Nome, o.Email })
            .FirstOrDefaultAsync(ct);

        var participantes = a.Participantes.Select(p => new AgendaParticipanteResponse(
            p.ParticipanteId,
            p.Participante?.Nome
        )).ToList();

        return new AgendaDetalhe(
            a.Id,
            a.OperadorId,
            operador?.Nome,
            a.Titulo,
            a.Descricao,
            a.Local,
            TimeZoneHelper.UtcParaBrasilia(a.DataInicio),
            TimeZoneHelper.UtcParaBrasilia(a.DataFim),
            a.DiaInteiro,
            a.Cor,
            a.Tipo,
            a.TipoId,
            a.TipoEvento?.Nome,
            a.TipoEvento?.Cor,
            a.ProjetoId,
            a.Projeto?.Codigo,
            participantes,
            a.UsuarioInclusao,
            a.DataInclusao,
            a.UsuarioAlteracao,
            a.DataAlteracao,
            a.Prioridade,
            a.SLAMinutos
        );
    }

    /// <summary>
    /// Fim efetivo do intervalo: usa DataFim; se nula, dia inteiro ocupa até
    /// o fim do dia, senão o evento é pontual (fim = início).
    /// </summary>
    private static DateTime FimEfetivo(DateTime inicio, DateTime? fim, bool diaInteiro)
        => fim ?? (diaInteiro ? inicio.Date.AddDays(1) : inicio);

    /// <summary>Regras rígidas por tipo de evento (chave: nome do TipoEvento normalizado).</summary>
    private sealed record RegraTipoEvento(
        bool ExigeDiaInteiro,
        bool ProibeDiaInteiro,
        bool ExigeHorario,
        bool PermiteSpan,
        bool PermiteSemanalMensal);

    private static string NormalizarNomeTipo(string? nome)
    {
        if (string.IsNullOrWhiteSpace(nome)) return string.Empty;
        var n = nome.Trim().ToUpperInvariant().Normalize(System.Text.NormalizationForm.FormD);
        return new string(n.Where(c => System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c)
            != System.Globalization.UnicodeCategory.NonSpacingMark).ToArray());
    }

    private static RegraTipoEvento ObterRegraTipo(string? tipoNome) => NormalizarNomeTipo(tipoNome) switch
    {
        "FERIAS" => new(true, false, false, true, false),
        "TREINAMENTO" or "DAILY" => new(false, true, true, true, true),
        "REUNIAO" or "ATENDIMENTO" => new(false, true, true, false, false),
        _ => new(false, false, false, true, false), // Pessoal, Outro ou sem tipo: livre
    };

    private async Task<(string? Nome, RegraTipoEvento Regra)> ResolverRegraTipoAsync(int? tipoId, CancellationToken ct)
    {
        string? nome = null;
        if (tipoId.HasValue)
            nome = await _db.TiposEvento.AsNoTracking()
                .Where(t => t.Id == tipoId.Value)
                .Select(t => t.Nome)
                .FirstOrDefaultAsync(ct);
        return (nome, ObterRegraTipo(nome));
    }

    /// <summary>
    /// Valida as regras do tipo e normaliza (diaInteiro/fim) para evento único.
    /// Férias: força dia inteiro (horas ignoradas). Demais: rejeita o que viola a regra.
    /// </summary>
    private static (bool DiaInteiro, DateTime? Fim) AplicarRegraEventoUnico(
        string? tipoNome, RegraTipoEvento regra, DateTime inicio, DateTime? fim, bool diaInteiro)
    {
        // Férias é um PERÍODO simples (linha única com span, sem repetição):
        // exige data de retorno após o início; horas são ignoradas.
        if (regra.ExigeDiaInteiro)
        {
            if (!fim.HasValue || fim.Value.Date <= inicio.Date)
                throw new ArgumentException($"{tipoNome ?? "Férias"}: defina a data de retorno (após o início).");
            return (true, fim);
        }
        if (regra.ProibeDiaInteiro && diaInteiro)
            throw new ArgumentException($"{tipoNome} exige horário específico e não pode ser dia inteiro.");
        if (regra.ExigeHorario && !fim.HasValue)
            throw new ArgumentException($"{tipoNome}: informe hora de início e fim.");
        if (!regra.PermiteSpan && fim.HasValue && fim.Value.Date > inicio.Date)
            throw new ArgumentException($"{tipoNome} permite apenas um dia.");
        return (diaInteiro, fim);
    }

    private IQueryable<AgendaItem> QueryConflito(string operadorId, DateTime inicio, DateTime fimEfetivo, int? idExcluir)
    {
        var query = _db.Agenda.AsNoTracking()
            .Where(a => a.OperadorId == operadorId
                && a.DataInicio < fimEfetivo
                && (a.DataFim ?? (a.DiaInteiro ? a.DataInicio.Date.AddDays(1) : a.DataInicio)) > inicio);

        if (idExcluir.HasValue)
            query = query.Where(a => a.Id != idExcluir.Value);

        return query;
    }

    private static string DescreverConflito(AgendaResumo c)
        => $"'{c.Titulo}' ({c.DataInicio:dd/MM HH:mm}–{(c.DataFim?.ToString("dd/MM HH:mm") ?? "—")})";

    /// <summary>
    /// Lista os eventos do responsável que se sobrepõem ao intervalo informado.
    /// </summary>
    public async Task<List<AgendaResumo>> ObterConflitosAsync(string operadorId, DateTime inicio, DateTime fimEfetivo, int? idExcluir = null, CancellationToken ct = default)
    {
        var operadorNome = await _db.Operadores.AsNoTracking()
            .Where(o => o.OperadorId == operadorId)
            .Select(o => o.Nome)
            .FirstOrDefaultAsync(ct);

        return await QueryConflito(operadorId, inicio, fimEfetivo, idExcluir)
            .OrderBy(a => a.DataInicio)
            .Select(a => new AgendaResumo(
                a.Id,
                a.OperadorId,
                operadorNome,
                a.Titulo,
                TimeZoneHelper.UtcParaBrasilia(a.DataInicio),
                TimeZoneHelper.UtcParaBrasilia(a.DataFim),
                a.DiaInteiro,
                a.Cor,
                a.Tipo,
                a.TipoId,
                a.TipoEvento != null ? a.TipoEvento.Nome : null,
                a.TipoEvento != null ? a.TipoEvento.Cor : null,
                a.ProjetoId,
                a.Projeto != null ? a.Projeto.Codigo : null,
                a.Prioridade,
                a.SLAMinutos
            ))
            .ToListAsync(ct);
    }

    private async Task ValidarSemConflitoAsync(string operadorId, DateTime inicio, DateTime? fim, bool diaInteiro, int? idExcluir, CancellationToken ct)
    {
        var fimEfetivo = FimEfetivo(inicio, fim, diaInteiro);
        var conflitos = await ObterConflitosAsync(operadorId, inicio, fimEfetivo, idExcluir, ct);
        if (conflitos.Count > 0)
            throw new ConflictException(
                $"Conflito de horários detectado: {string.Join("; ", conflitos.Select(DescreverConflito))}",
                conflitos);
    }

    public async Task<AgendaDetalhe> CriarEventoAsync(AgendaCriarRequest request, string usuarioId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Titulo))
            throw new ArgumentException("Título é obrigatório");

        if (request.DataFim.HasValue && request.DataFim <= request.DataInicio)
            throw new ArgumentException("Data final deve ser maior que data inicial");

        if (request.TipoId.HasValue)
        {
            var tipoExiste = await _db.TiposEvento.AnyAsync(t => t.Id == request.TipoId.Value && t.Ativo, ct);
            if (!tipoExiste)
                throw new ArgumentException("Tipo de evento inválido");
        }

        var responsavelExiste = await _db.Operadores.AnyAsync(o => o.OperadorId == request.ResponsavelId && o.SeAtivo == "S", ct);
        if (!responsavelExiste)
            throw new ArgumentException("Responsável inválido ou inativo");

        if (!Enum.IsDefined(typeof(PrioridadeAgenda), request.Prioridade))
            throw new ArgumentException("Prioridade inválida");

        if (request.SLAMinutos.HasValue && request.SLAMinutos.Value < 0)
            throw new ArgumentException("SLA deve ser zero ou positivo");

        var (tipoNome, regra) = await ResolverRegraTipoAsync(request.TipoId, ct);
        var (diaInteiro, fim) = AplicarRegraEventoUnico(tipoNome, regra, request.DataInicio, request.DataFim, request.DiaInteiro);

        await ValidarSemConflitoAsync(request.ResponsavelId, request.DataInicio, fim, diaInteiro, null, ct);

        var evento = new AgendaItem
        {
            Titulo = request.Titulo.Trim(),
            Descricao = request.Descricao,
            Local = request.Local,
            DataInicio = request.DataInicio,
            DataFim = fim,
            DiaInteiro = diaInteiro,
            TipoId = request.TipoId,
            OperadorId = request.ResponsavelId,
            ProjetoId = request.ProjetoId,
            Prioridade = (PrioridadeAgenda)request.Prioridade,
            SLAMinutos = request.SLAMinutos,
            UsuarioInclusao = usuarioId,
            DataInclusao = DateTime.Now
        };

        if (request.ParticipantesIds?.Any() == true)
        {
            // Intersect em memória: Contains sobre coleção local gera OPENJSON,
            // incompatível com o compatibility level do banco de produção.
            var ativos = await _db.Operadores.AsNoTracking()
                .Where(o => o.SeAtivo == "S")
                .Select(o => o.OperadorId)
                .ToListAsync(ct);

            evento.Participantes = ativos.Intersect(request.ParticipantesIds)
                .Select(id => new AgendaParticipante { ParticipanteId = id })
                .ToList();
        }

        _db.Agenda.Add(evento);
        await _db.SaveChangesAsync(ct);

        return (await ObterEventoAsync(evento.Id, ct))!;
    }

    public async Task<AgendaDetalhe?> AtualizarEventoAsync(int id, AgendaAtualizarRequest request, string usuarioId, bool isAdmin, CancellationToken ct = default)
    {
        var evento = await _db.Agenda
            .Include(e => e.Participantes)
            .FirstOrDefaultAsync(e => e.Id == id, ct);

        if (evento == null) return null;

        if (!isAdmin && evento.OperadorId != usuarioId)
            throw new ForbiddenException("Apenas o responsável ou administrador pode alterar este evento.");

        if (!isAdmin && request.ResponsavelId != evento.OperadorId && request.ResponsavelId != usuarioId)
            throw new ForbiddenException("Sem permissão para transferir responsabilidade do evento.");

        if (string.IsNullOrWhiteSpace(request.Titulo))
            throw new ArgumentException("Título é obrigatório");

        if (request.DataFim.HasValue && request.DataFim <= request.DataInicio)
            throw new ArgumentException("Data final deve ser maior que data inicial");

        if (request.TipoId.HasValue)
        {
            var tipoExiste = await _db.TiposEvento.AnyAsync(t => t.Id == request.TipoId.Value && t.Ativo, ct);
            if (!tipoExiste)
                throw new ArgumentException("Tipo de evento inválido");
        }

        var responsavelExiste = await _db.Operadores.AnyAsync(o => o.OperadorId == request.ResponsavelId && o.SeAtivo == "S", ct);
        if (!responsavelExiste)
            throw new ArgumentException("Responsável inválido ou inativo");

        if (!Enum.IsDefined(typeof(PrioridadeAgenda), request.Prioridade))
            throw new ArgumentException("Prioridade inválida");

        if (request.SLAMinutos.HasValue && request.SLAMinutos.Value < 0)
            throw new ArgumentException("SLA deve ser zero ou positivo");

        var (tipoNomeUpd, regraUpd) = await ResolverRegraTipoAsync(request.TipoId, ct);
        var (diaInteiroUpd, fimUpd) = AplicarRegraEventoUnico(tipoNomeUpd, regraUpd, request.DataInicio, request.DataFim, request.DiaInteiro);

        await ValidarSemConflitoAsync(request.ResponsavelId, request.DataInicio, fimUpd, diaInteiroUpd, id, ct);

        evento.Titulo = request.Titulo.Trim();
        evento.Descricao = request.Descricao;
        evento.Local = request.Local;
        evento.DataInicio = request.DataInicio;
        evento.DataFim = fimUpd;
        evento.DiaInteiro = diaInteiroUpd;
        evento.TipoId = request.TipoId;
        evento.OperadorId = request.ResponsavelId;
        evento.ProjetoId = request.ProjetoId;
        evento.Prioridade = (PrioridadeAgenda)request.Prioridade;
        evento.SLAMinutos = request.SLAMinutos;
        evento.UsuarioAlteracao = usuarioId;
        evento.DataAlteracao = DateTime.Now;

        // Atualizar participantes
        evento.Participantes.Clear();
        if (request.ParticipantesIds?.Any() == true)
        {
            // Intersect em memória: Contains sobre coleção local gera OPENJSON,
            // incompatível com o compatibility level do banco de produção.
            var ativos = await _db.Operadores.AsNoTracking()
                .Where(o => o.SeAtivo == "S")
                .Select(o => o.OperadorId)
                .ToListAsync(ct);

            foreach (var pid in ativos.Intersect(request.ParticipantesIds))
            {
                evento.Participantes.Add(new AgendaParticipante { ParticipanteId = pid });
            }
        }

        await _db.SaveChangesAsync(ct);

        return await ObterEventoAsync(evento.Id, ct);
    }

    public async Task<bool> ExcluirEventoAsync(int id, string usuarioId, bool isAdmin, CancellationToken ct = default)
    {
        var evento = await _db.Agenda.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (evento == null) return false;

        if (!isAdmin && evento.OperadorId != usuarioId)
            throw new ForbiddenException("Apenas o responsável ou administrador pode excluir este evento.");

        _db.Agenda.Remove(evento);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AgendaDetalhe?> MoverEventoAsync(int id, AgendaMoverRequest request, string usuarioId, bool isAdmin, CancellationToken ct = default)
    {
        if (request.NovaDataFim <= request.NovaDataInicio)
            throw new ArgumentException("Data final deve ser maior que data inicial");

        var evento = await _db.Agenda.FirstOrDefaultAsync(e => e.Id == id, ct);
        if (evento == null) return null;

        if (!isAdmin && evento.OperadorId != usuarioId)
            throw new ForbiddenException("Apenas o responsável ou administrador pode mover este evento.");

        await ValidarSemConflitoAsync(evento.OperadorId, request.NovaDataInicio, request.NovaDataFim, evento.DiaInteiro, id, ct);

        evento.DataInicio = request.NovaDataInicio;
        evento.DataFim = request.NovaDataFim;
        evento.DataAlteracao = DateTime.Now;

        await _db.SaveChangesAsync(ct);

        return await ObterEventoAsync(evento.Id, ct);
    }

    public async Task<List<OperadorResumo>> ListarOperadoresAtivosAsync(CancellationToken ct = default)
    {
        return await _db.Operadores.AsNoTracking()
            .Where(o => o.SeAtivo == "S")
            .OrderBy(o => o.Nome)
            .Select(o => new OperadorResumo(o.OperadorId, o.Nome, o.Email))
            .ToListAsync(ct);
    }

    public async Task<List<FuncaoResumo>> ListarFuncoesAsync(CancellationToken ct = default)
    {
        return await _db.Funcoes.AsNoTracking()
            .Where(f => f.Ativo && _db.FuncionariosLegado.Any(fl => fl.FuncaoId == f.Id && fl.Ativo == "S"))
            .OrderBy(f => f.Descricao)
            .Select(f => new FuncaoResumo(f.Id, f.Descricao, f.Classificacao))
            .ToListAsync(ct);
    }

    public async Task<List<TipoEventoResponse>> ListarTiposAsync(CancellationToken ct = default)
    {
        return await _db.TiposEvento.AsNoTracking()
            .Where(t => t.Ativo)
            .OrderBy(t => t.Nome)
            .Select(t => new TipoEventoResponse(t.Id, t.Nome, t.Cor))
            .ToListAsync(ct);
    }

    public async Task<AgendaLoteResponse> CriarEventosLoteAsync(AgendaCriarLoteRequest request, string usuarioId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Titulo))
            throw new ArgumentException("Título é obrigatório");

        if (request.DataFim.HasValue && request.DataFim <= request.DataInicio)
            throw new ArgumentException("Data final deve ser maior que data inicial");

        if (request.DataRepeticaoFim < request.DataInicio)
            throw new ArgumentException("Data de repetição deve ser maior ou igual à data inicial");

        if (request.TipoId.HasValue)
        {
            var tipoExiste = await _db.TiposEvento.AnyAsync(t => t.Id == request.TipoId.Value && t.Ativo, ct);
            if (!tipoExiste)
                throw new ArgumentException("Tipo de evento inválido");
        }

        var responsavelExiste = await _db.Operadores.AnyAsync(o => o.OperadorId == request.ResponsavelId && o.SeAtivo == "S", ct);
        if (!responsavelExiste)
            throw new ArgumentException("Responsável inválido ou inativo");

        if (!Enum.IsDefined(typeof(PrioridadeAgenda), request.Prioridade))
            throw new ArgumentException("Prioridade inválida");

        if (request.SLAMinutos.HasValue && request.SLAMinutos.Value < 0)
            throw new ArgumentException("SLA deve ser zero ou positivo");

        var (tipoNomeLote, regraLote) = await ResolverRegraTipoAsync(request.TipoId, ct);
        var padrao = request.PadraoRecorrencia switch
        {
            2 => AgendaRecorrencia.Semanal,
            3 => AgendaRecorrencia.Mensal,
            _ => AgendaRecorrencia.Diario,
        };
        var diaInteiroLote = request.DiaInteiro;
        if (regraLote.ExigeDiaInteiro)
        {
            diaInteiroLote = true;
        }
        else
        {
            if (regraLote.ProibeDiaInteiro && diaInteiroLote)
                throw new ArgumentException($"{tipoNomeLote} exige horário específico e não pode ser dia inteiro.");
            if (regraLote.ExigeHorario && !request.DataFim.HasValue)
                throw new ArgumentException($"{tipoNomeLote}: informe hora de início e fim.");
        }
        var spanDias = (request.DataRepeticaoFim.Date - request.DataInicio.Date).Days;
        if (regraLote.ExigeDiaInteiro && spanDias > 0)
            throw new ArgumentException($"{tipoNomeLote} não usa repetição: informe Data início e Data fim.");
        if (!regraLote.PermiteSpan && spanDias > 0)
            throw new ArgumentException($"{tipoNomeLote} permite apenas um dia.");
        if (!regraLote.PermiteSemanalMensal && padrao != AgendaRecorrencia.Diario)
            throw new ArgumentException($"{tipoNomeLote} não permite recorrência semanal/mensal.");

        var dias = new List<DateTime>();
        for (var d = request.DataInicio.Date; d <= request.DataRepeticaoFim.Date;
             d = padrao switch { AgendaRecorrencia.Semanal => d.AddDays(7), AgendaRecorrencia.Mensal => d.AddMonths(1), _ => d.AddDays(1) })
            dias.Add(d);

        foreach (var dia in dias)
        {
            var inicioDia = new DateTime(dia.Year, dia.Month, dia.Day, request.DataInicio.Hour, request.DataInicio.Minute, 0, DateTimeKind.Utc);
            var fimDia = request.DataFim.HasValue
                ? new DateTime(dia.Year, dia.Month, dia.Day, request.DataFim.Value.Hour, request.DataFim.Value.Minute, 0, DateTimeKind.Utc)
                : (diaInteiroLote ? inicioDia.Date.AddDays(1) : inicioDia);

            await ValidarSemConflitoAsync(request.ResponsavelId, inicioDia, fimDia, diaInteiroLote, null, ct);
        }

        var recorrente = dias.Count > 1;
        var eventos = new List<AgendaItem>();
        foreach (var dia in dias)
        {
            var inicioDia = new DateTime(dia.Year, dia.Month, dia.Day, request.DataInicio.Hour, request.DataInicio.Minute, 0, DateTimeKind.Utc);
            var fimDia = request.DataFim.HasValue
                ? new DateTime(dia.Year, dia.Month, dia.Day, request.DataFim.Value.Hour, request.DataFim.Value.Minute, 0, DateTimeKind.Utc)
                : (diaInteiroLote ? inicioDia.Date.AddDays(1) : inicioDia);

            var evento = new AgendaItem
            {
                Titulo = request.Titulo.Trim(),
                Descricao = request.Descricao,
                Local = request.Local,
                DataInicio = inicioDia,
                DataFim = fimDia,
                DiaInteiro = diaInteiroLote,
                TipoId = request.TipoId,
                OperadorId = request.ResponsavelId,
                ProjetoId = request.ProjetoId,
                Prioridade = (PrioridadeAgenda)request.Prioridade,
                SLAMinutos = request.SLAMinutos,
                Recorrente = recorrente,
                PadraoRecorrencia = recorrente ? padrao : AgendaRecorrencia.Nenhuma,
                UsuarioInclusao = usuarioId,
                DataInclusao = DateTime.UtcNow
            };

            if (request.ParticipantesIds?.Any() == true)
            {
                var ativos = await _db.Operadores.AsNoTracking()
                    .Where(o => o.SeAtivo == "S")
                    .Select(o => o.OperadorId)
                    .ToListAsync(ct);

                evento.Participantes = ativos.Intersect(request.ParticipantesIds)
                    .Select(id => new AgendaParticipante { ParticipanteId = id })
                    .ToList();
            }

            eventos.Add(evento);
        }

        _db.Agenda.AddRange(eventos);
        await _db.SaveChangesAsync(ct);

        var detalhes = new List<AgendaDetalhe>();
        foreach (var e in eventos)
            detalhes.Add((await ObterEventoAsync(e.Id, ct))!);

        return new AgendaLoteResponse(eventos.Count, detalhes);
    }
}