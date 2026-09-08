using System.Security.Cryptography;
using System.Text;

namespace Central_BackEnd.Services;

public static class SegurancaHelper
{
    public static bool SenhasIguais(string? a, string? b)
    {
        var ha = SHA256.HashData(Encoding.UTF8.GetBytes(a ?? string.Empty));
        var hb = SHA256.HashData(Encoding.UTF8.GetBytes(b ?? string.Empty));
        var diff = 0;
        for (var i = 0; i < ha.Length; i++)
        {
            diff |= ha[i] ^ hb[i];
        }
        return diff == 0;
    }
}