import { Component, OnInit, OnDestroy, inject, signal, computed, ElementRef, viewChild, afterNextRender } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardGeral } from '../../models/dashboard.model';
import { TarefasService } from '../../services/tarefas.service';
import { TarefaResumo, ehAtrasada } from '../../models/tarefa.model';
import { ProjetosService } from '../../services/projetos.service';
import { ProjetoResumo } from '../../models/projeto.model';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

Chart.register(...registerables);

type PeriodoProdutividade = 'este-mes' | 'proximo-mes' | 'ultimos-3-meses';

interface LinhaPessoa {
  nome: string;
  concluidas: number;
  total: number;
  percentualMedia: number;
}

interface LinhaPrioridade {
  label: string;
  total: number;
  concluidas: number;
}

interface DiaEvolucao {
  rotulo: string;
  total: number;
}

@Component({
  selector: 'app-implantacao-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, PageHeaderComponent],
  template: `
    <section class="adm-page imp-dashboard">
      <app-page-header
        titulo="Visão Geral"
        descricao="Acompanhe o progresso geral, métricas e o status consolidado do projeto."
        icone="bi-bar-chart-fill">
        <div actions class="imp-dashboard__header-actions">
          <select class="adm-search__input" [ngModel]="projetoId()" (ngModelChange)="aoMudarProjeto($event)" aria-label="Filtrar por projeto">
            <option value="">Todos os projetos</option>
            <optgroup label="Ativos" *ngIf="projetosAtivos().length">
              <option *ngFor="let p of projetosAtivos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
            </optgroup>
            <optgroup label="Concluídos" *ngIf="projetosConcluidos().length">
              <option *ngFor="let p of projetosConcluidos()" [value]="p.id">{{ p.codigo }} — {{ p.nome }}</option>
            </optgroup>
          </select>
        </div>
      </app-page-header>

      <div *ngIf="loading()" class="adm-empty">
        <i class="bi bi-arrow-clockwise"></i>
        <p>Carregando indicadores...</p>
      </div>

      <div *ngIf="!loading() && erro()" class="imp-dashboard__erro" role="alert">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <div>
          <strong>Não foi possível carregar o dashboard</strong>
          <span>{{ erro() }}</span>
        </div>
        <button type="button" class="adm-btn adm-btn--primary adm-btn--icon" (click)="tentarNovamente()">
          <i class="bi bi-arrow-clockwise"></i> Tentar novamente
        </button>
      </div>

      <div *ngIf="!loading() && !erro() && !dados()" class="adm-empty">
        <i class="bi bi-inbox"></i>
        <p>Sem dados para exibir no momento.</p>
      </div>

      <ng-container *ngIf="dados() as d">
        <div class="adm-stats">
          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']">
            <span class="adm-stat__icone" style="background: rgba(37, 99, 235, 0.12); color: #2563eb;">
              <i class="bi bi-kanban"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosAtivos }}</strong>
              <span>Projetos Ativos</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']" [queryParams]="{status: 'Atrasado'}">
            <span class="adm-stat__icone" style="background: rgba(220, 38, 38, 0.12); color: #dc2626;">
              <i class="bi bi-exclamation-triangle"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosAtrasados }}</strong>
              <span>Projetos Atrasados</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/projetos']" [queryParams]="{status: 'Concluido'}">
            <span class="adm-stat__icone" style="background: rgba(22, 163, 74, 0.12); color: #16a34a;">
              <i class="bi bi-check-circle"></i>
            </span>
            <div>
              <strong>{{ d.kpis.projetosConcluidos }}</strong>
              <span>Projetos Finalizados</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/tarefas']">
            <span class="adm-stat__icone" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed;">
              <i class="bi bi-clock-history"></i>
            </span>
            <div>
              <strong>{{ totalHoras() }}</strong>
              <span>Horas Apontadas</span>
            </div>
          </a>

          <!-- Novos KPIs Fase 3 -->
          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/tarefas']" [queryParams]="{tipo: 0}">
            <span class="adm-stat__icone" style="background: rgba(30, 64, 175, 0.12); color: #1e40af;">
              <i class="bi bi-sparkles"></i>
            </span>
            <div>
              <strong>{{ d.kpis.tarefasFeatures }}</strong>
              <span>Features</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/tarefas']" [queryParams]="{tipo: 1}">
            <span class="adm-stat__icone" style="background: rgba(153, 27, 27, 0.12); color: #991b1b;">
              <i class="bi bi-bug-fill"></i>
            </span>
            <div>
              <strong>{{ d.kpis.tarefasBugs }}</strong>
              <span>Bugs</span>
            </div>
          </a>

          <a class="adm-stat adm-stat--clickable" [routerLink]="['/implantacao/tarefas']">
            <span class="adm-stat__icone" style="background: rgba(217, 119, 6, 0.12); color: #d97706;">
              <i class="bi bi-arrow-repeat"></i>
            </span>
            <div>
              <strong>{{ d.kpis.percentualRetrabalho }}%</strong>
              <span>Retrabalho</span>
            </div>
          </a>
        </div>

        <div class="imp-dashboard__charts">
          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-bar-chart-line"></i> Tarefas por Status
            </h2>
            <div class="imp-dashboard__chart-wrap" [hidden]="!temDadosStatus()">
              <canvas #barChart></canvas>
            </div>
            <div class="imp-dashboard__empty" *ngIf="!temDadosStatus()">
              <i class="bi bi-inbox"></i>
              <p>Sem tarefas por status no momento.</p>
            </div>
            <div class="imp-dashboard__legend">
              <span *ngFor="let s of statusList" class="imp-dashboard__legend-item">
                <span class="imp-dashboard__legend-swatch" [style.background]="s.color"></span>
                {{ s.label }}
              </span>
            </div>
          </article>

          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-pie-chart"></i> Features vs Bugs
            </h2>
            <div class="imp-dashboard__chart-wrap imp-dashboard__chart-wrap--donut" [hidden]="!temDadosTipo()">
              <canvas #donutChart></canvas>
            </div>
            <div class="imp-dashboard__empty" *ngIf="!temDadosTipo()">
              <i class="bi bi-inbox"></i>
              <p>Sem features ou bugs no momento.</p>
            </div>
            <div class="imp-dashboard__legend">
              <span class="imp-dashboard__legend-item" style="color: #1e40af;">
                <span class="imp-dashboard__legend-swatch" style="background: #1e40af;"></span>
                Features ({{ tipoFeaturesCount() }})
              </span>
              <span class="imp-dashboard__legend-item" style="color: #991b1b;">
                <span class="imp-dashboard__legend-swatch" style="background: #991b1b;"></span>
                Bugs ({{ tipoBugsCount() }})
              </span>
            </div>
          </article>
        </div>

        <div class="imp-dashboard__charts-row2">
          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-bar-chart"></i> Horas por Tipo
            </h2>
            <div class="imp-dashboard__chart-wrap" [hidden]="!temDadosTipo()">
              <canvas #horasTipoChart></canvas>
            </div>
            <div class="imp-dashboard__empty" *ngIf="!temDadosTipo()">
              <i class="bi bi-inbox"></i>
              <p>Sem horas apontadas por tipo.</p>
            </div>
          </article>

          <article class="adm-card imp-dashboard__chart-card">
            <h2 class="adm-section-title">
              <i class="bi bi-people"></i> Top Responsáveis (Horas)
            </h2>
            <div class="imp-dashboard__chart-wrap" [hidden]="!(dados()?.horasPorResponsavel?.length)">
              <canvas #horasRespChart></canvas>
            </div>
            <div class="imp-dashboard__empty" *ngIf="!(dados()?.horasPorResponsavel?.length)">
              <i class="bi bi-inbox"></i>
              <p>Sem horas apontadas por responsável.</p>
            </div>
          </article>
        </div>

        <div class="imp-dashboard__lower">
          <article class="adm-card">
            <header class="imp-dashboard__section-head">
              <h2 class="adm-section-title">
                <i class="bi bi-calendar-event"></i> Próximas Entregas
              </h2>
              <a [routerLink]="['/implantacao/projetos']" class="adm-btn adm-btn--ghost adm-btn--icon">
                Ver todas <i class="bi bi-arrow-right"></i>
              </a>
            </header>
            <div class="imp-dashboard__empty" *ngIf="!d.proximosPrazo.length">
              <i class="bi bi-inbox"></i>
              <p>Nenhum projeto com prazo próximo.</p>
            </div>
            <ul class="imp-dashboard__entregas" *ngIf="d.proximosPrazo.length">
              <li *ngFor="let p of d.proximosPrazo.slice(0, 4)" class="adm-card adm-card--link imp-dashboard__entrega">
                <a [routerLink]="['/implantacao/projetos', p.id]" class="imp-dashboard__entrega-link">
                  <span class="adm-card__icone" [style.background]="corEquipeBg('Geral')" [style.color]="corEquipe('Geral')">
                    <i class="bi bi-calendar3"></i>
                  </span>
                  <div class="imp-dashboard__entrega-info">
                    <strong class="adm-card__title">{{ p.nome }}</strong>
                    <span class="adm-card__desc">{{ p.codigo }}<span *ngIf="p.clienteNome"> &middot; {{ p.clienteNome }}</span></span>
                  </div>
                  <span class="adm-card__meta">{{ p.dataPrevisao | date:'dd/MM' }}</span>
                </a>
              </li>
            </ul>
          </article>

          <article class="adm-card">
            <header class="imp-dashboard__section-head">
              <h2 class="adm-section-title">
                <i class="bi bi-bell"></i> Alertas e Pendências
              </h2>
            </header>
            <ul class="imp-dashboard__alertas">
              <li *ngIf="d.kpis.projetosAtrasados > 0" class="imp-dashboard__alerta" style="background: rgba(220, 38, 38, 0.06); border-left: 3px solid #dc2626;">
                <i class="bi bi-exclamation-triangle" style="color: #dc2626;"></i>
                <div>
                  <strong>{{ d.kpis.projetosAtrasados }} projeto(s) atrasado(s)</strong>
                  <span>Revise os prazos e prioridades com a equipe.</span>
                </div>
              </li>
              <li *ngIf="d.kpis.tarefasAtrasadas > 0" class="imp-dashboard__alerta" style="background: rgba(217, 119, 6, 0.06); border-left: 3px solid #d97706;">
                <i class="bi bi-clock-history" style="color: #d97706;"></i>
                <div>
                  <strong>{{ d.kpis.tarefasAtrasadas }} tarefa(s) atrasada(s)</strong>
                  <span>Verifique a coluna Kanban e reatribua se necessário.</span>
                </div>
              </li>
              <li *ngIf="d.kpis.tarefasAbertas > 0" class="imp-dashboard__alerta" style="background: rgba(37, 99, 235, 0.06); border-left: 3px solid #2563eb;">
                <i class="bi bi-list-check" style="color: #2563eb;"></i>
                <div>
                  <strong>{{ d.kpis.tarefasAbertas }} tarefa(s) em aberto</strong>
                  <span>Total acumulado de tarefas não concluídas.</span>
                </div>
              </li>
              <li *ngIf="d.kpis.percentualRetrabalho > 20" class="imp-dashboard__alerta" style="background: rgba(153, 27, 27, 0.06); border-left: 3px solid #991b1b;">
                <i class="bi bi-bug-fill" style="color: #991b1b;"></i>
                <div>
                  <strong>Retrabalho alto: {{ d.kpis.percentualRetrabalho }}%</strong>
                  <span>Muitas horas em Bugs. Revise qualidade e processos.</span>
                </div>
              </li>
              <li *ngIf="!d.kpis.projetosAtrasados && !d.kpis.tarefasAtrasadas && d.kpis.percentualRetrabalho <= 20" class="imp-dashboard__alerta imp-dashboard__alerta--ok" style="background: rgba(22, 163, 74, 0.06); border-left: 3px solid #16a34a;">
                <i class="bi bi-check-circle" style="color: #16a34a;"></i>
                <div>
                  <strong>Tudo em dia</strong>
                  <span>Nenhum projeto ou tarefa atrasada, retrabalho controlado.</span>
                </div>
              </li>
            </ul>
          </article>
        </div>

        <section class="imp-prod" aria-label="Produtividade">
          <header class="imp-dashboard__section-head">
            <h2 class="adm-section-title">
              <i class="bi bi-graph-up"></i> Produtividade
            </h2>
            <div class="imp-dashboard__prod-controls">
              <span class="adm-header__desc">SLA, conclusões e produtividade calculados das tarefas reais.</span>
              <select class="adm-search__input" [ngModel]="periodoProd()" (ngModelChange)="aoMudarPeriodoProd($event)" aria-label="Período da produtividade">
                <option value="este-mes">Este mês</option>
                <option value="proximo-mes">Próximo mês</option>
                <option value="ultimos-3-meses">Últimos 3 meses</option>
              </select>
            </div>
          </header>

          <div class="adm-stats">
            <div class="adm-stat">
              <span class="adm-stat__icone" style="background: rgba(37,99,235,.12); color:#2563eb;"><i class="bi bi-check-circle"></i></span>
              <div><strong>{{ taxaProd() }}%</strong><span>Taxa de conclusão ({{ concluidasProd() }}/{{ totalProd() }})</span></div>
            </div>
            <div class="adm-stat">
              <span class="adm-stat__icone" style="background: rgba(124,58,237,.12); color:#7c3aed;"><i class="bi bi-stopwatch"></i></span>
              <div><strong>{{ tempoMedioProd() }}d</strong><span>Tempo médio criação → conclusão</span></div>
            </div>
            <div class="adm-stat">
              <span class="adm-stat__icone" style="background: rgba(22,163,74,.12); color:#16a34a;"><i class="bi bi-shield-check"></i></span>
              <div><strong>{{ slaProd() }}%</strong><span>Dentro do SLA</span></div>
            </div>
            <div class="adm-stat">
              <span class="adm-stat__icone" style="background: rgba(220,38,38,.12); color:#dc2626;"><i class="bi bi-exclamation-triangle"></i></span>
              <div><strong>{{ atrasadasProd().length }}</strong><span>Tarefas atrasadas</span></div>
            </div>
          </div>

          <div class="imp-rel__grid">
            <article class="adm-card imp-rel__card">
              <h2 class="adm-section-title"><i class="bi bi-bar-chart-line"></i> Conclusões por dia</h2>
              <div class="imp-rel__chart" [hidden]="!temEvolucao()">
                <canvas #evolucaoChart></canvas>
              </div>
              <div class="imp-rel__vazio" *ngIf="!temEvolucao()"><i class="bi bi-inbox"></i><p>Sem conclusões no período.</p></div>
            </article>

            <article class="adm-card imp-rel__card">
              <h2 class="adm-section-title"><i class="bi bi-people"></i> Produtividade por pessoa</h2>
              <ul class="imp-rel__pessoas" *ngIf="pessoasProd().length; else semPessoasProd">
                <li *ngFor="let p of pessoasProd()">
                  <div class="imp-rel__pessoa-topo"><strong>{{ p.nome }}</strong><span>{{ p.concluidas }} concluídas · {{ p.percentualMedia }}% da média</span></div>
                  <div class="imp-rel__barra"><div class="imp-rel__barra-fill" [style.width.%]="barraPessoa(p)"></div></div>
                </li>
              </ul>
              <ng-template #semPessoasProd><div class="imp-rel__vazio"><i class="bi bi-inbox"></i><p>Sem conclusões por pessoa no período.</p></div></ng-template>
            </article>
          </div>

          <div class="imp-rel__grid">
            <article class="adm-card imp-rel__card">
              <h2 class="adm-section-title"><i class="bi bi-flag"></i> Por prioridade</h2>
              <ul class="imp-rel__prio" *ngIf="porPrioridadeProd().length">
                <li *ngFor="let p of porPrioridadeProd()"><strong>{{ p.label }}</strong><span>{{ p.concluidas }} de {{ p.total }} concluídas</span></li>
              </ul>
            </article>

            <article class="adm-card imp-rel__card">
              <h2 class="adm-section-title"><i class="bi bi-alarm"></i> Tarefas com atraso (top 10)</h2>
              <ul class="imp-rel__atraso" *ngIf="atrasadasProd().length; else semAtrasoProd">
                <li *ngFor="let t of atrasadasProd().slice(0, 10)">
                  <a [routerLink]="['/implantacao/tarefas', t.id, 'editar']"><strong>T{{ t.id }} · {{ t.titulo }}</strong></a>
                  <span>{{ t.responsavelNome || 'sem responsável' }} · {{ diasAtraso(t) }}d de atraso</span>
                </li>
              </ul>
              <ng-template #semAtrasoProd><div class="imp-rel__vazio"><i class="bi bi-check-circle"></i><p>Nenhuma tarefa atrasada. Tudo em dia.</p></div></ng-template>
            </article>
          </div>
        </section>
      </ng-container>
    </section>
  `,
  styles: [`
    section.adm-page.imp-dashboard {
      padding: 1.5rem;
    }
    .imp-dashboard__header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .imp-dashboard__header-actions .adm-search__input { min-width: 12rem; }
    .imp-dashboard__prod-controls { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; }
    .imp-dashboard__prod-controls .adm-search__input { min-width: 10rem; }
    /* Produtividade (mesclado do Relatório) */
    .imp-prod { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
    .imp-rel__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
    @media (max-width: 900px) { .imp-rel__grid { grid-template-columns: 1fr; } }
    .imp-rel__card { padding: 1.5rem; }
    .imp-rel__card .adm-section-title { display: flex; align-items: center; gap: 0.5rem; margin: 0 0 1rem; }
    .imp-rel__card .adm-section-title i { color: var(--primary-color); opacity: 0.7; }
    .imp-rel__chart { position: relative; height: 13.75rem; }
    .imp-rel__vazio { padding: 1.5rem; text-align: center; opacity: 0.6; }
    .imp-rel__vazio i { font-size: 2rem; opacity: 0.5; } .imp-rel__vazio p { margin: 0.5rem 0 0; font-size: 0.875rem; }
    .imp-rel__pessoas, .imp-rel__prio, .imp-rel__atraso { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .imp-rel__pessoa-topo { display: flex; justify-content: space-between; gap: 0.5rem; font-size: 0.85rem; }
    .imp-rel__pessoa-topo span { opacity: 0.7; font-size: 0.78rem; }
    .imp-rel__barra { height: 0.5rem; border-radius: 0.25rem; background: rgba(15,23,42,.08); overflow: hidden; margin-top: 0.3rem; }
    .imp-rel__barra-fill { height: 100%; background: #2563eb; border-radius: 0.25rem; }
    .imp-rel__prio li, .imp-rel__atraso li { display: flex; justify-content: space-between; gap: 0.75rem; font-size: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
    .imp-rel__prio li:last-child, .imp-rel__atraso li:last-child { border-bottom: 0; padding-bottom: 0; }
    .imp-rel__prio span, .imp-rel__atraso span { opacity: 0.7; font-size: 0.78rem; text-align: right; }
    .imp-rel__atraso a { color: inherit; text-decoration: none; } .imp-rel__atraso a:hover { color: var(--primary-color); }
    @media print { .imp-dashboard__header-actions { display: none; } }
    .imp-dashboard__charts {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
      margin: 1.5rem 0;
    }
    @media (max-width: 900px) {
      .imp-dashboard__charts { grid-template-columns: 1fr; }
    }
    .imp-dashboard__chart-card { padding: 1.5rem; }
    .imp-dashboard__chart-card .adm-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .imp-dashboard__chart-card .adm-section-title i {
      color: var(--primary-color);
      opacity: 0.7;
    }
    .imp-dashboard__chart-wrap {
      position: relative;
      height: 13.75rem;
    }
    .imp-dashboard__chart-wrap--donut { height: 12.5rem; }
    .imp-dashboard__legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      margin-top: 1rem;
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.85;
    }
    .imp-dashboard__legend--list {
      list-style: none;
      padding: 0;
      margin: 1rem 0 0;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .imp-dashboard__legend--list li {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .imp-dashboard__legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .imp-dashboard__legend-swatch {
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 2px;
      display: inline-block;
    }
    .imp-dashboard__legend-name {
      flex: 1;
      font-weight: 500;
    }
    .imp-dashboard__legend-value {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-color);
      opacity: 0.7;
    }
    .imp-dashboard__lower {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
    }
    @media (max-width: 900px) {
      .imp-dashboard__lower { grid-template-columns: 1fr; }
    }
    .imp-dashboard__section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .imp-dashboard__section-head .adm-section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
    }
    .imp-dashboard__section-head .adm-section-title i {
      color: var(--primary-color);
      opacity: 0.7;
    }
    .imp-dashboard__entregas {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .imp-dashboard__entrega {
      padding: 0.75rem 1rem;
      display: block;
    }
    .imp-dashboard__entrega-link {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      text-decoration: none;
      color: inherit;
    }
    .imp-dashboard__entrega-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem
    }
    .imp-dashboard__entrega-info .adm-card__title {
      font-size: 0.9rem;
      margin: 0 0 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .imp-dashboard__entrega-info .adm-card__desc {
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.7;
    }
    .imp-dashboard__alertas {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .imp-dashboard__alerta {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
    }
    .imp-dashboard__alerta i {
      font-size: 1.1rem;
      margin-top: 0.1rem;
    }
    .imp-dashboard__alerta strong {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 0.15rem;
    }
    .imp-dashboard__alerta span {
      font-size: 0.75rem;
      color: var(--text-color);
      opacity: 0.75;
    }
    .imp-dashboard__empty {
      padding: 1.5rem;
      text-align: center;
      color: var(--text-color);
      opacity: 0.6;
    }    .imp-dashboard__empty p {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
    }
    .imp-dashboard__empty i {
      font-size: 2rem;
      opacity: 0.5;
    }
    .imp-dashboard__erro {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1rem 1.25rem;
      margin: 1rem 0;
      border-radius: 0.75rem;
      background: rgba(220, 38, 38, 0.06);
      border: 1px solid rgba(220, 38, 38, 0.25);
    }
    .imp-dashboard__erro > i {
      font-size: 1.5rem;
      color: #dc2626;
      flex-shrink: 0;
    }
    .imp-dashboard__erro strong { display: block; font-size: 0.9rem; }
    .imp-dashboard__erro span { font-size: 0.8rem; opacity: 0.8; }
    .imp-dashboard__erro .adm-btn { margin-left: auto; flex-shrink: 0; }
    .adm-stat--clickable {
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s, transform 0.15s;
    }
    .adm-stat--clickable:hover {
      border-color: var(--primary-color);
      transform: translateY(-1px);
    }
    .imp-dashboard__charts-row2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
      margin: 1.5rem 0;
    }
    @media (max-width: 900px) {
      .imp-dashboard__charts-row2 { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly svc = inject(DashboardService);
  private readonly projetosSvc = inject(ProjetosService);
  dados = signal<DashboardGeral | null>(null);
  loading = signal(true);
  erro = signal<string | null>(null);

  // Filtro por projeto (Visão Geral)
  projetoId = signal<string>('');
  projetos = signal<ProjetoResumo[]>([]);
  projetosAtivos = computed(() => this.projetos().filter(p => p.status !== 'Concluido'));
  projetosConcluidos = computed(() => this.projetos().filter(p => p.status === 'Concluido'));

  barCanvas = viewChild<ElementRef<HTMLCanvasElement>>('barChart');
  donutCanvas = viewChild<ElementRef<HTMLCanvasElement>>('donutChart');
  horasTipoCanvas = viewChild<ElementRef<HTMLCanvasElement>>('horasTipoChart');
  horasRespCanvas = viewChild<ElementRef<HTMLCanvasElement>>('horasRespChart');

  private barChartInstance?: Chart;
  private donutChartInstance?: Chart;
  private horasTipoChartInstance?: Chart;
  private horasRespChartInstance?: Chart;

  // Mapping status com cor (chaves iguais ao enum StatusTarefa do backend)
  readonly statusList = [
    { key: 'Backlog',         label: 'Backlog',        color: '#94a3b8' },
    { key: 'AFazer',          label: 'A Fazer',         color: '#60a5fa' },
    { key: 'EmAndamento',     label: 'Em Andamento',    color: '#fbbf24' },
    { key: 'EmHomologacao',   label: 'Homologação',     color: '#a78bfa' },
    { key: 'Concluida',       label: 'Concluída',       color: '#16a34a' }
  ];

  // Mapping tipo
  readonly tipoList = [
    { key: 'Feature', label: 'Feature', color: '#1e40af' },
    { key: 'Bug',     label: 'Bug',     color: '#991b1b' }
  ];

  totalHoras = computed(() => {
    const d = this.dados();
    if (!d) return 0;
    return d.kpis.horasApontadas;
  });

  tipoFeaturesCount = computed(() => {
    const d = this.dados();
    if (!d) return 0;
    return d.tarefasPorTipo?.find(t => t.tipo === 'Feature')?.total ?? 0;
  });

  tipoBugsCount = computed(() => {
    const d = this.dados();
    if (!d) return 0;
    return d.tarefasPorTipo?.find(t => t.tipo === 'Bug')?.total ?? 0;
  });

  ngOnInit(): void {
    this.projetosSvc.listar({}).subscribe({
      next: ps => this.projetos.set(ps ?? []),
      error: () => this.projetos.set([])
    });
    this.carregar();
  }

  ngOnDestroy(): void {
    this.barChartInstance?.destroy();
    this.donutChartInstance?.destroy();
    this.horasTipoChartInstance?.destroy();
    this.horasRespChartInstance?.destroy();
    this.evolucaoChartInstance?.destroy();
  }

  carregar(): void {
    this.loading.set(true);
    this.erro.set(null);
    const pid = this.projetoId() ? Number(this.projetoId()) : null;
    this.svc.obter(pid).subscribe({
      next: (d) => {
        this.dados.set(d);
        this.loading.set(false);
        // Render charts após a view atualizar (canvas estão dentro de *ngIf)
        this.agendarRenderCharts(d, 0);
        this.carregarProdutividade();
      },
      error: (err) => {
        this.loading.set(false);
        this.erro.set(this.mensagemErro(err));
      }
    });
  }

  aoMudarProjeto(v: string): void {
    this.projetoId.set(v ?? '');
    this.carregar();
  }

  tentarNovamente(): void {
    this.carregar();
  }

  // ---------- Produtividade (mesclado do Relatório; tudo client-side) ----------

  private readonly tarSvc = inject(TarefasService);

  periodoProd = signal<PeriodoProdutividade>('ultimos-3-meses');
  linhasProd = signal<TarefaResumo[]>([]);
  totalProd = signal(0);
  concluidasProd = signal(0);
  taxaProd = signal(0);
  tempoMedioProd = signal(0);
  slaProd = signal(0);
  pessoasProd = signal<LinhaPessoa[]>([]);
  porPrioridadeProd = signal<LinhaPrioridade[]>([]);
  atrasadasProd = signal<TarefaResumo[]>([]);
  evolucaoProd = signal<DiaEvolucao[]>([]);

  evolucaoCanvas = viewChild<ElementRef<HTMLCanvasElement>>('evolucaoChart');
  private evolucaoChartInstance?: Chart;

  private carregarProdutividade(): void {
    const filtro = this.projetoId() ? { projetoId: Number(this.projetoId()) } : {};
    this.tarSvc.listar(filtro).subscribe({
      next: t => { this.linhasProd.set(t ?? []); this.recalcularProd(); },
      error: () => this.linhasProd.set([])
    });
  }

  aoMudarPeriodoProd(v: PeriodoProdutividade): void {
    this.periodoProd.set(v);
    this.recalcularProd();
  }

  temEvolucao(): boolean {
    return this.evolucaoProd().some(d => d.total > 0);
  }

  barraPessoa(p: LinhaPessoa): number {
    const max = Math.max(1, ...this.pessoasProd().map(x => x.concluidas));
    return Math.round((p.concluidas / max) * 100);
  }

  diasAtraso(t: TarefaResumo): number {
    const ref = t.dataEntrega ?? t.dataPrevisao;
    if (!ref) return 0;
    const hoje = new Date(new Date().toDateString()).getTime();
    return Math.max(0, Math.round((hoje - new Date(new Date(ref).toDateString()).getTime()) / 86400000));
  }

  private recalcularProd(): void {
    const todas = this.linhasProd();
    const { inicio, fim } = this.intervaloPeriodoProd(this.periodoProd());
    const universo = todas.filter(t => {
      const d = new Date(t.dataInclusao);
      if (inicio && d < inicio) return false;
      if (fim && d > fim) return false;
      return true;
    });
    const concl = universo.filter(t => t.status === 'Concluida');

    this.totalProd.set(universo.length);
    this.concluidasProd.set(concl.length);
    this.taxaProd.set(universo.length ? Math.round((concl.length / universo.length) * 100) : 0);

    const tempos = concl
      .filter(t => t.dataConclusao)
      .map(t => (new Date(t.dataConclusao as string).getTime() - new Date(t.dataInclusao).getTime()) / 86400000)
      .filter(n => Number.isFinite(n) && n >= 0);
    this.tempoMedioProd.set(tempos.length ? Math.round((tempos.reduce((a, b) => a + b, 0) / tempos.length) * 10) / 10 : 0);

    const comPrazo = universo.filter(t => t.dataEntrega ?? t.dataPrevisao);
    const dentro = comPrazo.filter(t => !this.vencidaAberta(t));
    this.slaProd.set(comPrazo.length ? Math.round((dentro.length / comPrazo.length) * 100) : 100);

    this.atrasadasProd.set(
      universo.filter(t => this.vencidaAberta(t)).sort((a, b) => this.diasAtraso(b) - this.diasAtraso(a))
    );

    const porResp = new Map<string, { nome: string; concluidas: number; total: number }>();
    universo.forEach(t => {
      const key = t.responsavelId || 'sem-responsavel';
      const atual = porResp.get(key) ?? { nome: t.responsavelNome || 'Sem responsável', concluidas: 0, total: 0 };
      atual.total += 1;
      if (t.status === 'Concluida') atual.concluidas += 1;
      porResp.set(key, atual);
    });
    const lista = [...porResp.values()].sort((a, b) => b.concluidas - a.concluidas).slice(0, 8);
    const media = lista.length ? lista.reduce((s, p) => s + p.concluidas, 0) / lista.length : 0;
    this.pessoasProd.set(lista.map(p => ({
      ...p,
      percentualMedia: media > 0 ? Math.round((p.concluidas / media) * 100) : 0
    })));

    const nomes = ['Baixa', 'Média', 'Alta', 'Urgente'];
    this.porPrioridadeProd.set([0, 1, 2, 3].map(n => {
      const doNivel = universo.filter(t => t.prioridade === n);
      return { label: nomes[n], total: doNivel.length, concluidas: doNivel.filter(t => t.status === 'Concluida').length };
    }));

    const dias: Date[] = [];
    if (inicio && fim) {
      const cur = new Date(inicio);
      while (cur <= fim && dias.length < 100) {
        dias.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dias.push(d);
      }
    }
    const serie: DiaEvolucao[] = dias.map(d => {
      const chave = d.toDateString();
      const rotulo = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const totalDia = todas.filter(t => t.dataConclusao && new Date(t.dataConclusao).toDateString() === chave).length;
      return { rotulo, total: totalDia };
    });
    this.evolucaoProd.set(serie);
    setTimeout(() => this.renderGraficoProd(), 50);
  }

  private intervaloPeriodoProd(p: PeriodoProdutividade): { inicio: Date | null; fim: Date | null } {
    const agora = new Date();
    if (p === 'este-mes') {
      return {
        inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
        fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999)
      };
    }
    if (p === 'proximo-mes') {
      return {
        inicio: new Date(agora.getFullYear(), agora.getMonth() + 1, 1),
        fim: new Date(agora.getFullYear(), agora.getMonth() + 2, 0, 23, 59, 59, 999)
      };
    }
    // ultimos-3-meses: mês atual + 2 anteriores
    return {
      inicio: new Date(agora.getFullYear(), agora.getMonth() - 2, 1),
      fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999)
    };
  }

  private vencidaAberta(t: TarefaResumo): boolean {
    return ehAtrasada(t);
  }

  private renderGraficoProd(): void {
    const el = this.evolucaoCanvas()?.nativeElement;
    if (!el) return;
    this.evolucaoChartInstance?.destroy();
    this.evolucaoChartInstance = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels: this.evolucaoProd().map(d => d.rotulo),
        datasets: [{
          label: 'Conclusões',
          data: this.evolucaoProd().map(d => d.total),
          backgroundColor: '#2563eb',
          borderRadius: 3,
          maxBarThickness: 22
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#475569', maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#64788b' } }
        }
      }
    });
  }

  private mensagemErro(err: any): string {
    const status = err?.status;
    if (status === 0) return 'Não foi possível alcançar a API. Verifique a conexão e tente novamente.';
    if (status === 401) return 'Sua sessão expirou. Faça login novamente para ver os indicadores.';
    if (status === 403) return 'Você não tem permissão para ver o dashboard.';
    return err?.error?.mensagem || err?.message || 'Erro ao carregar indicadores. Tente novamente.';
  }

  temDadosStatus(): boolean {
    const lista = this.dados()?.tarefasPorStatus ?? [];
    return lista.some(t => (t.total ?? 0) > 0);
  }

  temDadosTipo(): boolean {
    return (this.tipoFeaturesCount() + this.tipoBugsCount()) > 0;
  }

  semDados(): boolean {
    const d = this.dados();
    if (!d) return true;
    return this.temDadosStatus() === false && this.temDadosTipo() === false &&
      (d.kpis?.projetosAtivos ?? 0) === 0 && (d.kpis?.tarefasAbertas ?? 0) === 0;
  }

  private agendarRenderCharts(d: DashboardGeral, tentativa: number): void {
    if (tentativa > 20) return;
    setTimeout(() => {
      const pronto = this.barCanvas()?.nativeElement || this.donutCanvas()?.nativeElement;
      if (!pronto) {
        this.agendarRenderCharts(d, tentativa + 1);
        return;
      }
      this.renderCharts(d);
    }, 50);
  }

  corEquipe(nome?: string): string {
    if (nome === 'IMPLANTACAO') return '#0f4c81';
    if (nome === 'CIAA') return '#7c3aed';
    return '#94a3b8';
  }

  corEquipeBg(nome?: string): string {
    if (nome === 'IMPLANTACAO') return 'rgba(15, 76, 129, 0.12)';
    if (nome === 'CIAA') return 'rgba(124, 58, 237, 0.12)';
    return 'rgba(148, 163, 184, 0.15)';
  }

  private renderCharts(d: DashboardGeral): void {
    this.renderBarChart(d);
    this.renderDonutChart(d);
    this.renderHorasTipoChart(d);
    this.renderHorasRespChart(d);
  }

  private renderBarChart(d: DashboardGeral): void {
    const el = this.barCanvas()?.nativeElement;
    if (!el) return;

    // Contagem por status (do kpis + tarefasPorStatus)
    const contagem = this.statusList.map(s => {
      const found = d.tarefasPorStatus?.find(t => t.status === s.key);
      return found ? found.total : 0;
    });

    this.barChartInstance?.destroy();
    this.barChartInstance = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels: this.statusList.map(s => s.label),
        datasets: [{
          data: contagem,
          backgroundColor: this.statusList.map(s => s.color),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 48
        }]
      },
      options: this.barOptions
    });
  }

  private renderDonutChart(d: DashboardGeral): void {
    const el = this.donutCanvas()?.nativeElement;
    if (!el) return;

    const featureCount = d.tarefasPorTipo?.find(t => t.tipo === 'Feature')?.total ?? 0;
    const bugCount = d.tarefasPorTipo?.find(t => t.tipo === 'Bug')?.total ?? 0;

    this.donutChartInstance?.destroy();
    this.donutChartInstance = new (Chart as any)(el, {
      type: 'doughnut',
      data: {
        labels: ['Features', 'Bugs'],
        datasets: [{
          data: [featureCount, bugCount],
          backgroundColor: ['#1e40af', '#991b1b'],
          borderColor: '#ffffff',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: this.donutOptions
    });
  }

  private renderHorasTipoChart(d: DashboardGeral): void {
    const el = this.horasTipoCanvas()?.nativeElement;
    if (!el) return;

    const featureHoras = d.tarefasPorTipo?.find(t => t.tipo === 'Feature')?.horasRealizadas ?? 0;
    const bugHoras = d.tarefasPorTipo?.find(t => t.tipo === 'Bug')?.horasRealizadas ?? 0;

    this.horasTipoChartInstance?.destroy();
    this.horasTipoChartInstance = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels: ['Features', 'Bugs'],
        datasets: [{
          label: 'Horas Realizadas',
          data: [featureHoras, bugHoras],
          backgroundColor: ['#1e40af', '#991b1b'],
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: 60
        }]
      },
      options: this.barOptions
    });
  }

  private renderHorasRespChart(d: DashboardGeral): void {
    const el = this.horasRespCanvas()?.nativeElement;
    if (!el) return;

    const topResponsaveis = d.horasPorResponsavel?.slice(0, 10) ?? [];
    const labels = topResponsaveis.map(r => r.responsavelNome.length > 15 ? r.responsavelNome.substring(0, 15) + '...' : r.responsavelNome);
    const horasRealizadas = topResponsaveis.map(r => r.horasRealizadas);
    const horasEstimadas = topResponsaveis.map(r => r.horasEstimadas);

    this.horasRespChartInstance?.destroy();
    this.horasRespChartInstance = new (Chart as any)(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Realizadas',
            data: horasRealizadas,
            backgroundColor: '#1e40af',
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 24
          },
          {
            label: 'Estimadas',
            data: horasEstimadas,
            backgroundColor: '#60a5fa',
            borderRadius: 4,
            borderSkipped: false,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        ...this.barOptions,
        plugins: {
          ...this.barOptions.plugins,
          legend: { display: true, position: 'bottom', labels: { font: { family: "'Inter', sans-serif", size: 10 } } }
        }
      }
    });
  }

  private readonly barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#475569' }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(15, 23, 42, 0.06)' },
        border: { display: false },
        ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 }, color: '#64748b', stepSize: 1 }
      }
    }
  };

  private readonly donutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: "'Inter', sans-serif", size: 12 },
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 12 },
        padding: 10,
        cornerRadius: 6,
        displayColors: false
      }
    }
  };
}