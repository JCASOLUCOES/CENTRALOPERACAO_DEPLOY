import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AgendaService } from './services/agenda.service';
import { AgendaItem, AgendaTipo, AgendaVisibilidade, AgendaRecorrencia, AgendaCriarRequest, AgendaAtualizarRequest } from './models/agenda.model';
import { ProjetosService } from '../implantacao/services/projetos.service';
import { LegacyService } from '../implantacao/services/legacy.service';
import { FuncionarioLegadoResumo } from '../implantacao/models/legacy.model';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-agenda-evento-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agenda-evento-modal.component.html',
  styleUrl: './agenda-evento-modal.component.scss'
})
export class AgendaEventoModalComponent implements OnInit {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly agendaSvc = inject(AgendaService);
  private readonly projetosSvc = inject(ProjetosService);
  private readonly legacySvc = inject(LegacyService);

  @Input() inicio = signal<Date>(new Date());
  @Input() eventoEdicao?: AgendaItem;
  @Input() usuarioLogado = 'admin';

  readonly closed = new Subject<void>();

  readonly salvando = signal(false);
  readonly erroMsg = signal<string | null>(null);

  readonly tipos: { valor: AgendaTipo; rotulo: string; cor: string; icone: string }[] = [
    { valor: 'Reuniao', rotulo: 'Reunião', cor: '#0f4c81', icone: 'bi-people-fill' },
    { valor: 'Treinamento', rotulo: 'Treinamento', cor: '#16a34a', icone: 'bi-mortarboard-fill' },
    { valor: 'Atendimento', rotulo: 'Atendimento', cor: '#d97706', icone: 'bi-headset' },
    { valor: 'Pessoal', rotulo: 'Pessoal', cor: '#94a3b8', icone: 'bi-person-fill' },
    { valor: 'Outro', rotulo: 'Outro', cor: '#7c3aed', icone: 'bi-three-dots' }
  ];

  readonly visibilidades: { valor: AgendaVisibilidade; rotulo: string; icone: string }[] = [
    { valor: 'Publico', rotulo: 'Público', icone: 'bi-globe' },
    { valor: 'Equipe', rotulo: 'Equipe', icone: 'bi-people' },
    { valor: 'Privado', rotulo: 'Privado', icone: 'bi-lock-fill' }
  ];

  readonly recorrencias: { valor: AgendaRecorrencia; rotulo: string }[] = [
    { valor: 'Nenhuma', rotulo: '—' },
    { valor: 'Diario', rotulo: 'Diário' },
    { valor: 'Semanal', rotulo: 'Semanal' },
    { valor: 'Mensal', rotulo: 'Mensal' }
  ];

  // form
  titulo = '';
  descricao = '';
  local = '';
  dataInicio = '';
  horaInicio = '09:00';
  dataFim = '';
  horaFim = '';
  diaInteiro = false;
  cor = '';
  tipo: AgendaTipo = 'Reuniao';
  visibilidade: AgendaVisibilidade = 'Publico';
  projetoId?: number;
  recorrente = false;
  padraoRecorrencia: AgendaRecorrencia = 'Nenhuma';

  // apoio
  readonly projetos = signal<{ id: number; codigo: string; nome: string }[]>([]);
  readonly funcionarios = signal<FuncionarioLegadoResumo[]>([]);

  ngOnInit(): void {
    this.projetosSvc.listar({}).subscribe(lista => {
      this.projetos.set(lista.map(p => ({ id: p.id, codigo: p.codigo, nome: p.nome })));
    });
    this.legacySvc.listarFuncionarios('', 200).subscribe(l => this.funcionarios.set(l));

    if (this.eventoEdicao) {
      const e = this.eventoEdicao;
      this.titulo = e.titulo;
      this.tipo = e.tipo;
      this.visibilidade = e.visibilidade;
      this.projetoId = e.projetoId;
      this.recorrente = e.recorrente;
      this.padraoRecorrencia = e.padraoRecorrencia;
      this.cor = e.cor ?? '';
      this.diaInteiro = e.diaInteiro;
      this.carregarDetalhes(e.id);
    } else {
      const d = this.inicio();
      this.dataInicio = this.formatarData(d);
      this.horaInicio = this.formatarHora(d);
    }
  }

  private carregarDetalhes(id: number): void {
    this.agendaSvc.obter(id).subscribe({
      next: d => {
        this.descricao = d.descricao ?? '';
        this.local = d.local ?? '';
        const ini = new Date(d.dataInicio);
        this.dataInicio = this.formatarData(ini);
        this.horaInicio = this.formatarHora(ini);
        if (d.dataFim) {
          const fim = new Date(d.dataFim);
          this.dataFim = this.formatarData(fim);
          this.horaFim = this.formatarHora(fim);
        }
      },
      error: () => this.erroMsg.set('Não foi possível carregar o evento.')
    });
  }

  private formatarData(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private formatarHora(d: Date): string {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  salvar(): void {
    this.erroMsg.set(null);
    if (!this.titulo.trim()) {
      this.erroMsg.set('Título é obrigatório.');
      return;
    }
    if (!this.dataInicio) {
      this.erroMsg.set('Data de início é obrigatória.');
      return;
    }
    if (this.dataFim && this.dataFim < this.dataInicio) {
      this.erroMsg.set('Data fim anterior à data início.');
      return;
    }
    if (this.recorrente && this.padraoRecorrencia === 'Nenhuma') {
      this.erroMsg.set('Recorrente exige um padrão de recorrência.');
      return;
    }

    const ini = this.combinar(this.dataInicio, this.horaInicio);
    const fim = this.dataFim && this.horaFim ? this.combinar(this.dataFim, this.horaFim) : null;
    this.salvando.set(true);

    if (this.eventoEdicao) {
      const req: AgendaAtualizarRequest = {
        titulo: this.titulo.trim(),
        descricao: this.descricao || undefined,
        local: this.local || undefined,
        dataInicio: ini.toISOString(),
        dataFim: fim?.toISOString(),
        diaInteiro: this.diaInteiro,
        cor: this.cor || undefined,
        tipo: this.tipo,
        visibilidade: this.visibilidade,
        projetoId: this.projetoId,
        recorrente: this.recorrente,
        padraoRecorrencia: this.padraoRecorrencia,
        usuarioAlteracao: this.usuarioLogado
      };
      this.agendaSvc.atualizar(this.eventoEdicao.id, req).subscribe({
        next: () => { this.salvando.set(false); this.fechar(); },
        error: () => { this.salvando.set(false); this.erroMsg.set('Falha ao atualizar evento.'); }
      });
    } else {
      const req: AgendaCriarRequest = {
        titulo: this.titulo.trim(),
        descricao: this.descricao || undefined,
        local: this.local || undefined,
        dataInicio: ini.toISOString(),
        dataFim: fim?.toISOString(),
        diaInteiro: this.diaInteiro,
        cor: this.cor || undefined,
        tipo: this.tipo,
        visibilidade: this.visibilidade,
        projetoId: this.projetoId,
        recorrente: this.recorrente,
        padraoRecorrencia: this.padraoRecorrencia,
        usuarioInclusao: this.usuarioLogado
      };
      this.agendaSvc.criar(req).subscribe({
        next: () => { this.salvando.set(false); this.fechar(); },
        error: () => { this.salvando.set(false); this.erroMsg.set('Falha ao criar evento.'); }
      });
    }
  }

  excluir(): void {
    if (!this.eventoEdicao) return;
    if (!confirm('Excluir este evento?')) return;
    this.salvando.set(true);
    this.agendaSvc.excluir(this.eventoEdicao.id).subscribe({
      next: () => { this.salvando.set(false); this.fechar(); },
      error: () => { this.salvando.set(false); this.erroMsg.set('Falha ao excluir evento.'); }
    });
  }

  private combinar(data: string, hora: string): Date {
    const [a, m, d] = data.split('-').map(Number);
    const [h, mm] = (hora || '00:00').split(':').map(Number);
    return new Date(a, (m || 1) - 1, d || 1, h || 0, mm || 0, 0, 0);
  }

  fechar(): void {
    this.closed.next();
    this.closed.complete();
    this.activeModal.close();
  }
}
