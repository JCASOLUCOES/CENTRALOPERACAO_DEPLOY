export interface ConsultaSql {
  id: string;
  titulo: string;
  descricao: string;
  sql: string;
}

export interface CategoriaSql {
  id: string;
  nome: string;
  icone: string;
  consultas: ConsultaSql[];
}

export const bibliotecaSql: CategoriaSql[] = [
  {
    id: 'fundamentos',
    nome: 'Fundamentos do SQL',
    icone: 'bi-cpu',
    consultas: [
      {
        id: 'sql-select',
        titulo: 'SELECT com colunas específicas',
        descricao: 'Sempre selecione apenas as colunas necessárias. Evite SELECT * em produção.',
        sql: `-- Listar devedores com campos úteis para atendimento
SELECT
    devedor_id,
    nome,
    documento,
    cidade,
    uf
FROM tbdevedor
ORDER BY nome;`
      },
      {
        id: 'sql-where',
        titulo: 'WHERE com operadores',
        descricao: 'Filtros combinados com AND/OR. Use parênteses para evitar ambiguidade.',
        sql: `-- Títulos acima de R$ 1.000,00 em aberto
SELECT titulo_id, devedor_id, valor, data_vencimento, situacao
FROM tbtitulo
WHERE situacao = 'A'
  AND valor > 1000.00
ORDER BY valor DESC;`
      },
      {
        id: 'sql-top',
        titulo: 'TOP para limitar resultados',
        descricao: 'Sempre limite o volume retornado em consultas exploratórias.',
        sql: `-- 10 devedores com maior saldo em aberto
SELECT TOP 10 devedor_id, nome, saldo
FROM tbdevedor
ORDER BY saldo DESC;`
      },
      {
        id: 'sql-distinct',
        titulo: 'DISTINCT para eliminar duplicados',
        descricao: 'Cuidado: DISTINCT não substitui um filtro mal construído.',
        sql: `-- Cidades onde existem devedores
SELECT DISTINCT cidade, uf
FROM tbdevedor
ORDER BY uf, cidade;`
      },
      {
        id: 'sql-like',
        titulo: 'Pesquisa por nome (LIKE)',
        descricao: 'Evite % no início da string — impede o uso de índice e é mais lento.',
        sql: `-- Pesquisar devedor pelo nome (case-insensitive no SQL Server)
SELECT devedor_id, nome, documento
FROM tbdevedor
WHERE nome LIKE 'JOAO%'
ORDER BY nome;`
      }
    ]
  },
  {
    id: 'joins',
    nome: 'Joins e Agregações',
    icone: 'bi-diagram-3',
    consultas: [
      {
        id: 'sql-inner-join',
        titulo: 'INNER JOIN',
        descricao: 'Retorna apenas registros que possuem correspondência nas duas tabelas.',
        sql: `-- Títulos com o nome do devedor
SELECT
    t.titulo_id,
    d.nome,
    t.valor,
    t.data_vencimento,
    t.situacao
FROM tbtitulo t
INNER JOIN tbdevedor d
    ON d.devedor_id = t.devedor_id
WHERE t.situacao = 'A';`
      },
      {
        id: 'sql-left-join',
        titulo: 'LEFT JOIN',
        descricao: 'Retorna todos os registros da tabela à esquerda, mesmo sem correspondência.',
        sql: `-- Todos os devedores e a quantidade de títulos (inclui devedores sem títulos)
SELECT
    d.devedor_id,
    d.nome,
    COUNT(t.titulo_id) AS qtd_titulos
FROM tbdevedor d
LEFT JOIN tbtitulo t
    ON t.devedor_id = d.devedor_id
GROUP BY d.devedor_id, d.nome
ORDER BY qtd_titulos DESC;`
      },
      {
        id: 'sql-group-by',
        titulo: 'GROUP BY com HAVING',
        descricao: 'Agrupa registros; HAVING filtra grupos (WHERE filtra linhas antes do agrupamento).',
        sql: `-- Situações de título com mais de 100 registros
SELECT
    situacao,
    COUNT(*) AS qtd,
    SUM(valor) AS total
FROM tbtitulo
GROUP BY situacao
HAVING COUNT(*) > 100
ORDER BY qtd DESC;`
      },
      {
        id: 'sql-agregados',
        titulo: 'Funções de agregação',
        descricao: 'SUM, COUNT, AVG, MIN e MAX ignoram NULL (COUNT(*) não).',
        sql: `-- Resumo financeiro de um devedor
SELECT
    devedor_id,
    COUNT(*)                    AS qtd_titulos,
    SUM(valor)                  AS saldo_total,
    AVG(valor)                  AS valor_medio,
    MIN(data_vencimento)        AS primeira_vencimento,
    MAX(data_vencimento)        AS ultima_vencimento
FROM tbtitulo
WHERE situacao = 'A'
GROUP BY devedor_id;`
      },
      {
        id: 'sql-union',
        titulo: 'UNION vs UNION ALL',
        descricao: 'UNION elimina duplicados; UNION ALL preserva tudo e é mais rápido.',
        sql: `-- Títulos em aberto + títulos pagos (sem duplicar)
SELECT titulo_id, 'EM ABERTO' AS origem
FROM tbtitulo
WHERE situacao = 'A'
UNION
SELECT titulo_id, 'PAGO'
FROM tbtitulo_pago;`
      }
    ]
  },
  {
    id: 'avancado',
    nome: 'Consultas Avançadas',
    icone: 'bi-stars',
    consultas: [
      {
        id: 'sql-cte',
        titulo: 'CTE (WITH)',
        descricao: 'Common Table Expression organiza consultas complexas em etapas legíveis.',
        sql: `-- Top 5 devedores por saldo em aberto, usando CTE
WITH resumo AS (
    SELECT
        devedor_id,
        COUNT(*)   AS qtd,
        SUM(valor) AS saldo
    FROM tbtitulo
    WHERE situacao = 'A'
    GROUP BY devedor_id
)
SELECT TOP 5
    d.nome,
    r.qtd,
    r.saldo
FROM resumo r
INNER JOIN tbdevedor d
    ON d.devedor_id = r.devedor_id
ORDER BY r.saldo DESC;`
      },
      {
        id: 'sql-window',
        titulo: 'Funções de janela (ROW_NUMBER)',
        descricao: 'Números por partição sem agrupar as linhas — útil para rankings e deduplicação.',
        sql: `-- Ranking dos 3 títulos mais caros de cada devedor
WITH rank_titulos AS (
    SELECT
        titulo_id,
        devedor_id,
        valor,
        ROW_NUMBER() OVER (
            PARTITION BY devedor_id
            ORDER BY valor DESC
        ) AS posicao
    FROM tbtitulo
    WHERE situacao = 'A'
)
SELECT devedor_id, titulo_id, valor
FROM rank_titulos
WHERE posicao <= 3;`
      },
      {
        id: 'sql-paginacao',
        titulo: 'Paginação com OFFSET / FETCH',
        descricao: 'Forma correta e eficiente de paginar no SQL Server (2012+).',
        sql: `-- Página 3 com 50 registros por página
SELECT devedor_id, nome, documento
FROM tbdevedor
ORDER BY nome
OFFSET 100 ROWS
FETCH NEXT 50 ROWS ONLY;`
      },
      {
        id: 'sql-exists',
        titulo: 'EXISTS vs IN',
        descricao: 'EXISTS é mais eficiente que IN quando a subconsulta é grande.',
        sql: `-- Devedores que possuem pelo menos um título vencido
SELECT d.devedor_id, d.nome
FROM tbdevedor d
WHERE EXISTS (
    SELECT 1
    FROM tbtitulo t
    WHERE t.devedor_id = d.devedor_id
      AND t.situacao = 'A'
      AND t.data_vencimento < GETDATE()
);`
      },
      {
        id: 'sql-case',
        titulo: 'CASE WHEN',
        descricao: 'Expressões condicionais no SELECT para classificar dados.',
        sql: `-- Classificar atraso dos títulos por faixa
SELECT
    titulo_id,
    valor,
    data_vencimento,
    CASE
        WHEN DATEDIFF(DAY, data_vencimento, GETDATE()) <= 0 THEN 'Em dia'
        WHEN DATEDIFF(DAY, data_vencimento, GETDATE()) <= 30 THEN 'Atraso até 30 dias'
        WHEN DATEDIFF(DAY, data_vencimento, GETDATE()) <= 90 THEN 'Atraso de 31 a 90 dias'
        ELSE 'Atraso acima de 90 dias'
    END AS faixa_atraso
FROM tbtitulo
WHERE situacao = 'A';`
      },
      {
        id: 'sql-lag',
        titulo: 'Comparar linhas com LAG',
        descricao: 'Acessa valores de linhas anteriores sem self join.',
        sql: `-- Diferença de valor entre pagamentos consecutivos de um título
SELECT
    titulo_id,
    data_pagamento,
    valor_pago,
    LAG(valor_pago) OVER (
        PARTITION BY titulo_id
        ORDER BY data_pagamento
    ) AS pagamento_anterior
FROM tbtitulo_pago
ORDER BY titulo_id, data_pagamento;`
      }
    ]
  },
  {
    id: 'devedores',
    nome: 'Devedores e Títulos',
    icone: 'bi-people',
    consultas: [
      {
        id: 'jca-devedor-doc',
        titulo: 'Localizar devedor por documento',
        descricao: 'CPF/CNPJ digitado sem máscara; sempre comparar o documento completo.',
        sql: `-- Procurar devedor pelo documento
SELECT devedor_id, nome, documento, telefone, cidade, uf, saldo
FROM tbdevedor
WHERE documento = '12345678901'; -- CPF/CNPJ sem pontuação`
      },
      {
        id: 'jca-titulos-abertos',
        titulo: 'Títulos em aberto de um devedor',
        descricao: 'Situação "A" (aberto). Adapte a coluna de situação ao modelo do cliente.',
        sql: `-- Todos os títulos em aberto de um devedor
SELECT
    titulo_id,
    valor,
    data_vencimento,
    fila_id,
    situacao
FROM tbtitulo
WHERE devedor_id = 12345
  AND situacao = 'A'
ORDER BY data_vencimento;`
      },
      {
        id: 'jca-titulos-vencidos',
        titulo: 'Títulos vencidos',
        descricao: 'Filtrar vencidos até a data atual com GETDATE().',
        sql: `-- Títulos vencidos de um devedor
SELECT
    titulo_id,
    valor,
    data_vencimento,
    DATEDIFF(DAY, data_vencimento, GETDATE()) AS dias_atraso
FROM tbtitulo
WHERE devedor_id = 12345
  AND situacao = 'A'
  AND data_vencimento < GETDATE()
ORDER BY data_vencimento;`
      },
      {
        id: 'jca-titulos-pagos',
        titulo: 'Títulos pagos de um devedor',
        descricao: 'Histórico de pagamentos com JOIN entre tbtitulo e tbtitulo_pago.',
        sql: `SELECT
    tp.data_pagamento,
    tp.valor_pago,
    tp.forma_pagamento,
    t.titulo_id,
    t.valor,
    t.data_vencimento
FROM tbtitulo_pago tp
INNER JOIN tbtitulo t
    ON t.titulo_id = tp.titulo_id
WHERE t.devedor_id = 12345
ORDER BY tp.data_pagamento DESC;`
      },
      {
        id: 'jca-resumo-devedor',
        titulo: 'Resumo financeiro do devedor',
        descricao: 'Visão consolidada: total em aberto, vencido e pago no período.',
        sql: `SELECT
    d.nome,
    (SELECT ISNULL(SUM(valor), 0)
     FROM tbtitulo
     WHERE devedor_id = d.devedor_id AND situacao = 'A') AS total_aberto,
    (SELECT ISNULL(SUM(valor), 0)
     FROM tbtitulo
     WHERE devedor_id = d.devedor_id
       AND situacao = 'A'
       AND data_vencimento < GETDATE()) AS total_vencido,
    (SELECT ISNULL(SUM(valor_pago), 0)
     FROM tbtitulo_pago tp
     INNER JOIN tbtitulo t ON t.titulo_id = tp.titulo_id
     WHERE t.devedor_id = d.devedor_id) AS total_pago
FROM tbdevedor d
WHERE d.devedor_id = 12345;`
      }
    ]
  },
  {
    id: 'acordos',
    nome: 'Acordos, Importações e Filas',
    icone: 'bi-file-earmark-arrow-down',
    consultas: [
      {
        id: 'jca-acordos',
        titulo: 'Acordos de um devedor',
        descricao: 'Histórico de acordos firmados, com valores e situação de cada acordo.',
        sql: `SELECT
    a.acordo_id,
    a.data_acordo,
    a.valor_total,
    a.entrada,
    a.parcelas,
    a.situacao,
    a.usuario_id
FROM tbacordo a
WHERE a.devedor_id = 12345
ORDER BY a.data_acordo DESC;`
      },
      {
        id: 'jca-importacoes',
        titulo: 'Importações recentes',
        descricao: 'Últimas importações de arquivos no ambiente do cliente.',
        sql: `SELECT TOP 20
    i.importacao_id,
    i.data_importacao,
    i.origem,
    i.nome_arquivo,
    i.total_registros,
    i.importados,
    i.erros,
    i.usuario_id
FROM tbimportacao i
ORDER BY i.data_importacao DESC;`
      },
      {
        id: 'jca-filas',
        titulo: 'Filas e distribuição de títulos',
        descricao: 'Quantidade e valor de títulos por fila — visão de carga de trabalho.',
        sql: `SELECT
    t.fila_id,
    f.nome AS nome_fila,
    COUNT(*)    AS qtd_titulos,
    SUM(t.valor) AS valor_total
FROM tbtitulo t
LEFT JOIN tbfila f
    ON f.fila_id = t.fila_id
WHERE t.situacao = 'A'
GROUP BY t.fila_id, f.nome
ORDER BY qtd_titulos DESC;`
      },
      {
        id: 'jca-campanhas',
        titulo: 'Campanhas e ações de cobrança',
        descricao: 'Quantidade de ações registradas por campanha em um período.',
        sql: `SELECT
    c.campanha_id,
    c.nome AS nome_campanha,
    COUNT(a.acao_id) AS qtd_acoes,
    MIN(a.data_hora) AS primeira_acao,
    MAX(a.data_hora) AS ultima_acao
FROM tbcampanha c
LEFT JOIN tbacao a
    ON a.campanha_id = c.campanha_id
WHERE a.data_hora >= DATEADD(DAY, -7, GETDATE())
GROUP BY c.campanha_id, c.nome
ORDER BY qtd_acoes DESC;`
      }
    ]
  },
  {
    id: 'logs',
    nome: 'Logs e Auditoria',
    icone: 'bi-journal-text',
    consultas: [
      {
        id: 'jca-log-devedor',
        titulo: 'Log de ações de um devedor',
        descricao: 'Rastrear o histórico de atendimento e ações sobre o devedor.',
        sql: `SELECT TOP 50
    l.data_hora,
    u.nome AS usuario,
    l.acao,
    l.detalhe
FROM tblog l
LEFT JOIN tbusuario u
    ON u.usuario_id = l.usuario_id
WHERE l.devedor_id = 12345
ORDER BY l.data_hora DESC;`
      },
      {
        id: 'jca-auditoria-usuario',
        titulo: 'Auditoria por usuário',
        descricao: 'Tudo o que um usuário fez em um período — útil em análises de conduta.',
        sql: `SELECT
    l.data_hora,
    l.acao,
    l.tabela,
    l.registro_id,
    l.detalhe
FROM tbauditoria l
WHERE l.usuario_id = 999
  AND l.data_hora >= '2026-01-01'
ORDER BY l.data_hora DESC;`
      },
      {
        id: 'jca-alteracoes-titulo',
        titulo: 'Alterações recentes em títulos',
        descricao: 'Acompanhar mudanças de situação/valor em um título específico.',
        sql: `SELECT
    a.data_hora,
    u.nome AS usuario,
    a.campo,
    a.valor_anterior,
    a.valor_novo
FROM tbauditoria a
LEFT JOIN tbusuario u
    ON u.usuario_id = a.usuario_id
WHERE a.tabela = 'tbtitulo'
  AND a.registro_id = 789
ORDER BY a.data_hora DESC;`
      }
    ]
  },
  {
    id: 'diagnostico',
    nome: 'Diagnóstico do Ambiente',
    icone: 'bi-activity',
    consultas: [
      {
        id: 'diag-who2',
        titulo: 'Sessões ativas (sp_who2)',
        descricao: 'Proc rápida e nativa para ver o que está rodando no servidor.',
        sql: `EXEC sp_who2;`
      },
      {
        id: 'diag-whoisactive',
        titulo: 'sp_WhoIsActive',
        descricao: 'Diagnóstico completo de sessões (se instalado pelo DBA no ambiente).',
        sql: `EXEC sp_WhoIsActive @get_full_inner_text = 1, @get_plans = 1;`
      },
      {
        id: 'diag-requests',
        titulo: 'Consultas em execução agora',
        descricao: 'SQL real de cada sessão ativa via DMVs — sem dependência de procedures.',
        sql: `SELECT
    r.session_id,
    s.login_name,
    s.host_name,
    s.program_name,
    db_name(r.database_id) AS banco,
    r.status,
    r.command,
    r.cpu_time,
    r.total_elapsed_time / 1000 AS segundos,
    SUBSTRING(
        t.text,
        (r.statement_start_offset / 2) + 1,
        (
            (CASE r.statement_end_offset
                WHEN -1 THEN DATALENGTH(t.text)
                ELSE r.statement_end_offset END
            ) - r.statement_start_offset
        ) / 2 + 1
    ) AS sql_atual
FROM sys.dm_exec_requests r
INNER JOIN sys.dm_exec_sessions s
    ON s.session_id = r.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.status NOT IN ('background', 'sleeping')
ORDER BY r.total_elapsed_time DESC;`
      },
      {
        id: 'diag-bloqueios',
        titulo: 'Bloqueios (quem está bloqueando quem)',
        descricao: 'Identifica cadeias de bloqueio em tempo real.',
        sql: `SELECT
    r.session_id AS bloqueado,
    r.blocking_session_id AS bloqueador,
    db_name(r.database_id) AS banco,
    s.login_name,
    s.program_name,
    r.wait_type,
    r.wait_time,
    SUBSTRING(
        t.text,
        (r.statement_start_offset / 2) + 1,
        ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(t.text)
            ELSE r.statement_end_offset END
        ) - r.statement_start_offset) / 2 + 1
    ) AS sql_atual
FROM sys.dm_exec_requests r
INNER JOIN sys.dm_exec_sessions s
    ON s.session_id = r.session_id
CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
WHERE r.blocking_session_id > 0
ORDER BY r.blocking_session_id;`
      },
      {
        id: 'diag-locks',
        titulo: 'Locks com recurso',
        descricao: 'Recursos travados (tabela/página/chave) e o tipo de lock solicitado.',
        sql: `SELECT
    l.request_session_id,
    db_name(l.resource_database_id) AS banco,
    l.resource_type,
    l.request_mode,
    l.request_status,
    OBJECT_NAME(p.object_id) AS tabela
FROM sys.dm_tran_locks l
LEFT JOIN sys.partitions p
    ON p.hobt_id = l.resource_associated_entity_id
WHERE l.request_session_id > 50
  AND l.resource_type <> 'DATABASE'
ORDER BY l.request_session_id;`
      },
      {
        id: 'diag-deadlocks',
        titulo: 'Deadlocks (arquivo de evento)',
        descricao: 'Graphs de deadlock recentes capturados pelo system_health do SQL Server.',
        sql: `-- Requer permissão de administrador no servidor
SELECT
    CAST(target_data AS XML).query(
        '/RingBufferTarget/event[@name="xml_deadlock_report"]'
    ) AS deadlock_report
FROM sys.dm_xe_session_targets st
INNER JOIN sys.dm_xe_sessions s
    ON s.address = st.event_session_address
WHERE s.name = 'system_health'
  AND st.target_name = 'ring_buffer';`
      },
      {
        id: 'diag-jobs',
        titulo: 'Jobs do SQL Agent',
        descricao: 'Últimas execuções de jobs — verificar rotinas agendadas do cliente.',
        sql: `SELECT
    j.name AS job,
    j.enabled,
    h.run_status,
    h.run_date,
    h.run_time,
    h.run_duration
FROM msdb.dbo.sysjobs j
LEFT JOIN msdb.dbo.sysjobhistory h
    ON h.job_id = j.job_id
   AND h.step_id = 0
WHERE j.name LIKE '%ACTYON%'
ORDER BY h.run_date DESC, h.run_time DESC;`
      },
      {
        id: 'diag-conexoes',
        titulo: 'Conexões por aplicação',
        descricao: 'Distribuição de conexões ativas por aplicação e host.',
        sql: `SELECT
    s.program_name,
    s.host_name,
    s.login_name,
    COUNT(*) AS qtd_conexoes,
    SUM(CASE WHEN s.status = 'running' THEN 1 ELSE 0 END) AS em_execucao
FROM sys.dm_exec_sessions s
WHERE s.is_user_process = 1
GROUP BY s.program_name, s.host_name, s.login_name
ORDER BY qtd_conexoes DESC;`
      }
    ]
  },
  {
    id: 'performance',
    nome: 'Performance e Índices',
    icone: 'bi-speedometer2',
    consultas: [
      {
        id: 'perf-missing-index',
        titulo: 'Índices sugeridos pelo SQL Server',
        descricao: 'DMV de índices ausentes — ótimo ponto de partida para otimização.',
        sql: `SELECT
    OBJECT_NAME(s.object_id) AS tabela,
    s.unique_compiles AS compilacoes,
    s.user_seeks AS seeks,
    s.user_scans AS scans,
    s.avg_user_impact AS impacto_percentual,
    d.equality_columns,
    d.inequality_columns,
    d.included_columns
FROM sys.dm_db_missing_index_group_stats s
INNER JOIN sys.dm_db_missing_index_groups g
    ON g.index_group_handle = s.group_handle
INNER JOIN sys.dm_db_missing_index_details d
    ON d.index_handle = g.index_handle
ORDER BY s.avg_user_impact DESC;`
      },
      {
        id: 'perf-fragmentacao',
        titulo: 'Fragmentação de índices',
        descricao: 'Identifica índices fragmentados (acima de 30% → reorganizar/rebuild).',
        sql: `SELECT
    OBJECT_NAME(ps.object_id) AS tabela,
    i.name AS indice,
    ps.index_type_desc,
    ps.avg_fragmentation_in_percent AS fragmentacao,
    ps.page_count
FROM sys.dm_db_index_physical_stats(
    DB_ID(),
    NULL, NULL, NULL, 'LIMITED'
) ps
INNER JOIN sys.indexes i
    ON i.object_id = ps.object_id
   AND i.index_id = ps.index_id
WHERE ps.page_count > 100
  AND ps.avg_fragmentation_in_percent > 5
ORDER BY ps.avg_fragmentation_in_percent DESC;`
      },
      {
        id: 'perf-plan-cache',
        titulo: 'Queries mais pesadas no plan cache',
        descricao: 'Top queries por tempo total de CPU — candidatas a otimização.',
        sql: `SELECT TOP 10
    qs.total_worker_time / 1000000 AS cpu_segundos,
    qs.execution_count AS execucoes,
    qs.total_logical_reads AS leituras,
    SUBSTRING(
        qt.text,
        (qs.statement_start_offset / 2) + 1,
        (
            (CASE qs.statement_end_offset
                WHEN -1 THEN DATALENGTH(qt.text)
                ELSE qs.statement_end_offset END
            ) - qs.statement_start_offset
        ) / 2 + 1
    ) AS sql_text
FROM sys.dm_exec_query_stats qs
CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
ORDER BY qs.total_worker_time DESC;`
      },
      {
        id: 'perf-nolock',
        titulo: 'NOLOCK — com ressalvas',
        descricao: 'Evita bloqueios de leitura, mas pode ler dados não confirmados. Use com critério.',
        sql: `-- Exemplo: consulta rápida com leitura sem bloqueio
SELECT t.titulo_id, t.valor
FROM tbtitulo t WITH (NOLOCK)
WHERE t.situacao = 'A';

-- Alternativa equivalente no nível da sessão:
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;`
      },
      {
        id: 'perf-tam-tabelas',
        titulo: 'Tamanho e linhas por tabela',
        descricao: 'Visão geral do volume de dados do banco (metadados, sem scan).',
        sql: `SELECT
    t.name AS tabela,
    p.rows AS linhas,
    CAST(
        SUM(a.total_pages) * 8 / 1024.0 AS DECIMAL(10,2)
    ) AS tamanho_mb
FROM sys.tables t
INNER JOIN sys.indexes i
    ON i.object_id = t.object_id
   AND i.index_id IN (0, 1)
INNER JOIN sys.partitions p
    ON p.object_id = t.object_id
   AND p.index_id = i.index_id
INNER JOIN sys.allocation_units a
    ON a.container_id = p.partition_id
GROUP BY t.name, p.rows
ORDER BY tamanho_mb DESC;`
      }
    ]
  },
  {
    id: 'dml',
    nome: 'DML, Transações e Procedimentos',
    icone: 'bi-pencil-square',
    consultas: [
      {
        id: 'dml-update-seguro',
        titulo: 'UPDATE seguro (validar antes de efetivar)',
        descricao: 'Sempre valide com SELECT antes e use BEGIN TRAN para poder desfazer.',
        sql: `-- 1) Validar o que será alterado
SELECT titulo_id, situacao, valor
FROM tbtitulo
WHERE titulo_id = 789;

-- 2) Executar dentro de transação
BEGIN TRAN;

UPDATE tbtitulo
SET situacao = 'B'
WHERE titulo_id = 789;

-- 3) Conferir e decidir:
--    COMMIT;   (manter)
--    ROLLBACK; (desfazer)`
      },
      {
        id: 'dml-delete-top',
        titulo: 'DELETE com TOP e filtro',
        descricao: 'Remova em lotes pequenos para evitar bloqueios longos em produção.',
        sql: `BEGIN TRAN;

DELETE TOP (100)
FROM tblog
WHERE data_hora < DATEADD(MONTH, -6, GETDATE());

-- Conferir linhas afetadas antes de COMMIT
SELECT @@ROWCOUNT AS linhas_afetadas;

-- COMMIT;  ou  ROLLBACK;`
      },
      {
        id: 'dml-insert-output',
        titulo: 'INSERT com OUTPUT',
        descricao: 'Captura valores gerados (identidade, defaults) na mesma instrução.',
        sql: `INSERT INTO tbdevedor (nome, documento, cidade, uf)
OUTPUT INSERTED.devedor_id, INSERTED.nome
VALUES ('NOVO DEVEDOR', '00000000000', 'SAO PAULO', 'SP');`
      },
      {
        id: 'dml-merge',
        titulo: 'MERGE (upsert)',
        descricao: 'Insere ou atualiza conforme a existência do registro na origem.',
        sql: `MERGE tbdevedor AS alvo
USING (SELECT 12345 AS devedor_id, 'NOVO NOME' AS nome) AS origem
    ON alvo.devedor_id = origem.devedor_id
WHEN MATCHED THEN
    UPDATE SET nome = origem.nome
WHEN NOT MATCHED THEN
    INSERT (devedor_id, nome)
    VALUES (origem.devedor_id, origem.nome)
OUTPUT $action, INSERTED.devedor_id;`
      },
      {
        id: 'dml-procedure',
        titulo: 'Stored procedure simples',
        descricao: 'Padrão de procedure com parâmetros e retorno de SELECT.',
        sql: `CREATE OR ALTER PROCEDURE sp_titulos_abertos_devedor
    @devedor_id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT titulo_id, valor, data_vencimento, situacao
    FROM tbtitulo
    WHERE devedor_id = @devedor_id
      AND situacao = 'A'
    ORDER BY data_vencimento;
END;
GO

-- Executar:
EXEC sp_titulos_abertos_devedor @devedor_id = 12345;`
      },
      {
        id: 'dml-trigger',
        titulo: 'Trigger de auditoria',
        descricao: 'Exemplo de trigger AFTER que grava alterações em tabela de auditoria.',
        sql: `CREATE OR ALTER TRIGGER trg_tbtitulo_auditoria
ON tbtitulo
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO tbauditoria (tabela, registro_id, campo, valor_anterior, valor_novo, data_hora)
    SELECT
        'tbtitulo',
        i.titulo_id,
        'situacao',
        d.situacao,
        i.situacao,
        GETDATE()
    FROM INSERTED i
    INNER JOIN DELETED d
        ON d.titulo_id = i.titulo_id
    WHERE ISNULL(i.situacao, '') <> ISNULL(d.situacao, '');
END;`
      },
      {
        id: 'dml-temp-table',
        titulo: 'Tabela temporária',
        descricao: 'Preparar dados intermediários em etapas para consultas complexas.',
        sql: `-- Criar tabela temporária local
SELECT devedor_id, SUM(valor) AS saldo
INTO #resumo_devedores
FROM tbtitulo
WHERE situacao = 'A'
GROUP BY devedor_id;

-- Usar em etapas seguintes
SELECT TOP 10 d.nome, r.saldo
FROM #resumo_devedores r
INNER JOIN tbdevedor d
    ON d.devedor_id = r.devedor_id
ORDER BY r.saldo DESC;

-- Remover ao final
DROP TABLE IF EXISTS #resumo_devedores;`
      }
    ]
  }
];
