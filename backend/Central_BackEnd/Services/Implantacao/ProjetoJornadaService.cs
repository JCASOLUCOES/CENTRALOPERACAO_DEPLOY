using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IProjetoJornadaService
{
    Task<ProjetoJornada?> ObterJornadaAsync(int projetoId, CancellationToken ct = default);
    /// <summary>Recalcula e persiste PRJ_Progresso (média simples das etapas com tarefas).</summary>
    Task<int> RecalcularProgressoAsync(int projetoId, CancellationToken ct = default);
}

public class ProjetoJornadaService : IProjetoJornadaService
{
    private readonly AppDbContext _db;

    public ProjetoJornadaService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ProjetoJornada?> ObterJornadaAsync(int projetoId, CancellationToken ct = default)
    {
        var projeto = await _db.Projetos.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto == null) return null;

        // Fluxo = etapas ativas do TipoProjeto do projeto + globais, na ordem cadastrada.
        var etapas = await _db.Etapas.AsNoTracking()
            .Where(e => e.Ativa && (e.TipoProjetoId == null || e.TipoProjetoId == projeto.TipoProjetoId))
            .OrderBy(e => e.Ordem)
            .ToListAsync(ct);

        // Tarefas do projeto (mesma convenção da lista: sem arquivadas), agrupadas por etapa.
        var tarefas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.ProjetoId == projetoId && !t.Arquivada)
            .Select(t => new { t.EtapaId, t.Status })
            .ToListAsync(ct);

        var itens = new List<EtapaJornadaItem>();
        var anteriorCompleta = true;
        foreach (var e in etapas)
        {
            var daEtapa = tarefas.Where(t => t.EtapaId == e.Id).ToList();
            var total = daEtapa.Count;
            var concluidas = daEtapa.Count(t => t.Status == StatusTarefa.Concluida);
            var percentual = total > 0 ? (int)Math.Round(concluidas * 100.0 / total) : 0;

            string estado;
            if (total > 0 && concluidas == total)
                estado = "Concluida";
            else if (!anteriorCompleta)
                estado = "Bloqueada";
            else if (total > 0)
                estado = "EmAndamento";
            else
                estado = "Pendente";

            // Etapa vazia não bloqueia a seguinte (100% vazio).
            anteriorCompleta = total == 0 || concluidas == total;

            itens.Add(new EtapaJornadaItem(e.Id, e.Nome, e.Cor, e.Ordem, total, concluidas, percentual, estado));
        }

        var comTarefas = itens.Where(i => i.TotalTarefas > 0).ToList();
        var geral = comTarefas.Count > 0
            ? (int)Math.Round(comTarefas.Average(i => i.Percentual))
            : 0;

        var atual = itens.FirstOrDefault(i => i.Estado != "Concluida") ?? itens.LastOrDefault();

        return new ProjetoJornada(projetoId, itens, geral, atual?.EtapaId);
    }

    public async Task<int> RecalcularProgressoAsync(int projetoId, CancellationToken ct = default)
    {
        var jornada = await ObterJornadaAsync(projetoId, ct);
        if (jornada == null) return 0;

        var projeto = await _db.Projetos.FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto == null) return jornada.ProgressoGeral;

        projeto.Progresso = jornada.ProgressoGeral;
        await _db.SaveChangesAsync(ct);
        return jornada.ProgressoGeral;
    }
}
