import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../../../environments/environment";
import { OperadoresService, OperadorResumo } from "@core/services/operadores.service";

export interface TipoEventoResponse {
  id: number;
  nome: string;
  cor: string | null;
}

export interface FuncaoResumo {
  id: number;
  descricao: string;
  classificacao: string | null;
}

export interface AgendaParticipanteResponse {
  participanteId: string;
  participanteNome: string | null;
}

export interface AgendaResumo {
  id: number;
  operadorId: string;
  operadorNome: string | null;
  titulo: string;
  dataInicio: string;
  dataFim: string | null;
  diaInteiro: boolean;
  cor: string | null;
  tipo: number;
  tipoId: number | null;
  tipoNome: string | null;
  tipoCor: string | null;
  projetoId: number | null;
  projetoCodigo: string | null;
  /** 0=Normal, 1=Alta, 2=Cr�tica */
  prioridade: number;
  /** SLA em minutos (opcional). */
  slaMinutos: number | null;
}

export interface AgendaDetalhe {
  id: number;
  operadorId: string;
  operadorNome: string | null;
  titulo: string;
  descricao: string | null;
  local: string | null;
  dataInicio: string;
  dataFim: string | null;
  diaInteiro: boolean;
  cor: string | null;
  tipo: number;
  tipoId: number | null;
  tipoNome: string | null;
  tipoCor: string | null;
  projetoId: number | null;
  projetoCodigo: string | null;
  participantes: AgendaParticipanteResponse[];
  usuarioInclusao: string | null;
  dataInclusao: string;
  usuarioAlteracao: string | null;
  dataAlteracao: string | null;
  prioridade: number;
  slaMinutos: number | null;
}

export interface AgendaCriarRequest {
  titulo: string;
  descricao?: string;
  local?: string;
  dataInicio: string;
  dataFim?: string;
  diaInteiro: boolean;
  tipoId?: number;
  responsavelId: string;
  projetoId?: number;
  participantesIds?: string[];
  prioridade: number;
  slaMinutos?: number;
}

export interface AgendaAtualizarRequest {
  titulo: string;
  descricao?: string;
  local?: string;
  dataInicio: string;
  dataFim?: string;
  diaInteiro: boolean;
  tipoId?: number;
  responsavelId: string;
  projetoId?: number;
  participantesIds?: string[];
  usuarioAlteracao: string;
  prioridade: number;
  slaMinutos?: number;
}

export interface AgendaMoverRequest {
  novaDataInicio: string;
  novaDataFim: string;
}

export interface AgendaCriarLoteRequest {
  titulo: string;
  descricao?: string;
  local?: string;
  dataInicio: string;
  dataFim?: string;
  diaInteiro: boolean;
  tipoId?: number;
  responsavelId: string;
  projetoId?: number;
  participantesIds?: string[];
  prioridade: number;
  slaMinutos?: number;
  dataRepeticaoFim: string;
  /** Padrão de recorrência: 1=Diária, 2=Semanal, 3=Mensal. */
  padraoRecorrencia?: number;
}

export interface AgendaLoteResponse {
  totalCriados: number;
  eventos: AgendaDetalhe[];
}

export interface ErroConflito {
  mensagem: string;
  conflitos: AgendaResumo[];
  code: string;
}

export interface AgendaFiltro {
  inicio: string;
  fim: string;
  responsavelId?: string;
  funcaoId?: number;
}

@Injectable({ providedIn: "root" })
export class AgendaService {
  private readonly http = inject(HttpClient);
  private readonly operadoresSvc = inject(OperadoresService);
  private readonly baseUrl = `${environment.apiBaseUrl}/agenda`;

  listarEventos(inicio: string, fim: string, responsavelId?: string, funcaoId?: number): Observable<AgendaResumo[]> {
    let params = new HttpParams()
      .set("inicio", inicio)
      .set("fim", fim);
    if (responsavelId) {
      params = params.set("responsavelId", responsavelId);
    }
    if (funcaoId != null) {
      params = params.set("funcaoId", funcaoId);
    }
    return this.http.get<AgendaResumo[]>(`${this.baseUrl}/eventos`, { params });
  }

  obterEvento(id: number): Observable<AgendaDetalhe> {
    return this.http.get<AgendaDetalhe>(`${this.baseUrl}/eventos/${id}`);
  }

  criarEvento(req: AgendaCriarRequest): Observable<AgendaDetalhe> {
    return this.http.post<AgendaDetalhe>(`${this.baseUrl}/eventos`, req);
  }

  atualizarEvento(id: number, req: AgendaAtualizarRequest): Observable<AgendaDetalhe> {
    return this.http.put<AgendaDetalhe>(`${this.baseUrl}/eventos/${id}`, req);
  }

  excluirEvento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/eventos/${id}`);
  }

  moverEvento(id: number, req: AgendaMoverRequest): Observable<AgendaDetalhe> {
    return this.http.patch<AgendaDetalhe>(`${this.baseUrl}/eventos/${id}/mover`, req);
  }

  listarTipos(): Observable<TipoEventoResponse[]> {
    return this.http.get<TipoEventoResponse[]>(`${this.baseUrl}/tipos`);
  }

  /** Delegado para OperadoresService compartilhado. */
  listarOperadores(): Observable<OperadorResumo[]> {
    return this.operadoresSvc.listar();
  }

  listarFuncoes(): Observable<FuncaoResumo[]> {
    return this.http.get<FuncaoResumo[]>(`${this.baseUrl}/funcoes`);
  }

  criarEventosLote(req: AgendaCriarLoteRequest): Observable<AgendaLoteResponse> {
    return this.http.post<AgendaLoteResponse>(`${this.baseUrl}/eventos/lote`, req);
  }
}
