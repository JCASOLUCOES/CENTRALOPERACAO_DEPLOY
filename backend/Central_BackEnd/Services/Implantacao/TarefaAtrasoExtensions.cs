using Central_BackEnd.Models.Implantacao;

namespace Central_BackEnd.Services.Implantacao;

/// <summary>
/// Regra única de atraso de tarefa: prazo = DataEntrega ?? DataPrevisao.
/// Atrasada quando o prazo já passou, exceto tarefa Concluída dentro do prazo
/// (DataConclusao ≤ prazo). Cancelada nunca conta.
/// </summary>
public static class TarefaAtrasoExtensions
{
    public static IQueryable<Tarefa> OndeAtrasadas(this IQueryable<Tarefa> q, DateTime hoje)
    {
        return q.Where(t =>
            t.Status != StatusTarefa.Cancelada &&
            (t.DataEntrega ?? t.DataPrevisao) != null &&
            (t.DataEntrega ?? t.DataPrevisao)!.Value.Date < hoje &&
            (t.Status != StatusTarefa.Concluida ||
             !t.DataConclusao.HasValue ||
             t.DataConclusao.Value.Date > (t.DataEntrega ?? t.DataPrevisao)!.Value.Date));
    }
}
