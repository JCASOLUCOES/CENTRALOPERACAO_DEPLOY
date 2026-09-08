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
    Task<ProjetoDetalhe?> MudarStatusAsync(int id, ProjetoMudarStatusRequest req, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, CancellationToken ct = default);
    Task<string> ProximoCodigoAsync(int equipeId, CancellationToken ct = default);
}

public class ProjetoService : IProjetoService
{
    private readonly AppDbContext _db;
    private readonly ILegacyDataService legacyService;
    private readonly IAuditoriaImplantacaoService _auditoria;
    public ProjetoService(AppDbContext db, ILegacyDataService legacy, IAuditoriaImplantacaoService auditoria)
    {
        _db = db;
        legacyService = legacy;
        _auditoria = auditoria;
    }

    public async Task<List<ProjetoResumo>> ListarAsync(ProjetoFiltro f, CancellationToken ct = default)
    {
        var q = _db.Projetos.AsNoTracking()
            .Include(p => p.Equipe)
            .Include(p => p.TipoProjeto)
            .Include(p => p.Cliente)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(f.Buscar))
            q = q.Where(p => EF.Functions.Like(p.Nome, $"%{f.Buscar}%") || EF.Functions.Like(p.Codigo, $"%{f.Buscar}%"));
        if (!string.IsNullOrWhiteSpace(f.Equipe))
            q = q.Where(p => p.Equipe != null && p.Equipe.Nome == f.Equipe);
        if (!string.IsNullOrWhiteSpace(f.Tipo))
            q = q.Where(p => p.TipoProjeto != null && p.TipoProjeto.Codigo == f.Tipo);
        if (f.ClienteId.HasValue) q = q.Where(p => p.ClienteId == f.ClienteId);
        if (!string.IsNullOrEmpty(f.ResponsavelId))
            q = q.Where(p => p.ResponsavelId == f.ResponsavelId);
        if (!string.IsNullOrWhiteSpace(f.Status) && Enum.TryParse<StatusProjeto>(f.Status, out var st))
            q = q.Where(p => p.Status == st);

        return await q
            .OrderByDescending(p => p.DataInclusao)
            .Take(500)
            .Select(p => new ProjetoResumo(
                p.Id, p.Codigo, p.Nome,
                p.Equipe != null ? p.Equipe.Nome : "",
                p.TipoProjeto != null ? p.TipoProjeto.Nome : "",
                p.ClienteId, p.Cliente != null ? p.Cliente.Nome : null,
                p.ClienteLegadoId, null,   // ClienteLegadoId e Nome (preenchidos no ObterAsync via SQL)
                p.Status.ToString(), (int)p.Prioridade, p.Progresso,
                p.ResponsavelId,
                _db.Operadores.Where(o => o.OperadorId == p.ResponsavelId).Select(o => o.Nome).FirstOrDefault(),
                p.DataPrevisao, p.DataConclusao, p.DataInclusao))
            .ToListAsync(ct);
    }

    public async Task<ProjetoDetalhe?> ObterAsync(int id, CancellationToken ct = default)
    {
        var p = await _db.Projetos.AsNoTracking()
            .Include(x => x.Equipe).Include(x => x.TipoProjeto).Include(x => x.Cliente)
            .Include(x => x.ColunaKanban)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return null;

        var responsavelNome = p.ResponsavelId == null ? null :
            await _db.Operadores.Where(o => o.OperadorId == p.ResponsavelId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var criadorNome = await _db.Operadores.Where(o => o.OperadorId == p.CriadorId).Select(o => o.Nome).FirstOrDefaultAsync(ct);
        var totalTarefas = await _db.Tarefas.CountAsync(t => t.ProjetoId == id, ct);
        var tarefasConcluidas = await _db.Tarefas.CountAsync(t => t.ProjetoId == id && t.Status == StatusTarefa.Concluida, ct);
        var hoje = DateTime.Today;
        var tarefasAtrasadas = await _db.Tarefas.CountAsync(t =>
            t.ProjetoId == id && t.Status != StatusTarefa.Concluida && t.Status != StatusTarefa.Cancelada &&
            t.DataPrevisao != null && t.DataPrevisao.Value.Date < hoje, ct);

        // Busca dados do cliente legado (dbBUSINESS_HML) se houver
        string? clienteLegadoNome = null;
        string? clienteLegadoCnpj = null;
        if (p.ClienteLegadoId.HasValue)
        {
            var leg = await legacyService.ObterClienteAsync(p.ClienteLegadoId.Value, ct);
            if (leg != null)
            {
                clienteLegadoNome = string.IsNullOrWhiteSpace(leg.Fantasia) ? leg.RazaoSocial : leg.Fantasia;
                clienteLegadoCnpj = leg.Cnpj;
            }
        }

        return new ProjetoDetalhe(
            p.Id, p.Codigo, p.Nome, p.Descricao,
            p.EquipeId, p.Equipe?.Nome ?? "",
            p.TipoProjetoId, p.TipoProjeto?.Nome ?? "",
            p.ClienteId, p.Cliente?.Nome,
            p.ClienteLegadoId, clienteLegadoNome, clienteLegadoCnpj,
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
        await ValidarAsync(req.EquipeId, req.TipoProjetoId, req.ClienteId, ct);
        var p = new Projeto
        {
            Codigo = await ProximoCodigoAsync(req.EquipeId, ct),
            Nome = req.Nome.Trim(),
            Descricao = req.Descricao,
            EquipeId = req.EquipeId,
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
        await ValidarAsync(req.EquipeId, req.TipoProjetoId, req.ClienteId, ct);
        var antes = new { p.Nome, p.Descricao, p.EquipeId, p.TipoProjetoId, p.ClienteId, p.ClienteLegadoId, p.ResponsavelId, p.ColunaKanbanId, p.Prioridade, p.Progresso, p.DataInicio, p.DataPrevisao, p.DataConclusao, p.DataGoLivePrevista, p.DataGoLiveReal, p.HorasPlanejadas, p.HorasRealizadas, p.Observacao, p.Status };
        p.Nome = req.Nome.Trim();
        p.Descricao = req.Descricao;
        p.EquipeId = req.EquipeId;
        p.TipoProjetoId = req.TipoProjetoId;
        p.ClienteId = req.ClienteId;
        p.ClienteLegadoId = req.ClienteLegadoId;
        p.ResponsavelId = req.ResponsavelId;
        p.ColunaKanbanId = req.ColunaKanbanId;
        p.Prioridade = (PrioridadeProjeto)req.Prioridade;
        p.Progresso = req.Progresso;
        p.DataInicio = req.DataInicio;
        p.DataPrevisao = req.DataPrevisao;
        p.DataConclusao = req.DataConclusao;
        p.DataGoLivePrevista = req.DataGoLivePrevista;
        p.DataGoLiveReal = req.DataGoLiveReal;
        p.HorasPlanejadas = req.HorasPlanejadas;
        p.HorasRealizadas = req.HorasRealizadas;
        p.Observacao = req.Observacao;
        p.UsuarioAlteracao = req.UsuarioAlteracao;
        p.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", id, "UPDATE", antes, p, req.UsuarioAlteracao, "Projeto atualizado", ct);
        return await ObterAsync(p.Id, ct);
    }

    public async Task<ProjetoDetalhe?> MudarStatusAsync(int id, ProjetoMudarStatusRequest req, CancellationToken ct = default)
    {
        var p = await _db.Projetos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return null;
        if (!Enum.TryParse<StatusProjeto>(req.Status, out var novoStatus))
            throw new ArgumentException("Status invalido");
        var antes = new { p.Status, p.ColunaKanbanId, p.Progresso, p.DataConclusao };
        p.Status = novoStatus;
        p.ColunaKanbanId = req.ColunaKanbanId;
        p.UsuarioAlteracao = req.UsuarioAlteracao;
        p.DataAlteracao = DateTime.Now;
        if (novoStatus == StatusProjeto.Concluido)
        {
            p.DataConclusao = DateTime.Now;
            p.Progresso = 100;
        }
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", id, "UPDATE", antes, new { p.Status, p.ColunaKanbanId, p.Progresso, p.DataConclusao }, req.UsuarioAlteracao, $"Status alterado para {novoStatus}", ct);
        return await ObterAsync(p.Id, ct);
    }

    public async Task<bool> ExcluirAsync(int id, CancellationToken ct = default)
    {
        var p = await _db.Projetos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (p == null) return false;
        var antes = new { p.Codigo, p.Nome, p.EquipeId, p.TipoProjetoId, p.ClienteId, p.ClienteLegadoId, p.Status };
        _db.Projetos.Remove(p);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", id, "DELETE", antes, null, "system", "Projeto excluído", ct);
        return true;
    }

    public async Task<string> ProximoCodigoAsync(int equipeId, CancellationToken ct = default)
    {
        var equipe = await _db.Equipes.FirstOrDefaultAsync(e => e.Id == equipeId, ct);
        var prefixo = equipe?.PrefixoCodigo ?? "PRJ";
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

    private async Task ValidarAsync(int equipeId, int tipoProjetoId, int? clienteId, CancellationToken ct)
    {
        var tipo = await _db.TiposProjeto.AsNoTracking().FirstOrDefaultAsync(t => t.Id == tipoProjetoId, ct);
        if (tipo == null) throw new ArgumentException("TipoProjeto inexistente");
        if (!await _db.Equipes.AnyAsync(e => e.Id == equipeId, ct))
            throw new ArgumentException("Equipe inexistente");
        if (tipo.ClienteObrigatorio)
        {
            if (clienteId == null) throw new ArgumentException($"Tipo {tipo.Codigo} exige cliente");
            if (!await _db.Clientes.AnyAsync(c => c.Id == clienteId, ct))
                throw new ArgumentException("Cliente inexistente");
        }
    }
}
