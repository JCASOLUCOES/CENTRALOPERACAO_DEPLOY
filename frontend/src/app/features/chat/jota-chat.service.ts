import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RagChatRequest {
  message: string;
  workspaceId: string;
  mode: string;
  sessionId?: string;
}

export interface RagChatResponse {
  resposta: string;
  documentos: string[];
  tempoProcessamento: number;
  sessionId: string;
}

export interface JotaChatSessionDto {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  workspaceId: string;
}

export interface JotaChatMessageDto {
  id: string;
  role: string;
  content: string;
  documentsReferenced: string[];
  processingTime: number;
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class JotaChatService {
  private apiUrl = '/api/rag-proxy';

  constructor(private http: HttpClient) {}

  chat(request: RagChatRequest): Observable<RagChatResponse> {
    return this.http.post<RagChatResponse>(`${this.apiUrl}/chat`, request);
  }

  getSessions(): Observable<JotaChatSessionDto[]> {
    return this.http.get<JotaChatSessionDto[]>(`${this.apiUrl}/sessions`);
  }

  getMessages(sessionId: string): Observable<JotaChatMessageDto[]> {
    return this.http.get<JotaChatMessageDto[]>(`${this.apiUrl}/sessions/${sessionId}/messages`);
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/sessions/${sessionId}`);
  }
}