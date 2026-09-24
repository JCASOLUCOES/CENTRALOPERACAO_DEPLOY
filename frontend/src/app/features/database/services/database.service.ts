import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  DatabaseInfo, DatabaseTable, DatabaseColumn, DatabaseIndex,
  DatabaseRelationship, DatabaseSearchResult,
  DatabaseStatus, DatabaseConnectionConfig,
  ProcedureResumo, ProcedureDetalhe,
  Trigger, Dependencia, ProcedureAnalysis,
  SchemaComparisonResult, SchemaComparisonBatchResult
} from '../models/database.model';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/database`;

  status(): Observable<DatabaseStatus> {
    return this.http.get<DatabaseStatus>(`${this.baseUrl}/status`);
  }

  info(): Observable<DatabaseInfo> {
    return this.http.get<DatabaseInfo>(`${this.baseUrl}/info`);
  }

  listarTabelas(schema?: string): Observable<DatabaseTable[]> {
    let params = new HttpParams();
    if (schema) params = params.set('schema', schema);
    return this.http.get<DatabaseTable[]>(`${this.baseUrl}/tables`, { params });
  }

  obterTabela(schema: string, nome: string): Observable<DatabaseTable> {
    return this.http.get<DatabaseTable>(`${this.baseUrl}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}`);
  }

  listarColunas(schema: string, nome: string): Observable<DatabaseColumn[]> {
    return this.http.get<DatabaseColumn[]>(`${this.baseUrl}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}/columns`);
  }

  listarIndices(schema: string, nome: string): Observable<DatabaseIndex[]> {
    return this.http.get<DatabaseIndex[]>(`${this.baseUrl}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}/indexes`);
  }

  relacionamentos(schema?: string, incluirPossiveis = false, take = 500, tabela?: string): Observable<DatabaseRelationship[]> {
    let params = new HttpParams().set('incluirPossiveis', String(incluirPossiveis)).set('take', String(take));
    if (schema) params = params.set('schema', schema);
    if (tabela) params = params.set('tabela', tabela);
    return this.http.get<DatabaseRelationship[]>(`${this.baseUrl}/relationships`, { params });
  }

  grafo(tabela: string, profundidade = 2, incluirPossiveis = false): Observable<DatabaseRelationship[]> {
    let params = new HttpParams().set('tabela', tabela).set('profundidade', String(profundidade)).set('incluirPossiveis', String(incluirPossiveis));
    return this.http.get<DatabaseRelationship[]>(`${this.baseUrl}/graph`, { params });
  }

  usoColuna(coluna: string): Observable<DatabaseRelationship[]> {
    return this.http.get<DatabaseRelationship[]>(`${this.baseUrl}/column-usage`, { params: new HttpParams().set('coluna', coluna) });
  }

  buscar(termo: string, take = 200): Observable<DatabaseSearchResult[]> {
    return this.http.get<DatabaseSearchResult[]>(`${this.baseUrl}/search`, {
      params: new HttpParams().set('termo', termo).set('take', String(take))
    });
  }

  testarConexao(): Observable<DatabaseStatus> {
    return this.http.get<DatabaseStatus>(`${this.baseUrl}/status`);
  }

  obterConfig(): Observable<DatabaseConnectionConfig> {
    return this.http.get<DatabaseConnectionConfig>(`${this.baseUrl}/config`);
  }

  listarProcedures(schema?: string, busca?: string, take = 5000): Observable<ProcedureResumo[]> {
    let params = new HttpParams().set('take', String(take));
    if (schema) params = params.set('schema', schema);
    if (busca) params = params.set('busca', busca);
    return this.http.get<ProcedureResumo[]>(`${this.baseUrl}/procedures`, { params });
  }

  obterProcedure(schema: string, nome: string): Observable<ProcedureDetalhe> {
    return this.http.get<ProcedureDetalhe>(`${this.baseUrl}/procedures/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}`);
  }

  listarTriggers(schema?: string, tabela?: string): Observable<Trigger[]> {
    let params = new HttpParams();
    if (schema) params = params.set('schema', schema);
    if (tabela) params = params.set('tabela', tabela);
    return this.http.get<Trigger[]>(`${this.baseUrl}/triggers`, { params });
  }

  obterTrigger(schema: string, nome: string): Observable<Trigger> {
    return this.http.get<Trigger>(`${this.baseUrl}/triggers/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}`);
  }

  listarDependencias(schema: string, tabela: string): Observable<Dependencia[]> {
    return this.http.get<Dependencia[]>(`${this.baseUrl}/tables/${encodeURIComponent(schema)}/${encodeURIComponent(tabela)}/dependencies`);
  }

  analisarProcedure(schema: string, nome: string): Observable<ProcedureAnalysis> {
    return this.http.get<ProcedureAnalysis>(`${this.baseUrl}/procedures/${encodeURIComponent(schema)}/${encodeURIComponent(nome)}/analysis`);
  }

  // Query Builder Avançado
  executarQueryBuilderAvançado(req: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/query-builder-advanced`, req);
  }

  // Comparação de schemas (upload arquivo x schema JCA)
  compararSchemas(schema: string, tabela: string, arquivo: File): Observable<SchemaComparisonResult> {
    const fd = new FormData();
    fd.append('schema', schema);
    fd.append('tabela', tabela);
    fd.append('arquivo', arquivo, arquivo.name);
    return this.http.post<SchemaComparisonResult>(`${this.baseUrl}/compare-schemas`, fd);
  }

  compararSchemasLote(arquivo: File): Observable<SchemaComparisonBatchResult> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    return this.http.post<SchemaComparisonBatchResult>(`${this.baseUrl}/compare-schemas-lote`, fd);
  }
}
