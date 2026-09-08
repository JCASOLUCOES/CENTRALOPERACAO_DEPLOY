import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProjetosService } from '../../services/projetos.service';
import { EquipesService } from '../../services/equipes.service';
import { ProjetoResumo, ProjetoFiltro } from '../../models/projeto.model';
import { EquipeResumo } from '../../models/equipe-tipo-etapa-coluna.model';

@Component({
  selector: 'app-implantacao-projetos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrl: './projetos.component.scss',
  template: `
    <div class="imp-page">
      <header class="imp-header">
        <div>
          <p class="imp-eyebrow">Projetos e trabalhos</p>
          <h1 class="imp-header__title">Projetos</h1>
          <p class="imp-header__sub">{{ total() }} projeto(s) encontrado(s)</p>
        </div>
        <div class="imp-header__actions">
          <a [routerLink]="['novo']" class="imp-btn imp-btn--primary">
            <i class="bi bi-plus-lg"></i> Novo projeto
          </a>
        </div>
      </header>

      <div class="imp-chips">
        <button class="imp-chip" [class.imp-chip--active]="equipe() === 'Todas'" (click)="setEquipe('Todas')">Todas</button>
        <button class="imp-chip imp-chip--impl" [class.imp-chip--active]="equipe() === 'IMPLANTACAO'" (click)="setEquipe('IMPLANTACAO')">Implantação</button>
        <button class="imp-chip imp-chip--ciaa" [class.imp-chip--active]="equipe() === 'CIAA'" (click)="setEquipe('CIAA')">CIAA</button>
      </div>

      <div class="imp-filtros">
        <input type="text" class="imp-search imp-filtros__search" placeholder="Buscar por código ou nome…"
               [value]="buscar()" (input)="onBuscar($any($event.target).value)" />
        <select class="imp-form__select" [value]="status()" (change)="onStatus($any($event.target).value)">
          <option value="">Todos os status</option>
          <option value="Backlog">Backlog</option>
          <option value="AFazer">A Fazer</option>
          <option value="EmAndamento">Em Andamento</option>
          <option value="Homologacao">Homologação</option>
          <option value="Concluido">Concluído</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
      </div>

      <div *ngIf="loading()" class="imp-loading">Carregando projetos…</div>

      <div *ngIf="!loading() && !projetos().length" class="imp-empty">
        <h3 class="imp-empty__title">Nenhum projeto por aqui</h3>
        <p class="imp-empty__hint">Crie o primeiro projeto de implantação ou CIAA para começar a acompanhar.</p>
        <a [routerLink]="['novo']" class="imp-btn imp-btn--primary imp-empty__action">
          <i class="bi bi-plus-lg"></i> Criar primeiro projeto
        </a>
      </div>

      <div class="imp-proj-grid" *ngIf="projetos().length">
        <a *ngFor="let p of projetos()"
           [routerLink]="[p.id]"
           class="imp-card imp-card--clickable"
           [class.imp-card--impl]="p.equipeNome === 'IMPLANTACAO'"
           [class.imp-card--ciaa]="p.equipeNome === 'CIAA'">
          <div class="imp-proj-card">
            <div class="imp-proj-card__top">
              <span class="imp-code">{{ p.codigo }}</span>
              <span class="imp-status" [ngClass]="classeStatus(p.status)">{{ formatarStatus(p.status) }}</span>
            </div>

            <h3 class="imp-proj-card__title">{{ p.nome }}</h3>

            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
              <span class="imp-team" [class.imp-team--impl]="p.equipeNome === 'IMPLANTACAO'" [class.imp-team--ciaa]="p.equipeNome === 'CIAA'">
                {{ p.equipeNome }}
              </span>
              <span style="font: 500 0.75rem/1 'Inter', sans-serif; color: var(--imp-sky);">·</span>
              <span style="font: 500 0.75rem/1 'Inter', sans-serif; color: var(--imp-ink-soft);">{{ p.tipoProjetoNome }}</span>
            </div>

            <p *ngIf="p.clienteNome" class="imp-proj-card__client">{{ p.clienteNome }}</p>

            <div>
              <div class="imp-progress">
                <div class="imp-progress__bar" [style.width.%]="p.progresso"></div>
                <span class="imp-progress__text">{{ p.progresso }}%</span>
              </div>
            </div>

            <div class="imp-proj-card__meta">
              <span *ngIf="p.responsavelNome"><i class="bi bi-person"></i> {{ p.responsavelNome }}</span>
              <span *ngIf="p.dataPrevisao"><i class="bi bi-calendar"></i> {{ p.dataPrevisao | date:'dd/MM/yyyy' }}</span>
            </div>
          </div>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .imp-proj-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1rem;
    }
  `]
})
export class ProjetosComponent implements OnInit {
  private readonly projSvc = inject(ProjetosService);
  private readonly eqSvc = inject(EquipesService);

  projetos = signal<ProjetoResumo[]>([]);
  loading = signal(true);
  equipe = signal('Todas');
  status = signal('');
  buscar = signal('');

  total = computed(() => this.projetos().length);

  ngOnInit(): void { this.carregar(); }

  setEquipe(eq: string): void { this.equipe.set(eq); this.carregar(); }
  onStatus(v: string): void { this.status.set(v); this.carregar(); }
  onBuscar(v: string): void { this.buscar.set(v); this.carregar(); }

  carregar(): void {
    this.loading.set(true);
    const filtro: ProjetoFiltro = {};
    if (this.equipe() !== 'Todas') filtro.equipe = this.equipe();
    if (this.status()) filtro.status = this.status();
    if (this.buscar()) filtro.buscar = this.buscar();

    this.projSvc.listar(filtro).subscribe({
      next: (p) => { this.projetos.set(p); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  classeStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'imp-status--backlog',
      'AFazer': 'imp-status--afazer',
      'EmAndamento': 'imp-status--em-andamento',
      'Homologacao': 'imp-status--em-homologacao',
      'Concluido': 'imp-status--concluido',
      'Bloqueado': 'imp-status--bloqueado',
      'Cancelado': 'imp-status--cancelado'
    };
    return m[s] ?? 'imp-status--backlog';
  }

  formatarStatus(s: string): string {
    const m: Record<string, string> = {
      'Backlog': 'Backlog', 'AFazer': 'A Fazer', 'EmAndamento': 'Em Andamento',
      'Homologacao': 'Homologação', 'Concluido': 'Concluído',
      'Cancelado': 'Cancelado', 'Bloqueado': 'Bloqueado'
    };
    return m[s] ?? s;
  }
}
