import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, map } from "rxjs";
import { environment } from "../../../../environments/environment";
import { OperadoresService, OperadorResumo } from "@core/services/operadores.service";
import {
  ProjetoEtapaChecklistItemRequest,
  ProjetoEtapaAtualizarRequest,
  ProjetoEtapaRetornoRequest,
  ProjetoEtapaDocumentoRequest,
  ProjetoEtapaComentarioRequest,
  ProjetoComEtapasResumo,
  ProjetoResumo,
  ProjetoDetalhe,
  ProjetoFiltro,
  ClienteResumo,
  TipoProjetoResumo,
  ProjetoCriarRequest,
  ProjetoAtualizarRequest,
  ProjetoEtapaResumo,
  ProjetoEtapaDetalhe,
  ProjetoEtapaEstado,
  ProjetoEtapaChecklistItem,
  ProjetoEtapaDocumentoItem,
  ProjetoEtapaHistoricoItem,
  ProjetoEtapaComentarioItem,
  EtapaPadraoResumo
} from "../models/projeto.model";

@Injectable({ providedIn: "root" })
export class ProjetosService {
  private readonly http = inject(HttpClient);
  private readonly operadoresSvc = inject(OperadoresService);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/projetos`;

  listar(filtro: ProjetoFiltro): Observable<ProjetoResumo[]> {
    let params = new HttpParams();
    if (filtro.tipo) params = params.set("tipo", filtro.tipo);
    if (filtro.status) params = params.set("status", filtro.status);
    if (filtro.clienteId != null) params = params.set("clienteId", String(filtro.clienteId));
    if (filtro.responsavelId) params = params.set("responsavelId", filtro.responsavelId);
    if (filtro.buscar) params = params.set("buscar", filtro.buscar);
    if (filtro.perfilId) params = params.set("perfilId", filtro.perfilId);
    return this.http.get<ProjetoResumo[]>(this.baseUrl, { params });
  }

  listarComEtapas(filtro: ProjetoFiltro): Observable<ProjetoComEtapasResumo[]> {
    let params = new HttpParams();
    if (filtro.tipo) params = params.set("tipo", filtro.tipo);
    if (filtro.status) params = params.set("status", filtro.status);
    if (filtro.clienteId != null) params = params.set("clienteId", String(filtro.clienteId));
    if (filtro.responsavelId) params = params.set("responsavelId", filtro.responsavelId);
    if (filtro.buscar) params = params.set("buscar", filtro.buscar);
    if (filtro.perfilId) params = params.set("perfilId", filtro.perfilId);
    return this.http.get<ProjetoComEtapasResumo[]>(`${this.baseUrl}/com-etapas`, { params });
  }

  obter(id: number): Observable<ProjetoDetalhe> {
    return this.http.get<ProjetoDetalhe>(`${this.baseUrl}/${id}`);
  }

  obterEtapaDetalhe(projetoId: number, ordem: number): Observable<ProjetoEtapaDetalhe> {
    return this.http.get<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/${ordem}`);
  }

  atualizarEtapa(projetoId: number, ordem: number, req: ProjetoEtapaAtualizarRequest): Observable<ProjetoEtapaDetalhe> {
    return this.http.put<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/${ordem}`, req);
  }

  retornarEtapa(projetoId: number, req: ProjetoEtapaRetornoRequest): Observable<ProjetoEtapaDetalhe> {
    return this.http.post<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/retornar`, req);
  }

  adicionarChecklistItem(projetoId: number, ordem: number, item: ProjetoEtapaChecklistItemRequest): Observable<ProjetoEtapaDetalhe> {
    return this.http.post<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/${ordem}/checklist`, item);
  }

  adicionarDocumento(projetoId: number, ordem: number, req: ProjetoEtapaDocumentoRequest): Observable<ProjetoEtapaDetalhe> {
    return this.http.post<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/${ordem}/documentos`, req);
  }

  adicionarComentario(projetoId: number, ordem: number, req: ProjetoEtapaComentarioRequest): Observable<ProjetoEtapaDetalhe> {
    return this.http.post<ProjetoEtapaDetalhe>(`${this.baseUrl}/${projetoId}/etapas/${ordem}/comentarios`, req);
  }

  obterEtapasProjeto(projetoId: number): Observable<ProjetoEtapaResumo[]> {
    return this.http.get<ProjetoEtapaResumo[]>(`${this.baseUrl}/${projetoId}/etapas`);
  }

  /** Lista fixa das 9 etapas padrão (fonte única no backend). */
  listarEtapasPadrao(): Observable<EtapaPadraoResumo[]> {
    return this.http.get<EtapaPadraoResumo[]>(`${this.baseUrl}/etapas-padrao`);
  }

  // M�todos originais mantidos para compatibilidade
  listarTipos(): Observable<TipoProjetoResumo[]> {
    return this.http.get<TipoProjetoResumo[]>(`${environment.apiBaseUrl}/implantacao/tipos-projeto`, {
      params: new HttpParams().set("apenasAtivos", "true")
    });
  }

  listarClientes(): Observable<ClienteResumo[]> {
    return this.http.get<ClienteResumo[]>(`${this.baseUrl}/clientes`);
  }

  /** Delegado para OperadoresService compartilhado. */
  listarOperadores(): Observable<OperadorResumo[]> {
    return this.operadoresSvc.listar();
  }

  listarColunasKanban(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/implantacao/colunas-kanban?apenasAtivas=true`);
  }

  criar(req: ProjetoCriarRequest): Observable<ProjetoDetalhe> {
    return this.http.post<ProjetoDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: ProjetoAtualizarRequest): Observable<ProjetoDetalhe> {
    return this.http.put<ProjetoDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  obterProximoCodigo(): Observable<string> {
    return this.http.get<{ codigo: string }>(`${this.baseUrl}/proximo-codigo`).pipe(
      map((resposta) => resposta?.codigo ?? "")
    );
  }
}
