import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipesService } from '../../services/equipes.service';
import { TiposProjetoService, EtapasService, ColunasKanbanService } from '../../services/cadastros.service';
import { EquipeResumo, TipoProjetoResumo, EtapaResumo, ColunaKanbanResumo } from '../../models/equipe-tipo-etapa-coluna.model';
import { AuthService } from '@core/services/auth.service';

type Tab = 'equipes' | 'tipos' | 'etapas' | 'colunas';

interface TabDef { id: Tab; rotulo: string; icone: string; cor: string; }

@Component({
  selector: 'app-implantacao-cadastros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrl: './cadastros.component.scss',
  template: `
    <section class="cad-shell">
      <header class="cad-header">
        <div>
          <p class="cad-eyebrow">CONFIGURAÇÕES</p>
          <h1 class="cad-title">Cadastros</h1>
          <p class="cad-sub">Equipes, tipos de projeto, etapas e colunas do Kanban.</p>
        </div>
        <div class="cad-header__count">
          <span><strong>{{ totalItens() }}</strong> itens cadastrados</span>
        </div>
      </header>

      <nav class="cad-tabs" role="tablist">
        <button *ngFor="let t of tabs" type="button" class="cad-tab"
          [class.cad-tab--active]="tab() === t.id"
          [style.--tab-cor]="t.cor"
          role="tab"
          [attr.aria-selected]="tab() === t.id"
          (click)="tab.set(t.id)">
          <i class="bi" [ngClass]="t.icone"></i>
          <span>{{ t.rotulo }}</span>
          <span class="cad-tab__count">{{ countPorTab(t.id) }}</span>
        </button>
      </nav>

      <div class="cad-body">

        <!-- EQUIPES -->
        <section *ngIf="tab() === 'equipes'" class="cad-panel">
          <form class="cad-form" (ngSubmit)="salvarEquipe()" #fEq="ngForm">
            <h2 class="cad-panel__title"><i class="bi bi-people-fill"></i> Adicionar equipe</h2>
            <div class="cad-form__grid">
              <label class="cad-field">
                <span>Nome <em>*</em></span>
                <input class="cad-input" [(ngModel)]="formEquipe.nome" name="enome" required placeholder="Ex.: IMPLANTACAO" />
              </label>
              <label class="cad-field">
                <span>Prefixo <em>*</em> <small>(código do projeto)</small></span>
                <input class="cad-input cad-input--mono" [(ngModel)]="formEquipe.prefixoCodigo" name="eprefixo" maxlength="20" required placeholder="IMP" />
              </label>
              <label class="cad-field cad-field--full">
                <span>Descrição</span>
                <input class="cad-input" [(ngModel)]="formEquipe.descricao" name="edesc" placeholder="O que essa equipe faz" />
              </label>
            </div>
            <div class="cad-form__actions">
              <button type="submit" class="cad-btn cad-btn--primary" [disabled]="fEq.invalid">
                <i class="bi bi-plus-lg"></i> Adicionar equipe
              </button>
            </div>
          </form>

          <div class="cad-table-wrap" *ngIf="equipes().length">
            <table class="cad-table">
              <thead><tr><th>Nome</th><th>Prefixo</th><th>Descrição</th><th class="cad-num">Membros</th><th>Status</th></tr></thead>
              <tbody>
                <tr *ngFor="let e of equipes()">
                  <td>
                    <span class="cad-pill" [class.cad-pill--impl]="e.nome === 'IMPLANTACAO'" [class.cad-pill--ciaa]="e.nome === 'CIAA'">
                      <i class="bi bi-people-fill"></i> {{ e.nome }}
                    </span>
                  </td>
                  <td><code class="cad-mono">{{ e.prefixoCodigo }}</code></td>
                  <td class="cad-muted">{{ e.nome === 'IMPLANTACAO' ? 'Equipe responsável por implantações em clientes' : (e.nome === 'CIAA' ? 'Centro de Inovação, Automação e IA' : '—') }}</td>
                  <td class="cad-num"><strong>{{ e.membrosCount }}</strong></td>
                  <td>
                    <span class="cad-status" [class.cad-status--ok]="e.ativa">
                      <i class="bi" [ngClass]="e.ativa ? 'bi-check-circle-fill' : 'bi-pause-circle'"></i>
                      {{ e.ativa ? 'Ativa' : 'Inativa' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- TIPOS -->
        <section *ngIf="tab() === 'tipos'" class="cad-panel">
          <form class="cad-form" (ngSubmit)="salvarTipo()" #fTp="ngForm">
            <h2 class="cad-panel__title"><i class="bi bi-tags-fill"></i> Adicionar tipo de projeto</h2>
            <div class="cad-form__grid">
              <label class="cad-field">
                <span>Código <em>*</em></span>
                <input class="cad-input cad-input--mono" [(ngModel)]="formTipo.codigo" name="tcod" required placeholder="CLIENTE" />
              </label>
              <label class="cad-field">
                <span>Nome <em>*</em></span>
                <input class="cad-input" [(ngModel)]="formTipo.nome" name="tnome" required placeholder="Cliente" />
              </label>
              <label class="cad-field">
                <span>Equipe</span>
                <select class="cad-input" [(ngModel)]="formTipo.equipeId" name="teq">
                  <option [ngValue]="null">— Selecione —</option>
                  <option *ngFor="let eq of equipes()" [ngValue]="eq.id">{{ eq.nome }}</option>
                </select>
              </label>
              <label class="cad-field">
                <span>Ordem</span>
                <input type="number" class="cad-input" [(ngModel)]="formTipo.ordem" name="tord" min="0" />
              </label>
              <label class="cad-field cad-field--check">
                <input type="checkbox" [(ngModel)]="formTipo.clienteObrigatorio" name="tcli" />
                <span>Cliente obrigatório (tipos IMPL)</span>
              </label>
            </div>
            <div class="cad-form__actions">
              <button type="submit" class="cad-btn cad-btn--primary" [disabled]="fTp.invalid">
                <i class="bi bi-plus-lg"></i> Adicionar tipo
              </button>
            </div>
          </form>

          <div class="cad-table-wrap" *ngIf="tipos().length">
            <table class="cad-table">
              <thead><tr><th>Código</th><th>Nome</th><th>Equipe</th><th>Cliente obrigatório</th><th class="cad-num">Ordem</th></tr></thead>
              <tbody>
                <tr *ngFor="let t of tipos()">
                  <td><code class="cad-mono">{{ t.codigo }}</code></td>
                  <td><strong>{{ t.nome }}</strong></td>
                  <td>
                    <span class="cad-pill" *ngIf="t.equipeNome"
                      [class.cad-pill--impl]="t.equipeNome === 'IMPLANTACAO'"
                      [class.cad-pill--ciaa]="t.equipeNome === 'CIAA'">
                      {{ t.equipeNome }}
                    </span>
                    <span class="cad-muted" *ngIf="!t.equipeNome">—</span>
                  </td>
                  <td>
                    <span class="cad-status" [class.cad-status--ok]="t.clienteObrigatorio">
                      <i class="bi" [ngClass]="t.clienteObrigatorio ? 'bi-check-lg' : 'bi-dash'"></i>
                      {{ t.clienteObrigatorio ? 'Sim' : 'Não' }}
                    </span>
                  </td>
                  <td class="cad-num"><code class="cad-mono">{{ t.ordem }}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ETAPAS -->
        <section *ngIf="tab() === 'etapas'" class="cad-panel">
          <form class="cad-form" (ngSubmit)="salvarEtapa()" #fEt="ngForm">
            <h2 class="cad-panel__title"><i class="bi bi-list-ol"></i> Adicionar etapa</h2>
            <div class="cad-form__grid">
              <label class="cad-field cad-field--wide">
                <span>Nome <em>*</em></span>
                <input class="cad-input cad-input--mono" [(ngModel)]="formEtapa.nome" name="enome" required placeholder="KICKOFF" />
              </label>
              <label class="cad-field">
                <span>Tipo de projeto</span>
                <select class="cad-input" [(ngModel)]="formEtapa.tipoProjetoId" name="etipo">
                  <option [ngValue]="null">— Todos —</option>
                  <option *ngFor="let t of tipos()" [ngValue]="t.id">{{ t.codigo }}</option>
                </select>
              </label>
              <label class="cad-field">
                <span>Ordem</span>
                <input type="number" class="cad-input" [(ngModel)]="formEtapa.ordem" name="eord" min="0" />
              </label>
              <label class="cad-field">
                <span>Cor <small>(hex)</small></span>
                <input class="cad-input cad-input--mono" [(ngModel)]="formEtapa.cor" name="ecor" maxlength="20" placeholder="#0f4c81" />
              </label>
            </div>
            <div class="cad-form__actions">
              <button type="submit" class="cad-btn cad-btn--primary" [disabled]="fEt.invalid">
                <i class="bi bi-plus-lg"></i> Adicionar etapa
              </button>
            </div>
          </form>

          <div class="cad-table-wrap" *ngIf="etapas().length">
            <table class="cad-table">
              <thead><tr><th class="cad-num" style="width: 70px;">Ordem</th><th>Nome</th><th>Tipo</th><th>Cor</th></tr></thead>
              <tbody>
                <tr *ngFor="let e of etapas()">
                  <td class="cad-num"><code class="cad-mono">{{ e.ordem }}</code></td>
                  <td><strong>{{ e.nome }}</strong></td>
                  <td><code class="cad-mono">{{ tipoCodigo(e.tipoProjetoId) }}</code></td>
                  <td>
                    <span class="cad-swatch" *ngIf="e.cor" [style.background]="e.cor"></span>
                    <code class="cad-mono" *ngIf="e.cor">{{ e.cor }}</code>
                    <span class="cad-muted" *ngIf="!e.cor">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- COLUNAS -->
        <section *ngIf="tab() === 'colunas'" class="cad-panel">
          <form class="cad-form" (ngSubmit)="salvarColuna()" #fCl="ngForm">
            <h2 class="cad-panel__title"><i class="bi bi-kanban-fill"></i> Adicionar coluna Kanban</h2>
            <div class="cad-form__grid">
              <label class="cad-field cad-field--wide">
                <span>Nome <em>*</em></span>
                <input class="cad-input" [(ngModel)]="formColuna.nome" name="cnome" required placeholder="BACKLOG" />
              </label>
              <label class="cad-field">
                <span>Ordem</span>
                <input type="number" class="cad-input" [(ngModel)]="formColuna.ordem" name="cord" min="0" />
              </label>
              <label class="cad-field">
                <span>Cor <small>(hex)</small></span>
                <input class="cad-input cad-input--mono" [(ngModel)]="formColuna.cor" name="ccor" maxlength="20" placeholder="#60a5fa" />
              </label>
              <label class="cad-field">
                <span>Limite WIP</span>
                <input type="number" class="cad-input" [(ngModel)]="formColuna.limiteWip" name="cwip" min="0" />
              </label>
            </div>
            <div class="cad-form__actions">
              <button type="submit" class="cad-btn cad-btn--primary" [disabled]="fCl.invalid || colunas().length >= 8">
                <i class="bi bi-plus-lg"></i> Adicionar coluna
              </button>
              <span *ngIf="colunas().length >= 8" class="cad-form__warn">
                <i class="bi bi-exclamation-triangle-fill"></i> Limite máximo de 8 colunas atingido.
              </span>
            </div>
          </form>

          <div class="cad-table-wrap" *ngIf="colunas().length">
            <table class="cad-table">
              <thead><tr><th class="cad-num" style="width: 70px;">Ordem</th><th>Nome</th><th>Cor</th><th class="cad-num">WIP</th><th>Tipo</th><th>Status</th></tr></thead>
              <tbody>
                <tr *ngFor="let c of colunas()">
                  <td class="cad-num"><code class="cad-mono">{{ c.ordem }}</code></td>
                  <td><strong>{{ c.nome }}</strong></td>
                  <td>
                    <span class="cad-swatch" *ngIf="c.cor" [style.background]="c.cor"></span>
                    <code class="cad-mono" *ngIf="c.cor">{{ c.cor }}</code>
                    <span class="cad-muted" *ngIf="!c.cor">—</span>
                  </td>
                  <td class="cad-num">{{ c.limiteWip || '—' }}</td>
                  <td>
                    <span class="cad-tag" [class.cad-tag--primary]="c.padrao">{{ c.padrao ? 'Padrão' : 'Customizada' }}</span>
                  </td>
                  <td>
                    <span class="cad-status" [class.cad-status--ok]="c.ativa">
                      <i class="bi" [ngClass]="c.ativa ? 'bi-check-circle-fill' : 'bi-pause-circle'"></i>
                      {{ c.ativa ? 'Ativa' : 'Inativa' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </section>
  `,
})
export class CadastrosComponent implements OnInit {
  private readonly eqSvc = inject(EquipesService);
  private readonly tiposSvc = inject(TiposProjetoService);
  private readonly etapasSvc = inject(EtapasService);
  private readonly colSvc = inject(ColunasKanbanService);
  private readonly auth = inject(AuthService);

  tab = signal<Tab>('equipes');

  readonly tabs: TabDef[] = [
    { id: 'equipes', rotulo: 'Equipes',        icone: 'bi-people-fill',     cor: '#0f4c81' },
    { id: 'tipos',   rotulo: 'Tipos',          icone: 'bi-tags-fill',       cor: '#7c3aed' },
    { id: 'etapas',  rotulo: 'Etapas',         icone: 'bi-list-ol',         cor: '#16a34a' },
    { id: 'colunas', rotulo: 'Colunas Kanban', icone: 'bi-kanban-fill',     cor: '#d97706' }
  ];

  equipes = signal<EquipeResumo[]>([]);
  tipos = signal<TipoProjetoResumo[]>([]);
  etapas = signal<EtapaResumo[]>([]);
  colunas = signal<ColunaKanbanResumo[]>([]);

  readonly totalItens = computed(() => this.equipes().length + this.tipos().length + this.etapas().length + this.colunas().length);

  countPorTab(t: Tab): number {
    switch (t) {
      case 'equipes': return this.equipes().length;
      case 'tipos':   return this.tipos().length;
      case 'etapas':  return this.etapas().length;
      case 'colunas': return this.colunas().length;
    }
  }

  formEquipe = { nome: '', prefixoCodigo: '', descricao: '' };
  formTipo = { codigo: '', nome: '', equipeId: null as number | null, clienteObrigatorio: true, ordem: 0 };
  formEtapa = { nome: '', ordem: 0, tipoProjetoId: null as number | null, cor: '' };
  formColuna = { nome: '', ordem: 0, cor: '', limiteWip: null as number | null };

  ngOnInit(): void { this.carregarTudo(); }

  carregarTudo(): void {
    this.eqSvc.listar().subscribe(e => this.equipes.set(e));
    this.tiposSvc.listar(undefined, false).subscribe(t => this.tipos.set(t));
    this.etapasSvc.listar().subscribe(e => this.etapas.set(e));
    this.colSvc.listar(false).subscribe(c => this.colunas.set(c));
  }

  salvarEquipe(): void {
    if (!this.formEquipe.nome || !this.formEquipe.prefixoCodigo) return;
    this.eqSvc.criar({
      nome: this.formEquipe.nome, prefixoCodigo: this.formEquipe.prefixoCodigo,
      descricao: this.formEquipe.descricao || undefined,
      usuarioInclusao: this.auth.getOperadorLogado()
    }).subscribe(() => { this.formEquipe = { nome: '', prefixoCodigo: '', descricao: '' }; this.carregarTudo(); });
  }

  salvarTipo(): void {
    if (!this.formTipo.codigo || !this.formTipo.nome) return;
    this.tiposSvc.criar({
      codigo: this.formTipo.codigo, nome: this.formTipo.nome,
      equipeId: this.formTipo.equipeId ?? undefined,
      clienteObrigatorio: this.formTipo.clienteObrigatorio,
      ordem: this.formTipo.ordem,
      usuarioInclusao: this.auth.getOperadorLogado()
    }).subscribe(() => { this.formTipo = { codigo: '', nome: '', equipeId: null, clienteObrigatorio: true, ordem: 0 }; this.carregarTudo(); });
  }

  salvarEtapa(): void {
    if (!this.formEtapa.nome) return;
    this.etapasSvc.criar({
      nome: this.formEtapa.nome, ordem: this.formEtapa.ordem,
      tipoProjetoId: this.formEtapa.tipoProjetoId ?? undefined,
      cor: this.formEtapa.cor || undefined,
      usuarioInclusao: this.auth.getOperadorLogado()
    }).subscribe(() => { this.formEtapa = { nome: '', ordem: 0, tipoProjetoId: null, cor: '' }; this.carregarTudo(); });
  }

  salvarColuna(): void {
    if (!this.formColuna.nome) return;
    this.colSvc.criar({
      nome: this.formColuna.nome, ordem: this.formColuna.ordem,
      cor: this.formColuna.cor || undefined,
      limiteWip: this.formColuna.limiteWip ?? undefined,
      usuarioInclusao: this.auth.getOperadorLogado()
    }).subscribe(() => { this.formColuna = { nome: '', ordem: 0, cor: '', limiteWip: null }; this.carregarTudo(); });
  }

  tipoCodigo(id?: number): string {
    if (!id) return '—';
    return this.tipos().find(t => t.id === id)?.codigo ?? '—';
  }
}
