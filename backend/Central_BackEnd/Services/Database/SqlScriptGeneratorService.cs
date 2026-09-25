using System.Text;
using System.Text.RegularExpressions;
using Central_BackEnd.Dtos.Database;
using Microsoft.Data.SqlClient;

namespace Central_BackEnd.Services.Database;

/// <summary>
/// Gera scripts SQL de correcao a partir da comparacao de schemas.
/// DIRECAO: o ARQUIVO e o alvo - o banco JCA e ajustado para ficar igual ao arquivo.
/// O que existe apenas no banco vira script comentado (nunca executado automaticamente).
/// NUNCA executa nada no banco; apenas monta, classifica o risco e valida estaticamente.
/// </summary>
public interface ISqlScriptGeneratorService
{
    /// <summary>Geracao no modo tabela unica.</summary>
    SqlScriptResultDto GerarScripts(SchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null);

    /// <summary>Geracao no modo banco inteiro (bulk).</summary>
    SqlScriptResultDto GerarScriptsBulk(BulkSchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null);

    /// <summary>Validacao estatica de um script: nada e executado no SQL Server.</summary>
    Task<ValidarScriptResultDto> ValidarScriptAsync(string? sql, CancellationToken ct = default);
}

public class SqlScriptGeneratorService : ISqlScriptGeneratorService
{
    private readonly IDatabaseConnectionService _conn;
    private readonly ILogger<SqlScriptGeneratorService> _logger;

    public SqlScriptGeneratorService(
        IDatabaseConnectionService conn,
        ILogger<SqlScriptGeneratorService> logger)
    {
        _conn = conn;
        _logger = logger;
    }

    // =====================================================================
    // Geracao
    // =====================================================================

    public SqlScriptResultDto GerarScripts(SchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null)
    {
        if (resultado == null)
            throw new ArgumentException("Resultado da comparacao e obrigatorio.");
        if (string.IsNullOrWhiteSpace(resultado.Tabela))
            throw new ArgumentException("Tabela do resultado da comparacao e obrigatoria.");

        var acc = new Acc(opcoes);
        ProcessarTabela(acc, resultado.Tabela, resultado.Diferencas,
            resultado.SchemaArquivo, resultado.SchemaJca);
        return Finalizar(acc);
    }

    public SqlScriptResultDto GerarScriptsBulk(BulkSchemaComparisonResultDto resultado, ScriptsGenOpcoesDto? opcoes = null)
    {
        if (resultado == null)
            throw new ArgumentException("Resultado da comparacao e obrigatorio.");
        if (resultado.Tabelas == null || resultado.Tabelas.Count == 0)
            throw new ArgumentException("Resultado da comparacao nao contem tabelas para gerar scripts.");

        var acc = new Acc(opcoes);
        foreach (var t in resultado.Tabelas)
        {
            switch (t.Status)
            {
                case "SomenteArquivo":
                    GerarCriacaoTabela(acc, t.Tabela, t.SchemaArquivo);
                    break;
                case "Diferencas":
                    ProcessarTabela(acc, t.Tabela, t.Diferencas, t.SchemaArquivo, t.SchemaJca);
                    break;
                case "SomenteBanco":
                    GerarExclusaoTabela(acc, t.Tabela);
                    break;
            }
        }
        return Finalizar(acc);
    }

    // =====================================================================
    // Processamento de uma tabela com diferencas
    // =====================================================================

    private void ProcessarTabela(Acc a, string tabela, List<SchemaDifferenceDto>? difs,
        SchemaInfoDto? arquivo, SchemaInfoDto? jca)
    {
        difs ??= new List<SchemaDifferenceDto>();

        var uteis = difs
            .Where(d => d.Severidade != "Ok" && !EhDuplicada(d))
            .ToList();

        // Sem o schema do arquivo nao da para montar criacoes/alteracoes com seguranca.
        if (arquivo == null || arquivo.Colunas.Count == 0)
        {
            foreach (var d in uteis)
                if (d.Categoria == "Coluna" && d.Esperado != null && d.Encontrado == null)
                    GerarDropColuna(a, tabela, d.Campo);

            if (uteis.Any(d => d.Categoria != "Coluna"))
                a.RevisaoManual.Add(
                    $"'{tabela}': resultado sem o schema do arquivo; refaca a comparacao " +
                    "para gerar criacoes, alteracoes de tipo, indices e FKs.");
            return;
        }

        var arqPorNome = PorNome(arquivo.Colunas, c => c.Nome);
        var jcaPorNome = jca != null ? PorNome(jca.Colunas, c => c.Nome) : null;

        // 1) ADD COLUMN: coluna no arquivo ausente no banco JCA
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var col in arquivo.Colunas)
        {
            if (!vistos.Add(col.Nome)) continue; // coluna duplicada no arquivo: usa so a primeira
            bool existeNoBanco = jcaPorNome != null
                ? jcaPorNome.ContainsKey(col.Nome)
                : difs.Any(d => d.Categoria == "Coluna"
                    && d.Campo.Equals(col.Nome, StringComparison.OrdinalIgnoreCase)
                    && d.Esperado != null);
            if (!existeNoBanco)
                GerarAddColuna(a, tabela, col);
        }

        // 2) DROP COLUMN: coluna so no banco (existe no JCA, nao no arquivo)
        foreach (var d in uteis)
            if (d.Categoria == "Coluna" && d.Esperado != null && d.Encontrado == null)
                GerarDropColuna(a, tabela, d.Campo);

        // 3) ALTER COLUMN / ALTER TYPE: tipos e nullability divergentes
        var alvos = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
        foreach (var d in uteis)
        {
            if (d.Categoria != "Tipo" && d.Categoria != "Nullable") continue;
            if (jcaPorNome != null && !jcaPorNome.ContainsKey(d.Campo)) continue;
            alvos.TryGetValue(d.Campo, out bool tinhaTipo);
            alvos[d.Campo] = tinhaTipo || d.Categoria == "Tipo";
        }
        foreach (var par in alvos)
        {
            var campo = par.Key;
            var mudouTipo = par.Value;
            if (!arqPorNome.TryGetValue(campo, out var alvo))
            {
                a.RevisaoManual.Add(
                    $"'{tabela}': diferenca de tipo/nullable na coluna '{campo}' " +
                    "sem definicao correspondente no arquivo.");
                continue;
            }
            SchemaColumnInfoDto? atual = null;
            jcaPorNome?.TryGetValue(campo, out atual);
            var difTipo = uteis.FirstOrDefault(d =>
                d.Categoria == "Tipo" && d.Campo.Equals(campo, StringComparison.OrdinalIgnoreCase));
            GerarAlterColuna(a, tabela, alvo, atual, mudouTipo, difTipo);
        }

        // 4) Indices (so ha diferencas de indice quando o arquivo traz indices)
        if (arquivo.Indices.Count > 0)
        {
            foreach (var d in uteis.Where(x => x.Categoria == "Indice"))
            {
                var alvoIdx = arquivo.Indices.FirstOrDefault(i =>
                    i.Nome.Equals(d.Campo, StringComparison.OrdinalIgnoreCase));
                if (d.Esperado != null && d.Encontrado == null)
                    GerarIndice(a, tabela, d.Campo, IndiceModo.Remover, null);
                else if (d.Esperado == null && d.Encontrado != null)
                {
                    if (alvoIdx != null) GerarIndice(a, tabela, d.Campo, IndiceModo.Novo, alvoIdx);
                }
                else if (alvoIdx != null)
                {
                    GerarIndice(a, tabela, d.Campo, IndiceModo.Divergente, alvoIdx);
                }
            }
        }

        // 5) Foreign keys (so ha diferencas de FK quando o arquivo traz fks)
        if (arquivo.Fks.Count > 0)
        {
            foreach (var d in uteis.Where(x => x.Categoria == "Fk"))
            {
                var alvoFk = arquivo.Fks.FirstOrDefault(f =>
                    f.Nome.Equals(d.Campo, StringComparison.OrdinalIgnoreCase));
                if (d.Esperado != null && d.Encontrado == null)
                    GerarFk(a, tabela, d.Campo, IndiceModo.Remover, null);
                else if (d.Esperado == null && d.Encontrado != null)
                {
                    if (alvoFk != null) GerarFk(a, tabela, d.Campo, IndiceModo.Novo, alvoFk);
                }
                else if (alvoFk != null)
                {
                    GerarFk(a, tabela, d.Campo, IndiceModo.Divergente, alvoFk);
                }
            }
        }
    }

    // =====================================================================
    // Criacao de tabela (somente no arquivo)
    // =====================================================================

    private void GerarCriacaoTabela(Acc a, string tabela, SchemaInfoDto? arquivo)
    {
        if (arquivo == null || arquivo.Colunas.Count == 0)
        {
            a.RevisaoManual.Add(
                $"'{tabela}': existe apenas no arquivo, mas o resultado nao trouxe as colunas; " +
                "refaca a comparacao para gerar o CREATE TABLE.");
            return;
        }

        var nome = Qualificar(tabela);
        var pk = arquivo.Indices.FirstOrDefault(i =>
            i.Nome.StartsWith("PK", StringComparison.OrdinalIgnoreCase) && i.Colunas.Count > 0);

        var comentarios = new List<string>
        {
            $"-- Cria a tabela {nome} (existe apenas no arquivo; nao existe no banco conectado).",
            "-- Ajuste manualmente IDENTITY/DEFAULT se a origem os possuir: o JSON de origem nao os exporta."
        };

        var linhas = new List<string>();
        bool padraoUsado = false;
        var vistos = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var col in arquivo.Colunas.OrderBy(c => c.Ordem))
        {
            if (!vistos.Add(col.Nome))
                continue;
            var (def, padrao) = DefinicaoColuna(col);
            padraoUsado |= padrao;
            linhas.Add($"    {Bracket(col.Nome)} {def}");
        }
        if (padraoUsado)
            comentarios.Add("-- Tamanho/precisao nao informados no arquivo em alguma coluna: valores padrao aplicados (ajuste manualmente).");
        if (vistos.Count < arquivo.Colunas.Count)
            comentarios.Add("-- O arquivo traz colunas duplicadas; apenas a primeira ocorrencia foi usada.");
        if (pk != null && pk.Colunas.Count > 0)
            linhas.Add($"    CONSTRAINT {Bracket(pk.Nome)} PRIMARY KEY CLUSTERED ({string.Join(", ", pk.Colunas.Select(Bracket))})");

        var stmt = $"CREATE TABLE {nome} (\n{string.Join(",\n", linhas)}\n);";
        var partes = new List<string>(comentarios) { stmt };
        var dto = Montar("CREATE_TABLE", "Info", tabela,
            $"Cria a tabela {nome} no banco JCA (somente no arquivo).",
            partes, false, null, ConsultaTabela(tabela));
        Adicionar(a, dto, false, null);

        // Indices (alem da PK) e FKs da nova tabela
        foreach (var idx in arquivo.Indices)
        {
            if (ReferenceEquals(idx, pk)) continue;
            GerarIndice(a, tabela, idx.Nome, IndiceModo.Novo, idx, novaTabela: true);
        }
        foreach (var fk in arquivo.Fks)
            GerarFk(a, tabela, fk.Nome, IndiceModo.Novo, fk, novaTabela: true);
    }

    // =====================================================================
    // Exclusao de tabela (somente no banco)
    // =====================================================================

    private void GerarExclusaoTabela(Acc a, string tabela)
    {
        var nome = Qualificar(tabela);
        var stmt = $"DROP TABLE {nome};";
        var partes = new List<string>
        {
            $"-- ATENCAO: a tabela {nome} existe no banco conectado mas nao no arquivo.",
            "-- Executar significa excluir a tabela e TODOS os dados dela.",
            "-- Revise antes; o bloco de backup abaixo roda automaticamente (se habilitado).",
            BlocoBackupTabela(a, tabela),
            "-- Descomente a linha abaixo somente apos a revisao:",
            Comentar(stmt)
        };
        var dto = Montar("DROP_TABLE", "Critico", tabela,
            $"Remove a tabela {nome} (existe so no banco). Script comentado; descomente para executar.",
            partes, true, OpcoesExclusaoTabela(tabela), ConsultaTabela(tabela));
        Adicionar(a, dto, true, null);
    }

    // =====================================================================
    // Colunas: ADD / DROP / ALTER
    // =====================================================================

    private void GerarAddColuna(Acc a, string tabela, SchemaColumnInfoDto col)
    {
        var nome = Qualificar(tabela);
        var (def, padrao) = DefinicaoColuna(col);
        var comentarios = new List<string>
        {
            $"-- Adiciona a coluna '{col.Nome}' em {nome} conforme o arquivo: {def}.",
            "-- Execute apos a criacao da tabela, se ela tambem entrar neste lote."
        };
        if (padrao)
            comentarios.Add("-- Tamanho/precisao nao informado no arquivo: valor padrao aplicado (ajuste manualmente).");
        if (!col.Nulo)
            comentarios.Add("-- Atencao: NOT NULL em tabela ja populada exige valores preenchidos; trate os nulos antes de executar.");

        var stmt = $"ALTER TABLE {nome} ADD {Bracket(col.Nome)} {def};";
        var partes = new List<string>(comentarios) { stmt };
        var sev = col.Nulo ? "Info" : "Aviso";
        var dto = Montar("ADD_COLUMN", sev, col.Nome,
            $"Adiciona a coluna '{col.Nome}' em {nome} com a definicao do arquivo.",
            partes, false, null, ConsultaColuna(tabela, col.Nome));
        Adicionar(a, dto, false, null);
    }

    private void GerarDropColuna(Acc a, string tabela, string coluna)
    {
        var nome = Qualificar(tabela);
        var stmt = $"ALTER TABLE {nome} DROP COLUMN {Bracket(coluna)};";
        var partes = new List<string>
        {
            $"-- ATENCAO: exclusao da coluna '{coluna}' em {nome}.",
            "-- O arquivo nao possui esta coluna: os dados dela serao perdidos.",
            BlocoBackupColuna(a, tabela, coluna),
            "-- Descomente a linha abaixo somente apos a revisao:",
            Comentar(stmt)
        };
        var dto = Montar("DROP_COLUMN", "Critico", coluna,
            $"Remove a coluna '{coluna}' de {nome} (existe no banco, nao no arquivo). Script comentado.",
            partes, true, OpcoesExclusaoColuna(tabela, coluna), ConsultaColuna(tabela, coluna));
        Adicionar(a, dto, true, null);
    }

    private void GerarAlterColuna(Acc a, string tabela, SchemaColumnInfoDto alvo,
        SchemaColumnInfoDto? atual, bool mudouTipo, SchemaDifferenceDto? difTipo)
    {
        var nome = Qualificar(tabela);
        var alvoInfo = InfoDe(alvo);
        var alvoSql = TipoSql(alvo, out bool padrao);

        TipoInfo atualInfo;
        string atualTxt;
        if (atual != null)
        {
            atualInfo = InfoDe(atual);
            atualTxt = TipoSql(atual, out _);
        }
        else if (mudouTipo)
        {
            atualInfo = ParseTipo(difTipo?.Esperado);
            atualTxt = difTipo?.Esperado ?? "desconhecido";
        }
        else
        {
            atualInfo = alvoInfo;
            atualTxt = "(desconhecido)";
        }

        var (def, _) = DefinicaoColuna(alvo);
        var classe = mudouTipo || atualInfo.Base != alvoInfo.Base || atualInfo.Tamanho != alvoInfo.Tamanho
            ? Classificar(atualInfo, alvoInfo)
            : Classe.Compativel;
        if (!mudouTipo && atual == null)
            classe = Classe.Compativel; // so nullable e conhecido: conversao nao aplicavel

        var tipo = mudouTipo ? "ALTER_TYPE" : "ALTER_COLUMN";
        var stmt = $"ALTER TABLE {nome} ALTER COLUMN {Bracket(alvo.Nome)} {def};";

        if (classe == Classe.Compativel)
        {
            var comentarios = new List<string>
            {
                $"-- Ajusta a coluna '{alvo.Nome}' em {nome} para a definicao do arquivo: {def}.",
                $"-- Tipo atual no banco: {atualTxt} | Tipo alvo (arquivo): {alvoSql}."
            };
            if (padrao)
                comentarios.Add("-- Tamanho/precisao nao informado no arquivo: valor padrao aplicado (ajuste manualmente).");
            if (!alvo.Nulo && (atual == null || atual.Nulo))
                comentarios.Add("-- Atencao: a coluna passa a NOT NULL; registros com NULL farao o ALTER falhar.");
            if (!alvo.Nulo)
                comentarios.Add($"-- Cheque nulos antes: SELECT COUNT(*) FROM {nome} WHERE {Bracket(alvo.Nome)} IS NULL;");

            var partes = new List<string>(comentarios) { stmt };
            var dto = Montar(tipo, "Aviso", alvo.Nome,
                $"Altera a coluna '{alvo.Nome}' em {nome} de '{atualTxt}' para '{alvoSql}' (definicao do arquivo).",
                partes, false, null, ConsultaColuna(tabela, alvo.Nome));
            Adicionar(a, dto, false, null);
            return;
        }

        bool incompativel = classe == Classe.Incompativel;
        string motivo = incompativel
            ? $"a conversao '{atualTxt}' -> '{alvoSql}' exige recriacao/conversao manual da coluna."
            : $"a nova definicao '{alvoSql}' e mais restritiva que '{atualTxt}' (possivel perda/truncamento).";

        var cabs = new List<string>
        {
            $"-- ATENCAO: alteracao destrutiva da coluna '{alvo.Nome}' em {nome}.",
            $"-- Motivo: {motivo}",
            $"-- Tipo atual no banco: {atualTxt} | Tipo alvo (arquivo): {alvoSql}."
        };
        if (!alvo.Nulo)
            cabs.Add("-- Atencao: NOT NULL em tabela populada exige nulos tratados antes do ALTER.");
        cabs.Add(BlocoBackupColuna(a, tabela, alvo.Nome));
        cabs.Add("-- Descomente a linha abaixo somente apos a revisao:");
        cabs.Add(Comentar(stmt));

        var revisao = incompativel
            ? $"'{tabela}.{alvo.Nome}': {motivo} Script gerado comentado."
            : null;

        var dtoAlt = Montar(tipo, "Critico", alvo.Nome,
            $"Altera a coluna '{alvo.Nome}' em {nome} de '{atualTxt}' para '{alvoSql}'. Script comentado.",
            cabs, true, OpcoesMigracaoColuna(tabela, alvo), ConsultaColuna(tabela, alvo.Nome));
        Adicionar(a, dtoAlt, true, revisao);
    }

    // =====================================================================
    // Indices
    // =====================================================================

    private void GerarIndice(Acc a, string tabela, string nomeIndice, IndiceModo modo,
        SchemaIndexInfoDto? alvo, bool novaTabela = false)
    {
        var nome = Qualificar(tabela);

        if (modo == IndiceModo.Remover)
        {
            var stmt = $"DROP INDEX {Bracket(nomeIndice)} ON {nome};";
            var partes = new List<string>
            {
                $"-- ATENCAO: o indice '{nomeIndice}' existe no banco mas nao no arquivo.",
                "-- Descomente a linha abaixo somente apos a revisao:",
                Comentar(stmt)
            };
            var dto = Montar("DROP_INDEX", "Aviso", nomeIndice,
                $"Remove o indice '{nomeIndice}' de {nome} (nao esta no arquivo). Script comentado.",
                partes, false, OpcoesRenomearIndice(tabela, nomeIndice), ConsultaIndice(tabela, nomeIndice));
            Adicionar(a, dto, true, null);
            return;
        }

        if (alvo == null) return;
        var criar = SqlIndice(alvo, nome);
        var cabecalho = new List<string>
        {
            $"-- Cria o indice '{nomeIndice}' em {nome} conforme o arquivo.",
            "-- clustered/nonclustered nao exportado no JSON: padrao NONCLUSTERED."
        };
        if (novaTabela)
            cabecalho.Add("-- Execute apos o CREATE TABLE desta tabela.");
        else
            cabecalho.Add("-- Execute apos os scripts de coluna (aba Alteracoes).");

        if (modo == IndiceModo.Novo)
        {
            var partesNovo = new List<string>(cabecalho) { criar };
            var dtoNovo = Montar("CREATE_INDEX", "Info", nomeIndice,
                $"Cria o indice '{nomeIndice}' em {nome}.",
                partesNovo, false, null, ConsultaIndice(tabela, nomeIndice));
            Adicionar(a, dtoNovo, false, null);
            return;
        }

        // Divergente: ja existe no banco com definicao diferente
        var stmtDrop = $"DROP INDEX {Bracket(nomeIndice)} ON {nome};";
        var partesDiv = new List<string>(cabecalho)
        {
            "-- O indice ja existe no banco com definicao diferente da arquivo.",
            "-- Descomente a linha abaixo para remover a versao atual antes de recriar:",
            Comentar(stmtDrop),
            criar
        };
        var dtoDiv = Montar("CREATE_INDEX", "Aviso", nomeIndice,
            $"Recria o indice '{nomeIndice}' em {nome} (definicao divergente; drop comentado incluido).",
            partesDiv, false, OpcoesNovoNomeIndice(alvo, nomeIndice, tabela), ConsultaIndice(tabela, nomeIndice));
        Adicionar(a, dtoDiv, false, null);
    }

    private static string SqlIndice(SchemaIndexInfoDto idx, string tabela)
    {
        var uniq = idx.Unique ? "UNIQUE " : "";
        var cols = string.Join(", ", idx.Colunas.Select(Bracket));
        return $"CREATE {uniq}NONCLUSTERED INDEX {Bracket(idx.Nome)} ON {tabela} ({cols});";
    }

    // =====================================================================
    // Foreign keys
    // =====================================================================

    private void GerarFk(Acc a, string tabela, string nomeFk, IndiceModo modo,
        SchemaFkInfoDto? alvo, bool novaTabela = false)
    {
        var nome = Qualificar(tabela);

        if (modo == IndiceModo.Remover)
        {
            var stmt = $"ALTER TABLE {nome} DROP CONSTRAINT {Bracket(nomeFk)};";
            var partes = new List<string>
            {
                $"-- ATENCAO: a FK '{nomeFk}' existe no banco mas nao no arquivo.",
                "-- Descomente a linha abaixo somente apos a revisao:",
                Comentar(stmt)
            };
            var dto = Montar("ALTER_FK", "Aviso", nomeFk,
                $"Remove a FK '{nomeFk}' de {nome} (nao esta no arquivo). Script comentado.",
                partes, false, null, ConsultaFk(nomeFk));
            Adicionar(a, dto, true, null);
            return;
        }

        if (alvo == null) return;
        var destino = Qualificar(alvo.TabelaDestino);
        var criar = $"ALTER TABLE {nome} ADD CONSTRAINT {Bracket(alvo.Nome)} " +
                    $"FOREIGN KEY ({Bracket(alvo.ColunaOrigem)}) " +
                    $"REFERENCES {destino} ({Bracket(alvo.ColunaDestino)});";

        var cabecalho = new List<string>
        {
            $"-- Cria a FK '{alvo.Nome}' em {nome}: {alvo.ColunaOrigem} -> {destino}.{alvo.ColunaDestino}.",
            $"-- Confirme que a tabela destino {destino} existe no banco alvo."
        };
        if (novaTabela)
            cabecalho.Add("-- Execute apos o CREATE TABLE desta tabela e da tabela destino.");
        else
            cabecalho.Add("-- Execute apos os scripts de coluna (aba Alteracoes).");

        if (modo == IndiceModo.Novo)
        {
            var partesNovo = new List<string>(cabecalho) { criar };
            var dtoNovo = Montar("ALTER_FK", "Info", nomeFk,
                $"Cria a FK '{nomeFk}' em {nome} (existe no arquivo, nao no banco).",
                partesNovo, false, null, ConsultaFk(nomeFk));
            Adicionar(a, dtoNovo, false, null);
            return;
        }

        // Divergente: ja existe com outra definicao
        var stmtDrop = $"ALTER TABLE {nome} DROP CONSTRAINT {Bracket(nomeFk)};";
        var partesDiv = new List<string>(cabecalho)
        {
            "-- A FK ja existe no banco com definicao diferente da arquivo.",
            "-- Descomente a linha abaixo para remover a versao atual antes de recriar:",
            Comentar(stmtDrop),
            criar
        };
        var dtoDiv = Montar("ALTER_FK", "Aviso", nomeFk,
            $"Recria a FK '{nomeFk}' em {nome} (definicao divergente; drop comentado incluido).",
            partesDiv, false, OpcoesNovaFk(alvo, tabela), ConsultaFk(nomeFk));
        Adicionar(a, dtoDiv, false, null);
    }

    // =====================================================================
    // Blocos de backup
    // =====================================================================

    private string BlocoBackupTabela(Acc a, string tabela)
    {
        var destino = NomeBackup(tabela, null);
        if (!a.Opcoes.GerarBackup)
            return $"-- Sugestao de backup (descomente para executar antes):\n" +
                   $"-- SELECT * INTO {destino} FROM {Qualificar(tabela)};";
        if (!a.Backups.Add(destino))
            return $"-- Backup da tabela ja incluido em outro script: {destino}";
        return $"-- 1) Backup dos dados atuais:\nSELECT * INTO {destino} FROM {Qualificar(tabela)};";
    }

    private string BlocoBackupColuna(Acc a, string tabela, string coluna)
    {
        var destino = NomeBackup(tabela, coluna);
        if (!a.Opcoes.GerarBackup)
            return $"-- Sugestao de backup da coluna (descomente para executar antes):\n" +
                   $"-- SELECT {Bracket(coluna)} INTO {destino} FROM {Qualificar(tabela)};";
        if (!a.Backups.Add(destino))
            return $"-- Backup da coluna ja incluido em outro script: {destino}";
        return $"-- 1) Backup dos dados atuais da coluna:\n" +
               $"SELECT {Bracket(coluna)} INTO {destino} FROM {Qualificar(tabela)};";
    }

    // =====================================================================
    // Opcoes alternativas (nenhum destructive fica sem alternativa)
    // =====================================================================

    private static List<SqlScriptDto>? OpcoesExclusaoTabela(string tabela)
    {
        var id = IdTabela(tabela);
        var novo = ExtrairNome(tabela) + "_OBSOLETA";
        var partes = new List<string>
        {
            $"-- Alternativa nao destrutiva: renomeia {Qualificar(tabela)} em vez de exclui-la.",
            $"EXEC sp_rename N'{Esc(id)}', N'{Esc(novo)}';"
        };
        return new List<SqlScriptDto>
        {
            Montar("DROP_TABLE", "Aviso", tabela,
                $"Renomeia {Qualificar(tabela)} para {novo} (preserva os dados).",
                partes, false, null, null)
        };
    }

    private static List<SqlScriptDto>? OpcoesExclusaoColuna(string tabela, string coluna)
    {
        var novo = coluna + "_OBSOLETA";
        var partes = new List<string>
        {
            $"-- Alternativa nao destrutiva: renomeia a coluna em vez de exclui-la.",
            $"EXEC sp_rename N'{Esc(IdTabela(tabela))}.{Esc(coluna)}', N'{Esc(novo)}', N'COLUMN';"
        };
        return new List<SqlScriptDto>
        {
            Montar("DROP_COLUMN", "Aviso", coluna,
                $"Renomeia a coluna '{coluna}' de {Qualificar(tabela)} para {novo} (preserva os dados).",
                partes, false, null, null)
        };
    }

    private static List<SqlScriptDto>? OpcoesRenomearIndice(string tabela, string indice)
    {
        var novo = indice + "_OBSOLETO";
        var partes = new List<string>
        {
            $"-- Alternativa nao destrutiva: renomeia o indice em vez de remove-lo.",
            $"EXEC sp_rename N'{Esc(IdTabela(tabela))}.{Esc(indice)}', N'{Esc(novo)}', N'INDEX';"
        };
        return new List<SqlScriptDto>
        {
            Montar("DROP_INDEX", "Aviso", indice,
                $"Renomeia o indice '{indice}' para {novo} (preserva a estrutura).",
                partes, false, null, null)
        };
    }

    private static List<SqlScriptDto>? OpcoesNovoNomeIndice(
        SchemaIndexInfoDto idx, string original, string tabela)
    {
        var nome = original + "_NOVO";
        var copia = new SchemaIndexInfoDto(nome, idx.Unique, idx.Colunas);
        var partes = new List<string>
        {
            $"-- Alternativa: cria o indice com outro nome, mantendo o indice atual intacto em {Qualificar(tabela)}.",
            SqlIndice(copia, Qualificar(tabela))
        };
        return new List<SqlScriptDto>
        {
            Montar("CREATE_INDEX", "Aviso", original,
                $"Cria o indice com o nome '{nome}' em vez de substituir o atual.",
                partes, false, null, null)
        };
    }

    private static List<SqlScriptDto>? OpcoesNovaFk(SchemaFkInfoDto fk, string tabela)
    {
        var nome = fk.Nome + "_NOVA";
        var partes = new List<string>
        {
            $"-- Alternativa: cria a FK com outro nome, mantendo a atual intacta em {Qualificar(tabela)}.",
            $"ALTER TABLE {Qualificar(tabela)} ADD CONSTRAINT {Bracket(nome)} " +
            $"FOREIGN KEY ({Bracket(fk.ColunaOrigem)}) " +
            $"REFERENCES {Qualificar(fk.TabelaDestino)} ({Bracket(fk.ColunaDestino)});"
        };
        return new List<SqlScriptDto>
        {
            Montar("ALTER_FK", "Aviso", fk.Nome,
                $"Cria a FK '{nome}' em vez de substituir a atual.",
                partes, false, null, null)
        };
    }

    private static List<SqlScriptDto>? OpcoesMigracaoColuna(string tabela, SchemaColumnInfoDto alvo)
    {
        var nome = Qualificar(tabela);
        var tipo = TipoSql(alvo, out _);
        var mig = alvo.Nome + "_MIG";
        var partes = new List<string>
        {
            "-- Alternativa: migra os dados sem alterar a coluna original.",
            $"ALTER TABLE {nome} ADD {Bracket(mig)} {tipo} NULL;",
            $"UPDATE {nome} SET {Bracket(mig)} = TRY_CONVERT({tipo}, {Bracket(alvo.Nome)});",
            "-- Depois de validar a migracao, descomente para trocar as colunas:",
            $"-- ALTER TABLE {nome} DROP COLUMN {Bracket(alvo.Nome)};",
            $"-- EXEC sp_rename N'{Esc(IdTabela(tabela))}.{Esc(mig)}', N'{Esc(alvo.Nome)}', N'COLUMN';"
        };
        return new List<SqlScriptDto>
        {
            Montar("ALTER_TYPE", "Aviso", alvo.Nome,
                $"Migra '{alvo.Nome}' para '{tipo}' via coluna temporaria '{mig}' (sem perda imediata).",
                partes, false, null, null)
        };
    }

    // =====================================================================
    // Montagem / acumulador
    // =====================================================================

    private sealed class Acc
    {
        public readonly List<SqlScriptDto> Criacao = new();
        public readonly List<SqlScriptDto> Alteracao = new();
        public readonly List<SqlScriptDto> IndiceConstraint = new();
        public readonly List<string> RevisaoManual = new();
        public readonly HashSet<string> Backups = new(StringComparer.OrdinalIgnoreCase);
        public readonly ScriptsGenOpcoesDto Opcoes;

        public Acc(ScriptsGenOpcoesDto? opcoes) => Opcoes = opcoes ?? new ScriptsGenOpcoesDto();
    }

    private static SqlScriptDto Montar(string tipo, string severidade, string campo,
        string descricao, List<string> partes, bool backupSugerido,
        List<SqlScriptDto>? opcoes, string? consulta)
    {
        var sql = string.Join("\n", partes);
        var sqlFormatado = string.Join("\n\n", partes);
        return new SqlScriptDto(NovoId(tipo), tipo, severidade, sql, sqlFormatado,
            descricao, campo, backupSugerido, opcoes, consulta);
    }

    private static void Adicionar(Acc a, SqlScriptDto dto, bool destrutivo, string? revisao)
    {
        if (destrutivo && a.Opcoes.ModoEstrito)
        {
            a.RevisaoManual.Add(revisao
                ?? $"Acao destrutiva '{dto.Tipo}' excluida pelo Modo estrito: {dto.Descricao}");
            return;
        }
        if (revisao != null)
            a.RevisaoManual.Add(revisao);

        switch (dto.Tipo)
        {
            case "CREATE_TABLE":
                a.Criacao.Add(dto);
                break;
            case "CREATE_INDEX":
            case "DROP_INDEX":
            case "ALTER_FK":
                a.IndiceConstraint.Add(dto);
                break;
            default:
                a.Alteracao.Add(dto);
                break;
        }
    }

    private SqlScriptResultDto Finalizar(Acc a)
    {
        var criacao = a.Criacao.OrderBy(s => Ordem(s.Tipo)).ToList();
        var alteracao = a.Alteracao.OrderBy(s => Ordem(s.Tipo)).ToList();
        var indices = a.IndiceConstraint.OrderBy(s => Ordem(s.Tipo)).ToList();
        var todos = criacao.Concat(alteracao).Concat(indices).ToList();

        var impacto = Impacto(todos);
        var avisos = todos.Count(s => s.Severidade != "Info");

        _logger.LogInformation(
            "Scripts SQL gerados: {Criacoes} criacoes, {Alteracoes} alteracoes, {Indices} indices/FKs, impacto {Impacto}",
            criacao.Count, alteracao.Count, indices.Count, impacto);

        return new SqlScriptResultDto(criacao, alteracao, indices,
            new SqlScriptResumoDto(criacao.Count, alteracao.Count, indices.Count,
                impacto, avisos, a.RevisaoManual));
    }

    private static int Ordem(string tipo) => tipo switch
    {
        "CREATE_TABLE" => 1,
        "ADD_COLUMN" => 2,
        "ALTER_COLUMN" => 3,
        "ALTER_TYPE" => 4,
        "DROP_COLUMN" => 5,
        "DROP_TABLE" => 6,
        "CREATE_INDEX" => 7,
        "DROP_INDEX" => 8,
        "ALTER_FK" => 9,
        _ => 99
    };

    private static string Impacto(List<SqlScriptDto> todos)
    {
        if (todos.Any(s => s.Tipo == "DROP_TABLE")) return "Critical";
        if (todos.Any(s => s.Tipo == "DROP_COLUMN" || s.Tipo == "ALTER_TYPE")) return "High";
        if (todos.Any(s => s.Tipo == "ALTER_COLUMN" || s.Tipo == "ALTER_FK" || s.Tipo == "DROP_INDEX"))
            return "Medium";
        return "Low";
    }

    private static string NovoId(string tipo)
        => $"{tipo.ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}";

    private enum IndiceModo { Novo, Remover, Divergente }

    // =====================================================================
    // Definicao de coluna / tipos
    // =====================================================================

    private static (string Sql, bool Padrao) DefinicaoColuna(SchemaColumnInfoDto col)
    {
        var tipo = TipoSql(col, out bool padrao);
        var partes = new List<string> { tipo };
        var def = DefaultTexto(col);
        if (def != null)
            partes.Add("DEFAULT " + def);
        partes.Add(col.Nulo ? "NULL" : "NOT NULL");
        return (string.Join(" ", partes), padrao);
    }

    /// <summary>
    /// Monta o tipo SQL de uma coluna. Usa sempre os campos estruturados
    /// (Tamanho/Precisao/Escala) - nunca a string descricao, que pode ter
    /// dois grupos de parenteses (ex.: varchar(255)(255,0)).
    /// </summary>
    private static string TipoSql(SchemaColumnInfoDto c, out bool padrao)
    {
        padrao = false;
        var tipo = (c.Tipo ?? "").Trim();
        if (tipo.Length == 0) return "int";
        if (tipo.Contains('('))
            return tipo.ToLowerInvariant();

        var b = tipo.ToLowerInvariant();
        switch (b)
        {
            case "char" or "nchar" or "binary":
                if (c.Tamanho is > 0) return $"{b}({c.Tamanho})";
                padrao = true;
                return b switch
                {
                    "char" => "char(1)",
                    "nchar" => "nchar(1)",
                    _ => "binary(1)"
                };
            case "varchar" or "nvarchar" or "varbinary":
                if (c.Tamanho is -1) return $"{b}(max)";
                if (c.Tamanho is > 0) return $"{b}({c.Tamanho})";
                padrao = true;
                return $"{b}(max)";
            case "decimal" or "numeric":
                if (c.Precisao is > 0) return $"{b}({c.Precisao},{c.Escala ?? 0})";
                padrao = true;
                return $"{b}(18,0)";
            default:
                return b;
        }
    }

    private static string? DefaultTexto(SchemaColumnInfoDto c)
    {
        var v = (c.ValorDefault ?? "").Trim();
        if (v.Length == 0) return null;
        if (v.StartsWith("DEFAULT ", StringComparison.OrdinalIgnoreCase))
            v = v["DEFAULT ".Length..].Trim();
        if (v.Length == 0) return null;
        if (v.StartsWith("(") || v.StartsWith("'")) return v;
        if (double.TryParse(v, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out _)) return v;
        if (v.Equals("getdate", StringComparison.OrdinalIgnoreCase)
            || v.Equals("getutcdate", StringComparison.OrdinalIgnoreCase)
            || v.Equals("newid", StringComparison.OrdinalIgnoreCase)
            || v.Equals("sysdatetime", StringComparison.OrdinalIgnoreCase))
            return $"({v}())";
        return $"'{v.Replace("'", "''")}'";
    }

    private sealed record TipoInfo(string Base, int? Tamanho, int? Precisao, int? Escala);

    private static TipoInfo InfoDe(SchemaColumnInfoDto c) => DeSql(TipoSql(c, out _));

    private static TipoInfo ParseTipo(string? esperado)
    {
        if (string.IsNullOrWhiteSpace(esperado)) return new TipoInfo("", null, null, null);
        var token = esperado.Trim().Split(' ')[0];
        return DeSql(token);
    }

    private static TipoInfo DeSql(string tipo)
    {
        var s = (tipo ?? "").Trim().ToLowerInvariant();
        var idx = s.IndexOf('(');
        if (idx < 0) return new TipoInfo(s, null, null, null);

        var b = s[..idx].Trim();
        var fim = s.IndexOf(')', idx);
        var dentro = fim > idx ? s[(idx + 1)..fim] : "";
        var partes = dentro.Split(',');
        int? p0 = int.TryParse(partes[0].Trim(), out var v0) ? v0 : null;
        int? p1 = partes.Length > 1 && int.TryParse(partes[1].Trim(), out var v1) ? v1 : null;

        return b switch
        {
            "decimal" or "numeric" => new TipoInfo(b, null, p0 ?? 18, p1 ?? 0),
            "char" or "varchar" or "nchar" or "nvarchar" or "binary" or "varbinary"
                => new TipoInfo(b, p0, null, null),
            _ => new TipoInfo(b, null, null, null)
        };
    }

    private enum Familia { Numerica, Caracter, Binaria, DataHora, Outra }
    private enum Classe { Compativel, Estreitamento, Incompativel }

    private static Familia FamiliaDe(string b) => b switch
    {
        "bit" or "tinyint" or "smallint" or "int" or "bigint" or "decimal" or "numeric"
            or "money" or "smallmoney" or "float" or "real" => Familia.Numerica,
        "char" or "varchar" or "text" or "nchar" or "nvarchar" or "ntext" => Familia.Caracter,
        "binary" or "varbinary" or "image" => Familia.Binaria,
        "date" or "time" or "datetime" or "datetime2" or "smalldatetime" or "datetimeoffset"
            => Familia.DataHora,
        _ => Familia.Outra
    };

    private static int Rank(Familia f, string b) => f switch
    {
        Familia.Numerica => b switch
        {
            "bit" => 0, "tinyint" => 1, "smallint" => 2, "int" => 3, "bigint" => 4,
            "decimal" or "numeric" => 5, "money" or "smallmoney" => 6,
            "float" or "real" => 7, _ => 5
        },
        Familia.Caracter => b switch
        {
            "char" => 0, "varchar" => 1, "text" => 2,
            "nchar" => 3, "nvarchar" => 4, "ntext" => 5, _ => 0
        },
        Familia.Binaria => b switch
        {
            "binary" => 0, "varbinary" => 1, "image" => 2, _ => 0
        },
        Familia.DataHora => b switch
        {
            "date" => 0, "time" => 1, "smalldatetime" => 2, "datetime" => 3,
            "datetime2" => 4, "datetimeoffset" => 5, _ => 0
        },
        _ => 0
    };

    private static Classe Classificar(TipoInfo atual, TipoInfo alvo)
    {
        if (atual.Base.Length == 0) return Classe.Incompativel;

        if (atual.Base == alvo.Base)
            return EstreitaTamanho(atual, alvo) ? Classe.Estreitamento : Classe.Compativel;

        var fa = FamiliaDe(atual.Base);
        var fb = FamiliaDe(alvo.Base);
        if (fa == Familia.Outra || fb == Familia.Outra)
            return Classe.Incompativel;

        if (fa != fb)
            return fa == Familia.Numerica && fb == Familia.Caracter
                ? Classe.Compativel
                : Classe.Incompativel;

        if (Rank(fa, alvo.Base) < Rank(fa, atual.Base))
            return Classe.Estreitamento;
        if (fb == Familia.Caracter && EstreitaTamanho(atual, alvo))
            return Classe.Estreitamento;
        return Classe.Compativel;
    }

    private static bool EstreitaTamanho(TipoInfo atual, TipoInfo alvo)
    {
        if (alvo.Tamanho.HasValue && atual.Tamanho.HasValue
            && alvo.Tamanho.Value >= 0 && atual.Tamanho.Value >= 0
            && alvo.Tamanho.Value < atual.Tamanho.Value)
            return true;
        if (alvo.Precisao.HasValue && atual.Precisao.HasValue)
        {
            if (alvo.Precisao.Value < atual.Precisao.Value) return true;
            if ((alvo.Escala ?? 0) < (atual.Escala ?? 0)) return true;
        }
        return false;
    }

    // =====================================================================
    // Qualificacao de identificadores
    // =====================================================================

    private static string Bracket(string ident) => "[" + (ident ?? "").Replace("]", "]]") + "]";

    private static string Qualificar(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        if (p >= 0) return $"{Bracket(t[..p].Trim())}.{Bracket(t[(p + 1)..].Trim())}";
        return $"[dbo].{Bracket(t)}";
    }

    private static string IdTabela(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        if (p >= 0) return $"{t[..p].Trim()}.{t[(p + 1)..].Trim()}";
        return $"dbo.{t}";
    }

    private static string ExtrairSchema(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        return p >= 0 ? t[..p].Trim() : "dbo";
    }

    private static string ExtrairNome(string tabela)
    {
        var t = (tabela ?? "").Trim();
        var p = t.IndexOf('.');
        return p >= 0 ? t[(p + 1)..].Trim() : t;
    }

    private static string NomeBackup(string tabela, string? sufixo)
    {
        var nome = ExtrairNome(tabela) + "_BACKUP"
                   + (sufixo != null ? "_" + sufixo : "")
                   + "_" + DateTime.UtcNow.ToString("yyyyMMdd");
        return Qualificar($"{ExtrairSchema(tabela)}.{nome}");
    }

    private static string Esc(string? s) => (s ?? "").Replace("'", "''");

    private static string Comentar(string sql)
    {
        var linhas = sql.Replace("\r\n", "\n").Split('\n');
        for (var i = 0; i < linhas.Length; i++)
            linhas[i] = linhas[i].Length == 0 ? "--" : "-- " + linhas[i];
        return string.Join("\n", linhas);
    }

    private static bool EhDuplicada(SchemaDifferenceDto d)
        => d.Descricao != null && d.Descricao.Contains("duplicad", StringComparison.OrdinalIgnoreCase);

    private static Dictionary<string, T> PorNome<T>(IEnumerable<T> itens, Func<T, string> nomeDe)
    {
        var mapa = new Dictionary<string, T>(StringComparer.OrdinalIgnoreCase);
        foreach (var i in itens)
        {
            var n = nomeDe(i);
            if (!mapa.ContainsKey(n)) mapa[n] = i;
        }
        return mapa;
    }

    // =====================================================================
    // Consultas de validacao (o usuario roda depois do script)
    // =====================================================================

    private static string ConsultaColuna(string tabela, string coluna)
        => "SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH " +
           $"FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{Esc(ExtrairNome(tabela))}' " +
           $"AND COLUMN_NAME = '{Esc(coluna)}';";

    private static string ConsultaTabela(string tabela)
        => $"SELECT CASE WHEN OBJECT_ID(N'{Esc(IdTabela(tabela))}', N'U') IS NULL " +
           "THEN 'REMOVIDA' ELSE 'AINDA EXISTE' END AS Situacao;";

    private static string ConsultaIndice(string tabela, string indice)
        => $"SELECT name FROM sys.indexes WHERE name = N'{Esc(indice)}' " +
           $"AND object_id = OBJECT_ID(N'{Esc(IdTabela(tabela))}');";

    private static string ConsultaFk(string fk)
        => $"SELECT name FROM sys.foreign_keys WHERE name = N'{Esc(fk)}';";

    // =====================================================================
    // Validacao estatica (nada e executado no banco)
    // =====================================================================

    private static readonly HashSet<string> Verbos = new(StringComparer.OrdinalIgnoreCase)
    {
        "SELECT", "INSERT", "UPDATE", "DELETE", "MERGE", "CREATE", "ALTER", "DROP",
        "TRUNCATE", "EXEC", "EXECUTE", "WITH", "BEGIN", "END", "IF", "ELSE", "WHILE",
        "RETURN", "PRINT", "DECLARE", "SET", "USE", "GRANT", "DENY", "REVOKE", "GO",
        "DBCC", "BULK", "VALUES", "OPEN", "FETCH", "CLOSE", "DEALLOCATE", "EXPLAIN"
    };

    private static readonly HashSet<string> Objetos = new(StringComparer.OrdinalIgnoreCase)
    {
        "TABLE", "INDEX", "VIEW", "PROCEDURE", "PROC", "FUNCTION", "TRIGGER", "SCHEMA",
        "DATABASE", "UNIQUE", "STATISTICS", "TYPE", "DEFAULT", "RULE", "SEQUENCE",
        "FULLTEXT", "CONSTRAINT", "FOREIGN"
    };

    private static readonly HashSet<string> SchemasIgnorados = new(StringComparer.OrdinalIgnoreCase)
    {
        "sys", "INFORMATION_SCHEMA", "guest"
    };

    public async Task<ValidarScriptResultDto> ValidarScriptAsync(string? sql, CancellationToken ct = default)
    {
        var erros = new List<string>();
        var avisos = new List<string>();

        if (string.IsNullOrWhiteSpace(sql))
        {
            erros.Add("Script vazio: informe o SQL para validar.");
            return new ValidarScriptResultDto(false, erros, avisos);
        }

        var (limpo, erroLex) = LimparSql(sql);
        if (erroLex != null) erros.Add(erroLex);
        if (erros.Count > 0) return new ValidarScriptResultDto(false, erros, avisos);

        if (limpo.Trim().Length == 0)
        {
            avisos.Add("Script contem apenas comentarios: nenhuma instrucao sera executada.");
            return new ValidarScriptResultDto(true, erros, avisos);
        }

        var instrucoes = limpo.Split(';')
            .Select(s => Regex.Replace(s.Trim(), @"\s+", " "))
            .Where(s => s.Length > 0 && !s.Equals("GO", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (instrucoes.Count == 0)
        {
            avisos.Add("Script contem apenas comentarios: nenhuma instrucao sera executada.");
            return new ValidarScriptResultDto(true, erros, avisos);
        }

        foreach (var inst in instrucoes)
            ValidarInstrucao(inst, erros, avisos);

        if (erros.Count == 0)
            await ChecarTabelasAsync(limpo, avisos, ct);

        return new ValidarScriptResultDto(erros.Count == 0, erros, avisos);
    }

    /// <summary>Remove comentarios e literais; acusa comentarios/aspas/parenteses mal fechados.</summary>
    private static (string Limpo, string? Erro) LimparSql(string sql)
    {
        var sb = new StringBuilder(sql.Length);
        int parenteses = 0;

        for (int i = 0; i < sql.Length; i++)
        {
            char c = sql[i];

            if (c == '-' && i + 1 < sql.Length && sql[i + 1] == '-')
            {
                while (i < sql.Length && sql[i] != '\n') i++;
                if (i < sql.Length) sb.Append('\n');
                continue;
            }

            if (c == '/' && i + 1 < sql.Length && sql[i + 1] == '*')
            {
                int fim = sql.IndexOf("*/", i + 2, StringComparison.Ordinal);
                if (fim < 0)
                    return (sb.ToString(), "Comentario de bloco '/*' nao foi fechado.");
                for (int k = i; k < fim + 2; k++)
                    if (sql[k] == '\n') sb.Append('\n');
                i = fim + 1;
                continue;
            }

            if (c == '\'' || c == '"')
            {
                char aspa = c;
                int j = i + 1;
                bool fechada = false;
                while (j < sql.Length)
                {
                    if (sql[j] == aspa)
                    {
                        if (j + 1 < sql.Length && sql[j + 1] == aspa) { j += 2; continue; }
                        fechada = true;
                        break;
                    }
                    j++;
                }
                if (!fechada)
                    return (sb.ToString(), aspa == '\''
                        ? "Literal de texto (aspas simples) nao fechado."
                        : "Identificador entre aspas duplas nao fechado.");
                sb.Append(aspa).Append(aspa);
                i = j;
                continue;
            }

            if (c == '(') parenteses++;
            else if (c == ')')
            {
                parenteses--;
                if (parenteses < 0)
                    return (sb.ToString(), "Parentesen ')' sem abrir correspondente.");
            }

            sb.Append(c);
        }

        if (parenteses > 0)
            return (sb.ToString(), $"Parenteses aberto(s) sem fechamento: {parenteses}.");
        return (sb.ToString(), null);
    }

    private static void ValidarInstrucao(string inst, List<string> erros, List<string> avisos)
    {
        var partes = inst.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (partes.Length == 0) return;
        var primeiro = partes[0];

        if (primeiro.StartsWith("sp_", StringComparison.OrdinalIgnoreCase)
            || primeiro.StartsWith("xp_", StringComparison.OrdinalIgnoreCase))
            return;

        if (!Verbos.Contains(primeiro))
        {
            erros.Add($"Instrucao nao reconhecida: '{Curtir(inst, 60)}'. Verifique o comando.");
            return;
        }

        if (primeiro is "CREATE" or "ALTER" or "DROP")
        {
            if (partes.Length < 2)
            {
                erros.Add($"'{primeiro}' sem objeto especificado (ex.: {primeiro} TABLE ...).");
                return;
            }
            if (!Objetos.Contains(partes[1]))
                erros.Add($"Objeto '{partes[1]}' nao reconhecido apos '{primeiro}' " +
                          "(esperado TABLE, INDEX, VIEW, PROCEDURE, CONSTRAINT ...).");
        }

        var alto = " " + inst.ToUpperInvariant() + " ";
        if (alto.Contains("DROP TABLE "))
            avisos.Add($"DROP TABLE em '{Curtir(inst, 70)}': remove a tabela e TODOS os dados.");
        if (alto.Contains("DROP COLUMN "))
            avisos.Add("Exclusao de coluna: os dados da coluna serao perdidos.");
        if (alto.Contains("TRUNCATE "))
            avisos.Add("TRUNCATE TABLE apaga todos os dados da tabela.");
        if ((alto.StartsWith(" DELETE ") || alto.StartsWith(" UPDATE "))
            && !alto.Contains(" WHERE "))
            avisos.Add($"'{primeiro}' sem clausula WHERE: afetara todos os registros da tabela.");
    }

    private static string Curtir(string s, int max)
        => s.Length <= max ? s : s[..max] + "...";

    private async Task ChecarTabelasAsync(string sqlLimpo, List<string> avisos, CancellationToken ct)
    {
        HashSet<string> existentes;
        try
        {
            existentes = await CarregarTabelasAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Validacao sem checagem de tabelas (banco indisponivel)");
            avisos.Add("Checagem de tabelas ignorada: banco conectado indisponivel.");
            return;
        }

        var jaAvisadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in RefTabelaRx.Matches(sqlLimpo))
        {
            var bruto = m.Groups["ref"].Value
                .Replace("[", "").Replace("]", "").Replace("\"", "");
            var partes = bruto.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (partes.Length == 0) continue;

            string? chave = null;
            if (partes.Length >= 2)
            {
                if (SchemasIgnorados.Contains(partes[0])) continue;
                chave = $"{partes[0]}.{partes[1]}";
                if (!existentes.Contains(chave) && existentes.Contains(partes[1]))
                    chave = partes[1]; // schema diferente do padrao mas a tabela existe
            }
            else
            {
                var unica = partes[0];
                if (unica.StartsWith('#') || unica.StartsWith('@')) continue;
                chave = unica;
            }

            if (existentes.Contains(chave) || !jaAvisadas.Add(chave)) continue;
            avisos.Add($"Tabela '{chave}' nao encontrada no banco conectado " +
                       "(confirme se e CTE, tabela temporaria ou outro schema).");
        }
    }

    private static readonly Regex RefTabelaRx = new(
        @"\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?<ref>(?:\[[^\]]+\]|""[^""]+""|[A-Za-z_][\w$#]*)" +
        @"(?:\s*\.\s*(?:\[[^\]]+\]|""[^""]+""|[A-Za-z_][\w$#]*))*)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private async Task<HashSet<string>> CarregarTabelasAsync(CancellationToken ct)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using var c = await _conn.OpenAsync(ct);
        await using var cmd = new SqlCommand(
            "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES " +
            "WHERE TABLE_TYPE = 'BASE TABLE'", c);
        await using var r = await cmd.ExecuteReaderAsync(ct);
        while (await r.ReadAsync(ct))
        {
            set.Add(r.GetString(1));
            set.Add($"{r.GetString(0)}.{r.GetString(1)}");
        }
        return set;
    }
}
