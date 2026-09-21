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
    public DbSet<TipoProjeto> TiposProjeto => Set<TipoProjeto>();
    public DbSet<Etapa> Etapas => Set<Etapa>();
    public DbSet<ColunaKanban> ColunasKanban => Set<ColunaKanban>();
    public DbSet<Projeto> Projetos => Set<Projeto>();
    public DbSet<ProjetoEtapa> ProjetoEtapas => Set<ProjetoEtapa>();
    public DbSet<ProjetoEtapaChecklist> ProjetoEtapaChecklists => Set<ProjetoEtapaChecklist>();
    public DbSet<ProjetoEtapaDocumento> ProjetoEtapaDocumentos => Set<ProjetoEtapaDocumento>();
    public DbSet<ProjetoEtapaHistorico> ProjetoEtapaHistoricos => Set<ProjetoEtapaHistorico>();
    public DbSet<ProjetoEtapaComentario> ProjetoEtapaComentarios => Set<ProjetoEtapaComentario>();
    public DbSet<Tarefa> Tarefas => Set<Tarefa>();
    public DbSet<ComentarioTarefa> ComentariosTarefa => Set<ComentarioTarefa>();
    public DbSet<TarefaResponsavel> TarefaResponsaveis => Set<TarefaResponsavel>();
    public DbSet<TarefaChamado> TarefaChamados => Set<TarefaChamado>();
    public DbSet<TarefaApontamento> TarefaApontamentos => Set<TarefaApontamento>();
    public DbSet<ChamadoLegado> ChamadosLegado => Set<ChamadoLegado>();
    public DbSet<AgendaItem> Agenda => Set<AgendaItem>();
    public DbSet<TipoEvento> TiposEvento => Set<TipoEvento>();
    public DbSet<AgendaParticipante> AgendaParticipantes => Set<AgendaParticipante>();
    public DbSet<AuditoriaImplantacao> AuditoriaImplantacao => Set<AuditoriaImplantacao>();
    public DbSet<FuncionarioLegado> FuncionariosLegado => Set<FuncionarioLegado>();
    public DbSet<ClienteLegado> ClientesLegado => Set<ClienteLegado>();

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

        modelBuilder.Entity<TipoProjeto>(entity =>
        {
            entity.HasIndex(e => e.Codigo).IsUnique();
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
            entity.HasOne(e => e.Cliente)
                  .WithMany()
                  .HasForeignKey(e => e.ClienteId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.ColunaKanban)
                  .WithMany()
                  .HasForeignKey(e => e.ColunaKanbanId)
                  .OnDelete(DeleteBehavior.SetNull);
            // Restrict explícito: TipoProjeto com projetos vinculados não pode ser excluído.
            // (Cascade aqui é rejeitado pelo SQL Server — múltiplos caminhos via Etapa→TipoProjeto.)
            entity.HasOne(e => e.TipoProjeto)
                  .WithMany()
                  .HasForeignKey(e => e.TipoProjetoId)
                  .OnDelete(DeleteBehavior.Restrict);
            
            entity.HasMany(e => e.Etapas)
                  .WithOne(e => e.Projeto)
                  .HasForeignKey(e => e.ProjetoId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjetoEtapa>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => new { e.ProjetoId, e.Ordem }).IsUnique();
            entity.HasOne(e => e.Projeto)
                  .WithMany(p => p.Etapas)
                  .HasForeignKey(e => e.ProjetoId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Checklist)
                  .WithOne(c => c.ProjetoEtapa)
                  .HasForeignKey(c => c.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Documentos)
                  .WithOne(d => d.ProjetoEtapa)
                  .HasForeignKey(d => d.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Historico)
                  .WithOne(h => h.ProjetoEtapa)
                  .HasForeignKey(h => h.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(e => e.Comentarios)
                  .WithOne(c => c.ProjetoEtapa)
                  .HasForeignKey(c => c.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjetoEtapaChecklist>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ProjetoEtapa)
                  .WithMany(p => p.Checklist)
                  .HasForeignKey(e => e.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjetoEtapaDocumento>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ProjetoEtapa)
                  .WithMany(p => p.Documentos)
                  .HasForeignKey(e => e.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjetoEtapaHistorico>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ProjetoEtapa)
                  .WithMany(p => p.Historico)
                  .HasForeignKey(e => e.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjetoEtapaComentario>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(e => e.ProjetoEtapa)
                  .WithMany(p => p.Comentarios)
                  .HasForeignKey(e => e.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Cascade);
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
            // Restrict explícito: SQL Server rejeita múltiplos caminhos em cascata
            // (IMPL_Projeto → IMPL_Tarefa direto + via tbprojetoEtapa com SET NULL).
            // Excluir projeto continua funcionando (cascatas apagam ambos os lados
            // na mesma instrução); ninguém deleta linha de tbprojetoEtapa isolada.
            entity.HasOne(e => e.ProjetoEtapa)
                  .WithMany()
                  .HasForeignKey(e => e.ProjetoEtapaId)
                  .OnDelete(DeleteBehavior.Restrict);
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

        modelBuilder.Entity<TarefaResponsavel>(entity =>
        {
            entity.HasKey(e => new { e.TarefaId, e.OperadorId });
            entity.HasOne(e => e.Tarefa)
                  .WithMany(t => t.Responsaveis)
                  .HasForeignKey(e => e.TarefaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.OperadorId);
        });

        modelBuilder.Entity<TarefaChamado>(entity =>
        {
            entity.HasKey(e => new { e.TarefaId, e.ChamadoId });
            entity.HasOne(e => e.Tarefa)
                  .WithMany(t => t.Chamados)
                  .HasForeignKey(e => e.TarefaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.ChamadoId);
        });

        modelBuilder.Entity<TarefaApontamento>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Horas).HasPrecision(5, 2);
            entity.HasOne(e => e.Tarefa)
                  .WithMany(t => t.Apontamentos)
                  .HasForeignKey(e => e.TarefaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.TarefaId, e.Data });
        });

        modelBuilder.Entity<ChamadoLegado>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.ToTable("tbchamado", t => t.ExcludeFromMigrations());
        });

        modelBuilder.Entity<AgendaItem>(entity =>
        {
            entity.HasIndex(e => e.OperadorId);
            entity.HasIndex(e => e.DataInicio);
            entity.HasIndex(e => new { e.OperadorId, e.DataInicio, e.DataFim })
                .HasDatabaseName("IX_IMPL_Agenda_Operador_DataInicio_DataFim");
            entity.HasIndex(e => e.ProjetoId);
            entity.HasIndex(e => e.TipoId);
            entity.HasOne(e => e.Projeto)
                  .WithMany()
                  .HasForeignKey(e => e.ProjetoId)
                  .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(e => e.TipoEvento)
                  .WithMany()
                  .HasForeignKey(e => e.TipoId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TipoEvento>(entity =>
        {
            entity.HasIndex(e => e.Nome).IsUnique();
        });

        modelBuilder.Entity<AgendaParticipante>(entity =>
        {
            entity.HasIndex(e => new { e.AgendaId, e.ParticipanteId }).IsUnique();
            entity.HasOne(e => e.Agenda)
                  .WithMany(a => a.Participantes)
                  .HasForeignKey(e => e.AgendaId)
                  .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Participante)
                  .WithMany()
                  .HasForeignKey(e => e.ParticipanteId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AuditoriaImplantacao>(entity =>
        {
            entity.HasIndex(e => new { e.Entidade, e.EntidadeId });
            entity.HasIndex(e => e.Data);
            entity.HasIndex(e => e.Usuario);
        });

        // Tabela legada: somente leitura, fora das migrations.
        modelBuilder.Entity<FuncionarioLegado>(entity =>
        {
            entity.ToTable("tbfuncionario", t => t.ExcludeFromMigrations());
        });

        // Tabela legada tbcliente: somente leitura, fora das migrations.
        // Fonte única de clientes (dropdown exibe FANTASIA). Nunca escrever aqui.
        modelBuilder.Entity<ClienteLegado>(entity =>
        {
            entity.ToTable("tbcliente", t => t.ExcludeFromMigrations());
            entity.Property(c => c.Ativo).HasMaxLength(1).IsUnicode(false);
            entity.Property(c => c.Cnpj).IsUnicode(false);
        });
    }
}
