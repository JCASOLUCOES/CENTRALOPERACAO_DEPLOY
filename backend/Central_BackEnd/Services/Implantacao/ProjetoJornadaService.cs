using Central_BackEnd.Data;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IProjetoJornadaService
{
    /// <summary>Recalcula e persiste PRJ_Progresso (média simples das etapas com tarefas).</summary>
    Task<int> RecalcularProgressoAsync(int projetoId, CancellationToken ct = default);
}

public class ProjetoJornadaService : IProjetoJornadaService
{
    private readonly AppDbContext _db;

    private sealed record EtapaJornadaProjecao(
        int EtapaId,
        string Nome,
        string? Cor,
        int Ordem,
        int TotalTarefas,
        int TarefasConcluidas,
        int Percentual,
        string Estado);

    private sealed record ProjetoJornadaProjecao(
        int ProjetoId,
        List<EtapaJornadaProjecao> Etapas,
        int ProgressoGeral,
        int? EtapaAtualId);

    public ProjetoJornadaService(AppDbContext db)
    {
        _db = db;
    }

    private async Task<ProjetoJornadaProjecao?> CalcularJornadaAsync(int projetoId, CancellationToken ct = default)
    {
        var projeto = await _db.Projetos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto == null) return null;

        // Jornada = etapas fixas do projeto (cards de 9 etapas), na ordem cadastrada.
        var etapas = await _db.ProjetoEtapas.AsNoTracking()
            .Where(e => e.ProjetoId == projetoId)
            .OrderBy(e => e.Ordem)
            .ToListAsync(ct);

        // Projeto sem etapas fixas ainda — não recalcula progresso (evita zerar).
        if (etapas.Count == 0) return null;

        // Tarefas do projeto (mesma convenção da lista: sem arquivadas), agrupadas por etapa do card.
        var tarefas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.ProjetoId == projetoId && !t.Arquivada && t.ProjetoEtapaId != null)
            .Select(t => new { t.ProjetoEtapaId, t.Status })
            .ToListAsync(ct);

        var itens = new List<EtapaJornadaProjecao>();
        var anteriorCompleta = true;
        foreach (var e in etapas)
        {
            var daEtapa = tarefas.Where(t => t.ProjetoEtapaId == e.Id).ToList();
            var total = daEtapa.Count;
            var concluidas = daEtapa.Count(t => t.Status == StatusTarefa.Concluida);
            var percentual = total > 0 ? (int)Math.Round(concluidas * 100.0 / total) : 0;

            string estado;
            // Estado persistido tem prioridade (ex.: etapas concluídas na criação, sem tarefas).
            if (e.Estado == "Concluida" || (total > 0 && concluidas == total))
                estado = "Concluida";
            else if (!anteriorCompleta)
                estado = "Bloqueada";
            else if (total > 0 || e.Estado == "EmAndamento")
                estado = "EmAndamento";
            else
                estado = "Pendente";

            // Etapa vazia não bloqueia a seguinte (100% vazio).
            anteriorCompleta = total == 0 || concluidas == total || e.Estado == "Concluida";

            // Etapa concluída sem tarefas (criação em etapa avançada) conta 100%.
            var percentualFinal = estado == "Concluida" && total == 0 ? 100 : percentual;

            itens.Add(new EtapaJornadaProjecao(e.Id, e.Nome, null, e.Ordem, total, concluidas, percentualFinal, estado));
        }

        var geral = (int)Math.Round(itens.Average(i => i.Estado == "Concluida" ? 100.0 : i.Percentual));

        var atual = itens.FirstOrDefault(i => i.Estado != "Concluida") ?? itens.LastOrDefault();

        return new ProjetoJornadaProjecao(projetoId, itens, geral, atual?.EtapaId);
    }

    public async Task<int> RecalcularProgressoAsync(int projetoId, CancellationToken ct = default)
    {
        var jornada = await CalcularJornadaAsync(projetoId, ct);
        if (jornada == null) return 0;

        var projeto = await _db.Projetos.FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto == null) return jornada.ProgressoGeral;

        projeto.Progresso = jornada.ProgressoGeral;
        await _db.SaveChangesAsync(ct);
        return jornada.ProgressoGeral;
    }
}
