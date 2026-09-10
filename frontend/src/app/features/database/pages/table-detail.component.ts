import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DatabaseService } from '../services/database.service';
import {
  DatabaseTable, DatabaseColumn, DatabaseIndex, DatabaseRelationship,
  ProcedureResumo, ProcedureDetalhe, Trigger, Dependencia, ProcedureAnalysis
} from '../models/database.model';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type SubAba = 'estrutura' | 'relacionamentos' | 'triggers' | 'procedures' | 'dependencias' | 'consultar';

interface BreadcrumbItem {
  label: string;
  rota?: string;
  schema?: string;
  tabela?: string;
}

interface SubAbaConfig {
  id: SubAba;
  rotulo: string;
  icone: string;
  contador?: () => number;
}

interface HistoricoItem {
  schema: string;
  tabela: string;
  nomeCompleto: string;
  timestamp: number;
}

@Component({
  selector: 'app-table-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './table-detail.component.html',
  styleUrl: './table-detail.component.scss'
})
export class TableDetailComponent implements OnInit, OnDestroy {
  private readonly db = inject(DatabaseService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly modalSvc = inject(NgbModal);

  readonly schema = signal<string>('dbo');
  readonly tabela = signal<string>('');
  readonly carregando = signal(false);
  readonly erro = signal<string | null>(null);
  readonly subAbaAtiva = signal<SubAba>('estrutura');
  readonly incluirInferidas = signal(false);

  readonly tableInfo = signal<DatabaseTable | null>(null);
  readonly colunas = signal<DatabaseColumn[]>([]);
  readonly indices = signal<DatabaseIndex[]>([]);
  readonly fks = signal<DatabaseRelationship[]>([]);
  readonly allFks = signal<DatabaseRelationship[]>([]);
  readonly triggers = signal<Trigger[]>([]);
  readonly procedures = signal<ProcedureResumo[]>([]);
  readonly dependencias = signal<Dependencia[]>([]);
  readonly procedureSelecionada = signal<ProcedureDetalhe | null>(null);
  readonly procedureAnalysis = signal<ProcedureAnalysis | null>(null);
  readonly triggerSelecionada = signal<Trigger | null>(null);

  readonly colunasSelecionadas = signal<string[]>([]);
  readonly filtrosSelecionados = signal<string[]>([]);
  readonly limiteConsulta = signal(100);
  readonly sqlGerado = signal<string>('');

  readonly breadcrumbs = signal<BreadcrumbItem[]>([{ label: 'Início', rota: '/database' }]);

  readonly subAbas = computed<SubAbaConfig[]>(() => [
    { id: 'estrutura', rotulo: 'Estrutura', icone: 'bi-list-columns', contador: () => this.colunas().length },
    { id: 'relacionamentos', rotulo: 'Relacionamentos', icone: 'bi-share', contador: () => this.fks().length },
    { id: 'triggers', rotulo: 'Triggers', icone: 'bi-lightning-charge-fill', contador: () => this.triggers().length },
    { id: 'procedures', rotulo: 'Procedures', icone: 'bi-gear-fill', contador: () => this.procedures().length },
    { id: 'dependencias', rotulo: 'Dependências', icone: 'bi-diagram-3-fill', contador: () => this.dependencias().length },
    { id: 'consultar', rotulo: 'Consultar', icone: 'bi-terminal' }
  ]);

  // Histórico de navegação
  private readonly HISTORICO_KEY = 'db_table_historico';
  private readonly MAX_HISTORICO = 10;
  readonly historicoNavegacao = signal<HistoricoItem[]>([]);

  private destroy$ = signal(false);

  ngOnInit(): void {
    this.carregarHistorico();
    this.route.params.subscribe(params => {
      if (params['schema'] && params['tabela']) {
        this.schema.set(params['schema']);
        this.tabela.set(params['tabela']);
        this.carregarTabela();
        this.atualizarBreadcrumb();
        this.adicionarHistorico(params['schema'], params['tabela']);
      }
    });

    this.route.queryParams.subscribe(qp => {
      if (qp['aba']) {
        this.subAbaAtiva.set(qp['aba'] as SubAba);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.set(true);
  }

  private carregarHistorico(): void {
    try {
      const dados = localStorage.getItem(this.HISTORICO_KEY);
      if (dados) {
        this.historicoNavegacao.set(JSON.parse(dados));
      }
    } catch {}
  }

  private adicionarHistorico(schema: string, tabela: string): void {
    const item: HistoricoItem = {
      schema,
      tabela,
      nomeCompleto: `${schema}.${tabela}`,
      timestamp: Date.now()
    };
    const atual = this.historicoNavegacao();
    const novo = [item, ...atual.filter(h => h.nomeCompleto !== item.nomeCompleto)].slice(0, this.MAX_HISTORICO);
    this.historicoNavegacao.set(novo);
    try {
      localStorage.setItem(this.HISTORICO_KEY, JSON.stringify(novo));
    } catch {}
  }

  navegarHistorico(item: HistoricoItem): void {
    this.router.navigate(['/database/tabela', item.schema, item.tabela]);
  }

  limparHistorico(): void {
    this.historicoNavegacao.set([]);
    localStorage.removeItem(this.HISTORICO_KEY);
  }

  carregarTabela(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.db.obterTabela(this.schema(), this.tabela()).subscribe({
      next: t => {
        if (!t) {
          this.erro.set(`Tabela ${this.schema()}.${this.tabela()} não encontrada`);
          this.carregando.set(false);
          return;
        }
        this.tableInfo.set(t);
        this.carregarDetalhes();
      },
      error: () => {
        this.erro.set('Erro ao carregar tabela');
        this.carregando.set(false);
      }
    });
  }

  carregarDetalhes(): void {
    const s = this.schema();
    const t = this.tabela();

    const colunas$ = this.db.listarColunas(s, t).pipe(catchError(() => of([] as DatabaseColumn[])));
    const indices$ = this.db.listarIndices(s, t).pipe(catchError(() => of([] as DatabaseIndex[])));
    const relacionamentos$ = this.db.relacionamentos(s, true, 500).pipe(catchError(() => of([] as DatabaseRelationship[])));
    const triggers$ = this.db.listarTriggers(s, t).pipe(catchError(() => of([] as Trigger[])));
    const procedures$ = this.db.listarProcedures(s, '', 200).pipe(catchError(() => of([] as ProcedureResumo[])));
    const dependencias$ = this.db.listarDependencias(s, t).pipe(catchError(() => of([] as Dependencia[])));

    forkJoin({
      colunas: colunas$,
      indices: indices$,
      relacionamentos: relacionamentos$,
      triggers: triggers$,
      procedures: procedures$,
      dependencias: dependencias$
    }).subscribe({
      next: results => {
        this.colunas.set(results.colunas);
        this.indices.set(results.indices);
        this.allFks.set(results.relacionamentos);
        this.aplicarFiltroRelacionamentos();
        this.triggers.set(results.triggers);
        const filtradas = results.procedures.filter(proc =>
          proc.nome.toLowerCase().includes(t.toLowerCase()) ||
          (proc as any).corpo?.toLowerCase().includes(t.toLowerCase())
        );
        this.procedures.set(filtradas);
        this.dependencias.set(results.dependencias);
      },
      error: () => {
        this.erro.set('Erro ao carregar detalhes da tabela');
      },
      complete: () => {
        this.carregando.set(false);
      }
    });
  }

  aplicarFiltroRelacionamentos(): void {
    const incluir = this.incluirInferidas();
    const filtradas = this.allFks().filter(rel =>
      (rel.tabelaOrigem === `${this.schema()}.${this.tabela()}` || rel.tabelaDestino === `${this.schema()}.${this.tabela()}`) &&
      (incluir || rel.tipo === 'Confirmada')
    );
    this.fks.set(filtradas);
  }

  recarregarRelacionamentos(): void {
    this.aplicarFiltroRelacionamentos();
  }

  atualizarBreadcrumb(): void {
    const items: BreadcrumbItem[] = [
      { label: 'Início', rota: '/database' },
      { label: this.tabela(), schema: this.schema(), tabela: this.tabela() }
    ];
    this.breadcrumbs.set(items);
  }

  navegarParaTabela(schema: string, tabela: string): void {
    this.router.navigate(['/database/tabela', schema, tabela]);
  }

  setSubAba(aba: SubAba): void {
    this.subAbaAtiva.set(aba);
    this.router.navigate([], { queryParams: { aba }, queryParamsHandling: 'merge' });
  }

  extrairSchema(tabelaCompleta: string): string {
    const partes = tabelaCompleta.split('.');
    return partes.length > 1 ? partes[0] : 'dbo';
  }

  extrairTabela(tabelaCompleta: string): string {
    const partes = tabelaCompleta.split('.');
    return partes.length > 1 ? partes[1] : tabelaCompleta;
  }

  async abrirProcedure(proc: ProcedureResumo): Promise<void> {
    const d = await this.db.obterProcedure(proc.schema, proc.nome).toPromise();
    if (d) {
      this.procedureSelecionada.set(d);
      const analysis = await this.db.analisarProcedure(proc.schema, proc.nome).toPromise();
      this.procedureAnalysis.set(analysis ?? null);
      const { DbProcedureModalComponent } = await import('./db-procedure-modal.component');
      const ref = this.modalSvc.open(DbProcedureModalComponent, { size: 'xl', scrollable: true });
      ref.componentInstance.procedure = d;
      ref.componentInstance.analysis = analysis;
    }
  }

  async abrirTrigger(trigger: Trigger): Promise<void> {
    this.triggerSelecionada.set(trigger);
    const { DbTriggerModalComponent } = await import('./db-trigger-modal.component');
    this.modalSvc.open(DbTriggerModalComponent, { size: 'xl', scrollable: true })
      .componentInstance.trigger = trigger;
  }

  abrirDiagrama(): void {
    this.router.navigate(['/database/diagrama'], { queryParams: { tabela: `${this.schema()}.${this.tabela()}` } });
  }

  abrirConsultas(): void {
    const sql = `SELECT TOP ${this.limiteConsulta()} * FROM [${this.schema()}].[${this.tabela()}]`;
    sessionStorage.setItem('db-query-prefill', sql);
    this.router.navigate(['/database/consultas']);
  }

  abrirQueryBuilder(): void {
    const tabelas = [`${this.schema()}.${this.tabela()}`];
    sessionStorage.setItem('db-query-builder-tables', JSON.stringify(tabelas));
    this.router.navigate(['/database/query-builder'], { queryParams: { builder: 'true' } });
  }

  toggleColuna(coluna: string): void {
    const atuais = this.colunasSelecionadas();
    const idx = atuais.indexOf(coluna);
    if (idx >= 0) {
      this.colunasSelecionadas.set(atuais.filter(c => c !== coluna));
    } else {
      this.colunasSelecionadas.set([...atuais, coluna]);
    }
    this.gerarSQL();
  }

  toggleFiltro(coluna: string): void {
    const atuais = this.filtrosSelecionados();
    const idx = atuais.indexOf(coluna);
    if (idx >= 0) {
      this.filtrosSelecionados.set(atuais.filter(c => c !== coluna));
    } else {
      this.filtrosSelecionados.set([...atuais, coluna]);
    }
    this.gerarSQL();
  }

  gerarSQL(): void {
    const cols = this.colunasSelecionadas().length > 0
      ? this.colunasSelecionadas().map(c => `[${c}]`).join(', ')
      : '*';
    let sql = `SELECT TOP ${this.limiteConsulta()} ${cols} FROM [${this.schema()}].[${this.tabela()}]`;
    const filtros = this.filtrosSelecionados();
    if (filtros.length > 0) {
      sql += '\nWHERE ' + filtros.map(c => `[${c}] = ?`).join(' AND ');
    }
    this.sqlGerado.set(sql);
  }

  gerarEConsultar(): void {
    this.gerarSQL();
    sessionStorage.setItem('db-query-prefill', this.sqlGerado());
    this.router.navigate(['/database/consultas']);
  }

  copiarSQL(): void {
    navigator.clipboard.writeText(this.sqlGerado());
  }

  iconeDependencia(tipo: string): string {
    const icones: Record<string, string> = {
      Procedure: 'bi-gear-fill',
      View: 'bi-eye-fill',
      Function: 'bi-function',
      Trigger: 'bi-lightning-charge-fill',
      'Foreign Key': 'bi-link-45deg',
      Tabela: 'bi-table'
    };
    return icones[tipo] || 'bi-question-circle';
  }

  corDependencia(tipo: string): string {
    const cores: Record<string, string> = {
      Procedure: '#3b82f6',
      View: '#06b6d4',
      Function: '#8b5cf6',
      Trigger: '#f59e0b',
      'Foreign Key': '#ef4444',
      Tabela: '#64748b'
    };
    return cores[tipo] || '#64748b';
  }

  classeDependencia(tipo: string): string {
    const classes: Record<string, string> = {
      Procedure: 'bg-primary',
      View: 'bg-info',
      Function: 'bg-purple',
      Trigger: 'bg-warning text-dark',
      'Foreign Key': 'bg-danger',
      Tabela: 'bg-secondary'
    };
    return classes[tipo] || 'bg-secondary';
  }

  navegarDependencia(d: Dependencia): void {
    if (d.tipo === 'Procedure') {
      // Para procedure, abre o explorador com filtro
      this.router.navigate(['/database/explorador'], { queryParams: { proc: `${d.schema}.${d.nome}` } });
    } else if (d.tipo === 'View' || d.tipo === 'Function') {
      // Views e Functions não têm rota de detalhe própria ainda, vai para explorador
      this.router.navigate(['/database/explorador']);
    } else if (d.tipo === 'Trigger') {
      // Trigger - poderia abrir modal se tivéssemos o nome
      this.router.navigate(['/database/explorador']);
    } else if (d.tipo === 'Foreign Key') {
      // Para FK, tenta extrair tabela relacionada do nome
      // O formato do nome pode variar, tenta navegar para a tabela relacionada
      // Por enquanto vai para explorador
      this.router.navigate(['/database/explorador']);
    } else if (d.tipo === 'Tabela') {
      // Se for uma tabela, navega direto para o detalhe
      const partes = d.nome.split('.');
      if (partes.length >= 2) {
        this.router.navigate(['/database/tabela', partes[0], partes[1]]);
      }
    }
  }

  trackByColuna = (i: number, c: DatabaseColumn) => c.coluna;
  trackByIndice = (i: number, i2: DatabaseIndex) => i2.nome;
  trackByFk = (i: number, fk: DatabaseRelationship) => `${fk.tabelaOrigem}.${fk.colunaOrigem}->${fk.tabelaDestino}.${fk.colunaDestino}`;
  trackByTrigger = (i: number, t: Trigger) => t.nome;
  trackByProc = (i: number, p: ProcedureResumo) => p.nomeCompleto;
  trackByDep = (i: number, d: Dependencia) => `${d.tipo}-${d.nome}`;

  fkBadgeClass(fk: DatabaseRelationship): string {
    return fk.tipo === 'Confirmada' ? 'bg-success' : 'bg-warning';
  }

  fkTooltip(fk: DatabaseRelationship): string {
    if (fk.tipo === 'Confirmada') return 'FK real no banco de dados';
    return `Inferida por: ${fk.motivos.join(', ')}`;
  }

  fkScore(fk: DatabaseRelationship): number {
    return fk.tipo === 'Possivel' ? fk.score : 100;
  }

  fkIcon(fk: DatabaseRelationship): string {
    return fk.tipo === 'Confirmada' ? 'bi-link-45deg' : 'bi-link-45deg';
  }
}