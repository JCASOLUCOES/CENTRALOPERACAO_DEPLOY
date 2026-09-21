import { Component, EventEmitter, Input, Output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutsideDirective } from '@shared/directives/click-outside.directive';
import { TarefasService, ChamadoResumo } from '@features/implantacao/services/tarefas.service';

interface Chamado { chamadoId: number; titulo?: string; status?: string; }

@Component({
  selector: 'app-chamado-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective],
  templateUrl: './chamado-dropdown.component.html',
  styleUrl: './chamado-dropdown.component.scss'
})
export class ChamadoDropdownComponent {
  private tarefasSvc = inject(TarefasService);

  @Input() selecionados: number[] = [];
  @Output() selecaoChange = new EventEmitter<number[]>();

  @Input() placeholder = 'Selecionar chamados...';

  aberto = signal(false);
  busca = signal('');
  chamados = signal<Chamado[]>([]);
  carregando = signal(false);
  erro = signal<string | null>(null);

  ngOnInit() { this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    this.erro.set(null);
    try {
      const chs = await this.tarefasSvc.buscarChamados(this.busca() || undefined, 50).toPromise();
      this.chamados.set((chs ?? []).map(c => ({
        chamadoId: c.chamadoId,
        titulo: c.titulo ?? `Chamado #${c.chamadoId}`,
        status: c.status
      })));
    } catch (e: unknown) {
      this.erro.set('Erro ao carregar chamados');
      console.error(e);
    } finally {
      this.carregando.set(false);
    }
  }

  filtrados = computed(() => {
    const b = this.busca().toLowerCase();
    if (!b) return this.chamados();
    return this.chamados().filter(c =>
      String(c.chamadoId).includes(b) ||
      (c.titulo?.toLowerCase() ?? '').includes(b)
    );
  });

  toggle(chId: number) {
    const atuais = [...this.selecionados];
    const idx = atuais.indexOf(chId);
    if (idx >= 0) atuais.splice(idx, 1);
    else atuais.push(chId);
    this.selecaoChange.emit(atuais);
  }

  isSelecionado(chId: number) { return this.selecionados.includes(chId); }

  getChamadoLabel(chId: number): string {
    const ch = this.chamados().find(c => c.chamadoId === chId);
    return ch ? `#${ch.chamadoId} - ${ch.titulo}` : `#${chId}`;
  }

  fechar() { this.aberto.set(false); this.busca.set(''); }

  toggleAberto() {
    this.aberto.update(v => !v);
    if (!this.aberto()) this.carregar();
  }

  onBuscaChange() { this.carregar(); }
}