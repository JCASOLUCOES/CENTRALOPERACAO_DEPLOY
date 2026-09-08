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

export interface DatabaseQueryRequest {
  sql: string;
  limite?: number;
  timeoutSegundos?: number;
}

export interface DatabaseQueryResult {
  sucesso: boolean;
  colunas: string[];
  linhas: (string | number | null)[][];
  quantidadeRegistros: number;
  duracaoMs: number;
  mensagemErro?: string;
}

export interface DatabaseStatus {
  conectado: boolean;
  servidor: string;
  banco: string;
  mensagem?: string;
  ultimaConsulta: string;
  duracaoMs: number;
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
