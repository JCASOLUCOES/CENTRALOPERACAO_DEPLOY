import { CommonModule } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable, DatabaseRelationship, ProcedureResumo, Trigger, GlobalSearchResult } from '../models/database.model';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

type IntentType = 'relacionamentos' | 'dependencias' | 'procedure' | 'trigger' | 'busca' | 'estrutura' | 'sugestao' | 'desconhecido';

interface ParsedIntent {
  intent: IntentType;
  entities: {
    tabela?: string;
    coluna?: string;
    procedure?: string;
    trigger?: string;
    termo?: string;
  };
}

@Component({
  selector: 'app-db-ia-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-ia-chat">
    <div class="db-ia-chat__header">
      <h4><i class="bi bi-robot"></i> Assistente de Investigação do Banco</h4>
      <p class="text-muted small mb-0">Pergunte em linguagem natural: "Como TBDEVEDOR se relaciona com TBTITULO?"</p>
    </div>

    <div class="db-ia-chat__exemplos">
      <span class="db-ia-chat__exemplo" (click)="usarExemplo($event)" *ngFor="let e of exemplos">{{ e }}</span>
    </div>

    <div class="db-ia-chat__messages" #messagesContainer>
      <div *ngFor="let msg of mensagens()" class="db-ia-chat__message" [class]="'db-ia-chat__message--' + msg.role">
        <div class="db-ia-chat__avatar">
          <i class="bi" [ngClass]="msg.role === 'user' ? 'bi-person' : 'bi-robot'"></i>
        </div>
        <div class="db-ia-chat__bubble">
          <div class="db-ia-chat__content" [innerHTML]="formatarMensagem(msg.content)"></div>
          <div class="db-ia-chat__timestamp">{{ msg.timestamp | date:'HH:mm' }}</div>
          <div *ngIf="msg.data" class="db-ia-chat__data">
            <button class="btn btn-sm btn-outline-primary" (click)="navegarParaDados(msg.data)">
              <i class="bi bi-arrow-right-circle"></i> Ver detalhes
            </button>
          </div>
        </div>
      </div>
      <div *ngIf="processando()" class="db-ia-chat__message db-ia-chat__message--assistant">
        <div class="db-ia-chat__avatar"><i class="bi bi-robot"></i></div>
        <div class="db-ia-chat__bubble">
          <div class="db-ia-chat__typing">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>

    <div class="db-ia-chat__input-area">
      <form (ngSubmit)="enviar()" #form="ngForm">
        <div class="input-group">
          <input type="text" class="form-control" [(ngModel)]="pergunta" name="pergunta"
            placeholder="Como esta tabela se relaciona com aquela? O que faz a procedure PRC_X?"
            (keydown.enter)="enviar()" [disabled]="processando()"
            #inputRef>
          <button class="btn btn-primary" type="submit" [disabled]="!pergunta.trim() || processando()">
            <i class="bi" [ngClass]="processando() ? 'bi-hourglass-split' : 'bi-send'"></i>
          </button>
        </div>
      </form>
    </div>
  </div>
  `,
  styles: [`
    .db-ia-chat {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 600px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      overflow: hidden;
    }
    .db-ia-chat__header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .db-ia-chat__header h4 { margin: 0 0 0.25rem; font-size: 1rem; color: #0f172a; }
    .db-ia-chat__header p { font-size: 0.85rem; }

    .db-ia-chat__exemplos {
      display: flex; flex-wrap: wrap; gap: 0.35rem;
      padding: 0.75rem 1rem; border-bottom: 1px solid #e2e8f0;
      background: #fff;
    }
    .db-ia-chat__exemplo {
      background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 1rem;
      padding: 0.25rem 0.75rem; font-size: 0.75rem; color: #475569;
      cursor: pointer; transition: all 0.15s;
    }
    .db-ia-chat__exemplo:hover { background: #dbeafe; border-color: #1d4ed8; color: #1e40af; }

    .db-ia-chat__messages {
      flex: 1; overflow-y: auto; padding: 1rem;
      display: flex; flex-direction: column; gap: 0.75rem;
    }
    .db-ia-chat__message {
      display: flex; gap: 0.5rem; max-width: 85%;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .db-ia-chat__message--user { align-self: flex-end; flex-direction: row-reverse; }
    .db-ia-chat__message--assistant { align-self: flex-start; }

    .db-ia-chat__avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }
    .db-ia-chat__message--user .db-ia-chat__avatar { background: #1d4ed8; color: #fff; }
    .db-ia-chat__message--assistant .db-ia-chat__avatar { background: #f1f5f9; color: #475569; }

    .db-ia-chat__bubble {
      padding: 0.6rem 0.85rem; border-radius: 1rem;
      font-size: 0.875rem; line-height: 1.5;
    }
    .db-ia-chat__message--user .db-ia-chat__bubble { background: #1d4ed8; color: #fff; border-bottom-right-radius: 0.25rem; }
    .db-ia-chat__message--assistant .db-ia-chat__bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 0.25rem; }

    .db-ia-chat__content { white-space: pre-wrap; word-wrap: break-word; }
    .db-ia-chat__timestamp { font-size: 0.65rem; opacity: 0.6; margin-top: 0.25rem; text-align: right; }
    .db-ia-chat__message--assistant .db-ia-chat__timestamp { text-align: left; }
    .db-ia-chat__data { margin-top: 0.5rem; }

    .db-ia-chat__typing { display: flex; gap: 3px; }
    .db-ia-chat__typing span {
      width: 6px; height: 6px; background: #1d4ed8; border-radius: 50%;
      animation: typing 1.4s infinite ease-in-out both;
    }
    .db-ia-chat__typing span:nth-child(1) { animation-delay: -0.32s; }
    .db-ia-chat__typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typing {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .db-ia-chat__input-area {
      padding: 1rem; border-top: 1px solid #e2e8f0; background: #f8fafc;
    }
    .db-ia-chat__input-area .input-group { max-width: 100%; }
  `]
})
export class DbIaChatComponent {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);

  readonly mensagens = signal<ChatMessage[]>([]);
  readonly processando = signal(false);
  pergunta = '';

  readonly exemplos = [
    'Como TBDEVEDOR se relaciona com TBTITULO?',
    'Quais procedures usam a tabela TBDEVEDOR?',
    'O que faz a trigger TRG_TBDEVEDOR?',
    'Onde a coluna CODDEVEDOR é usada?',
    'Me mostre a estrutura da tabela TBDEVEDOR',
    'Sugira uma query para listar devedores com títulos'
  ];

  async enviar(): Promise<void> {
    if (!this.pergunta.trim() || this.processando()) return;

    const userMsg = this.pergunta.trim();
    this.pergunta = '';
    this.mensagens.update(m => [...m, { role: 'user', content: userMsg, timestamp: new Date() }]);
    this.processando.set(true);

    try {
      const resposta = await this.processarPergunta(userMsg);
      this.mensagens.update(m => [...m, { role: 'assistant', content: resposta.texto, timestamp: new Date(), data: resposta.data }]);
    } catch (e) {
      this.mensagens.update(m => [...m, { role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente reformular.', timestamp: new Date() }]);
    } finally {
      this.processando.set(false);
    }
  }

  private async processarPergunta(pergunta: string): Promise<{ texto: string; data?: any }> {
    const intent = this.parseIntent(pergunta);

    switch (intent.intent) {
      case 'relacionamentos':
        return this.buscarRelacionamentos(intent.entities.tabela || '');
      case 'dependencias':
        return this.buscarDependencias(intent.entities.tabela || '');
      case 'procedure':
        return this.buscarProcedure(intent.entities.procedure || '');
      case 'trigger':
        return this.buscarTrigger(intent.entities.trigger || '');
      case 'busca':
        return this.buscarGlobal(intent.entities.termo || '');
      case 'estrutura':
        return this.buscarEstrutura(intent.entities.tabela || '');
      case 'sugestao':
        return this.gerarSugestaoQuery(intent.entities.tabela || '');
      default:
        return this.respostaGenerica(pergunta);
    }
  }

  private parseIntent(pergunta: string): ParsedIntent {
    const lower = pergunta.toLowerCase();

    // Relacionamentos
    if (lower.includes('relaciona') || lower.includes('relacionamento') || lower.includes('fk') || lower.includes('foreign key') ||
        (lower.includes('como') && (lower.includes('com') || lower.includes('entre')))) {
      const tabelas = this.extrairTabelas(pergunta);
      return { intent: 'relacionamentos', entities: { tabela: tabelas[0] } };
    }

    // Dependências / quem usa a tabela
    if (lower.includes('usa') || lower.includes('depende') || lower.includes('dependência') || lower.includes('dependencia') ||
        lower.includes('referencia') || lower.includes('referência') || lower.includes('impacto')) {
      const tabelas = this.extrairTabelas(pergunta);
      return { intent: 'dependencias', entities: { tabela: tabelas[0] } };
    }

    // Procedure
    if (lower.includes('procedure') || lower.includes('proc ') || lower.includes('prc_') || lower.includes('stored procedure')) {
      const proc = this.extrairProcedure(pergunta);
      return { intent: 'procedure', entities: { procedure: proc } };
    }

    // Trigger
    if (lower.includes('trigger') || lower.includes('trg_')) {
      const trigger = this.extrairTrigger(pergunta);
      return { intent: 'trigger', entities: { trigger } };
    }

    // Estrutura da tabela
    if (lower.includes('estrutura') || lower.includes('colunas') || lower.includes('campos') ||
        (lower.includes('mostre') && lower.includes('tabela'))) {
      const tabelas = this.extrairTabelas(pergunta);
      return { intent: 'estrutura', entities: { tabela: tabelas[0] } };
    }

    // Sugestão de query
    if (lower.includes('sugira') || lower.includes('sugest') || lower.includes('query') || lower.includes('consulta') ||
        lower.includes('select') || lower.includes('como consultar') || lower.includes('como buscar')) {
      const tabelas = this.extrairTabelas(pergunta);
      return { intent: 'sugestao', entities: { tabela: tabelas[0] } };
    }

    // Busca global
    return { intent: 'busca', entities: { termo: pergunta } };
  }

  private extrairTabelas(texto: string): string[] {
    const matches = texto.match(/(?:tb|TB)[A-Z][A-Z0-9_]*/g);
    return matches ? [...new Set(matches.map(t => t.toUpperCase()))] : [];
  }

  private extrairProcedure(texto: string): string {
    const match = texto.match(/(?:prc_|PRC_)[A-Z0-9_]+/i) || texto.match(/(?:procedure|proc)\s+(\w+)/i);
    return match ? match[0].toUpperCase() : '';
  }

  private extrairTrigger(texto: string): string {
    const match = texto.match(/(?:trg_|TRG_)[A-Z0-9_]+/i);
    return match ? match[0].toUpperCase() : '';
  }

  private async buscarRelacionamentos(tabela: string): Promise<{ texto: string; data?: any }> {
    if (!tabela) return { texto: 'Por favor, informe o nome da tabela (ex: TBDEVEDOR).' };

    try {
      const rels = await this.db.relacionamentos(undefined, true, 100).toPromise();
      const filtrados = rels?.filter(r =>
        r.tabelaOrigem.toUpperCase().includes(tabela.toUpperCase()) ||
        r.tabelaDestino.toUpperCase().includes(tabela.toUpperCase())
      ) || [];

      if (filtrados.length === 0) {
        return { texto: `Nenhum relacionamento encontrado para a tabela ${tabela}.` };
      }

      const confirmadas = filtrados.filter(f => f.tipo === 'Confirmada');
      const possiveis = filtrados.filter(f => f.tipo === 'Possivel');

      let texto = `**Relacionamentos de ${tabela}:**\n\n`;
      if (confirmadas.length > 0) {
        texto += `✅ **Confirmadas (${confirmadas.length}):**\n`;
        confirmadas.slice(0, 10).forEach(f => {
          const outra = f.tabelaOrigem.includes(tabela) ? f.tabelaDestino : f.tabelaOrigem;
          texto += `• ${outra} (${f.colunaOrigem} → ${f.colunaDestino})\n`;
        });
      }
      if (possiveis.length > 0) {
        texto += `\n🔍 **Possíveis/Inferidos (${possiveis.length}):**\n`;
        possiveis.slice(0, 5).forEach(f => {
          const outra = f.tabelaOrigem.includes(tabela) ? f.tabelaDestino : f.tabelaOrigem;
          texto += `• ${outra} — score: ${f.score} (${f.motivos.join(', ')})\n`;
        });
      }
      return { texto, data: { tipo: 'relacionamentos', tabela, itens: filtrados } };
    } catch {
      return { texto: 'Erro ao buscar relacionamentos.' };
    }
  }

  private async buscarDependencias(tabela: string): Promise<{ texto: string; data?: any }> {
    if (!tabela) return { texto: 'Por favor, informe o nome da tabela (ex: TBDEVEDOR).' };

    try {
      // Extrair schema se presente
      const partes = tabela.split('.');
      const schema = partes.length > 1 ? partes[0] : 'dbo';
      const nomeTabela = partes.length > 1 ? partes[1] : tabela;

      const deps = await this.db.listarDependencias(schema, nomeTabela).toPromise();

      if (!deps || deps.length === 0) {
        return { texto: `Nenhuma dependência encontrada para ${tabela}.` };
      }

      const porTipo = deps.reduce((acc, d) => {
        if (!acc[d.tipo]) acc[d.tipo] = [];
        acc[d.tipo].push(d);
        return acc;
      }, {} as Record<string, typeof deps>);

      let texto = `**Dependências de ${tabela} (${deps.length} objetos):**\n\n`;
      Object.entries(porTipo).forEach(([tipo, itens]) => {
        const icone = { Procedure: '⚙️', View: '👁️', Function: '🔧', Trigger: '⚡', 'Foreign Key': '🔗', Tabela: '📋' }[tipo] || '📄';
        texto += `${icone} **${tipo} (${itens.length}):**\n`;
        itens.slice(0, 5).forEach(i => texto += `• ${i.schema}.${i.nome}\n`);
        if (itens.length > 5) texto += `  ...e mais ${itens.length - 5}\n`;
        texto += '\n';
      });

      return { texto, data: { tipo: 'dependencias', tabela, itens: deps } };
    } catch {
      return { texto: 'Erro ao buscar dependências.' };
    }
  }

  private async buscarProcedure(nome: string): Promise<{ texto: string; data?: any }> {
    if (!nome) return { texto: 'Por favor, informe o nome da procedure (ex: PRC_TBDEVEDOR_INSERT).' };

    try {
      const partes = nome.split('.');
      const schema = partes.length > 1 ? partes[0] : 'dbo';
      const procNome = partes.length > 1 ? partes[1] : nome;

      const proc = await this.db.obterProcedure(schema, procNome).toPromise();
      if (!proc) return { texto: `Procedure ${nome} não encontrada.` };

      const analysis = await this.db.analisarProcedure(schema, procNome).toPromise();

      let texto = `**Procedure ${proc.nomeCompleto}:**\n\n`;
      texto += `${proc.corpo?.substring(0, 500) || 'Sem corpo disponível'}${proc.corpo && proc.corpo.length > 500 ? '...' : ''}\n\n`;
      texto += `**Parâmetros (${proc.parametros.length}):**\n`;
      proc.parametros.forEach(p => {
        const dir = p.isOutput ? 'OUTPUT' : 'INPUT';
        texto += `• ${p.nome} (${p.tipo}, ${dir})\n`;
      });

      if (analysis) {
        texto += `\n**Análise:**\n`;
        if (analysis.tabelasUtilizadas.length > 0) {
          texto += `📋 Tabelas usadas: ${analysis.tabelasUtilizadas.join(', ')}\n`;
        }
        if (analysis.proceduresChamadas.length > 0) {
          texto += `⚙️ Procedures chamadas: ${analysis.proceduresChamadas.join(', ')}\n`;
        }
      }

      return { texto, data: { tipo: 'procedure', procedure: proc, analysis } };
    } catch {
      return { texto: 'Erro ao buscar procedure.' };
    }
  }

  private async buscarTrigger(nome: string): Promise<{ texto: string; data?: any }> {
    if (!nome) return { texto: 'Por favor, informe o nome da trigger (ex: TRG_TBDEVEDOR).' };

    try {
      const partes = nome.split('.');
      const schema = partes.length > 1 ? partes[0] : 'dbo';
      const triggerNome = partes.length > 1 ? partes[1] : nome;

      const trigger = await this.db.obterTrigger(schema, triggerNome).toPromise();
      if (!trigger) return { texto: `Trigger ${nome} não encontrada.` };

      const nomeCompleto = `${trigger.schema}.${trigger.nome}`;
      let texto = `**Trigger ${nomeCompleto}:**\n\n`;
      texto += `📋 **Tabela:** ${trigger.tabela}\n`;
      texto += `📅 **Evento:** ${trigger.evento} (${trigger.momento})\n`;
      if (trigger.acoes?.length) {
        texto += `🎯 **Ações:** ${trigger.acoes.join(', ')}\n`;
      }
      if (trigger.tabelasAfetadas?.length) {
        texto += `🔗 **Tabelas afetadas:** ${trigger.tabelasAfetadas.join(', ')}\n`;
      }
      texto += `\n**Código:**\n\`\`\`sql\n${trigger.corpo}\n\`\`\``;

      return { texto, data: { tipo: 'trigger', trigger } };
    } catch {
      return { texto: 'Erro ao buscar trigger.' };
    }
  }

  private async buscarGlobal(termo: string): Promise<{ texto: string; data?: any }> {
    try {
      const resultados = await this.db.buscarGlobal(termo, 20).toPromise();

      if (!resultados || resultados.length === 0) {
        return { texto: `Nenhum resultado encontrado para "${termo}".` };
      }

      const porTipo = resultados.reduce((acc, r) => {
        if (!acc[r.tipo]) acc[r.tipo] = [];
        acc[r.tipo].push(r);
        return acc;
      }, {} as Record<string, typeof resultados>);

      let texto = `**Resultados para "${termo}" (${resultados.length}):**\n\n`;
      Object.entries(porTipo).forEach(([tipo, itens]) => {
        const icone = { tabela: '📋', coluna: '📊', procedure: '⚙️', trigger: '⚡', view: '👁️' }[tipo] || '📄';
        texto += `${icone} **${tipo.charAt(0).toUpperCase() + tipo.slice(1)}s (${itens.length}):**\n`;
        itens.slice(0, 5).forEach(i => texto += `• ${i.objeto}\n`);
        if (itens.length > 5) texto += `  ...e mais ${itens.length - 5}\n`;
        texto += '\n';
      });

      return { texto, data: { tipo: 'busca', termo, itens: resultados } };
    } catch {
      return { texto: 'Erro na busca global.' };
    }
  }

  private async buscarEstrutura(tabela: string): Promise<{ texto: string; data?: any }> {
    if (!tabela) return { texto: 'Por favor, informe o nome da tabela (ex: TBDEVEDOR).' };

    try {
      const partes = tabela.split('.');
      const schema = partes.length > 1 ? partes[0] : 'dbo';
      const nomeTabela = partes.length > 1 ? partes[1] : tabela;

      const [info, colunas, indices] = await Promise.all([
        this.db.obterTabela(schema, nomeTabela).toPromise(),
        this.db.listarColunas(schema, nomeTabela).toPromise(),
        this.db.listarIndices(schema, nomeTabela).toPromise()
      ]);

      if (!info) return { texto: `Tabela ${tabela} não encontrada.` };

      let texto = `**Estrutura de ${info.nomeCompleto}:**\n\n`;
      texto += `📊 **Registros:** ${info.quantidadeRegistros?.toLocaleString() || 'N/A'}\n`;
      texto += `📋 **Colunas (${colunas?.length || 0}):**\n`;
      colunas?.slice(0, 15).forEach(c => {
        const flags = [];
        if (c.isPrimaryKey) flags.push('PK');
        if (c.isForeignKey) flags.push('FK');
        if (c.isIdentity) flags.push('IDENTITY');
        texto += `• ${c.coluna} — ${c.tipo}${c.tamanho ? `(${c.tamanho})` : ''} ${flags.join(', ')}\n`;
      });
      if (colunas && colunas.length > 15) texto += `  ...e mais ${colunas.length - 15} colunas\n`;

      if (indices && indices.length > 0) {
        texto += `\n🔖 **Índices (${indices.length}):**\n`;
        indices.forEach(i => texto += `• ${i.nome} (${i.tipo}${i.unique ? ', Único' : ''}) — ${i.colunas.join(', ')}\n`);
      }

      return { texto, data: { tipo: 'estrutura', tabela: info, colunas, indices } };
    } catch {
      return { texto: 'Erro ao buscar estrutura da tabela.' };
    }
  }

  private async gerarSugestaoQuery(tabela: string): Promise<{ texto: string; data?: any }> {
    if (!tabela) return { texto: 'Por favor, informe o nome da tabela (ex: TBDEVEDOR).' };

    try {
      const partes = tabela.split('.');
      const schema = partes.length > 1 ? partes[0] : 'dbo';
      const nomeTabela = partes.length > 1 ? partes[1] : tabela;

      const rels = await this.db.relacionamentos(schema, true, 50).toPromise();
      const relacionadas = rels?.filter(r =>
        r.tabelaOrigem.toUpperCase().includes(nomeTabela.toUpperCase()) ||
        r.tabelaDestino.toUpperCase().includes(nomeTabela.toUpperCase())
      ) || [];

      let texto = `**Sugestão de query para ${tabela}:**\n\n`;

      if (relacionadas.length > 0) {
        const joins = relacionadas.slice(0, 3).map(r => {
          const origem = r.tabelaOrigem.includes(nomeTabela) ? r.tabelaDestino : r.tabelaOrigem;
          const colOrigem = r.tabelaOrigem.includes(nomeTabela) ? r.colunaOrigem : r.colunaDestino;
          const colDestino = r.tabelaOrigem.includes(nomeTabela) ? r.colunaDestino : r.colunaOrigem;
          return `  INNER JOIN [${origem}] o ON t.[${colOrigem}] = o.[${colDestino}]`;
        }).join('\n');

        texto += `-- Com JOINs baseados em relacionamentos reais\n`;
        texto += `SELECT TOP 100 t.*\n`;
        texto += `FROM [${schema}].[${nomeTabela}] t\n`;
        texto += `${joins}\n`;
        texto += `WHERE t.[...] = ?;\n\n`;
        texto += `💡 **Dica:** Use o **Query Builder** (aba ao lado) para montar visualmente.`;
      } else {
        texto += `SELECT TOP 100 * FROM [${schema}].[${nomeTabela}];\n\n`;
        texto += `⚠️ Nenhum relacionamento encontrado para sugerir JOINs automáticos.`;
      }

      return { texto, data: { tipo: 'sugestao', tabela, relacionadas } };
    } catch {
      return { texto: 'Erro ao gerar sugestão de query.' };
    }
  }

  private respostaGenerica(pergunta: string): { texto: string } {
    return {
      texto: `Não entendi completamente sua pergunta. Tente algo como:\n\n` +
        `• "Como **TBDEVEDOR** se relaciona com **TBTITULO"?\n` +
        `• "Quais procedures usam a tabela **TBDEVEDOR"?\n` +
        `• "O que faz a trigger **TRG_TBDEVEDOR"?\n` +
        `• "Onde a coluna **CODDEVEDOR** é usada?\n` +
        `• "Me mostre a estrutura da tabela **TBDEVEDOR"\n` +
        `• "Sugira uma query para listar devedores com títulos"`
    };
  }

  formatarMensagem(texto: string): string {
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  usarExemplo(event: Event): void {
    const texto = (event.target as HTMLElement).textContent?.trim() || '';
    if (texto) {
      this.pergunta = texto;
      this.enviar();
    }
  }

  navegarParaDados(data: any): void {
    if (!data) return;
    switch (data.tipo) {
      case 'relacionamentos':
        this.router.navigate(['/database/relacionamentos']);
        break;
      case 'dependencias':
        if (data.tabela) this.router.navigate(['/database/tabela', 'dbo', data.tabela.replace('TB', 'TB')]);
        break;
      case 'procedure':
        this.router.navigate(['/database/explorador'], { queryParams: { proc: data.procedure?.nomeCompleto } });
        break;
      case 'estrutura':
        if (data.tabela) this.router.navigate(['/database/tabela', data.tabela.schema, data.tabela.nome]);
        break;
    }
  }
}