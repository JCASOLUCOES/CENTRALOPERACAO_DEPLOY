using Central_BackEnd.Models;
using Central_BackEnd.Models.Acessos;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Operador> Operadores => Set<Operador>();

    public DbSet<Funcao> Funcoes => Set<Funcao>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuditoriaAcesso> AuditoriaAcessos => Set<AuditoriaAcesso>();

    public DbSet<Cliente> Clientes => Set<Cliente>();
    public DbSet<Equipe> Equipes => Set<Equipe>();
    public DbSet<MembroEquipe> MembrosEquipe => Set<MembroEquipe>();
    public DbSet<TipoProjeto> TiposProjeto => Set<TipoProjeto>();
    public DbSet<Etapa> Etapas => Set<Etapa>();
    public DbSet<ColunaKanban> ColunasKanban => Set<ColunaKanban>();
    public DbSet<Projeto> Projetos => Set<Projeto>();
    public DbSet<Tarefa> Tarefas => Set<Tarefa>();
    public DbSet<ComentarioTarefa> ComentariosTarefa => Set<ComentarioTarefa>();
    public DbSet<AgendaItem> Agenda => Set<AgendaItem>();
    public DbSet<AuditoriaImplantacao> AuditoriaImplantacao => Set<AuditoriaImplantacao>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Operador>(entity =>
        {
            entity.HasKey(e => e.OperadorId);
            entity.Property(e => e.OperadorId).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.Nome).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Senha).HasMaxLength(10).IsUnicode(false);
            entity.Property(e => e.Email).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.SeAtivo).HasMaxLength(1).IsUnicode(false);
            entity.Property(e => e.PerfilSkin).HasMaxLength(20).IsUnicode(false);
            entity.Property(e => e.UsuarioInclusao).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.UsuarioAlteracao).HasMaxLength(15).IsUnicode(false);
            entity.Property(e => e.PerfilId).HasMaxLength(1).IsUnicode(false);

            entity.HasOne(e => e.Funcao)
                  .WithMany()
                  .HasForeignKey(e => e.FuncaoId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Funcao>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Descricao).HasMaxLength(100).IsUnicode(false);
            entity.Property(e => e.Classificacao).HasMaxLength(50).IsUnicode(false);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TokenHash).HasMaxLength(500);
            entity.Property(e => e.OperadorId).HasMaxLength(15).IsUnicode(false);
            entity.HasOne(e => e.Operador)
                  .WithMany()
                  .HasForeignKey(e => e.OperadorId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.TokenHash);
        });

        modelBuilder.Entity<AuditoriaAcesso>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Usuario).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Empresa).HasMaxLength(200).IsUnicode(false);
            entity.Property(e => e.TipoInformacao).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.EnderecoIP).HasMaxLength(50).IsUnicode(false);
            entity.Property(e => e.Navegador).HasMaxLength(200).IsUnicode(false);
        });

        modelBuilder.Entity<Cliente>(entity =>
        {
            entity.HasIndex(e => e.Nome);
        });

        modelBuilder.Entity<Equipe>(entity =>
        {
            entity.HasIndex(e => e.Nome).IsUnique();
        });

        modelBuilder.Entity<MembroEquipe>(entity =>
        {
            entity.HasIndex(e => new { e.EquipeId, e.OperadorId }).IsUnique();
            entity.HasOne(e => e.Equipe)
                  .WithMany()
                  .HasForeignKey(e => e.EquipeId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TipoProjeto>(entity =>
        {
            entity.HasIndex(e => e.Codigo).IsUnique();
            entity.HasOne(e => e.Equipe)
                  .WithMany()
                  .HasForeignKey(e => e.EquipeId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Etapa>(entity =>
        {
            entity.HasOne(e => e.TipoProjeto)
                  .WithMany()
                  .HasForeignKey(e => e.TipoProjetoId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Projeto>(entity =>
        {
            entity.HasIndex(e => e.Codigo).IsUnique();
            entity.HasOne(e => e.Equipe)
                  .WithMany()
                  .HasForeignKey(e => e.EquipeId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.TipoProjeto)
                  .WithMany()
                  .HasForeignKey(e => e.TipoProjetoId)
                  .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Cliente)
                  .WithMany()
                  .HasForeignKey(e => e.ClienteId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ColunaKanban)
                  .WithMany()
                  .HasForeignKey(e => e.ColunaKanbanId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Tarefa>(entity =>
        {
            entity.HasOne(e => e.Projeto)
                  .WithMany()
                  .HasForeignKey(e => e.ProjetoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Etapa)
                  .WithMany()
                  .HasForeignKey(e => e.EtapaId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ColunaKanban)
                  .WithMany()
                  .HasForeignKey(e => e.ColunaKanbanId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ComentarioTarefa>(entity =>
        {
            entity.HasOne(e => e.Tarefa)
                  .WithMany()
                  .HasForeignKey(e => e.TarefaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AgendaItem>(entity =>
        {
            entity.HasIndex(e => e.OperadorId);
            entity.HasIndex(e => e.DataInicio);
            entity.HasIndex(e => e.ProjetoId);
            entity.HasOne(e => e.Projeto)
                  .WithMany()
                  .HasForeignKey(e => e.ProjetoId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AuditoriaImplantacao>(entity =>
        {
            entity.HasIndex(e => new { e.Entidade, e.EntidadeId });
            entity.HasIndex(e => e.Data);
            entity.HasIndex(e => e.Usuario);
        });
    }
}
