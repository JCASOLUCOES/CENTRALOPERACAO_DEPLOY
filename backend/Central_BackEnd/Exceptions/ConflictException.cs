using Central_BackEnd.Dtos.Implantacao;

namespace Central_BackEnd.Exceptions;

/// <summary>
/// Conflito de regra de negócio (ex.: sobreposição de horários na agenda).
/// Mapeada para HTTP 409 no controller.
/// </summary>
public class ConflictException : Exception
{
    public string Code { get; }
    public List<AgendaResumo> Conflitos { get; }

    public ConflictException(string message, List<AgendaResumo>? conflitos = null, string code = "CONFLICT_HORARIOS")
        : base(message)
    {
        Code = code;
        Conflitos = conflitos ?? new List<AgendaResumo>();
    }
}
