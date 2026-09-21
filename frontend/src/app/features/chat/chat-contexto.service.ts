import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface ChatTarefaContexto {
  tarefaId: number;
  titulo: string;
  responsavel?: string;
  prioridade?: string;
  status?: string;
  projeto?: string;
  descricao?: string;
}

interface MensagemSessao {
  papel: 'voce' | 'jota';
  texto: string;
  quando: string;
}

/**
 * Corretor #1: contexto do JOTA por tarefa.
 * - Guarda o contexto atual (tarefa aberta no Kanban ou nenhum).
 * - Constrói o prompt com contexto da tarefa (respostas curtas e situadas).
 * - Persiste o histórico da conversa por tarefa em sessionStorage.
 * - Emite pedido de abertura do painel flutuante (FAB).
 */
@Injectable({ providedIn: 'root' })
export class ChatContextoService {
  private readonly CHAVE = 'cc.jota.sessao.tarefa.';

  readonly contexto = signal<ChatTarefaContexto | null>(null);

  /** O widget assina para abrir o painel quando uma tarefa pede contexto. */
  readonly solicitarAbertura$ = new Subject<ChatTarefaContexto>();

  definirContextoTarefa(ctx: ChatTarefaContexto): void {
    this.contexto.set({ ...ctx });
    this.solicitarAbertura$.next({ ...ctx });
  }

  limparContexto(): void {
    this.contexto.set(null);
  }

  temContexto(): boolean {
    return this.contexto() !== null;
  }

  rotuloContexto(): string {
    const c = this.contexto();
    return c ? `T${c.tarefaId} · ${c.titulo}` : 'Conversa geral';
  }

  /** Monta a mensagem enviada ao JOTA com o contexto da tarefa. */
  construirMensagem(pergunta: string): string {
    const c = this.contexto();
    if (!c) return pergunta;
    const linhas = [
      `Contexto: o operador está resolvendo a tarefa "${c.titulo}" (ID ${c.tarefaId}).`,
      c.projeto ? `Projeto: ${c.projeto}.` : '',
      c.responsavel ? `Responsável: ${c.responsavel}.` : '',
      c.prioridade ? `Prioridade: ${c.prioridade}.` : '',
      c.status ? `Status: ${c.status}.` : '',
      c.descricao ? `Descrição: ${c.descricao}` : '',
      'Responda de forma curta (máx. 3 linhas) e cite a documentação consultada.',
      '',
      `Pergunta do operador: ${pergunta}`
    ];
    return linhas.filter(l => l !== '').join('\n');
  }

  carregarHistorico(tarefaId: number): MensagemSessao[] {
    try {
      const raw = sessionStorage.getItem(this.CHAVE + tarefaId);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as MensagemSessao[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  registrar(tarefaId: number, papel: 'voce' | 'jota', texto: string): void {
    const atual = this.carregarHistorico(tarefaId);
    const novo = [...atual, { papel, texto, quando: new Date().toISOString() }].slice(-30);
    try {
      sessionStorage.setItem(this.CHAVE + tarefaId, JSON.stringify(novo));
    } catch {}
  }
}
