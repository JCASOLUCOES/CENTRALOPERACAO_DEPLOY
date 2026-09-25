import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";
import { OperadoresService, OperadorResumo } from "@core/services/operadores.service";
import {
  TarefaResumo,
  TarefaDetalhe,
  TarefaCriarRequest,
  TarefaAtualizarRequest,
  TarefaMudarColunaRequest,
  ComentarioCriarRequest,
  ApontamentoCriarRequest,
  ApontamentoAtualizarRequest,
  ApontamentoResumo,
  ChamadoResumo,
  HistoricoMovimentacao,
  TarefaFiltro
} from "../models/tarefa.model";

export type {
  TarefaResumo,
  TarefaDetalhe,
  TarefaCriarRequest,
  TarefaAtualizarRequest,
  TarefaMudarColunaRequest,
  ComentarioCriarRequest,
  ApontamentoCriarRequest,
  ApontamentoAtualizarRequest,
  ApontamentoResumo,
  ChamadoResumo,
  HistoricoMovimentacao,
  TarefaFiltro
};

@Injectable({ providedIn: "root" })
export class TarefasService {
  private readonly http = inject(HttpClient);
  private readonly operadoresSvc = inject(OperadoresService);
  private readonly baseUrl = `${environment.apiBaseUrl}/implantacao/tarefas`;

listar(filtro: TarefaFiltro): Observable<TarefaResumo[]> {
    let params = new HttpParams();
    if (filtro.projetoId != null) params = params.set("projetoId", String(filtro.projetoId));
    if (filtro.responsavelId) params = params.set("responsavelId", filtro.responsavelId);
    if (filtro.status) params = params.set("status", filtro.status);
    if (filtro.prioridade != null) params = params.set("prioridade", String(filtro.prioridade));
    if (filtro.tipo != null) params = params.set("tipo", String(filtro.tipo));
    if (filtro.buscar) params = params.set("buscar", filtro.buscar);
    if (filtro.apenasAtrasadas) params = params.set("apenasAtrasadas", "true");
    if (filtro.apenasEmAndamento) params = params.set("apenasEmAndamento", "true");
    if (filtro.apenasConcluidas) params = params.set("apenasConcluidas", "true");
    if (filtro.apenasVenceHoje) params = params.set("apenasVenceHoje", "true");
    if (filtro.perfilId) params = params.set("perfilId", filtro.perfilId);
    if (filtro.perfilModo) params = params.set("perfilModo", filtro.perfilModo);
    if (filtro.incluirArquivadas) params = params.set("incluirArquivadas", "true");
    return this.http.get<TarefaResumo[]>(this.baseUrl, { params });
  }

  obter(id: number): Observable<TarefaDetalhe> {
    return this.http.get<TarefaDetalhe>(`${this.baseUrl}/${id}`);
  }

  criar(req: TarefaCriarRequest): Observable<TarefaDetalhe> {
    return this.http.post<TarefaDetalhe>(this.baseUrl, req);
  }

  atualizar(id: number, req: TarefaAtualizarRequest): Observable<TarefaDetalhe> {
    return this.http.put<TarefaDetalhe>(`${this.baseUrl}/${id}`, req);
  }

  mudarColuna(id: number, req: TarefaMudarColunaRequest): Observable<TarefaDetalhe> {
    return this.http.patch<TarefaDetalhe>(`${this.baseUrl}/${id}/coluna`, req);
  }

  arquivar(id: number): Observable<TarefaDetalhe> {
    return this.http.patch<TarefaDetalhe>(`${this.baseUrl}/${id}/arquivar`, {});
  }

  desarquivar(id: number): Observable<TarefaDetalhe> {
    return this.http.patch<TarefaDetalhe>(`${this.baseUrl}/${id}/desarquivar`, {});
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  adicionarComentario(tarefaId: number, req: ComentarioCriarRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/${tarefaId}/comentarios`, req);
  }

  buscarChamados(buscar?: string, take = 20): Observable<ChamadoResumo[]> {
    let params = new HttpParams().set("take", String(take));
    if (buscar) params = params.set("buscar", buscar);
    return this.http.get<ChamadoResumo[]>(`${this.baseUrl}/chamados/busca`, { params });
  }

  vincularChamado(tarefaId: number, chamadoId: number): Observable<TarefaDetalhe> {
    return this.http.post<TarefaDetalhe>(`${this.baseUrl}/${tarefaId}/chamados`, { chamadoId });
  }

  desvincularChamado(tarefaId: number, chamadoId: number): Observable<TarefaDetalhe> {
    return this.http.delete<TarefaDetalhe>(`${this.baseUrl}/${tarefaId}/chamados/${chamadoId}`);
  }

  adicionarApontamento(tarefaId: number, req: ApontamentoCriarRequest): Observable<ApontamentoResumo> {
    return this.http.post<ApontamentoResumo>(`${this.baseUrl}/${tarefaId}/apontamentos`, req);
  }

  atualizarApontamento(apontamentoId: number, req: ApontamentoAtualizarRequest): Observable<ApontamentoResumo> {
    return this.http.put<ApontamentoResumo>(`${this.baseUrl}/apontamentos/${apontamentoId}`, req);
  }

  excluirApontamento(apontamentoId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/apontamentos/${apontamentoId}`);
  }

  obterHistorico(tarefaId: number): Observable<HistoricoMovimentacao[]> {
    return this.http.get<HistoricoMovimentacao[]>(`${this.baseUrl}/${tarefaId}/historico`);
  }

  /** Delegado para OperadoresService compartilhado. */
  listarOperadores(): Observable<OperadorResumo[]> {
    return this.operadoresSvc.listar();
  }
}
