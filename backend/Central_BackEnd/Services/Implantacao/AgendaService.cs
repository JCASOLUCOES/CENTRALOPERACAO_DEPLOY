using System.Text;
using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IAgendaService
{
    Task<List<AgendaResumo>> ListarAsync(DateTime? inicio, DateTime? fim, string? operadorId,
        string? visibilidade, int? projetoId, int take, string usuarioLogado, CancellationToken ct = default);
    Task<AgendaDetalhe?> ObterAsync(int id, string usuarioLogado, bool isAdmin, CancellationToken ct = default);
    Task<AgendaDetalhe> CriarAsync(AgendaCriarRequest req, CancellationToken ct = default);
    Task<AgendaDetalhe?> AtualizarAsync(int id, AgendaAtualizarRequest req, string usuarioLogado, bool isAdmin, CancellationToken ct = default);
    Task<bool> ExcluirAsync(int id, string usuarioLogado, bool isAdmin, CancellationToken ct = default);
    byte[] ExportarIcs(string operadorId, IEnumerable<AgendaResumo> itens);
}

public class AgendaService : IAgendaService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;
    public AgendaService(AppDbContext db, IAuditoriaImplantacaoService auditoria)
    {
        _db = db;
        _auditoria = auditoria;
    }

    public async Task<List<AgendaResumo>> ListarAsync(DateTime? inicio, DateTime? fim, string? operadorId,
        string? visibilidade, int? projetoId, int take, string usuarioLogado, CancellationToken ct = default)
    {
        var q = _db.Agenda.AsNoTracking()
            .Include(a => a.Projeto)
            .AsQueryable();

        if (inicio.HasValue) q = q.Where(a => a.DataInicio >= inicio.Value);
        if (fim.HasValue) q = q.Where(a => a.DataInicio <= fim.Value);
        if (!string.IsNullOrWhiteSpace(operadorId)) q = q.Where(a => a.OperadorId == operadorId);
        if (projetoId.HasValue) q = q.Where(a => a.ProjetoId == projetoId);

        if (!string.IsNullOrWhiteSpace(visibilidade) && Enum.TryParse<AgendaVisibilidade>(visibilidade, true, out var v))
            q = q.Where(a => a.Visibilidade == v);

        var raw = await q
            .OrderBy(a => a.DataInicio)
            .Take(Math.Clamp(take, 1, 1000))
            .Select(a => new
            {
                a.Id, a.OperadorId, a.Titulo, a.DataInicio, a.DataFim, a.DiaInteiro, a.Cor,
                a.Tipo, a.Visibilidade, a.ProjetoId, a.Recorrente, a.PadraoRecorrencia
            })
            .ToListAsync(ct);

        var operadorIds = raw.Select(x => x.OperadorId).Distinct().ToList();
        var nomes = await _db.Operadores.AsNoTracking()
            .Where(o => operadorIds.Contains(o.OperadorId))
            .Select(o => new { o.OperadorId, o.Nome })
            .ToDictionaryAsync(o => o.OperadorId, o => o.Nome, ct);

        // Filtra por visibilidade:
        // PUBLICO -> todos veem
        // EQUIPE -> mesma equipe do autor (intersecao em MembrosEquipe)
        // PRIVADO -> so o proprio dono (ou admin)
        var resultado = new List<AgendaResumo>();
        var minhasEquipes = await _db.MembrosEquipe.AsNoTracking()
            .Where(m => m.OperadorId == usuarioLogado)
            .Select(m => m.EquipeId)
            .ToListAsync(ct);

        foreach (var a in raw)
        {
            var visivel = a.Visibilidade switch
            {
                AgendaVisibilidade.Publico => true,
                AgendaVisibilidade.Equipe => minhasEquipes.Any(),
                AgendaVisibilidade.Privado => a.OperadorId == usuarioLogado,
                _ => false
            };
            if (!visivel) continue;

            if (a.Visibilidade == AgendaVisibilidade.Equipe)
            {
                // precisa estar em pelo menos uma equipe em comum com o autor
                var autorEquipes = await _db.MembrosEquipe.AsNoTracking()
                    .Where(m => m.OperadorId == a.OperadorId)
                    .Select(m => m.EquipeId)
                    .ToListAsync(ct);
                if (!autorEquipes.Any(e => minhasEquipes.Contains(e))) continue;
            }

            nomes.TryGetValue(a.OperadorId, out var nome);
            string? projetoCodigo = a.ProjetoId == null
                ? null
                : await _db.Projetos.AsNoTracking().Where(p => p.Id == a.ProjetoId).Select(p => p.Codigo).FirstOrDefaultAsync(ct);

            resultado.Add(new AgendaResumo(
                a.Id, a.OperadorId, nome,
                a.Titulo, a.DataInicio, a.DataFim, a.DiaInteiro, a.Cor,
                a.Tipo, a.Visibilidade, a.ProjetoId, projetoCodigo,
                a.Recorrente, a.PadraoRecorrencia));
        }

        return resultado;
    }

    public async Task<AgendaDetalhe?> ObterAsync(int id, string usuarioLogado, bool isAdmin, CancellationToken ct = default)
    {
        var a = await _db.Agenda.AsNoTracking().Include(x => x.Projeto)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a == null) return null;
        if (a.Visibilidade == AgendaVisibilidade.Privado && a.OperadorId != usuarioLogado && !isAdmin)
            return null;

        var nome = await _db.Operadores.AsNoTracking().Where(o => o.OperadorId == a.OperadorId)
            .Select(o => o.Nome).FirstOrDefaultAsync(ct);

        return new AgendaDetalhe(
            a.Id, a.OperadorId, nome, a.Titulo, a.Descricao, a.Local,
            a.DataInicio, a.DataFim, a.DiaInteiro, a.Cor,
            a.Tipo, a.Visibilidade,
            a.ProjetoId, a.Projeto?.Codigo,
            a.Recorrente, a.PadraoRecorrencia,
            a.UsuarioInclusao, a.DataInclusao,
            a.UsuarioAlteracao, a.DataAlteracao);
    }

    public async Task<AgendaDetalhe> CriarAsync(AgendaCriarRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Titulo))
            throw new ArgumentException("Titulo obrigatorio");
        if (req.DataFim.HasValue && req.DataFim < req.DataInicio)
            throw new ArgumentException("DataFim anterior a DataInicio");
        if (req.Recorrente && req.PadraoRecorrencia == AgendaRecorrencia.Nenhuma)
            throw new ArgumentException("Recorrente exige padrao de recorrencia");

        var a = new AgendaItem
        {
            OperadorId = req.UsuarioInclusao,
            Titulo = req.Titulo.Trim(),
            Descricao = req.Descricao,
            Local = req.Local,
            DataInicio = req.DataInicio,
            DataFim = req.DataFim,
            DiaInteiro = req.DiaInteiro,
            Cor = req.Cor,
            Tipo = req.Tipo,
            Visibilidade = req.Visibilidade,
            ProjetoId = req.ProjetoId,
            Recorrente = req.Recorrente,
            PadraoRecorrencia = req.PadraoRecorrencia,
            UsuarioInclusao = req.UsuarioInclusao,
            DataInclusao = DateTime.Now
        };
        _db.Agenda.Add(a);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Agenda", a.Id, "CREATE", null, a, req.UsuarioInclusao, $"Evento criado: {a.Titulo}", ct);
        return (await ObterAsync(a.Id, req.UsuarioInclusao, isAdmin: false, ct))!;
    }

    public async Task<AgendaDetalhe?> AtualizarAsync(int id, AgendaAtualizarRequest req, string usuarioLogado, bool isAdmin, CancellationToken ct = default)
    {
        var a = await _db.Agenda.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a == null) return null;
        if (a.OperadorId != usuarioLogado && !isAdmin)
            return null;
        if (string.IsNullOrWhiteSpace(req.Titulo))
            throw new ArgumentException("Titulo obrigatorio");
        if (req.DataFim.HasValue && req.DataFim < req.DataInicio)
            throw new ArgumentException("DataFim anterior a DataInicio");

        var antes = new { a.Titulo, a.Descricao, a.Local, a.DataInicio, a.DataFim, a.DiaInteiro, a.Cor, a.Tipo, a.Visibilidade, a.ProjetoId, a.Recorrente, a.PadraoRecorrencia };
        a.Titulo = req.Titulo.Trim();
        a.Descricao = req.Descricao;
        a.Local = req.Local;
        a.DataInicio = req.DataInicio;
        a.DataFim = req.DataFim;
        a.DiaInteiro = req.DiaInteiro;
        a.Cor = req.Cor;
        a.Tipo = req.Tipo;
        a.Visibilidade = req.Visibilidade;
        a.ProjetoId = req.ProjetoId;
        a.Recorrente = req.Recorrente;
        a.PadraoRecorrencia = req.PadraoRecorrencia;
        a.UsuarioAlteracao = req.UsuarioAlteracao;
        a.DataAlteracao = DateTime.Now;
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Agenda", id, "UPDATE", antes, new { a.Titulo, a.Descricao, a.Local, a.DataInicio, a.DataFim, a.DiaInteiro, a.Cor, a.Tipo, a.Visibilidade, a.ProjetoId, a.Recorrente, a.PadraoRecorrencia }, req.UsuarioAlteracao, "Evento atualizado", ct);
        return await ObterAsync(a.Id, usuarioLogado, isAdmin, ct);
    }

    public async Task<bool> ExcluirAsync(int id, string usuarioLogado, bool isAdmin, CancellationToken ct = default)
    {
        var a = await _db.Agenda.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (a == null) return false;
        if (a.OperadorId != usuarioLogado && !isAdmin) return false;
        var antes = new { a.Titulo, a.OperadorId, a.DataInicio, a.DataFim, a.Tipo, a.Visibilidade };
        _db.Agenda.Remove(a);
        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Agenda", id, "DELETE", antes, null, usuarioLogado, "Evento excluído", ct);
        return true;
    }

    public byte[] ExportarIcs(string operadorId, IEnumerable<AgendaResumo> itens)
    {
        var sb = new StringBuilder();
        sb.AppendLine("BEGIN:VCALENDAR");
        sb.AppendLine("VERSION:2.0");
        sb.AppendLine("PRODID:-//JCA Central de Operacao//Agenda//PT-BR");
        sb.AppendLine("CALSCALE:GREGORIAN");
        sb.AppendLine("METHOD:PUBLISH");
        foreach (var i in itens)
        {
            sb.AppendLine("BEGIN:VEVENT");
            sb.AppendLine($"UID:agenda-{i.Id}@jca-central.local");
            sb.AppendLine($"DTSTAMP:{DateTime.UtcNow:yyyyMMddTHHmmssZ}");
            sb.AppendLine($"DTSTART:{i.DataInicio:yyyyMMddTHHmmss}");
            if (i.DataFim.HasValue)
                sb.AppendLine($"DTEND:{i.DataFim.Value:yyyyMMddTHHmmss}");
            sb.AppendLine($"SUMMARY:{EscapeIcs(i.Titulo)}");
            sb.AppendLine($"DESCRIPTION:Tipo={i.Tipo} Visibilidade={i.Visibilidade}");
            if (!string.IsNullOrEmpty(i.ProjetoCodigo))
                sb.AppendLine($"CATEGORIES:{EscapeIcs(i.ProjetoCodigo)}");
            sb.AppendLine("END:VEVENT");
        }
        sb.AppendLine("END:VCALENDAR");
        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    private static string EscapeIcs(string texto)
        => texto.Replace("\\", "\\\\").Replace(",", "\\,").Replace(";", "\\;").Replace("\n", "\\n");
}
