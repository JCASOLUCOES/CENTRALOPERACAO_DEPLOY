using System.Collections.Concurrent;

namespace Central_BackEnd.Services;

public class BruteForceGuard
{
    private sealed class RegistroFalhas
    {
        public int Contagem;
        public DateTime UltimaFalha;
        public DateTime BloqueadoAte;
    }

    private readonly ConcurrentDictionary<string, RegistroFalhas> _falhas = new();

    public const int MaxTentativas = 5;
    public static readonly TimeSpan Janela = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan Bloqueio = TimeSpan.FromMinutes(15);

    public bool EstaBloqueado(string chave)
    {
        if (!_falhas.TryGetValue(chave, out var registro))
            return false;

        if (registro.BloqueadoAte > DateTime.UtcNow)
            return true;

        if (DateTime.UtcNow - registro.UltimaFalha > Janela)
            _falhas.TryRemove(chave, out _);

        return false;
    }

    public void RegistrarFalha(string chave)
    {
        var registro = _falhas.GetOrAdd(chave, _ => new RegistroFalhas());

        lock (registro)
        {
            registro.Contagem++;
            registro.UltimaFalha = DateTime.UtcNow;

            if (registro.Contagem >= MaxTentativas && registro.BloqueadoAte <= DateTime.UtcNow)
            {
                registro.BloqueadoAte = DateTime.UtcNow.Add(Bloqueio);
            }
        }
    }

    public void Limpar(string chave) => _falhas.TryRemove(chave, out _);
}