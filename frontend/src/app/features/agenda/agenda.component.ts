import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AgendaService } from './services/agenda.service';
import { AgendaItem, AgendaTipo, AgendaVisibilidade, AgendaRecorrencia } from './models/agenda.model';
import { AuthService } from '@core/services/auth.service';

type Visao = 'dia' | 'semana' | 'mes';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss'
})
export class AgendaComponent implements OnInit {
  private readonly svc = inject(AgendaService);
  private readonly auth = inject(AuthService);
  private readonly modalSvc = inject(NgbModal);

  readonly visao = signal<Visao>('semana');
  readonly dataReferencia = signal<Date>(new Date());
  readonly eventos = signal<AgendaItem[]>([]);
  readonly carregando = signal(false);
  readonly operadorFiltro = signal<string>('');
  readonly equipeFiltro = signal<string>('');
  /** Quando true: mostra eventos do operador logado + eventos Publicos dos colegas. */
  readonly pessoalMaisPublico = signal(true);

  readonly usuarioLogado = computed(() => this.auth.getOperadorLogado());

  readonly tiposLegenda: { tipo: AgendaTipo; rotulo: string; cor: string; icone: string }[] = [
    { tipo: 'Reuniao', rotulo: 'Reunião', cor: '#0f4c81', icone: 'bi-people-fill' },
    { tipo: 'Treinamento', rotulo: 'Treinamento', cor: '#16a34a', icone: 'bi-mortarboard-fill' },
    { tipo: 'Atendimento', rotulo: 'Atendimento', cor: '#d97706', icone: 'bi-headset' },
    { tipo: 'Pessoal', rotulo: 'Pessoal', cor: '#94a3b8', icone: 'bi-person-fill' },
    { tipo: 'Outro', rotulo: 'Outro', cor: '#7c3aed', icone: 'bi-three-dots' }
  ];

  readonly inicio = computed(() => {
    const d = new Date(this.dataReferencia());
    if (this.visao() === 'dia') {
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (this.visao() === 'semana') {
      const dia = d.getDay();
      d.setDate(d.getDate() - dia);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly fim = computed(() => {
    const d = new Date(this.inicio());
    if (this.visao() === 'dia') {
      d.setDate(d.getDate() + 1);
      return d;
    }
    if (this.visao() === 'semana') {
      d.setDate(d.getDate() + 7);
      return d;
    }
    d.setMonth(d.getMonth() + 1);
    return d;
  });

  readonly diasSemana = computed(() => {
    const inicio = this.inicio();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return d;
    });
  });

  readonly diasMes = computed(() => {
    const inicio = new Date(this.inicio());
    const ultimoDia = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    return Array.from({ length: ultimoDia }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(i + 1);
      return d;
    });
  });

  readonly diasSemanaCurto = computed(() => {
    const inicio = new Date(this.dataReferencia());
    const dia = inicio.getDay();
    inicio.setDate(inicio.getDate() - dia);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    });
  });

  readonly horasDia = Array.from({ length: 24 }, (_, i) => i);

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando.set(true);
    this.svc.listar({
      inicio: this.inicio().toISOString(),
      fim: this.fim().toISOString(),
      operadorId: this.operadorFiltro() || undefined
    }).subscribe({
      next: lista => {
        this.eventos.set(this.aplicarFiltros(lista));
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false)
    });
  }

  private aplicarFiltros(lista: AgendaItem[]): AgendaItem[] {
    return lista.filter(e => {
      // Modo padrao: pessoal + publico. Sempre mantem eventos do operador logado
      // e eventos com visibilidade Publica dos colegas. Eventos de Equipe/Privado de
      // outros ja sao filtrados no backend; aqui garantimos o cliente.
      if (this.pessoalMaisPublico()) {
        if (e.operadorId !== this.usuarioLogado() && e.visibilidade !== 'Publico') return false;
      } else {
        // Sem o filtro: mantem tudo que o backend devolveu (respeitando a regra de visibilidade)
      }
      return true;
    });
  }

  eventosDoDia(dia: Date): AgendaItem[] {
    return this.eventos().filter(e => {
      const d = new Date(e.dataInicio);
      return d.getFullYear() === dia.getFullYear() && d.getMonth() === dia.getMonth() && d.getDate() === dia.getDate();
    });
  }

  eventosPorHora(dia: Date, hora: number): AgendaItem[] {
    return this.eventos().filter(e => {
      const d = new Date(e.dataInicio);
      if (d.getFullYear() !== dia.getFullYear() || d.getMonth() !== dia.getMonth() || d.getDate() !== dia.getDate()) return false;
      if (e.diaInteiro) return false;
      return d.getHours() === hora;
    });
  }

  eventosDiaInteiro(dia: Date): AgendaItem[] {
    return this.eventos().filter(e => {
      if (!e.diaInteiro) return false;
      const d = new Date(e.dataInicio);
      return d.getFullYear() === dia.getFullYear() && d.getMonth() === dia.getMonth() && d.getDate() === dia.getDate();
    });
  }

  ehHoje(d: Date): boolean {
    const h = new Date();
    return h.getFullYear() === d.getFullYear() && h.getMonth() === d.getMonth() && h.getDate() === d.getDate();
  }

  horaAtualMinutos(): number {
    const h = new Date();
    return h.getHours() * 60 + h.getMinutes();
  }

  corDoEvento(e: AgendaItem): string {
    if (e.cor) return e.cor;
    return this.tiposLegenda.find(t => t.tipo === e.tipo)?.cor ?? '#0f4c81';
  }

  // navegacao
  anterior(): void {
    const d = new Date(this.dataReferencia());
    if (this.visao() === 'dia') d.setDate(d.getDate() - 1);
    else if (this.visao() === 'semana') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    this.dataReferencia.set(d);
    this.carregar();
  }

  proximo(): void {
    const d = new Date(this.dataReferencia());
    if (this.visao() === 'dia') d.setDate(d.getDate() + 1);
    else if (this.visao() === 'semana') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    this.dataReferencia.set(d);
    this.carregar();
  }

  hoje(): void {
    this.dataReferencia.set(new Date());
    this.carregar();
  }

  mudarVisao(v: Visao): void { this.visao.set(v); this.carregar(); }

  rotuloCabecalho(): string {
    const d = this.dataReferencia();
    if (this.visao() === 'dia') return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    if (this.visao() === 'semana') {
      const i = this.inicio();
      const f = new Date(i); f.setDate(f.getDate() + 6);
      return `${i.toLocaleDateString('pt-BR')} – ${f.toLocaleDateString('pt-BR')}`;
    }
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  diaCurto(d: Date): string {
    return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }

  diaNumero(d: Date): number { return d.getDate(); }

  abrirModalEvento(dia?: Date, hora?: number): void {
    const inicio = dia ? new Date(dia) : new Date();
    if (hora != null) inicio.setHours(hora, 0, 0, 0);
    import('./agenda-evento-modal.component').then(m => {
      const ref = this.modalSvc.open(m.AgendaEventoModalComponent, { size: 'lg', backdrop: 'static' });
      ref.componentInstance.inicio.set(inicio);
      ref.componentInstance.usuarioLogado = this.usuarioLogado();
      ref.closed.subscribe(() => this.carregar());
    });
  }

  abrirEdicao(evento: AgendaItem): void {
    import('./agenda-evento-modal.component').then(m => {
      const ref = this.modalSvc.open(m.AgendaEventoModalComponent, { size: 'lg', backdrop: 'static' });
      ref.componentInstance.inicio.set(new Date(evento.dataInicio));
      ref.componentInstance.eventoEdicao = evento;
      ref.componentInstance.usuarioLogado = this.usuarioLogado();
      ref.closed.subscribe(() => this.carregar());
    });
  }
}
