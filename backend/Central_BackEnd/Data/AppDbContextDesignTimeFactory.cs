using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.SqlServer;

namespace Central_BackEnd.Data;

/// <summary>
/// Factory usada pelo dotnet ef (migrations) para construir o DbContext em
/// tempo de design, sem precisar iniciar a aplicacao inteira.
/// Usa SQL Server (mesmo provider de producao) para que o gerador de
/// migrations (IMigrator) funcione corretamente. O InMemory é incompatível
/// com o gerador de migrations.
/// </summary>
public class AppDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=CentralDesignTime;Trusted_Connection=True;TrustServerCertificate=True;",
                sql => sql.MigrationsAssembly("Central_BackEnd"))
            .Options;
        return new AppDbContext(options);
    }
}
