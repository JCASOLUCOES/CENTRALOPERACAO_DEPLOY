import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef, NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { AgendaService, AgendaResumo, TipoEventoResponse, FuncaoResumo } from './services/agenda.service';
import { OperadoresService, OperadorResumo } from '@core/services/operadores.service';
import { AuthService } from '@core/services/auth.service';

type Visao = 'dia' | 'semana' | 'operacional' | 'mes';
type Escopo = 'meus' | 'todos';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent implements OnInit, OnDestroy {
  private readonly svc = inject(AgendaService);
  private readonly operadoresSvc = inject(OperadoresService);
  private readonly auth = inject(AuthService);
  private readonly modalSvc = inject(NgbModal);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroy$ = new Subject<void>();
  private modalRef?: NgbModalRef;

  readonly visao = signal<Visao>('semana');
  readonly escopo = signal<Escopo>('meus');
  readonly dataReferencia = signal<Date>(new Date());
  readonly eventos = signal<AgendaResumo[]>([]);
  readonly carregando = signal(false);
  readonly tipos = signal<TipoEventoResponse[]>([]);
  readonly operadores = signal<OperadorResumo[]>([]);
  readonly funcoes = signal<FuncaoResumo[]>([]);
  readonly mostrarDatePicker = signal(false);
  readonly dataPickerModel = signal<NgbDateStruct | null>(null);

  // Filtros ligados via [(ngModel)] no template (propriedades simples).
  operadorFiltro = '';
  funcaoFiltro: number | null = null;

  readonly usuarioLogado = computed(() => this.auth.getOperadorLogado());

  readonly horasDia = Array.from({ length: 24 }, (_, i) => i);

  readonly inicio = computed(() => {
    const ref = new Date(this.dataReferencia());
    if (this.visao() === 'dia' || this.visao() === 'operacional') {
      ref.setHours(0, 0, 0, 0);
      return ref;
    }
    if (this.visao() === 'semana') {
      const d = new Date(ref);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d;
    }
    const d = new Date(ref.getFullYear(), ref.getMonth(), 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly fim = computed(() => {
    const i = new Date(this.inicio());
    if (this.visao() === 'dia') {
      i.setDate(i.getDate() + 1);
      return i;
    }
    if (this.visao() === 'operacional') {
      i.setDate(i.getDate() + 2);
      return i;
    }
    if (this.visao() === 'semana') {
      i.setDate(i.getDate() + 7);
      return i;
    }
    i.setMonth(i.getMonth() + 1);
    return i;
  });

  readonly diasSemana = computed(() => {
    const ini = this.inicio();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ini);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  readonly diasOperacionais = computed(() => {
    const ini = this.inicio();
    return [0, 1].map(off => {
      const d = new Date(ini);
      d.setDate(d.getDate() + off);
      return d;
    });
  });

  readonly diasMes = computed(() => {
    const ini = new Date(this.inicio());
    const ultimo = new Date(ini.getFullYear(), ini.getMonth() + 1, 0).getDate();
    return Array.from({ length: ultimo }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), i + 1));
  });

  readonly diasSemanaCurto = computed(() => ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']);

  ngOnInit(): void {
    this.sincronizarDatePicker();
    this.carregarLookups();
    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.modalRef) {
      this.modalRef.dismiss();
      this.modalRef = undefined;
    }
    if (this.isBrowser) {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
    }
  }

  // ---------- lookups ----------

  private carregarLookups(): void {
    this.svc.listarTipos().pipe(takeUntil(this.destroy$)).subscribe({
      next: t => this.tipos.set(t ?? []),
      error: () => this.tipos.set([])
    });
    this.operadoresSvc.listar().pipe(takeUntil(this.destroy$)).subscribe({
      next: o => this.operadores.set(o ?? []),
      error: () => this.operadores.set([])
    });
    this.svc.listarFuncoes().pipe(takeUntil(this.destroy$)).subscribe({
      next: f => this.funcoes.set(f ?? []),
      error: () => this.funcoes.set([])
    });
  }

  // ---------- carga de eventos ----------

  carregar(): void {
    this.carregando.set(true);
    const responsavel = this.responsavelEfetivo();
    this.svc.listarEventos(
      this.inicio().toISOString(),
      this.fim().toISOString(),
      responsavel || undefined,
      this.funcaoFiltro ?? undefined
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: lista => {
        this.eventos.set(lista ?? []);
        this.carregando.set(false);
      },
      error: () => {
        this.eventos.set([]);
        this.carregando.set(false);
      }
    });
  }

  private responsavelEfetivo(): string {
    if (this.operadorFiltro) return this.operadorFiltro;
    if (this.escopo() === 'meus') return this.usuarioLogado();
    return '';
  }

  // ---------- filtros / escopo ----------

  alternarEscopo(e: Escopo): void {
    this.escopo.set(e);
    if (e === 'todos') {
      // "Geral" significa sem filtro: limpa responsável e função para não
      // manter filtro fantasma (o dropdown venceria o escopo no request).
      this.operadorFiltro = '';
      this.funcaoFiltro = null;
    }
    this.carregar();
  }

  nomeOperadorFiltro(): string {
    if (!this.operadorFiltro) return '';
    return this.operadores().find(o => o.id === this.operadorFiltro)?.nome ?? this.operadorFiltro;
  }

  nomeFuncaoFiltro(): string {
    if (this.funcaoFiltro == null) return '';
    const f = this.funcoes().find(x => x.id === this.funcaoFiltro);
    return f ? this.formatarFuncao(f) : '';
  }

  filtrarPorResponsavel(valor: string): void {
    this.operadorFiltro = valor ?? '';
    this.carregar();
  }

  limparFiltroResponsavel(): void {
    this.operadorFiltro = '';
    this.carregar();
  }

  filtrarPorFuncao(valor: number | null): void {
    this.funcaoFiltro = valor;
    this.carregar();
  }

  limparFiltroFuncao(): void {
    this.funcaoFiltro = null;
    this.carregar();
  }

  formatarFuncao(f: FuncaoResumo): string {
    return f.classificacao ? `${f.descricao} · ${f.classificacao}` : f.descricao;
  }

  // ---------- navegação ----------

  anterior(): void {
    const d = new Date(this.dataReferencia());
    if (this.visao() === 'dia' || this.visao() === 'operacional') d.setDate(d.getDate() - 1);
    else if (this.visao() === 'semana') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    this.dataReferencia.set(d);
    this.sincronizarDatePicker();
    this.carregar();
  }

  proximo(): void {
    const d = new Date(this.dataReferencia());
    if (this.visao() === 'dia' || this.visao() === 'operacional') d.setDate(d.getDate() + 1);
    else if (this.visao() === 'semana') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    this.dataReferencia.set(d);
    this.sincronizarDatePicker();
    this.carregar();
  }

  hoje(): void {
    this.dataReferencia.set(new Date());
    this.sincronizarDatePicker();
    this.carregar();
  }

  mudarVisao(v: Visao): void {
    this.visao.set(v);
    this.carregar();
  }

  intervaloDatas(): string {
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const f = new Date(this.fim());
    f.setDate(f.getDate() - 1);
    return `${fmt(this.inicio())} – ${fmt(f)}`;
  }

  // ---------- date picker ----------

  alternarDatePicker(): void {
    this.mostrarDatePicker.update(v => !v);
  }

  aoSelecionarData(sel: NgbDateStruct): void {
    this.dataPickerModel.set(sel);
    this.dataReferencia.set(new Date(sel.year, sel.month - 1, sel.day));
    this.mostrarDatePicker.set(false);
    this.carregar();
  }

  private sincronizarDatePicker(): void {
    const d = this.dataReferencia();
    this.dataPickerModel.set({ year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() });
  }

  // ---------- grade ----------

  eventosDoDia(dia: Date): AgendaResumo[] {
    return this.eventos().filter(e =>
      this.mesmoDia(new Date(e.dataInicio), dia) || (e.diaInteiro && this.cobreDia(e, dia)));
  }

  eventosPorHora(dia: Date, hora: number): AgendaResumo[] {
    return this.eventos().filter(e => {
      if (e.diaInteiro) return false;
      const d = new Date(e.dataInicio);
      return this.mesmoDia(d, dia) && d.getHours() === hora;
    });
  }

  eventosDiaInteiro(dia: Date): AgendaResumo[] {
    return this.eventos().filter(e => e.diaInteiro && this.cobreDia(e, dia));
  }

  private mesmoDia(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  private inicioDoDia(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /**
   * Evento dia-inteiro cobre o dia? Linha única com span (Férias) aparece
   * em todos os dias entre início e fim. Fim exatamente à meia-noite é
   * exclusivo (linhas do lote terminam no próprio dia).
   */
  cobreDia(e: AgendaResumo, dia: Date): boolean {
    const ini = this.inicioDoDia(new Date(e.dataInicio)).getTime();
    const d = this.inicioDoDia(dia).getTime();
    if (d < ini) return false;
    if (!e.dataFim) return d === ini;
    const f = new Date(e.dataFim);
    const fimDia = (f.getHours() === 0 && f.getMinutes() === 0 && f.getSeconds() === 0)
      ? this.inicioDoDia(f).getTime() - 86400000
      : this.inicioDoDia(f).getTime();
    return d <= fimDia;
  }

  ehHoje(d: Date): boolean {
    return this.mesmoDia(new Date(), d);
  }

  horaAtualMinutos(): number {
    const h = new Date();
    return h.getHours() * 60 + h.getMinutes();
  }

  /** Altura real (px) de uma linha de hora: 3rem na fonte-raiz efetiva (12.8px sob .scaled). */
  alturaLinhaHoraPx(): number {
    if (!this.isBrowser) return 38.4;
    const fs = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(fs) ? 3 * fs : 38.4;
  }

  diaSemanaMaiusculo(d: Date): string {
    return ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()];
  }

  diaNumero(d: Date): number {
    return d.getDate();
  }

  formatarHoraLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  corDoEvento(e: AgendaResumo): string {
    return e.cor ?? e.tipoCor ?? '#0f4c81';
  }

  prioridadeEfetiva(e: AgendaResumo): 'critica' | 'alta' | 'normal' {
    if (e.prioridade === 2) return 'critica';
    if (e.prioridade === 1) return 'alta';
    return 'normal';
  }

  iconePrioridade(e: AgendaResumo): string | null {
    const p = this.prioridadeEfetiva(e);
    if (p === 'critica') return 'bi-exclamation-triangle-fill';
    if (p === 'alta') return 'bi-arrow-up-circle-fill';
    return null;
  }

  slaRestanteTexto(e: AgendaResumo): string | null {
    if (e.slaMinutos == null) return null;
    const fimSla = new Date(e.dataInicio).getTime() + e.slaMinutos * 60000;
    const diffMin = Math.round((fimSla - Date.now()) / 60000);
    if (diffMin < 0) return `SLA vencido há ${Math.abs(diffMin)}min`;
    if (diffMin === 0) return 'SLA vence agora';
    return `SLA ${diffMin}min`;
  }

  podeEditar(e: AgendaResumo): boolean {
    if (!e) return false;
    return e.operadorId === this.usuarioLogado() || this.auth.hasRole('Administrador');
  }

  // ---------- modal ----------

  abrirModalEvento(dia?: Date, hora?: number): void {
    const inicio = dia ? new Date(dia) : new Date(this.dataReferencia());
    if (hora != null) inicio.setHours(hora, 0, 0, 0);
    import('./agenda-evento-modal.component').then(m => {
      this.modalRef = this.modalSvc.open(m.AgendaEventoModalComponent, { size: 'lg', backdrop: 'static' });
      this.modalRef.componentInstance.inicio.set(inicio);
      this.modalRef.componentInstance.usuarioLogado = this.usuarioLogado();
      this.modalRef.componentInstance.tipos = this.tipos();
      this.modalRef.componentInstance.operadores = this.operadores();
      this.modalRef.closed.subscribe(() => this.carregar());
    });
  }

  abrirEdicao(evento: AgendaResumo): void {
    if (!this.podeEditar(evento)) return;
    import('./agenda-evento-modal.component').then(m => {
      this.modalRef = this.modalSvc.open(m.AgendaEventoModalComponent, { size: 'lg', backdrop: 'static' });
      this.modalRef.componentInstance.inicio.set(new Date(evento.dataInicio));
      this.modalRef.componentInstance.eventoEdicao = evento;
      this.modalRef.componentInstance.usuarioLogado = this.usuarioLogado();
      this.modalRef.componentInstance.tipos = this.tipos();
      this.modalRef.componentInstance.operadores = this.operadores();
      this.modalRef.closed.subscribe(() => this.carregar());
    });
  }
}
