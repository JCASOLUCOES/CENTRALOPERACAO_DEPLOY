using Asp.Versioning;
using Central_BackEnd.Data;
using Central_BackEnd.Models.Implantacao;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Central_BackEnd.Controllers.Implantacao;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/implantacao/admin")]
[Authorize]
public class AdminSeedController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminSeedController(AppDbContext db) { _db = db; }

    public record SeedResult(
        bool Executado,
        string Mensagem,
        int Equipes, int Colunas, int TiposProjeto, int Etapas,
        int Clientes, int Projetos, int Tarefas, int Comentarios);

    [HttpPost("seed-exemplo")]
    public async Task<ActionResult<SeedResult>> SeedExemplo(CancellationToken ct = default)
    {
        // 1. Equipes
        int eqCount = 0;
        if (!await _db.Equipes.AnyAsync(e => e.Nome == "IMPLANTACAO", ct))
        {
            _db.Equipes.Add(new Equipe { Nome = "IMPLANTACAO", Descricao = "Equipe responsavel por implantacoes em clientes", PrefixoCodigo = "IMP", Ativa = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
            eqCount++;
        }
        if (!await _db.Equipes.AnyAsync(e => e.Nome == "CIAA", ct))
        {
            _db.Equipes.Add(new Equipe { Nome = "CIAA", Descricao = "Centro de Inovacao, Automacao e IA", PrefixoCodigo = "CIAA", Ativa = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
            eqCount++;
        }
        await _db.SaveChangesAsync(ct);

        // 2. Colunas Kanban
        int colCount = 0;
        var nomesColunas = new[] { "BACKLOG", "A FAZER", "EM ANDAMENTO", "HOMOLOGACAO", "CONCLUIDO" };
        var coresColunas = new[] { "#94a3b8", "#60a5fa", "#fbbf24", "#a78bfa", "#34d399" };
        for (int i = 0; i < nomesColunas.Length; i++)
        {
            if (!await _db.ColunasKanban.AnyAsync(x => x.Nome == nomesColunas[i], ct))
            {
                _db.ColunasKanban.Add(new ColunaKanban { Nome = nomesColunas[i], Ordem = i + 1, Cor = coresColunas[i], Padrao = true, Ativa = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
                colCount++;
            }
        }
        await _db.SaveChangesAsync(ct);

        // 3. Tipos de Projeto
        int tipoCount = 0;
        var eqImpl = await _db.Equipes.FirstAsync(e => e.Nome == "IMPLANTACAO", ct);
        var eqCiaa = await _db.Equipes.FirstAsync(e => e.Nome == "CIAA", ct);
        var tiposData = new (string Codigo, string Nome, int EquipeId, bool ClienteObrigatorio, int Ordem)[] {
            ("CLIENTE",      "Cliente",     eqImpl.Id, true,  1),
            ("CARTEIRA",     "Carteira",    eqImpl.Id, true,  2),
            ("INTEGRACAO",   "Integracao",  eqImpl.Id, true,  3),
            ("PROJETO_CIAA", "Projeto CIAA", eqCiaa.Id, false, 1)
        };
        foreach (var t in tiposData)
        {
            if (!await _db.TiposProjeto.AnyAsync(x => x.Codigo == t.Codigo, ct))
            {
                _db.TiposProjeto.Add(new TipoProjeto { Codigo = t.Codigo, Nome = t.Nome, EquipeId = t.EquipeId, ClienteObrigatorio = t.ClienteObrigatorio, Ordem = t.Ordem, Ativo = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
                tipoCount++;
            }
        }
        await _db.SaveChangesAsync(ct);

        // 4. Etapas
        int etapaCount = 0;
        var tipoCliente = await _db.TiposProjeto.FirstAsync(t => t.Codigo == "CLIENTE", ct);
        var tipoCiaa = await _db.TiposProjeto.FirstAsync(t => t.Codigo == "PROJETO_CIAA", ct);
        var etapasData = new (string Nome, int Ordem, int TipoId, string Cor)[] {
            ("KICKOFF",         1, tipoCliente.Id, "#0f4c81"),
            ("PARAMETRIZACAO",  2, tipoCliente.Id, "#2563eb"),
            ("TREINAMENTO",     3, tipoCliente.Id, "#0ea5e9"),
            ("HOMOLOGACAO",     4, tipoCliente.Id, "#7c3aed"),
            ("GO LIVE",         5, tipoCliente.Id, "#16a34a"),
            ("ACEITE",          6, tipoCliente.Id, "#15803d"),
            ("LEVANTAMENTO",    1, tipoCiaa.Id,   "#7c3aed"),
            ("DESENHO",         2, tipoCiaa.Id,   "#a855f7"),
            ("DESENVOLVIMENTO", 3, tipoCiaa.Id,   "#d97706"),
            ("TESTES",          4, tipoCiaa.Id,   "#0891b2"),
            ("HOMOLOGACAO_CIAA",5, tipoCiaa.Id,   "#7c3aed"),
            ("PUBLICACAO",      6, tipoCiaa.Id,   "#16a34a"),
            ("MONITORAMENTO",   7, tipoCiaa.Id,   "#0d9488")
        };
        foreach (var e in etapasData)
        {
            if (!await _db.Etapas.AnyAsync(x => x.Nome == e.Nome, ct))
            {
                _db.Etapas.Add(new Etapa { Nome = e.Nome, Ordem = e.Ordem, TipoProjetoId = e.TipoId, Cor = e.Cor, Concluida = false, Ativa = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
                etapaCount++;
            }
        }
        await _db.SaveChangesAsync(ct);

        // 5. Clientes
        int clienteCount = 0;
        var clientesData = new (string Nome, string Cnpj, string Contato, string Observacao)[] {
            ("Tech Solutions S/A",     "12.345.678/0001-90", "contato@techsolutions.com.br", "Cliente do segmento de tecnologia. Contrato de 36 meses."),
            ("Indústria Aurora Ltda",  "98.765.432/0001-10", "implantacao@aurora.ind.br",  "Foco em módulos de cobrança. Implantação em fases."),
            ("Grupo Vértice",          "11.222.333/0001-44", "ti@vertice.com",              "Cliente novo, em fase de kickoff.")
        };
        foreach (var c in clientesData)
        {
            if (!await _db.Clientes.AnyAsync(x => x.Nome == c.Nome, ct))
            {
                _db.Clientes.Add(new Cliente { Nome = c.Nome, Cnpj = c.Cnpj, Contato = c.Contato, Observacao = c.Observacao, Ativo = true, UsuarioInclusao = "admin", DataInclusao = DateTime.Now });
                clienteCount++;
            }
        }
        await _db.SaveChangesAsync(ct);

        // 6. Projetos
        int projCount = 0;
        int tarCount = 0;
        int cmtCount = 0;

        var clienteTech = await _db.Clientes.FirstAsync(c => c.Nome == "Tech Solutions S/A", ct);
        var colBacklog = await _db.ColunasKanban.FirstAsync(c => c.Nome == "BACKLOG", ct);
        var colAFazer = await _db.ColunasKanban.FirstAsync(c => c.Nome == "A FAZER", ct);
        var colAndamento = await _db.ColunasKanban.FirstAsync(c => c.Nome == "EM ANDAMENTO", ct);
        var colHomologacao = await _db.ColunasKanban.FirstAsync(c => c.Nome == "HOMOLOGACAO", ct);
        var colConcluido = await _db.ColunasKanban.FirstAsync(c => c.Nome == "CONCLUIDO", ct);

        var eKick = await _db.Etapas.FirstAsync(e => e.Nome == "KICKOFF", ct);
        var ePar = await _db.Etapas.FirstAsync(e => e.Nome == "PARAMETRIZACAO", ct);
        var eTre = await _db.Etapas.FirstAsync(e => e.Nome == "TREINAMENTO", ct);
        var eHom = await _db.Etapas.FirstAsync(e => e.Nome == "HOMOLOGACAO", ct);
        var eGoL = await _db.Etapas.FirstAsync(e => e.Nome == "GO LIVE", ct);
        var eLev = await _db.Etapas.FirstAsync(e => e.Nome == "LEVANTAMENTO", ct);
        var eDes = await _db.Etapas.FirstAsync(e => e.Nome == "DESENHO", ct);
        var eDev = await _db.Etapas.FirstAsync(e => e.Nome == "DESENVOLVIMENTO", ct);
        var eTes = await _db.Etapas.FirstAsync(e => e.Nome == "TESTES", ct);
        var ePub = await _db.Etapas.FirstAsync(e => e.Nome == "PUBLICACAO", ct);

        // IMP-0001
        if (!await _db.Projetos.AnyAsync(p => p.Codigo == "IMP-0001", ct))
        {
            var p1 = new Projeto
            {
                Codigo = "IMP-0001", Nome = "Implantação Tech Solutions S/A",
                Descricao = "Implantação completa do Actyon no cliente Tech Solutions.\n\nFases: kickoff → parametrização → treinamento → homologação → go live.\nEscopo inclui 3 carteiras (Cobrança, Financeiro, RH) e 2 integrações bancárias.",
                EquipeId = eqImpl.Id, TipoProjetoId = tipoCliente.Id, ClienteId = clienteTech.Id,
                ResponsavelId = "admin", CriadorId = "admin",
                Status = StatusProjeto.EmAndamento, ColunaKanbanId = colAndamento.Id, Prioridade = PrioridadeProjeto.Alta, Progresso = 60,
                DataInicio = DateTime.Today.AddDays(-45), DataPrevisao = DateTime.Today.AddDays(20),
                HorasPlanejadas = 320, HorasRealizadas = 192,
                Observacao = "Cliente receptivo. Parametrização avançando bem. Próximo: agendar treinamento com a equipe financeira.",
                UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-45)
            };
            _db.Projetos.Add(p1);
            await _db.SaveChangesAsync(ct);
            projCount++;

            var tarefasImp = new (Etapa E, ColunaKanban C, int Ordem, string Titulo, string Desc, StatusTarefa S, PrioridadeTarefa P, bool Concluido, int DP, int? DC, int HE, int? HR, bool Bloq, string? Motivo, int DI)[] {
                (eKick, colConcluido,  1, "Treinar equipe fiscal", "Capacitar 4 analistas nas rotinas de cobrança, parcelamento e baixa.", StatusTarefa.Concluida, PrioridadeTarefa.Media, true, -40, -42, 4, 4, false, null, -45),
                (eKick, colConcluido,  2, "Configurar ambiente de produção", "Provisionar VM, banco de dados e certificados SSL.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -38, -36, 6, 5, false, null, -42),
                (ePar,  colConcluido,  3, "Levantar requisitos API", "Documentar endpoints de integração com o sistema legado do cliente.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -25, -23, 10, 8, false, null, -30),
                (ePar,  colConcluido,  4, "Modelar regras de negócio", "Mapear faixas de atraso, juros, descontos e distribuição por filial.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -20, -18, 12, 14, false, null, -25),
                (ePar,  colConcluido,  5, "Configurar integrações bancárias", "Homologar remessa CNAB 240 e retorno com Sicoob e Caixa.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -10, -8, 16, 14, false, null, -20),
                (ePar,  colConcluido,  6, "Importar cadastro de clientes", "Carga inicial de 2.300 clientes via planilha de migração.", StatusTarefa.Concluida, PrioridadeTarefa.Media, true, -8, -5, 8, 8, false, null, -18),
                (ePar,  colAFazer,    7, "Migrar cadastro de produtos", "Importar 580 produtos com regras de preço e tributação.", StatusTarefa.AFazer, PrioridadeTarefa.Media, false, 5, null, 8, null, false, null, -10),
                (ePar,  colAFazer,    8, "Configurar filiais e usuários", "Criar 12 filiais com perfil de acesso por cargo.", StatusTarefa.AFazer, PrioridadeTarefa.Media, false, 8, null, 10, null, false, null, -8),
                (ePar,  colAFazer,    9, "Documentar procedimentos", "Criar manual de operação para o time do cliente.", StatusTarefa.AFazer, PrioridadeTarefa.Baixa, false, 12, null, 8, null, false, null, -5),
                (eTre,  colAndamento, 10, "Agendar treinamento presencial", "2 turmas de 4h, sala no cliente confirmada para semana que vem.", StatusTarefa.EmAndamento, PrioridadeTarefa.Alta, false, -1, null, 16, 8, false, null, -3),
                (eTre,  colAndamento, 11, "Preparar material de treinamento", "Slides, exercícios práticos e avaliação de conhecimento.", StatusTarefa.EmAndamento, PrioridadeTarefa.Media, false, 0, null, 10, 6, false, null, -3),
                (eHom,  colHomologacao, 12, "Homologar migração de dados", "Validar 100% dos títulos importados em ambiente de homologação.", StatusTarefa.EmHomologacao, PrioridadeTarefa.Urgente, false, 15, null, 20, 12, false, null, -2),
                (eHom,  colHomologacao, 13, "Validar integração bancária", "Rodar 50 títulos do início ao fim com cliente acompanhando.", StatusTarefa.EmHomologacao, PrioridadeTarefa.Urgente, false, 20, null, 15, 8, false, null, -2),
                (eGoL,  colConcluido, 14, "Setup ambiente produção", "Provisionar ambiente final e configurar backup automatizado.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, 10, 12, 6, 6, false, null, -5)
            };
            var ids = new List<int>();
            foreach (var t in tarefasImp)
            {
                var trf = new Tarefa
                {
                    ProjetoId = p1.Id, EtapaId = t.E.Id, ColunaKanbanId = t.C.Id,
                    Titulo = t.Titulo, Descricao = t.Desc,
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = t.S, Prioridade = t.P, Ordem = t.Ordem,
                    DataPrevisao = DateTime.Today.AddDays(t.DP),
                    DataConclusao = t.DC.HasValue ? DateTime.Today.AddDays(t.DC.Value) : null,
                    HorasEstimadas = t.HE, HorasRealizadas = t.HR,
                    Bloqueada = t.Bloq, MotivoBloqueio = t.Motivo,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(t.DI)
                };
                _db.Tarefas.Add(trf);
                await _db.SaveChangesAsync(ct);
                ids.Add(trf.Id);
                tarCount++;
            }
            _db.ComentariosTarefa.AddRange(
                new ComentarioTarefa { TarefaId = ids[0], AutorId = "admin", Texto = "Cliente aprovou cronograma. Stakeholders definidos: CFO (patrocinador), Controller (gestor), 2 analistas (operadores).", DataInclusao = DateTime.Today.AddDays(-42) },
                new ComentarioTarefa { TarefaId = ids[3], AutorId = "admin", Texto = "Sicoob enviou layout do CNAB 240 em 02/09. Iniciando homologação do arquivo de remessa. Retorno ainda pendente — aberto chamado #4521 com o banco.", DataInclusao = DateTime.Today.AddDays(-1) }
            );
            await _db.SaveChangesAsync(ct);
            cmtCount += 2;
        }

        // CIAA-0001
        if (!await _db.Projetos.AnyAsync(p => p.Codigo == "CIAA-0001", ct))
        {
            var p2 = new Projeto
            {
                Codigo = "CIAA-0001", Nome = "Agente IA — Classificação de Chamados",
                Descricao = "Projeto de automação com IA para classificar e rotear chamados automaticamente.\n\nObjetivo: reduzir tempo de triagem em 60% e melhorar a assertividade do primeiro atendimento.\nStack: n8n + API Actyon + prompt engineering + integração com sistema de tickets.",
                EquipeId = eqCiaa.Id, TipoProjetoId = tipoCiaa.Id, ClienteId = null,
                ResponsavelId = "admin", CriadorId = "admin",
                Status = StatusProjeto.EmAndamento, ColunaKanbanId = colAndamento.Id, Prioridade = PrioridadeProjeto.Alta, Progresso = 35,
                DataInicio = DateTime.Today.AddDays(-30), DataPrevisao = DateTime.Today.AddDays(45),
                HorasPlanejadas = 200, HorasRealizadas = 70,
                Observacao = "MVP em validação. Prompt principal com acurácia de 78% em testes.",
                UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(-30)
            };
            _db.Projetos.Add(p2);
            await _db.SaveChangesAsync(ct);
            projCount++;

            var tarefasCiaa = new (Etapa E, ColunaKanban C, int Ordem, string Titulo, string Desc, StatusTarefa S, PrioridadeTarefa P, bool Concluido, int DP, int? DC, int HE, int? HR, bool Bloq, string? Motivo, int DI)[] {
                (eLev, colConcluido,  1, "Mapear categorias de chamados dos últimos 6 meses", "Amostra de 2.000 chamados para identificar padrões de classificação.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -25, -23, 16, 14, false, null, -30),
                (eDes, colConcluido,  2, "Definir arquitetura do agente (n8n + LLM)", "Fluxo: webhook → LLM → classificação → router → ticket. Latência alvo: 3s.", StatusTarefa.Concluida, PrioridadeTarefa.Alta, true, -20, -18, 12, 14, false, null, -25),
                (eDev, colAndamento, 3, "Implementar fluxo principal no n8n", "Webhook + LLM + tratamento de erros + retry. Logs estruturados.", StatusTarefa.EmAndamento, PrioridadeTarefa.Alta, false, -5, null, 40, 30, false, null, -20),
                (eDev, colAFazer,    4, "Construir prompt com few-shot examples", "Iterar prompt principal até atingir acurácia >85% em validação.", StatusTarefa.AFazer, PrioridadeTarefa.Alta, false, 5, null, 20, null, false, null, -15),
                (eTes, colAFazer,    5, "Rodar suite de 200 chamados históricos", "Comparar classificação do agente vs classificação humana (ground truth).", StatusTarefa.AFazer, PrioridadeTarefa.Media, false, 20, null, 16, null, false, null, -10),
                (ePub, colBacklog,   6, "Publicar agente em produção", "Deploy com feature flag. Monitorar 1 semana antes de expandir.", StatusTarefa.AFazer, PrioridadeTarefa.Media, false, 40, null, 8, null, false, null, -5)
            };
            var ids = new List<int>();
            foreach (var t in tarefasCiaa)
            {
                var trf = new Tarefa
                {
                    ProjetoId = p2.Id, EtapaId = t.E.Id, ColunaKanbanId = t.C.Id,
                    Titulo = t.Titulo, Descricao = t.Desc,
                    ResponsavelId = "admin", CriadorId = "admin",
                    Status = t.S, Prioridade = t.P, Ordem = t.Ordem,
                    DataPrevisao = DateTime.Today.AddDays(t.DP),
                    DataConclusao = t.DC.HasValue ? DateTime.Today.AddDays(t.DC.Value) : null,
                    HorasEstimadas = t.HE, HorasRealizadas = t.HR,
                    Bloqueada = t.Bloq, MotivoBloqueio = t.Motivo,
                    UsuarioInclusao = "admin", DataInclusao = DateTime.Today.AddDays(t.DI)
                };
                _db.Tarefas.Add(trf);
                await _db.SaveChangesAsync(ct);
                ids.Add(trf.Id);
                tarCount++;
            }
            _db.ComentariosTarefa.Add(new ComentarioTarefa
            {
                TarefaId = ids[2], AutorId = "admin",
                Texto = "Acurácia subiu de 62% → 78% depois do ajuste no few-shot. Próximo passo: incluir mais exemplos negativos (chamados ambíguos).",
                DataInclusao = DateTime.Today.AddDays(-2)
            });
            await _db.SaveChangesAsync(ct);
            cmtCount++;
        }

        var executou = (eqCount + colCount + tipoCount + etapaCount + clienteCount + projCount + tarCount + cmtCount) > 0;
        return Ok(new SeedResult(
            executou,
            executou ? "Seed aplicado com sucesso" : "Banco ja populado (nada a fazer)",
            eqCount, colCount, tipoCount, etapaCount, clienteCount, projCount, tarCount, cmtCount));
    }
}
