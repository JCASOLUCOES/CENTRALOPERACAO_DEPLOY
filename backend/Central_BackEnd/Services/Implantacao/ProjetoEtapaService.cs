using Central_BackEnd.Data;
using Central_BackEnd.Dtos.Implantacao;
using Central_BackEnd.Models.Implantacao;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Services.Implantacao;

public interface IProjetoEtapaService
{
    Task<List<ProjetoEtapaResumo>> ObterEtapasAsync(int projetoId, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe?> ObterEtapaDetalheAsync(int projetoId, int ordem, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe> AtualizarEtapaAsync(int projetoId, int ordem, ProjetoEtapaAtualizarRequest req, string usuario, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe> RetornarEtapaAsync(int projetoId, ProjetoEtapaRetornoRequest req, CancellationToken ct = default);
    Task InicializarEtapasPadraoAsync(int projetoId, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe> AdicionarChecklistItemAsync(int projetoId, int ordem, ProjetoEtapaChecklistItemRequest item, string usuario, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe> AdicionarDocumentoAsync(int projetoId, int ordem, ProjetoEtapaDocumentoRequest req, string usuario, CancellationToken ct = default);
    Task<ProjetoEtapaDetalhe> AdicionarComentarioAsync(int projetoId, int ordem, ProjetoEtapaComentarioRequest req, string usuario, CancellationToken ct = default);
    Task<int> RecalcularProgressoProjetoAsync(int projetoId, CancellationToken ct = default);
    /// <summary>
    /// Sincroniza os cards fixos com as tarefas (via Tarefa.ProjetoEtapaId):
    /// contador dinâmico, percentual task-based e conclusão automática com
    /// desbloqueio da próxima. Nunca reabre etapa concluída.
    /// </summary>
    Task SincronizarEtapasPorTarefasAsync(int projetoId, string usuario, CancellationToken ct = default);
}

public class ProjetoEtapaService : IProjetoEtapaService
{
    private readonly AppDbContext _db;
    private readonly IAuditoriaImplantacaoService _auditoria;
    private readonly ILogger<ProjetoEtapaService> _logger;

    private static readonly string[] NomesEtapasPadrao = new[]
    {
        "KICKOFF",
        "LEVANTAMENTO",
        "DESENVOLVIMENTO",
        "HOMOLOGAÇÃO",
        "TREINAMENTO",
        "GO LIVE",
        "PÓS-IMPLANTAÇÃO",
        "PASSAR PARA O SUPORTE",
        "CONCLUÍDO"
    };

    private static readonly string[][] ChecklistsPadrao = new[]
    {
        new[] { "Reunião inicial realizada", "Stakeholders definidos", "Escopo aprovado", "Cronograma base definido", "Ata de kickoff assinada" },
        new[] { "Requisitos funcionais levantados", "Requisitos não-funcionais levantados", "Protótipo aprovado pelo cliente", "Validação técnica realizada", "Documento de requisitos assinado" },
        new[] { "Design técnico aprovado", "Código implementado", "Testes unitários > 80%", "Code review realizado", "Deploy em staging concluído" },
        new[] { "UAT executado com cliente", "Bugs críticos resolvidos", "Relatório de UAT entregue", "Aprovação formal do cliente" },
        new[] { "Material de treinamento pronto", "Sessões de treinamento realizadas", "Certificados emitidos", "Feedback dos usuários coletado" },
        new[] { "Plano de rollback definido", "Monitoramento ativo configurado", "Ativação em produção realizada", "Validação pós-go-live concluída" },
        new[] { "Suporte 30 dias ativo", "Métricas de uso coletadas", "Relatório pós-implantação entregue", "Lições aprendidas documentadas" },
        new[] { "Documentação completa entregue", "Base de conhecimento atualizada", "Handover aprovado pelo suporte", "Assinatura de aceite do suporte" },
        new[] { "Relatório final entregue", "Assinado pelo cliente", "Projeto arquivado", "Lições aprendidas consolidadas" }
    };

    public ProjetoEtapaService(AppDbContext db, IAuditoriaImplantacaoService auditoria, ILogger<ProjetoEtapaService> logger)
    {
        _db = db;
        _auditoria = auditoria;
        _logger = logger;
    }

    public async Task<List<ProjetoEtapaResumo>> ObterEtapasAsync(int projetoId, CancellationToken ct = default)
    {
        var temEtapas = await _db.ProjetoEtapas.AsNoTracking().AnyAsync(e => e.ProjetoId == projetoId, ct);

        // Se não existem etapas, inicializar
        if (!temEtapas)
        {
            await InicializarEtapasPadraoAsync(projetoId, ct);
        }

        var etapas = await _db.ProjetoEtapas
            .AsNoTracking()
            .Where(e => e.ProjetoId == projetoId)
            .OrderBy(e => e.Ordem)
            .Select(e => new
            {
                e.Id,
                e.Ordem,
                e.Nome,
                e.Estado,
                e.Percentual,
                ChecklistTotal = e.Checklist.Count,
                ChecklistConcluidos = e.Checklist.Count(c => c.Concluido),
                e.DataInicio,
                e.DataFimPrevista,
                e.DataFimReal,
                e.AtrasoDias,
                ResponsavelNome = _db.Operadores.Where(o => o.OperadorId == e.ResponsavelId).Select(o => o.Nome).FirstOrDefault()
            })
            .ToListAsync(ct);

        // Contador dinâmico: tarefas vinculadas à etapa fixa (fora arquivadas).
        var contagens = await _db.Tarefas.AsNoTracking()
            .Where(t => t.ProjetoId == projetoId && !t.Arquivada && t.ProjetoEtapaId != null)
            .GroupBy(t => t.ProjetoEtapaId!.Value)
            .Select(g => new
            {
                ProjetoEtapaId = g.Key,
                Total = g.Count(),
                Concluidas = g.Count(t => t.Status == StatusTarefa.Concluida)
            })
            .ToListAsync(ct);
        var porEtapa = contagens.ToDictionary(c => c.ProjetoEtapaId);

        return etapas.Select(e => new ProjetoEtapaResumo(
            e.Ordem,
            e.Nome,
            e.Estado,
            e.Percentual,
            e.ChecklistTotal,
            e.ChecklistConcluidos,
            e.DataInicio,
            e.DataFimPrevista,
            e.DataFimReal,
            e.AtrasoDias,
            e.ResponsavelNome,
            porEtapa.TryGetValue(e.Id, out var c) ? c.Total : 0,
            porEtapa.TryGetValue(e.Id, out var cc) ? cc.Concluidas : 0,
            e.Id
        )).ToList();
    }

    public async Task SincronizarEtapasPorTarefasAsync(int projetoId, string usuario, CancellationToken ct = default)
    {
        var etapas = await _db.ProjetoEtapas
            .Where(e => e.ProjetoId == projetoId)
            .OrderBy(e => e.Ordem)
            .ToListAsync(ct);
        if (!etapas.Any()) return;

        var tarefas = await _db.Tarefas.AsNoTracking()
            .Where(t => t.ProjetoId == projetoId && !t.Arquivada && t.ProjetoEtapaId != null)
            .Select(t => new { ProjetoEtapaId = t.ProjetoEtapaId!.Value, Concluida = t.Status == StatusTarefa.Concluida })
            .ToListAsync(ct);

        var mudou = false;
        foreach (var etapa in etapas)
        {
            var daEtapa = tarefas.Where(t => t.ProjetoEtapaId == etapa.Id).ToList();
            // Sem tarefas vinculadas: fluxo manual/checklist intacto.
            if (daEtapa.Count == 0) continue;

            var concluidas = daEtapa.Count(t => t.Concluida);
            var percentual = (int)Math.Round(concluidas * 100.0 / daEtapa.Count);

            if (etapa.Estado == "Concluida")
            {
                // Congela em 100%; nunca reabre sozinho (retorno é manual).
                if (etapa.Percentual != 100) { etapa.Percentual = 100; mudou = true; }
                continue;
            }

            if (etapa.Percentual != percentual) { etapa.Percentual = percentual; mudou = true; }
            if (etapa.Estado == "Pendente" && percentual > 0)
            {
                etapa.Estado = "EmAndamento";
                etapa.DataInicio ??= DateTime.Now;
                mudou = true;
            }

            // 5/5 (ou N/N): conclui sozinha e libera a próxima.
            if (concluidas == daEtapa.Count)
            {
                var antes = etapa.Estado;
                etapa.Estado = "Concluida";
                etapa.DataFimReal ??= DateTime.Now;
                etapa.UsuarioAlteracao = usuario;
                etapa.DataAlteracao = DateTime.Now;
                etapa.Historico.Add(new ProjetoEtapaHistorico
                {
                    Acao = "Conclusão automática por tarefas",
                    Detalhes = $"Estado: {antes} → Concluida | {concluidas}/{daEtapa.Count} tarefas concluídas",
                    Usuario = usuario,
                    Data = DateTime.Now
                });
                mudou = true;
                await DesbloquearProximaEtapaAsync(projetoId, etapa.Ordem, usuario, ct);
            }
        }

        if (mudou) await _db.SaveChangesAsync(ct);
        await RecalcularProgressoProjetoAsync(projetoId, ct);
    }

    public async Task<ProjetoEtapaDetalhe?> ObterEtapaDetalheAsync(int projetoId, int ordem, CancellationToken ct = default)
    {
        var etapa = await _db.ProjetoEtapas
            .AsNoTracking()
            .Where(e => e.ProjetoId == projetoId && e.Ordem == ordem)
            .Select(e => new ProjetoEtapaDetalhe(
                e.Ordem,
                e.Nome,
                e.Estado,
                e.Percentual,
                e.Checklist.OrderBy(c => c.Ordem).Select(c => new ProjetoEtapaChecklistItem(
                    c.Id,
                    c.Descricao,
                    c.Concluido,
                    c.DataConclusao,
                    c.UsuarioConclusao
                )).ToList(),
                e.Documentos.Select(d => new ProjetoEtapaDocumentoItem(
                    d.Id,
                    d.Nome,
                    d.Url,
                    d.Descricao,
                    d.DataInclusao,
                    d.UsuarioInclusao
                )).ToList(),
                e.Historico.OrderByDescending(h => h.Data).Select(h => new ProjetoEtapaHistoricoItem(
                    h.Id,
                    h.Acao,
                    h.Detalhes,
                    h.Usuario,
                    h.Data
                )).ToList(),
                e.Comentarios.OrderBy(c => c.Data).Select(c => new ProjetoEtapaComentarioItem(
                    c.Id,
                    c.Texto,
                    c.Usuario,
                    c.Data
                )).ToList(),
                e.DataInicio,
                e.DataFimPrevista,
                e.DataFimReal,
                e.AtrasoDias,
                e.ResponsavelId,
                _db.Operadores.Where(o => o.OperadorId == e.ResponsavelId).Select(o => o.Nome).FirstOrDefault()
            ))
            .FirstOrDefaultAsync(ct);

        return etapa;
    }

    public async Task<ProjetoEtapaDetalhe> AtualizarEtapaAsync(int projetoId, int ordem, ProjetoEtapaAtualizarRequest req, string usuario, CancellationToken ct = default)
    {
        var etapa = await _db.ProjetoEtapas
            .Include(e => e.Checklist)
            .FirstOrDefaultAsync(e => e.ProjetoId == projetoId && e.Ordem == ordem, ct);

        if (etapa == null)
            throw new ArgumentException("Etapa não encontrada");

        var antes = new { etapa.Estado, etapa.Percentual, etapa.DataFimReal, etapa.ResponsavelId };

        // Atualizar checklist
        if (req.Checklist != null)
        {
            foreach (var itemReq in req.Checklist)
            {
                if (itemReq.Id.HasValue)
                {
                    var item = etapa.Checklist.FirstOrDefault(c => c.Id == itemReq.Id.Value);
                    if (item != null)
                    {
                        var eraConcluido = item.Concluido;
                        item.Concluido = itemReq.Concluido;
                        item.Descricao = itemReq.Descricao;
                        item.UsuarioAlteracao = usuario;
                        item.DataAlteracao = DateTime.Now;

                        if (!eraConcluido && itemReq.Concluido)
                        {
                            item.DataConclusao = DateTime.Now;
                            item.UsuarioConclusao = usuario;
                        }
                        else if (eraConcluido && !itemReq.Concluido)
                        {
                            item.DataConclusao = null;
                            item.UsuarioConclusao = null;
                        }
                    }
                }
                else
                {
                    // Novo item
                    etapa.Checklist.Add(new ProjetoEtapaChecklist
                    {
                        Descricao = itemReq.Descricao,
                        Concluido = itemReq.Concluido,
                        DataConclusao = itemReq.Concluido ? DateTime.Now : null,
                        UsuarioConclusao = itemReq.Concluido ? usuario : null,
                        Ordem = etapa.Checklist.Count,
                        UsuarioInclusao = usuario,
                        DataInclusao = DateTime.Now
                    });
                }
            }
        }

        // Calcular percentual baseado no checklist
        var totalChecklist = etapa.Checklist.Count;
        var concluidosChecklist = etapa.Checklist.Count(c => c.Concluido);
        var novoPercentual = totalChecklist > 0 ? (int)Math.Round((double)concluidosChecklist * 100.0 / totalChecklist) : req.Percentual;

        // Determinar estado
        string novoEstado;
        if (totalChecklist > 0 && concluidosChecklist == totalChecklist)
            novoEstado = "Concluida";
        else if (novoPercentual > 0 || concluidosChecklist > 0)
            novoEstado = "EmAndamento";
        else
            novoEstado = "Pendente";

        // Se usuário passou estado explícito, usar esse (exceto se for para Concluida sem 100%)
        if (!string.IsNullOrWhiteSpace(req.Estado))
        {
            if (req.Estado == "Concluida" && novoPercentual < 100)
                throw new ArgumentException("Não é possível marcar como Concluída sem 100% do checklist");
            novoEstado = req.Estado;
        }

        etapa.Percentual = novoPercentual;
        etapa.Estado = novoEstado;

        if (req.DataFimReal.HasValue)
            etapa.DataFimReal = req.DataFimReal.Value;
        else if (novoEstado == "Concluida" && !etapa.DataFimReal.HasValue)
            etapa.DataFimReal = DateTime.Now;

        if (!string.IsNullOrWhiteSpace(req.ResponsavelId))
            etapa.ResponsavelId = req.ResponsavelId;

        // Calcular atraso
        if (etapa.DataFimPrevista.HasValue)
        {
            var referencia = etapa.DataFimReal ?? DateTime.Now;
            var diasAtraso = (int)(referencia - etapa.DataFimPrevista.Value).TotalDays;
            etapa.AtrasoDias = Math.Max(0, diasAtraso);
        }

        if (!etapa.DataInicio.HasValue && novoPercentual > 0)
            etapa.DataInicio = DateTime.Now;

        etapa.UsuarioAlteracao = usuario;
        etapa.DataAlteracao = DateTime.Now;

        // Registrar histórico
        if (antes.Estado != novoEstado || antes.Percentual != novoPercentual)
        {
            etapa.Historico.Add(new ProjetoEtapaHistorico
            {
                Acao = "Atualização de etapa",
                Detalhes = $"Estado: {antes.Estado} → {novoEstado} | %: {antes.Percentual} → {novoPercentual}",
                Usuario = usuario,
                Data = DateTime.Now
            });
        }

        if (!string.IsNullOrWhiteSpace(req.Estado) && antes.Estado != req.Estado)
        {
            etapa.Historico.Add(new ProjetoEtapaHistorico
            {
                Acao = "Mudança de estado",
                Detalhes = $"{antes.Estado} → {req.Estado}",
                Usuario = usuario,
                Data = DateTime.Now
            });
        }

        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("ProjetoEtapa", etapa.Id, "UPDATE", antes, new { etapa.Estado, etapa.Percentual, etapa.DataFimReal }, usuario, "Etapa atualizada", ct);

        // Desbloquear próxima etapa se esta foi concluída
        if (novoEstado == "Concluida" && antes.Estado != "Concluida")
        {
            await DesbloquearProximaEtapaAsync(projetoId, ordem, usuario, ct);
        }

        // Recalcular progresso do projeto
        await RecalcularProgressoProjetoAsync(etapa.ProjetoId, ct);

        return (await ObterEtapaDetalheAsync(projetoId, ordem, ct))!;
    }

    public async Task<ProjetoEtapaDetalhe> RetornarEtapaAsync(int projetoId, ProjetoEtapaRetornoRequest req, CancellationToken ct = default)
    {
        if (req.OrdemAlvo < 1 || req.OrdemAlvo >= 9)
            throw new ArgumentException("Ordem alvo deve ser entre 1 e 8");

        var etapas = await _db.ProjetoEtapas
            .Where(e => e.ProjetoId == projetoId)
            .OrderBy(e => e.Ordem)
            .ToListAsync(ct);

        var etapaAtual = etapas.FirstOrDefault(e => e.Estado == "EmAndamento" || e.Estado == "Concluida");
        if (etapaAtual == null || etapaAtual.Ordem <= req.OrdemAlvo)
            throw new ArgumentException("Não é possível retornar para uma etapa igual ou posterior à atual");

        var etapasParaResetar = etapas.Where(e => e.Ordem > req.OrdemAlvo).ToList();
        
        foreach (var e in etapasParaResetar)
        {
            var antes = new { e.Estado, e.Percentual, e.DataFimReal };
            e.Estado = "Pendente";
            e.Percentual = 0;
            e.DataFimReal = null;
            e.DataInicio = null;
            e.AtrasoDias = 0;
            e.UsuarioAlteracao = req.UsuarioAlteracao;
            e.DataAlteracao = DateTime.Now;

            e.Historico.Add(new ProjetoEtapaHistorico
            {
                Acao = "Reset por retorno de etapa",
                Detalhes = $"Estado: {antes.Estado} → Pendente | %: {antes.Percentual} → 0",
                Usuario = req.UsuarioAlteracao,
                Data = DateTime.Now
            });
        }

        // Atualizar etapa alvo para EmAndamento (mantendo checklist)
        var etapaAlvo = etapas.First(e => e.Ordem == req.OrdemAlvo);
        etapaAlvo.Estado = "EmAndamento";
        etapaAlvo.DataFimReal = null;
        etapaAlvo.UsuarioAlteracao = req.UsuarioAlteracao;
        etapaAlvo.DataAlteracao = DateTime.Now;

        etapaAlvo.Historico.Add(new ProjetoEtapaHistorico
        {
            Acao = "Retorno de etapa",
            Detalhes = $"Projeto retornou para esta etapa. Motivo: {req.Motivo}",
            Usuario = req.UsuarioAlteracao,
            Data = DateTime.Now
        });

        await _db.SaveChangesAsync(ct);
        await _auditoria.RegistrarAsync("Projeto", projetoId, "RETORNO_ETAPA", null, new { OrdemAlvo = req.OrdemAlvo, Motivo = req.Motivo }, req.UsuarioAlteracao, $"Retorno para etapa {req.OrdemAlvo}", ct);

        // Recalcular progresso do projeto
        await RecalcularProgressoProjetoAsync(projetoId, ct);

        return (await ObterEtapaDetalheAsync(projetoId, req.OrdemAlvo, ct))!;
    }

    public async Task InicializarEtapasPadraoAsync(int projetoId, CancellationToken ct = default)
    {
        var existe = await _db.ProjetoEtapas.AnyAsync(e => e.ProjetoId == projetoId, ct);
        if (existe) return;

        var projeto = await _db.Projetos.FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto == null) throw new ArgumentException("Projeto não encontrado");

        var etapas = new List<ProjetoEtapa>();
        
        for (int i = 0; i < 9; i++)
        {
            var etapa = new ProjetoEtapa
            {
                ProjetoId = projetoId,
                Ordem = i + 1,
                Nome = NomesEtapasPadrao[i],
                Estado = i == 0 ? "EmAndamento" : "Pendente",
                Percentual = 0,
                UsuarioInclusao = projeto.CriadorId,
                DataInclusao = DateTime.Now
            };

            // Adicionar checklist padrão
            for (int j = 0; j < ChecklistsPadrao[i].Length; j++)
            {
                etapa.Checklist.Add(new ProjetoEtapaChecklist
                {
                    Descricao = ChecklistsPadrao[i][j],
                    Concluido = false,
                    Ordem = j,
                    UsuarioInclusao = projeto.CriadorId,
                    DataInclusao = DateTime.Now
                });
            }

            // Primeira etapa começa com DataInicio = hoje
            if (i == 0)
            {
                etapa.DataInicio = DateTime.Now;
                etapa.Estado = "EmAndamento";
            }

            etapas.Add(etapa);
        }

        _db.ProjetoEtapas.AddRange(etapas);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ProjetoEtapaDetalhe> AdicionarChecklistItemAsync(int projetoId, int ordem, ProjetoEtapaChecklistItemRequest item, string usuario, CancellationToken ct = default)
    {
        var etapa = await _db.ProjetoEtapas
            .Include(e => e.Checklist)
            .FirstOrDefaultAsync(e => e.ProjetoId == projetoId && e.Ordem == ordem, ct);

        if (etapa == null) throw new ArgumentException("Etapa não encontrada");

        etapa.Checklist.Add(new ProjetoEtapaChecklist
        {
            Descricao = item.Descricao,
            Concluido = item.Concluido,
            DataConclusao = item.Concluido ? DateTime.Now : null,
            UsuarioConclusao = item.Concluido ? usuario : null,
            Ordem = etapa.Checklist.Count,
            UsuarioInclusao = usuario,
            DataInclusao = DateTime.Now
        });

        await _db.SaveChangesAsync(ct);
        return (await ObterEtapaDetalheAsync(projetoId, ordem, ct))!;
    }

    public async Task<ProjetoEtapaDetalhe> AdicionarDocumentoAsync(int projetoId, int ordem, ProjetoEtapaDocumentoRequest req, string usuario, CancellationToken ct = default)
    {
        var etapa = await _db.ProjetoEtapas.FirstOrDefaultAsync(e => e.ProjetoId == projetoId && e.Ordem == ordem, ct);
        if (etapa == null) throw new ArgumentException("Etapa não encontrada");

        etapa.Documentos.Add(new ProjetoEtapaDocumento
        {
            Nome = req.Nome,
            Url = req.Url,
            Descricao = req.Descricao,
            UsuarioInclusao = usuario,
            DataInclusao = DateTime.Now
        });

        etapa.Historico.Add(new ProjetoEtapaHistorico
        {
            Acao = "Documento adicionado",
            Detalhes = req.Nome,
            Usuario = usuario,
            Data = DateTime.Now
        });

        await _db.SaveChangesAsync(ct);
        return (await ObterEtapaDetalheAsync(projetoId, ordem, ct))!;
    }

    public async Task<ProjetoEtapaDetalhe> AdicionarComentarioAsync(int projetoId, int ordem, ProjetoEtapaComentarioRequest req, string usuario, CancellationToken ct = default)
    {
        var etapa = await _db.ProjetoEtapas.FirstOrDefaultAsync(e => e.ProjetoId == projetoId && e.Ordem == ordem, ct);
        if (etapa == null) throw new ArgumentException("Etapa não encontrada");

        etapa.Comentarios.Add(new ProjetoEtapaComentario
        {
            Texto = req.Texto,
            Usuario = usuario,
            Data = DateTime.Now
        });

        await _db.SaveChangesAsync(ct);
        return (await ObterEtapaDetalheAsync(projetoId, ordem, ct))!;
    }

    private async Task DesbloquearProximaEtapaAsync(int projetoId, int ordemAtual, string usuario, CancellationToken ct)
    {
        var proxima = await _db.ProjetoEtapas
            .FirstOrDefaultAsync(e => e.ProjetoId == projetoId && e.Ordem == ordemAtual + 1, ct);

        if (proxima != null && proxima.Estado == "Pendente")
        {
            proxima.Estado = "EmAndamento";
            proxima.DataInicio = DateTime.Now;
            proxima.UsuarioAlteracao = usuario;
            proxima.DataAlteracao = DateTime.Now;

            proxima.Historico.Add(new ProjetoEtapaHistorico
            {
                Acao = "Etapa desbloqueada automaticamente",
                Detalhes = $"Etapa anterior ({ordemAtual}) concluída",
                Usuario = usuario,
                Data = DateTime.Now
            });

            await _db.SaveChangesAsync(ct);
        }
    }

    public async Task<int> RecalcularProgressoProjetoAsync(int projetoId, CancellationToken ct = default)
    {
        var etapas = await _db.ProjetoEtapas
            .Where(e => e.ProjetoId == projetoId)
            .OrderBy(e => e.Ordem)
            .ToListAsync(ct);

        if (!etapas.Any()) return 0;

        // Fórmula: (etapas concluídas * 100 + etapa atual %) / 9
        var concluidas = etapas.Count(e => e.Estado == "Concluida");
        var emAndamento = etapas.FirstOrDefault(e => e.Estado == "EmAndamento");
        var percentualAtual = emAndamento?.Percentual ?? 0;

        var progresso = (int)Math.Round((concluidas * 100.0 + percentualAtual) / 9.0);

        var projeto = await _db.Projetos.FirstOrDefaultAsync(p => p.Id == projetoId, ct);
        if (projeto != null && projeto.Progresso != progresso)
        {
            projeto.Progresso = progresso;
            projeto.DataAlteracao = DateTime.Now;
            await _db.SaveChangesAsync(ct);
        }

        return progresso;
    }
}