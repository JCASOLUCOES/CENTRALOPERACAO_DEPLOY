import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseRelationship, DatabaseTable } from '../models/database.model';

interface NoDiagrama { id: string; x: number; y: number; label: string; }
interface ArestaDiagrama { origem: string; destino: string; tipo: string; }

@Component({
  selector: 'app-db-diagrama',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-diag__controles">
    <input type="text" class="form-control db-diag__tabela-input" placeholder="Tabela inicial (ex: dbo.TBDEVEDOR)"
      [(ngModel)]="tabelaRaiz">
    <label class="db-diag__prof">
      Profundidade:
      <select class="form-select form-select-sm" [(ngModel)]="profundidade">
        <option [ngValue]="1">1</option>
        <option [ngValue]="2">2</option>
        <option [ngValue]="3">3</option>
        <option [ngValue]="4">4</option>
        <option [ngValue]="5">5</option>
      </select>
    </label>
    <label class="db-diag__check">
      <input type="checkbox" [(ngModel)]="incluirPossiveis"> Incluir relacionamentos possíveis
    </label>
    <button class="btn btn-primary" (click)="renderizar()" [disabled]="!tabelaRaiz || carregando()">
      <i class="bi bi-diagram-3"></i> Renderizar
    </button>
    <div class="db-diag__zoom-controls ms-auto d-flex gap-1" *ngIf="nos().length > 0">
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="zoomIn()" title="Aproximar (+)">
        <i class="bi bi-zoom-in"></i>
      </button>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="zoomOut()" title="Afastar (-)">
        <i class="bi bi-zoom-out"></i>
      </button>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="resetView()" title="Resetar visão">
        <i class="bi bi-arrows-fullscreen"></i>
      </button>
      <button type="button" class="btn btn-outline-secondary btn-sm" (click)="fitToView()" title="Ajustar ao conteúdo">
        <i class="bi bi-arrows-angle-contract"></i>
      </button>
    </div>
  </div>

  <div *ngIf="carregando()" class="adm-empty">Carregando grafo…</div>

  <div *ngIf="!carregando() && nos().length > 0" class="db-diag__canvas-wrap"
       (mousedown)="onPanStart($event)" (mousemove)="onPanMove($event)" (mouseup)="onPanEnd()" (mouseleave)="onPanEnd()"
       (wheel)="onWheel($event)"
       (touchstart)="onTouchStart($event)" (touchmove)="onTouchMove($event)" (touchend)="onTouchEnd()">
    <svg class="db-diag__svg" [attr.viewBox]="'0 0 ' + largura() + ' ' + altura()" [style.cursor]="isPanning() ? 'grabbing' : 'grab'">
      <defs>
        <marker id="arrow-confirmada" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L6,4 L0,8 z" fill="#1d4ed8" />
        </marker>
        <marker id="arrow-possivel" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
          <path d="M0,0 L6,4 L0,8 z" fill="#7c3aed" />
        </marker>
      </defs>
      <g [style.transform]="transformStyle()" [style.transform-origin]="'0 0'">
        <g *ngFor="let a of arestas()">
          <line [attr.x1]="coord(a.origem, 'x')" [attr.y1]="coord(a.origem, 'y')"
                [attr.x2]="coord(a.destino, 'x')" [attr.y2]="coord(a.destino, 'y')"
                [attr.stroke]="a.tipo === 'Confirmada' ? '#1d4ed8' : '#7c3aed'"
                [attr.stroke-dasharray]="a.tipo === 'Confirmada' ? '0' : '6 4'"
                [attr.stroke-width]="a.tipo === 'Confirmada' ? 2 : 1.5"
                [attr.marker-end]="a.tipo === 'Confirmada' ? 'url(#arrow-confirmada)' : 'url(#arrow-possivel)'" />
        </g>
        <g *ngFor="let n of nos()" (click)="navegarTabela(n.id)" style="cursor: pointer;">
          <rect [attr.x]="n.x - 70" [attr.y]="n.y - 18" width="140" height="36" rx="6"
            fill="#0f172a" stroke="#1d4ed8" stroke-width="1.5" />
          <text [attr.x]="n.x" [attr.y]="n.y + 5" text-anchor="middle" fill="#fff" font-size="12" font-weight="600">
            {{ n.label }}
          </text>
        </g>
      </g>
    </svg>
    <div class="db-diag__legenda">
      <span class="db-diag__leg-item"><span class="db-diag__leg-linha" style="background:#1d4ed8"></span> Confirmada</span>
      <span class="db-diag__leg-item"><span class="db-diag__leg-linha" style="background:repeating-linear-gradient(90deg, #7c3aed 0 6px, transparent 6px 10px)"></span> Possível</span>
    </div>
  </div>

  <div *ngIf="!carregando() && nos().length === 0" class="adm-empty">
    Informe uma tabela inicial e clique em <strong>Renderizar</strong> para ver o grafo de relacionamentos.
  </div>
  `,
  styles: [`
    .db-diag__controles { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
    .db-diag__tabela-input { max-width: 280px; }
    .db-diag__prof select { display: inline-block; width: auto; }
    .db-diag__zoom-controls { margin-left: auto; }
    .db-diag__canvas-wrap { background: #0f172a; border-radius: 0.5rem; padding: 1rem; overflow: hidden; position: relative; }
    .db-diag__svg { display: block; min-width: 100%; height: 500px; transition: transform 0.15s ease; }
    .db-diag__legenda { display: flex; gap: 1.5rem; padding: 0.5rem 0.25rem; color: #e2e8f0; font-size: 0.85rem; }
    .db-diag__leg-item { display: flex; align-items: center; gap: 0.4rem; }
    .db-diag__leg-linha { display: inline-block; width: 32px; height: 4px; border-radius: 2px; }
  `]
})
export class DbDiagramaComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);
  readonly nos = signal<NoDiagrama[]>([]);
  readonly arestas = signal<ArestaDiagrama[]>([]);
  readonly carregando = signal(false);
  readonly largura = signal(900);
  readonly altura = signal(500);

  // Zoom/Pan state
  readonly zoom = signal(1);
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly isPanning = signal(false);

  private panStart = { x: 0, y: 0 };
  private readonly MIN_ZOOM = 0.25;
  private readonly MAX_ZOOM = 4;

  tabelaRaiz = '';
  profundidade = 2;
  incluirPossiveis = false;

  ngOnInit(): void { /* input do usuario */ }

  coord(id: string, eixo: 'x' | 'y'): number {
    const n = this.nos().find(x => x.id === id);
    return n ? (eixo === 'x' ? n.x : n.y) : 0;
  }

  transformStyle(): string {
    return `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`;
  }

  // Zoom
  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.zoom.set(Math.max(this.MIN_ZOOM, Math.min(this.MAX_ZOOM, this.zoom() + delta)));
  }

  zoomIn(): void {
    this.zoom.set(Math.min(this.MAX_ZOOM, this.zoom() + 0.2));
  }

  zoomOut(): void {
    this.zoom.set(Math.max(this.MIN_ZOOM, this.zoom() - 0.2));
  }

  // Pan (mouse)
  onPanStart(e: MouseEvent): void {
    if (e.button !== 0) return; // only left click
    this.isPanning.set(true);
    this.panStart = { x: e.clientX - this.panX(), y: e.clientY - this.panY() };
  }

  onPanMove(e: MouseEvent): void {
    if (!this.isPanning()) return;
    this.panX.set(e.clientX - this.panStart.x);
    this.panY.set(e.clientY - this.panStart.y);
  }

  onPanEnd(): void {
    this.isPanning.set(false);
  }

  // Pan (touch)
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isPanning.set(true);
      const touch = e.touches[0];
      this.panStart = { x: touch.clientX - this.panX(), y: touch.clientY - this.panY() };
    }
  }

  onTouchMove(e: TouchEvent): void {
    if (!this.isPanning() || e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.panX.set(touch.clientX - this.panStart.x);
    this.panY.set(touch.clientY - this.panStart.y);
  }

  onTouchEnd(): void {
    this.isPanning.set(false);
  }

  // View controls
  resetView(): void {
    this.zoom.set(1);
    this.panX.set(0);
    this.panY.set(0);
  }

  fitToView(): void {
    const nos = this.nos();
    if (nos.length === 0) return;

    const minX = Math.min(...nos.map(n => n.x - 70));
    const maxX = Math.max(...nos.map(n => n.x + 70));
    const minY = Math.min(...nos.map(n => n.y - 18));
    const maxY = Math.max(...nos.map(n => n.y + 18));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewWidth = this.largura();
    const viewHeight = this.altura();

    const scaleX = viewWidth / contentWidth;
    const scaleY = viewHeight / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, this.MAX_ZOOM) * 0.9; // 90% to add padding

    this.zoom.set(Math.max(this.MIN_ZOOM, newZoom));
    this.panX.set(-minX * newZoom + (viewWidth - contentWidth * newZoom) / 2);
    this.panY.set(-minY * newZoom + (viewHeight - contentHeight * newZoom) / 2);
  }

  renderizar(): void {
    if (!this.tabelaRaiz) return;
    this.carregando.set(true);
    this.db.grafo(this.tabelaRaiz, this.profundidade, this.incluirPossiveis).subscribe({
      next: rels => { this.dispor(rels); this.carregando.set(false); this.resetView(); },
      error: () => this.carregando.set(false)
    });
  }

  navegarTabela(tabelaCompleta: string): void {
    const partes = tabelaCompleta.split('.');
    if (partes.length >= 2) {
      this.router.navigate(['/database/tabela', partes[0], partes[1]]);
    }
  }

  private dispor(rels: DatabaseRelationship[]): void {
    const adjacencias = new Map<string, Set<string>>();
    const nosSet = new Set<string>([this.tabelaRaiz]);
    rels.forEach(r => {
      nosSet.add(r.tabelaOrigem);
      nosSet.add(r.tabelaDestino);
      if (!adjacencias.has(r.tabelaOrigem)) adjacencias.set(r.tabelaOrigem, new Set());
      adjacencias.get(r.tabelaOrigem)!.add(r.tabelaDestino);
    });
    // BFS a partir da raiz para atribuir niveis (raio)
    const nivel = new Map<string, number>();
    nivel.set(this.tabelaRaiz, 0);
    const fila = [this.tabelaRaiz];
    while (fila.length) {
      const atual = fila.shift()!;
      const n = nivel.get(atual)!;
      const adj = adjacencias.get(atual);
      if (adj) for (const viz of adj) if (!nivel.has(viz)) { nivel.set(viz, n + 1); fila.push(viz); }
    }
    // Agrupa por nivel
    const porNivel = new Map<number, string[]>();
    [...nosSet].forEach(id => {
      const nv = nivel.get(id) ?? 99;
      if (!porNivel.has(nv)) porNivel.set(nv, []);
      porNivel.get(nv)!.push(id);
    });
    // Dispor em colunas
    const nos: NoDiagrama[] = [];
    const w = this.largura() - 100;
    const h = this.altura() - 100;
    const maxNivel = Math.max(...porNivel.keys(), 1);
    [...porNivel.entries()].sort((a, b) => a[0] - b[0]).forEach(([nv, ids]) => {
      ids.forEach((id, i) => {
        const x = 100 + (w * nv) / maxNivel;
        const y = 50 + (h * (i + 1)) / (ids.length + 1);
        const label = id.split('.').slice(-1)[0];
        nos.push({ id, x, y, label });
      });
    });
    this.nos.set(nos);
    this.arestas.set(rels.map(r => ({ origem: r.tabelaOrigem, destino: r.tabelaDestino, tipo: r.tipo })));
  }
}
