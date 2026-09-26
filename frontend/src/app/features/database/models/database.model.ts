export interface DatabaseInfo {
  conectado: boolean;
  servidor: string;
  banco: string;
  versaoSqlServer?: string;
  quantidadeTabelas: number;
  quantidadeColunas: number;
  quantidadePks: number;
  quantidadeFks: number;
  quantidadeIndices: number;
  quantidadeViews: number;
  quantidadeProcedures: number;
  quantidadeFunctions: number;
  quantidadeTriggers: number;
  usuario?: string;
  ultimaConsulta: string;
  duracaoMs: number;
  mensagemErro?: string;
}

export interface DatabaseTable {
  schema: string;
  nome: string;
  nomeCompleto: string;
  quantidadeRegistros: number;
  dataCriacao?: string;
  dataAlteracao?: string;
  quantidadeColunas: number;
  quantidadeIndices: number;
  quantidadeRelacionamentos: number;
}

export interface DatabaseColumn {
  tabela: string;
  coluna: string;
  ordem: number;
  tipo: string;
  nulo: boolean;
  tamanho?: number;
  precisao?: number;
  escala?: number;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isIdentity: boolean;
  valorDefault?: string;
  collation?: string;
}

export interface DatabaseIndex {
  tabela: string;
  nome: string;
  tipo: string;
  unique: boolean;
  colunas: string[];
}

export interface DatabaseForeignKey {
  nome: string;
  tabelaOrigem: string;
  colunaOrigem: string;
  tabelaDestino: string;
  colunaDestino: string;
  acaoUpdate?: string;
  acaoDelete?: string;
}

export interface DatabaseRelationship {
  tipo: 'Confirmada' | 'Possivel';
  tabelaOrigem: string;
  colunaOrigem: string;
  tabelaDestino: string;
  colunaDestino: string;
  score: number;
  motivos: string[];
}

export interface DatabaseSearchResult {
  tipo: string;
  objeto: string;
  coluna?: string;
  schema?: string;
  detalhe?: string;
}

export interface DatabaseStatus {
  conectado: boolean;
  servidor: string;
  banco: string;
  mensagem?: string;
  ultimaConsulta: string;
  duracaoMs: number;
  usuario?: string;
}

export interface DatabaseConnectionConfig {
  servidor: string;
  porta: number;
  banco: string;
  usuario: string;
  senha?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
}

export interface ProcedureResumo {
  schema: string;
  nome: string;
  nomeCompleto: string;
  tipo: string;
  dataCriacao?: string;
  dataAlteracao?: string;
  preview?: string;
  quantidadeParametros: number;
}

export interface ProcedureParametro {
  nome: string;
  tipo: string;
  isOutput: boolean;
  ordem: number;
  hasDefault: boolean;
  valorDefault: string;
}

export interface ProcedureDetalhe {
  schema: string;
  nome: string;
  nomeCompleto: string;
  tipo: string;
  dataCriacao?: string;
  dataAlteracao?: string;
  corpo?: string;
  parametros: ProcedureParametro[];
}

export interface Trigger {
  schema: string;
  nome: string;
  tabela: string;
  evento: string;
  momento: string;
  corpo: string;
  acoes?: string[];
  tabelasAfetadas?: string[];
}

export interface Dependencia {
  tipo: string;
  schema: string;
  nome: string;
  descricao: string;
}

export interface ProcedureAnalysis {
  parametros: ProcedureParametro[];
  tabelasUtilizadas: string[];
  proceduresChamadas: string[];
  explicacao: string;
  fluxoIdentificado: string[];
}

// WHERE Condition
export interface WhereCondition {
  coluna: string;
  operador: string;
  valor?: string;
  valor2?: string;
  logica: 'AND' | 'OR';
}

// ORDER BY Condition
export interface OrderByCondition {
  coluna: string;
  ascendente: boolean;
}

// GROUP BY Condition
export interface GroupByCondition {
  coluna: string;
  agregacao?: string; // COUNT, SUM, AVG, MIN, MAX
}

// CTE
export interface CteDefinition {
  nome: string;
  sql: string;
}

// Query Builder Advanced Request
export interface QueryBuilderAdvancedRequest {
  tabelas: string[];
  colunas: string[];
  relacionamentos: any[];
  whereConditions?: WhereCondition[];
  orderBy?: OrderByCondition[];
  groupBy?: GroupByCondition[];
  limite?: number;
  ctes?: CteDefinition[];
}

// Schema Comparison (upload arquivo x schema JCA)
export interface SchemaColumnInfo {
  nome: string;
  tipo: string;
  nulo: boolean;
  ordem: number;
  tamanho?: number;
  precisao?: number;
  escala?: number;
  valorDefault?: string;
}

export interface SchemaIndexInfo {
  nome: string;
  unique: boolean;
  colunas: string[];
}

export interface SchemaFkInfo {
  nome: string;
  colunaOrigem: string;
  tabelaDestino: string;
  colunaDestino: string;
}

export interface SchemaPkInfo {
  nome: string;
  colunas: string[];
}

export interface SchemaInfo {
  tabela: string;
  colunas: SchemaColumnInfo[];
  indices: SchemaIndexInfo[];
  fks: SchemaFkInfo[];
  pk?: SchemaPkInfo | null;
}

export type SchemaDifferenceCategoria =
  | 'Coluna' | 'Tipo' | 'Nullable' | 'Indice' | 'Fk' | 'Pk' | 'Tabela';

export interface SchemaDifference {
  severidade: 'Critico' | 'Aviso' | 'Ok';
  categoria: SchemaDifferenceCategoria;
  campo: string;
  esperado?: string;
  encontrado?: string;
  descricao: string;
  numeroCritico?: number;
}

// =====================================================================
// Abas do relatório de diferenças (tabela única e banco inteiro)
// =====================================================================

export type AbaRelatorio = 'tabelas' | 'colunas' | 'tamanhos' | 'indices' | 'chaves';

export interface AbaRelatorioDef {
  key: AbaRelatorio;
  rotulo: string;
  curto: string;
  categorias: SchemaDifferenceCategoria[];
  /** Aba exibida apenas no modo banco inteiro. */
  somenteBulk?: boolean;
  icone: string;
}

export const ABAS_RELATORIO: AbaRelatorioDef[] = [
  {
    key: 'tabelas',
    rotulo: 'Tabelas faltantes',
    curto: 'Tabelas',
    categorias: ['Tabela'],
    somenteBulk: true,
    icone: 'bi-table'
  },
  {
    key: 'colunas',
    rotulo: 'Colunas faltantes',
    curto: 'Colunas',
    categorias: ['Coluna'],
    icone: 'bi-list-columns'
  },
  {
    key: 'tamanhos',
    rotulo: 'Tamanhos divergentes',
    curto: 'Tamanhos',
    categorias: ['Tipo', 'Nullable'],
    icone: 'bi-rulers'
  },
  {
    key: 'indices',
    rotulo: 'Índices divergentes ou faltantes',
    curto: 'Índices',
    categorias: ['Indice'],
    icone: 'bi-signpost-split'
  },
  {
    key: 'chaves',
    rotulo: 'Chaves FK e PK divergentes e faltantes',
    curto: 'FK e PK',
    categorias: ['Fk', 'Pk'],
    icone: 'bi-key'
  }
];

export function abaDeCategoria(cat: SchemaDifferenceCategoria): AbaRelatorio {
  const aba = ABAS_RELATORIO.find(a => a.categorias.includes(cat));
  return aba ? aba.key : 'colunas';
}

export interface SchemaComparisonResult {
  geradoEm: string;
  tabela: string;
  arquivoNome?: string;
  totalColunasJca: number;
  totalColunasArquivo: number;
  criticos: number;
  avisos: number;
  oks: number;
  percentualMatch: number;
  diferencas: SchemaDifference[];
  schemaArquivo?: SchemaInfo;
  schemaJca?: SchemaInfo;
}

export type BulkTableStatus = 'Ok' | 'Diferencas' | 'SomenteArquivo' | 'SomenteBanco';

export interface BulkTableComparison {
  tabela: string;
  status: BulkTableStatus;
  criticos: number;
  avisos: number;
  oks: number;
  percentualMatch: number;
  totalColunasJca: number;
  totalColunasArquivo: number;
  diferencas: SchemaDifference[];
  schemaArquivo?: SchemaInfo;
  schemaJca?: SchemaInfo;
}

export interface BulkSchemaComparisonResult {
  geradoEm: string;
  arquivoNome?: string;
  totalTabelasArquivo: number;
  totalTabelasBanco: number;
  tabelasOk: number;
  tabelasComDiferenca: number;
  somenteArquivo: number;
  somenteBanco: number;
  criticos: number;
  avisos: number;
  oks: number;
  percentualMatch: number;
  tabelas: BulkTableComparison[];
}

// =====================================================================
// Geração de scripts SQL de correção (somente criações vindas do arquivo;
// divergências seguem o padrão do banco JCA — nenhum script é gerado)
// =====================================================================

export type SqlScriptTipo =
  | 'CREATE_TABLE'
  | 'ADD_COLUMN'
  | 'CREATE_INDEX'
  | 'ALTER_FK';

export type SqlScriptSeveridade = 'Info' | 'Aviso' | 'Critico';

export type SqlImpacto = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SqlScript {
  id: string;
  tipo: SqlScriptTipo;
  severidade: SqlScriptSeveridade;
  sql: string;
  sqlFormatado: string;
  descricao: string;
  campoRelacionado: string;
  tabela?: string | null;
  severidadeOrigem?: string | null;
  consultaValidacao?: string;
}

export interface SqlScriptResumo {
  totalCriacoes: number;
  totalAlteracoes: number;
  totalIndices: number;
  impactoEstimado: SqlImpacto;
  qtdAvisos: number;
  revisaoManual: string[];
}

export interface SqlScriptResult {
  scriptsCriacao: SqlScript[];
  scriptsAlteracao: SqlScript[];
  scriptsIndiceConstraint: SqlScript[];
  resumo: SqlScriptResumo;
}

export interface ValidarScriptResult {
  valido: boolean;
  erros: string[];
  avisos: string[];
}

// =====================================================================
// Comparação de procedures (somente leitura, sem geração de scripts)
// =====================================================================

export type ProcedureStatus = 'Compativel' | 'Divergente' | 'SomenteBanco' | 'SomenteArquivo';

export interface ProcedureComparison {
  schema: string;
  nome: string;
  status: ProcedureStatus;
  corpoJca?: string | null;
  corpoArquivo?: string | null;
}

export interface ProceduresComparisonResult {
  geradoEm: string;
  arquivoNome?: string | null;
  totalBanco: number;
  totalArquivo: number;
  compativeis: number;
  divergentes: number;
  somenteBanco: number;
  somenteArquivo: number;
  itens: ProcedureComparison[];
}
