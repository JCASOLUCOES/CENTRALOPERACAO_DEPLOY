import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of, Subscription } from 'rxjs';
import { JotaChatService } from '../jota-chat.service';
import { ChatContextoService } from '../chat-contexto.service';

interface Msg {
  papel: 'voce' | 'jota';
  texto: string;
  docs?: string[];
}

/**
 * JOTA transversal: painel flutuante disponível em todo o MainLayout.
 * Usa o proxy real (/api/rag-proxy/chat). Sem respostas mockadas:
 * falha mostra estado honesto de indisponibilidade.
 */
@Component({
  selector: 'app-jota-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jota-widget.component.html',
  styleUrl: './jota-widget.component.scss'
})
export class JotaWidgetComponent implements OnInit, OnDestroy {
  private readonly chat = inject(JotaChatService);
  readonly ctx = inject(ChatContextoService);
  private sub?: Subscription;

  @ViewChild('lista') lista?: ElementRef<HTMLElement>;

  aberto = signal(false);
  enviando = signal(false);
  erro = signal('');
  texto = signal('');
  sessionId?: string;
  mensagens = signal<Msg[]>([
    { papel: 'jota', texto: 'Olá! Sou o JOTA. Pergunte sobre procedimentos, atendimento ou implantação.' }
  ]);

  ngOnInit(): void {
    // Corretor #1: tarefa pede contexto → abre o painel já situado na tarefa
    this.sub = this.ctx.solicitarAbertura$.subscribe(c => {
      if (!this.aberto()) this.aberto.set(true);
      const historico = this.ctx.carregarHistorico(c.tarefaId).map(h => ({
        papel: h.papel,
        texto: h.texto
      } as Msg));
      this.mensagens.set([
        { papel: 'jota', texto: `Falando sobre: ${c.titulo} (T${c.tarefaId}). O que você precisa?` },
        ...historico
      ]);
      setTimeout(() => this.rolar(), 0);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  limparContexto(): void {
    this.ctx.limparContexto();
  }

  alternar(): void {
    this.aberto.update(v => !v);
    if (this.aberto()) setTimeout(() => this.rolar(), 0);
  }

  enviar(): void {
    const mensagem = this.texto().trim();
    if (!mensagem || this.enviando()) return;
    this.texto.set('');
    this.erro.set('');
    const contexto = this.ctx.contexto();
    const paraJota = this.ctx.construirMensagem(mensagem);
    this.mensagens.update(arr => [...arr, { papel: 'voce', texto: mensagem }]);
    if (contexto) this.ctx.registrar(contexto.tarefaId, 'voce', mensagem);
    this.enviando.set(true);
    this.rolar();

    this.chat.chat({ message: paraJota, workspaceId: 'suporte', mode: 'query', sessionId: this.sessionId })
      .pipe(catchError(() => of(null)))
      .subscribe(res => {
        this.enviando.set(false);
        if (!res) {
          this.erro.set('JOTA indisponível no momento. Tente de novo em instantes.');
        } else {
          this.sessionId = res.sessionId;
          this.mensagens.update(arr => [...arr, { papel: 'jota', texto: res.resposta, docs: res.documentos }]);
          if (contexto) this.ctx.registrar(contexto.tarefaId, 'jota', res.resposta);
        }
        this.rolar();
      });
  }

  private rolar(): void {
    setTimeout(() => {
      const el = this.lista?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
