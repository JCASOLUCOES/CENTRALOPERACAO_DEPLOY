using System;

namespace Central_BackEnd.Services.Implantacao;

public static class TimeZoneHelper
{
    private static readonly TimeZoneInfo BrasiliaZone;

    static TimeZoneHelper()
    {
        try
        {
            BrasiliaZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
        catch
        {
            BrasiliaZone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");
        }
    }

    public static DateTime UtcParaBrasilia(DateTime utc)
    {
        if (utc.Kind == DateTimeKind.Unspecified) utc = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, BrasiliaZone);
    }

    public static DateTime BrasiliaParaUtc(DateTime brasilia)
    {
        if (brasilia.Kind == DateTimeKind.Unspecified) brasilia = DateTime.SpecifyKind(brasilia, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(brasilia, BrasiliaZone);
    }

    public static DateTime? UtcParaBrasilia(DateTime? utc) => utc.HasValue ? UtcParaBrasilia(utc.Value) : null;
}