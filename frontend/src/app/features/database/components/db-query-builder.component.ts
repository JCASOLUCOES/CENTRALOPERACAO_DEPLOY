import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import {
  DatabaseTable, DatabaseColumn, DatabaseRelationship
} from '../models/database.model';

/** Tabela dentro da montagem visual. Alias é amigável (C, CL, CI...) e exibido ao usuário. */
interface TabelaMontagem {
  schema: string;
  nome: string;
  alias: string;
  colunas: DatabaseColumn[];
  colunasSelecionadas: string[];
}

interface TabelaRelacionadaItem {
  nomeCompleto: string;
  schema: string;
  nome: string;
  relacao: DatabaseRelationship;
  confirmada: boolean;
}

interface FiltroSimples {
  id: number;
  tabelaAlias: string;
  coluna: string;
  operador: string;
  valor: string;
  valor2: string;
}

interface OrdenacaoSimples {
  tabelaAlias: string;
  coluna: string;
  direcao: 'ASC' | 'DESC';
}

interface OperadorAmigavel {
  rotulo: string;
  sql: string;
  precisaValor: boolean;
  precisaValor2: boolean;
}

const OPERADORES: OperadorAmigavel[] = [
  { rotulo: 'igual a', sql: '=', precisaValor: true, precisaValor2: false },
  { rotulo: 'diferente de', sql: '<>', precisaValor: true, precisaValor2: false },
  { rotulo: 'contém', sql: 'LIKE', precisaValor: true, precisaValor2: false },
  { rotulo: 'começa com', sql: 'LIKE', precisaValor: true, precisaValor2: false },
  { rotulo: 'termina com', sql: 'LIKE', precisaValor: true, precisaValor2: false },
  { rotulo: 'maior que', sql: '>', precisaValor: true, precisaValor2: false },
  { rotulo: 'menor que', sql: '<', precisaValor: true, precisaValor2: false },
  { rotulo: 'maior ou igual', sql: '>=', precisaValor: true, precisaValor2: false },
  { rotulo: 'menor ou igual', sql: '<=', precisaValor: true, precisaValor2: false },
  { rotulo: 'entre', sql: 'BETWEEN', precisaValor: true, precisaValor2: true },
  { rotulo: 'está preenchido', sql: 'IS NOT NULL', precisaValor: false, precisaValor2: false },
  { rotulo: 'está vazio', sql: 'IS NULL', precisaValor: false, precisaValor2: false },
];

const ETAPAS = [
  { id: 1, rotulo: 'Tabela', icone: 'bi-table' },
  { id: 2, rotulo: 'Campos', icone: 'bi-list-check' },
  { id: 3, rotulo: 'Relacionamentos', icone: 'bi-share' },
  { id: 4, rotulo: 'Filtros', icone: 'bi-funnel' },
  { id: 5, rotulo: 'Ordenação', icone: 'bi-arrow-down-up' },
  { id: 6, rotulo: 'Resumo', icone: 'bi-clipboard-check' },
  { id: 7, rotulo: 'SQL', icone: 'bi-code' },
];

@Component({
  selector: 'app-db-query-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-qb">
    <!-- Cabeçalho -->
    <div class="db-qb__header">
      <h4><i class="bi bi-diagram-3"></i> Criador de Consultas</h4>
      <button class="btn btn-outline-secondary btn-sm" (click)="reiniciar()">
        <i class="bi bi-trash"></i> Recomeçar
      </button>
    </div>

    <!-- Stepper -->
    <ol class="db-qb__steps">
      <li *ngFor="let e of etapas" class="db-qb__step"
        [class.db-qb__step--ativo]="etapa() === e.id"
        [class.db-qb__step--ok]="etapaValida(e.id) && etapa() > e.id"
        [class.db-qb__step--bloqueado]="!podeIrPara(e.id)">
        <button type="button" (click)="irParaEtapa(e.id)" [disabled]="!podeIrPara(e.id)">
          <span class="db-qb__step-num">{{ e.id }}</span>
          <span class="db-qb__step-rotulo"><i class="bi" [ngClass]="e.icone"></i> {{ e.rotulo }}</span>
        </button>
      </li>
    </ol>

    <!-- ETAPA 1: tabela principal -->
    <section *ngIf="etapa() === 1" class="db-qb__panel">
      <h5>Tabela principal</h5>
      <p class="text-muted small">Escolha a tabela de onde os dados partem. As demais tabelas entram depois, pelos relacionamentos.</p>
      <div class="adm-search mb-2">
        <i class="bi bi-search adm-search__icone"></i>
        <input type="text" class="adm-search__input" placeholder="Pesquisar tabela..."
          [(ngModel)]="filtroTabelaTexto">
      </div>
      <p class="small text-muted">{{ tabelasDisponiveis().length }} tabelas disponíveis</p>
      <div *ngIf="tabelaPrincipal()" class="db-qb__principal">
        <div>
          <strong>{{ tabelaPrincipal()!.nome }}</strong>
          <small class="text-muted ms-2">{{ tabelaPrincipal()!.schema }} · {{ tabelaPrincipal()!.alias }}</small>
        </div>
        <div class="db-qb__badges">
          <span class="badge bg-info">{{ qtdColunasPrincipal() }} colunas</span>
          <span class="badge bg-primary">{{ qtdRelacionamentosPrincipal() }} relacionamentos</span>
        </div>
      </div>
      <div class="db-qb__lista">
        <button *ngFor="let t of tabelasFiltradas" type="button"
          class="db-qb__item" [class.db-qb__item--ativo]="ehPrincipal(t)"
          (click)="definirPrincipal(t)">
          <i class="bi bi-table"></i>
          <span><strong>{{ t.nome }}</strong> <small class="text-muted">{{ t.schema }}</small></span>
          <span *ngIf="ehPrincipal(t)" class="badge bg-success ms-auto">Principal</span>
        </button>
      </div>
      <div class="db-qb__nav">
        <span></span>
        <button class="btn btn-primary btn-sm" (click)="irParaEtapa(2)" [disabled]="!etapaValida(1)">Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </section>

    <!-- ETAPA 2: campos da principal -->
    <section *ngIf="etapa() === 2" class="db-qb__panel">
      <h5>Campos da tabela {{ tabelaPrincipal()?.nome }}</h5>
      <p class="text-muted small">Marque o que deve aparecer no resultado.</p>
      <div class="db-qb__toolbar">
        <div class="adm-search">
          <i class="bi bi-search adm-search__icone"></i>
          <input type="text" class="adm-search__input" placeholder="Pesquisar campos..." [(ngModel)]="buscaCampoPrincipal">
        </div>
        <button class="btn btn-outline-primary btn-sm" (click)="todosCamposPrincipal()">Todos</button>
        <button class="btn btn-outline-secondary btn-sm" (click)="limparCamposPrincipal()">Limpar</button>
      </div>
      <div class="db-qb__campos">
        <label *ngFor="let c of camposPrincipalFiltrados()" class="db-qb__campo">
          <input type="checkbox" class="form-check-input"
            [checked]="campoMarcado(tabelaPrincipal()!, c.coluna)"
            (change)="alternarCampo(tabelaPrincipal()!, c.coluna)">
          <span class="db-qb__campo-nome">{{ c.coluna }}</span>
          <span *ngIf="c.isPrimaryKey" class="badge bg-warning text-dark" title="Chave primária">PK</span>
          <span *ngIf="c.isForeignKey" class="badge bg-info" title="Chave estrangeira">FK</span>
          <small class="text-muted">{{ c.tipo }}</small>
        </label>
      </div>
      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(1)"><i class="bi bi-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary btn-sm" (click)="irParaEtapa(3)" [disabled]="!etapaValida(2)">Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </section>

    <!-- ETAPA 3: tabelas relacionadas -->
    <section *ngIf="etapa() === 3" class="db-qb__panel">
      <h5>Adicionar dados relacionados</h5>
      <p class="text-muted small">Traga campos de outras tabelas sem escrever JOIN — o relacionamento é aplicado sozinho.</p>

      <div class="db-qb__arvore">
        <div class="db-qb__no db-qb__no--raiz">
          <i class="bi bi-table"></i> {{ tabelaPrincipal()?.nome }}
          <small class="text-muted">({{ tabelaPrincipal()?.alias }})</small>
        </div>
        <div *ngFor="let t of tabelasRelacionadas()" class="db-qb__no">
          <span class="db-qb__galho">├──</span>
          <i class="bi bi-table"></i> {{ t.nome }}
          <small class="text-muted">({{ t.alias }})</small>
          <button class="btn btn-sm btn-outline-secondary ms-2" (click)="alternarExpansao(t.alias)">
            {{ tabelaExpandida() === t.alias ? 'Ocultar campos' : 'Ver campos' }}
          </button>
          <button class="btn btn-sm btn-outline-danger ms-1" (click)="removerTabela(t.alias)" title="Remover">
            <i class="bi bi-x"></i>
          </button>
          <div class="small text-muted mt-1">{{ descricaoJoin(t) }}</div>
          <div *ngIf="tabelaExpandida() === t.alias" class="db-qb__campos mt-2">
            <div class="db-qb__toolbar">
              <button class="btn btn-outline-primary btn-sm" (click)="todosCampos(t)">Todos</button>
              <button class="btn btn-outline-secondary btn-sm" (click)="limparCampos(t)">Limpar</button>
            </div>
            <label *ngFor="let c of t.colunas" class="db-qb__campo">
              <input type="checkbox" class="form-check-input"
                [checked]="campoMarcado(t, c.coluna)" (change)="alternarCampo(t, c.coluna)">
              <span class="db-qb__campo-nome">{{ c.coluna }}</span>
              <span *ngIf="c.isPrimaryKey" class="badge bg-warning text-dark">PK</span>
              <span *ngIf="c.isForeignKey" class="badge bg-info">FK</span>
              <small class="text-muted">{{ c.tipo }}</small>
            </label>
          </div>
        </div>
      </div>

      <button class="btn btn-outline-primary btn-sm mt-2" (click)="abrirModalTabelas()">
        <i class="bi bi-plus"></i> Adicionar tabela
      </button>

      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(2)"><i class="bi bi-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary btn-sm" (click)="irParaEtapa(4)">Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </section>

    <!-- ETAPA 4: filtros -->
    <section *ngIf="etapa() === 4" class="db-qb__panel">
      <h5>Filtros</h5>
      <p class="text-muted small">Opcional. Diga o que filtrar em linguagem simples — o WHERE é gerado sozinho.</p>
      <div *ngFor="let f of filtros()" class="db-qb__filtro">
        <select class="form-select form-select-sm" [(ngModel)]="f.tabelaAlias" (ngModelChange)="marcarAlterado()" title="Tabela">
          <option *ngFor="let t of tabelas()" [ngValue]="t.alias">{{ t.nome }} ({{ t.alias }})</option>
        </select>
        <select class="form-select form-select-sm" [(ngModel)]="f.coluna" (ngModelChange)="marcarAlterado()" title="Campo">
          <option *ngFor="let c of colunasDoAlias(f.tabelaAlias)" [ngValue]="c">{{ c }}</option>
        </select>
        <select class="form-select form-select-sm" [(ngModel)]="f.operador" (ngModelChange)="marcarAlterado()" title="Condição">
          <option *ngFor="let op of operadores" [ngValue]="op.rotulo">{{ op.rotulo }}</option>
        </select>
        <input *ngIf="precisaValor(f)" [type]="tipoInput(f)" class="form-control form-control-sm"
          [(ngModel)]="f.valor" (ngModelChange)="marcarAlterado()" placeholder="Valor">
        <span *ngIf="precisaValor2(f)" class="text-muted small">e</span>
        <input *ngIf="precisaValor2(f)" [type]="tipoInput(f)" class="form-control form-control-sm"
          [(ngModel)]="f.valor2" (ngModelChange)="marcarAlterado()" placeholder="Valor final">
        <button class="btn btn-sm btn-outline-danger" (click)="removerFiltro(f.id)" title="Remover filtro"><i class="bi bi-x"></i></button>
      </div>
      <button class="btn btn-outline-primary btn-sm" (click)="adicionarFiltro()"><i class="bi bi-plus"></i> Adicionar filtro</button>
      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(3)"><i class="bi bi-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary btn-sm" (click)="irParaEtapa(5)">Continuar <i class="bi bi-arrow-right"></i></button>
      </div>
    </section>

    <!-- ETAPA 5: ordenação -->
    <section *ngIf="etapa() === 5" class="db-qb__panel">
      <h5>Ordenar por</h5>
      <p class="text-muted small">Opcional. Defina a ordem das linhas do resultado.</p>
      <div *ngFor="let o of ordenacoes(); let i = index" class="db-qb__filtro">
        <select class="form-select form-select-sm" [(ngModel)]="o.tabelaAlias" (ngModelChange)="marcarAlterado()">
          <option *ngFor="let t of tabelas()" [ngValue]="t.alias">{{ t.nome }} ({{ t.alias }})</option>
        </select>
        <select class="form-select form-select-sm" [(ngModel)]="o.coluna" (ngModelChange)="marcarAlterado()">
          <option *ngFor="let c of colunasDoAlias(o.tabelaAlias)" [ngValue]="c">{{ c }}</option>
        </select>
        <select class="form-select form-select-sm" [(ngModel)]="o.direcao" (ngModelChange)="marcarAlterado()">
          <option [ngValue]="'ASC'">Crescente (A–Z, 0–9)</option>
          <option [ngValue]="'DESC'">Decrescente (Z–A, 9–0)</option>
        </select>
        <button class="btn btn-sm btn-outline-danger" (click)="removerOrdenacao(i)" title="Remover"><i class="bi bi-x"></i></button>
      </div>
      <button class="btn btn-outline-primary btn-sm" (click)="adicionarOrdenacao()"><i class="bi bi-plus"></i> Adicionar ordenação</button>
      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(4)"><i class="bi bi-arrow-left"></i> Voltar</button>
        <button class="btn btn-primary btn-sm" (click)="irParaEtapa(6)">Ver resumo <i class="bi bi-arrow-right"></i></button>
      </div>
    </section>

    <!-- ETAPA 6: resumo -->
    <section *ngIf="etapa() === 6" class="db-qb__panel">
      <h5>Resumo da consulta</h5>
      <div class="db-qb__resumo">
        <div><span>Tabela principal</span><strong>{{ tabelaPrincipal()?.nome }}</strong></div>
        <div><span>Tabelas utilizadas</span><strong>{{ tabelas().length }}</strong></div>
        <div><span>Campos selecionados</span><strong>{{ totalCampos() }}</strong></div>
        <div><span>Filtros</span><strong>{{ filtros().length }}</strong></div>
        <div><span>Ordenações</span><strong>{{ ordenacoes().length }}</strong></div>
      </div>
      <div class="db-qb__limites">
        <label>Registros por consulta
          <select class="form-select form-select-sm" [(ngModel)]="limite">
            <option [ngValue]="25">25</option><option [ngValue]="50">50</option>
            <option [ngValue]="100">100</option><option [ngValue]="500">500</option>
          </select>
        </label>
      </div>

      <details class="db-qb__avancado">
        <summary>Opções avançadas (agrupar e CTE)</summary>
        <div class="mt-2">
          <label class="form-label small">Agrupar por (GROUP BY)</label>
          <div class="db-qb__campos">
            <label *ngFor="let t of tabelas()" class="db-qb__campo db-qb__campo--bloco">
              <strong class="small">{{ t.alias }}:</strong>
              <span *ngFor="let c of t.colunasSelecionadas" class="db-qb__mini">
                <input type="checkbox" class="form-check-input"
                  [checked]="agruparPor().includes(t.alias + '.' + c)"
                  (change)="alternarAgrupar(t.alias + '.' + c)"> {{ c }}
              </span>
            </label>
          </div>
          <label class="form-label small mt-2">Condição do grupo (HAVING)</label>
          <input type="text" class="form-control form-control-sm" [(ngModel)]="having" placeholder="Ex: COUNT(*) > 1">
        </div>
      </details>

      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(5)"><i class="bi bi-arrow-left"></i> Voltar</button>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm" (click)="verSQL()" [disabled]="gerandoSql()">
            <i class="bi bi-code"></i> {{ gerandoSql() ? 'Gerando…' : 'Ver SQL' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ETAPA 7: SQL -->
    <section *ngIf="etapa() === 7" class="db-qb__panel">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0"><i class="bi bi-code"></i> SQL gerado</h5>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-outline-secondary" (click)="copiarSQL()"><i class="bi bi-clipboard"></i> Copiar</button>
        </div>
      </div>
      <p class="text-muted small">Copie o SQL e execute no SSMS. A interface não roda consultas.</p>
      <div *ngIf="avisoSql()" class="alert alert-warning py-2 small">{{ avisoSql() }}</div>
      <pre class="db-qb__sql">{{ sqlGerado() || 'Gerando SQL…' }}</pre>
      <div class="db-qb__nav">
        <button class="btn btn-outline-secondary btn-sm" (click)="irParaEtapa(6)"><i class="bi bi-arrow-left"></i> Voltar ao resumo</button>
      </div>
    </section>
  </div>

  <!-- Modal: adicionar tabela relacionada -->
  <div class="db-qb__overlay" *ngIf="modalTabelasAberto" (click)="fecharModalTabelas()">
    <div class="db-qb__modal" (click)="$event.stopPropagation()">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">Adicionar tabela</h5>
        <button class="btn btn-sm btn-outline-secondary" (click)="fecharModalTabelas()"><i class="bi bi-x"></i></button>
      </div>
      <p class="text-muted small">Relações conhecidas da sua montagem. Escolha uma para ver o relacionamento antes de adicionar.</p>
      <div class="adm-search mb-2">
        <i class="bi bi-search adm-search__icone"></i>
        <input type="text" class="adm-search__input" placeholder="Pesquisar relacionada..." [(ngModel)]="buscaRelacionadaTexto">
      </div>
      <div *ngIf="carregandoRels()" class="text-muted small">Carregando relacionamentos…</div>
      <div class="db-qb__lista db-qb__lista--modal">
        <button *ngFor="let item of relacionadasFiltradas" type="button" class="db-qb__item"
          [class.db-qb__item--ativo]="pendente()?.nomeCompleto === item.nomeCompleto"
          (click)="preverRelacionada(item)">
          <i class="bi bi-table"></i>
          <span><strong>{{ item.nome }}</strong> <small class="text-muted">{{ item.schema }}</small></span>
          <span class="badge ms-auto" [class.bg-success]="item.confirmada" [class.bg-warning]="!item.confirmada">
            {{ item.confirmada ? 'Confirmada' : 'Sugerida' }}
          </span>
        </button>
        <div *ngIf="!carregandoRels() && relacionadasFiltradas.length === 0" class="text-muted small p-2">
          Nenhuma tabela relacionada encontrada.
        </div>
      </div>
      <div *ngIf="pendente()" class="db-qb__preview">
        <div *ngIf="pendente()!.relacao.tipo === 'Confirmada'" class="alert alert-success py-2 small mb-2">
          Relacionamento confirmado — definido por FK no SQL Server.
        </div>
        <div *ngIf="pendente()!.relacao.tipo !== 'Confirmada'" class="alert alert-warning py-2 small mb-2">
          Relacionamento sugerido — inferido pela estrutura do banco. Confiança: {{ pendente()!.relacao.score }}%.
        </div>
        <code>{{ pendente()!.relacao.tabelaOrigem }}.{{ pendente()!.relacao.colunaOrigem }} = {{ pendente()!.relacao.tabelaDestino }}.{{ pendente()!.relacao.colunaDestino }}</code>
        <div class="mt-1">
          <button class="btn btn-sm btn-link p-0" (click)="verEvidencias(pendente()!.relacao)">Ver evidências</button>
        </div>
      </div>
      <div class="d-flex justify-content-end gap-2 mt-2">
        <button class="btn btn-outline-secondary btn-sm" (click)="fecharModalTabelas()">Cancelar</button>
        <button class="btn btn-primary btn-sm" (click)="confirmarRelacionada()" [disabled]="!pendente()">Adicionar tabela</button>
      </div>
    </div>
  </div>

  <!-- Modal: evidências -->
  <div class="db-qb__overlay" *ngIf="relacaoDetalhe()" (click)="relacaoDetalhe.set(null)">
    <div class="db-qb__modal" (click)="$event.stopPropagation()">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">Evidências do relacionamento</h5>
        <button class="btn btn-sm btn-outline-secondary" (click)="relacaoDetalhe.set(null)"><i class="bi bi-x"></i></button>
      </div>
      <code>{{ relacaoDetalhe()!.tabelaOrigem }}.{{ relacaoDetalhe()!.colunaOrigem }} = {{ relacaoDetalhe()!.tabelaDestino }}.{{ relacaoDetalhe()!.colunaDestino }}</code>
      <ul class="mt-2 small">
        <li *ngFor="let m of relacaoDetalhe()!.motivos">{{ m }}</li>
      </ul>
      <p class="small text-muted">Confiança: {{ relacaoDetalhe()!.score }}% · Tipo: {{ relacaoDetalhe()!.tipo }}</p>
    </div>
  </div>
  `,
  styles: [`
    .db-qb { padding: 1rem; }
    .db-qb__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem; }
    .db-qb__header h4 { margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.4rem; }
    .db-qb__steps { list-style: none; display: flex; gap: 0.35rem; padding: 0; margin: 0 0 1rem; flex-wrap: wrap; }
    .db-qb__step button { display: flex; align-items: center; gap: 0.4rem; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 1.2rem; padding: 0.3rem 0.7rem; font-size: 0.78rem; cursor: pointer; }
    .db-qb__step--ativo button { background: #dbeafe; border-color: #3b82f6; font-weight: 700; }
    .db-qb__step--ok button { background: #ecfdf5; border-color: #a7f3d0; }
    .db-qb__step--bloqueado button { opacity: 0.45; cursor: not-allowed; }
    .db-qb__step-num { display: inline-flex; align-items: center; justify-content: center; width: 1.3rem; height: 1.3rem; border-radius: 50%; background: #fff; border: 1px solid #cbd5e1; font-size: 0.72rem; font-weight: 700; }
    .db-qb__panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; }
    .db-qb__panel h5 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.25rem; }
    .db-qb__principal { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.4rem; padding: 0.6rem 0.8rem; margin: 0.6rem 0; flex-wrap: wrap; }
    .db-qb__badges { display: flex; gap: 0.35rem; }
    .db-qb__lista { display: flex; flex-direction: column; gap: 0.25rem; max-height: 20rem; overflow-y: auto; margin-top: 0.5rem; }
    .db-qb__lista--modal { max-height: 16.25rem; }
    .db-qb__item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.65rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.35rem; text-align: left; cursor: pointer; font-size: 0.82rem; }
    .db-qb__item:hover { background: #dbeafe; border-color: #3b82f6; }
    .db-qb__item--ativo { background: #ecfdf5; border-color: #34d399; }
    .db-qb__toolbar { display: flex; gap: 0.5rem; align-items: center; margin: 0.6rem 0; flex-wrap: wrap; }
    .db-qb__toolbar .adm-search { flex: 1; min-width: 12.5rem; }
    .db-qb__campos { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
    .db-qb__campo { display: inline-flex; align-items: center; gap: 0.3rem; border: 1px solid #e2e8f0; border-radius: 0.35rem; padding: 0.3rem 0.5rem; font-size: 0.78rem; cursor: pointer; background: #f8fafc; }
    .db-qb__campo--bloco { width: 100%; align-items: flex-start; flex-wrap: wrap; }
    .db-qb__campo-nome { font-weight: 600; }
    .db-qb__mini { display: inline-flex; align-items: center; gap: 0.2rem; margin-left: 0.4rem; font-size: 0.75rem; }
    .db-qb__arvore { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.4rem; padding: 0.75rem; margin: 0.5rem 0; }
    .db-qb__no { padding: 0.35rem 0; font-size: 0.85rem; }
    .db-qb__no--raiz { font-weight: 700; }
    .db-qb__galho { color: #94a3b8; margin-right: 0.3rem; }
    .db-qb__filtro { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.4rem; padding: 0.5rem; margin-bottom: 0.4rem; }
    .db-qb__filtro select, .db-qb__filtro input { max-width: 13.75rem; }
    .db-qb__resumo { display: grid; grid-template-columns: repeat(auto-fit, minmax(9.375rem, 1fr)); gap: 0.5rem; margin: 0.6rem 0; }
    .db-qb__resumo > div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.4rem; padding: 0.6rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .db-qb__resumo span { font-size: 0.72rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
    .db-qb__limites { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.6rem; }
    .db-qb__limites label { font-size: 0.78rem; display: flex; flex-direction: column; gap: 0.25rem; }
    .db-qb__avancado { margin: 0.6rem 0; font-size: 0.82rem; }
    .db-qb__avancado summary { cursor: pointer; font-weight: 600; color: #475569; }
    .db-qb__nav { display: flex; justify-content: space-between; margin-top: 1rem; }
    .db-qb__sql { background: #0f172a; color: #e2e8f0; padding: 1rem; border-radius: 0.4rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; max-height: 20rem; overflow: auto; white-space: pre-wrap; word-break: break-word; }
    .db-qb__meta { display: flex; gap: 1.5rem; color: #475569; font-size: 0.85rem; }
    .db-qb__overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1050; display: flex; align-items: center; justify-content: center; }
    .db-qb__modal { background: #fff; border-radius: 0.5rem; max-width: 38.75rem; width: 92%; max-height: 88vh; overflow-y: auto; padding: 1rem; }
    .db-qb__modal code, .db-qb__preview code { font-size: 0.75rem; }
    .db-qb__preview { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.4rem; padding: 0.6rem; margin-top: 0.5rem; }
    .adm-table-wrap { border-radius: 0.4rem; overflow: hidden; border: 1px solid #e2e8f0; }
    .adm-table { width: 100%; margin: 0; font-size: 0.82rem; }
    .adm-table th { background: #f8fafc; font-size: 0.72rem; text-transform: uppercase; padding: 0.55rem 0.75rem; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
    .adm-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    .adm-table tbody tr:hover { background: #f1f5f9; }
  `]
})
export class DbQueryBuilderComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly route = inject(ActivatedRoute);

  readonly etapas = ETAPAS;
  readonly operadores = OPERADORES;

  readonly etapa = signal(1);
  readonly tabelas = signal<TabelaMontagem[]>([]);
  readonly tabelasDisponiveis = signal<DatabaseTable[]>([]);
  readonly relacoes = signal<DatabaseRelationship[]>([]);
  readonly relacaoUsadaPorTabela = signal<Record<string, DatabaseRelationship>>({});
  readonly filtros = signal<FiltroSimples[]>([]);
  readonly ordenacoes = signal<OrdenacaoSimples[]>([]);
  readonly agruparPor = signal<string[]>([]);
  readonly sqlGerado = signal('');
  readonly avisoSql = signal<string | null>(null);
  readonly gerandoSql = signal(false);
  readonly carregandoRels = signal(false);
  readonly tabelaExpandida = signal<string | null>(null);
  readonly pendente = signal<TabelaRelacionadaItem | null>(null);
  readonly relacaoDetalhe = signal<DatabaseRelationship | null>(null);

  filtroTabelaTexto = '';
  buscaCampoPrincipal = '';
  buscaRelacionadaTexto = '';
  buscasCampoRelacionada: Record<string, string> = {};
  modalTabelasAberto = false;
  having = '';
  limite = 100;

  private proximoFiltroId = 1;

  // ---------- ciclo de vida ----------

  ngOnInit(): void {
    this.db.listarTabelas().subscribe(t => this.tabelasDisponiveis.set(t ?? []));
    this.route.queryParams.subscribe(params => {
      const legadas = this.lerTabelasLegadas();
      const porParam = this.lerTabelasDeParams(params);
      const lista = porParam.length > 0 ? porParam : legadas;
      if (lista.length > 0) {
        this.adicionarTabelasEmSequencia(lista);
      }
    });
  }

  private lerTabelasLegadas(): string[] {
    try {
      const raw = sessionStorage.getItem('db-query-builder-tables');
      if (!raw) return [];
      sessionStorage.removeItem('db-query-builder-tables');
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((x: unknown) => typeof x === 'string') : [];
    } catch { return []; }
  }

  private lerTabelasDeParams(params: Record<string, string>): string[] {
    const lista: string[] = [];
    const push = (v: string | undefined) => {
      if (!v) return;
      for (const parte of String(v).split(',')) {
        const nome = parte.trim();
        if (nome && !lista.includes(nome)) lista.push(nome);
      }
    };
    push(params['tabela']);
    push(params['tabelas']);
    push(params['caminho']);
    if (params['origem']) push(params['origem']);
    if (params['destino'] ?? params['rel']) push(params['destino'] ?? params['rel']);
    return lista;
  }

  private adicionarTabelasEmSequencia(lista: string[]): void {
    const [primeira, ...resto] = lista;
    if (!primeira) return;
    const [schema, ...nomePartes] = primeira.split('.');
    const nome = nomePartes.join('.') || schema;
    const sch = nomePartes.length > 0 ? schema : 'dbo';
    this.definirPrincipalPorNome(sch, nome, () => {
      resto.forEach((item, idx) => {
        setTimeout(() => {
          const [s, ...n] = item.split('.');
          const nm = n.join('.') || s;
          this.adicionarTabelaPorNome(n.length > 0 ? s : 'dbo', nm);
        }, 150 * (idx + 1));
      });
    });
  }

  // ---------- etapa 1: tabela principal ----------

  get tabelasFiltradas(): DatabaseTable[] {
    const f = this.filtroTabelaTexto.trim().toLowerCase();
    const todas = this.tabelasDisponiveis();
    const filtradas = !f ? todas : todas.filter(t =>
      t.nome.toLowerCase().includes(f) || t.nomeCompleto.toLowerCase().includes(f));
    return filtradas.slice(0, 80);
  }

  tabelaPrincipal(): TabelaMontagem | null {
    return this.tabelas()[0] ?? null;
  }

  tabelasRelacionadas(): TabelaMontagem[] {
    return this.tabelas().slice(1);
  }

  ehPrincipal(t: DatabaseTable): boolean {
    const p = this.tabelaPrincipal();
    return !!p && p.schema === t.schema && p.nome === t.nome;
  }

  qtdColunasPrincipal(): number {
    return this.tabelaPrincipal()?.colunas.length ?? 0;
  }

  qtdRelacionamentosPrincipal(): number {
    const p = this.tabelaPrincipal();
    if (!p) return 0;
    const chave = `${p.schema}.${p.nome}`;
    return this.relacoes().filter(r => r.tabelaOrigem === chave || r.tabelaDestino === chave).length;
  }

  definirPrincipal(t: DatabaseTable): void {
    if (this.ehPrincipal(t)) { this.irParaEtapa(2); return; }
    this.definirPrincipalPorNome(t.schema, t.nome);
  }

  private definirPrincipalPorNome(schema: string, nome: string, depois?: () => void): void {
    this.db.listarColunas(schema, nome).subscribe({
      next: colunas => {
        const mantidas = this.tabelas().slice(1)
          .filter(t => !(t.schema === schema && t.nome === nome))
          .map(t => ({ ...t }));
        const alias = this.gerarAlias(nome, mantidas.map(t => t.alias));
        const principal: TabelaMontagem = { schema, nome, alias, colunas: colunas ?? [], colunasSelecionadas: [] };
        this.tabelas.set([principal, ...mantidas]);
        this.marcarAlterado();
        this.carregarRelacoes();
        this.irParaEtapa(2);
        depois?.();
      },
      error: () => { /* mantém estado atual em caso de falha */ }
    });
  }

  adicionarTabelaPorNome(schema: string, nome: string): void {
    if (this.tabelas().length >= 5) return;
    if (this.tabelas().some(t => t.schema === schema && t.nome === nome)) return;
    this.db.listarColunas(schema, nome).subscribe({
      next: colunas => {
        const alias = this.gerarAlias(nome, this.tabelas().map(t => t.alias));
        this.tabelas.update(arr => [...arr, { schema, nome, alias, colunas: colunas ?? [], colunasSelecionadas: [] }]);
        this.marcarAlterado();
        this.carregarRelacoes();
      },
      error: () => { /* ignora falha de uma tabela */ }
    });
  }

  removerTabela(alias: string): void {
    if (this.tabelas().length <= 1) return;
    const removida = this.tabelas().find(t => t.alias === alias);
    this.tabelas.update(arr => arr.filter(t => t.alias !== alias));
    if (removida) {
      const chave = `${removida.schema}.${removida.nome}`;
      this.relacaoUsadaPorTabela.update(m => {
        const copia = { ...m };
        delete copia[chave];
        return copia;
      });
      this.filtros.update(fs => fs.filter(f => f.tabelaAlias !== alias));
      this.ordenacoes.update(os => os.filter(o => o.tabelaAlias !== alias));
    }
    this.marcarAlterado();
    this.carregarRelacoes();
  }

  // ---------- aliases amigáveis ----------

  private gerarAlias(nomeTabela: string, ocupados: string[]): string {
    const usados = new Set([...this.tabelas().map(t => t.alias), ...ocupados]);
    const base = nomeTabela.toUpperCase().replace(/^TB_?/, '');
    const partes = base.split('_').filter(Boolean);
    let candidato = (partes.map(p => p[0]).join('') || base.slice(0, 2)).slice(0, 4);
    if (!candidato) candidato = 'T';
    let alias = candidato;
    let i = 1;
    const primeira = partes[0] || base;
    while (usados.has(alias) && i < 10) {
      alias = (candidato + (primeira[i] ?? String(i))).slice(0, 4);
      i++;
    }
    return alias;
  }

  // ---------- relacionamentos ----------

  private carregarRelacoes(): void {
    const principal = this.tabelaPrincipal();
    if (!principal) { this.relacoes.set([]); return; }
    this.carregandoRels.set(true);
    const chave = `${principal.schema}.${principal.nome}`;
    let rels: DatabaseRelationship[] = [];
    let concluidas = 0;
    const finalizar = () => {
      concluidas++;
      if (concluidas >= 2) {
        const vistas = new Set<string>();
        this.relacoes.set(rels.filter(r => {
          const k = `${r.tabelaOrigem}.${r.colunaOrigem}->${r.tabelaDestino}.${r.colunaDestino}`;
          if (vistas.has(k)) return false;
          vistas.add(k);
          return true;
        }));
        this.carregandoRels.set(false);
      }
    };
    this.db.grafo(chave, 2, true).subscribe({
      next: l => { rels = [...rels, ...(l ?? [])]; finalizar(); },
      error: () => finalizar()
    });
    this.db.relacionamentos(principal.schema, true, 500).subscribe({
      next: l => { rels = [...rels, ...(l ?? [])]; finalizar(); },
      error: () => finalizar()
    });
  }

  /** Tabelas relacionadas ainda não adicionadas, derivadas das relações conhecidas. */
  get relacionadasDisponiveis(): TabelaRelacionadaItem[] {
    const selecionadas = new Set(this.tabelas().map(t => `${t.schema}.${t.nome}`));
    const mapa = new Map<string, TabelaRelacionadaItem>();
    for (const r of this.relacoes()) {
      const origemSel = selecionadas.has(r.tabelaOrigem);
      const destinoSel = selecionadas.has(r.tabelaDestino);
      if (origemSel === destinoSel) continue;
      const outra = origemSel ? r.tabelaDestino : r.tabelaOrigem;
      if (selecionadas.has(outra) || mapa.has(outra)) continue;
      const [schema, ...resto] = outra.split('.');
      const nome = resto.join('.') || schema;
      mapa.set(outra, {
        nomeCompleto: outra,
        schema: resto.length > 0 ? schema : 'dbo',
        nome,
        relacao: r,
        confirmada: r.tipo === 'Confirmada'
      });
    }
    return [...mapa.values()].sort((a, b) =>
      Number(b.confirmada) - Number(a.confirmada) || b.relacao.score - a.relacao.score);
  }

  get relacionadasFiltradas(): TabelaRelacionadaItem[] {
    const f = this.buscaRelacionadaTexto.trim().toLowerCase();
    if (!f) return this.relacionadasDisponiveis;
    return this.relacionadasDisponiveis.filter(i => i.nome.toLowerCase().includes(f));
  }

  abrirModalTabelas(): void {
    this.pendente.set(null);
    this.buscaRelacionadaTexto = '';
    this.modalTabelasAberto = true;
    if (this.relacoes().length === 0) this.carregarRelacoes();
  }

  fecharModalTabelas(): void {
    this.modalTabelasAberto = false;
    this.pendente.set(null);
  }

  preverRelacionada(item: TabelaRelacionadaItem): void {
    this.pendente.set(item);
  }

  confirmarRelacionada(): void {
    const item = this.pendente();
    if (!item || this.tabelas().length >= 5) return;
    this.db.listarColunas(item.schema, item.nome).subscribe({
      next: colunas => {
        const alias = this.gerarAlias(item.nome, this.tabelas().map(t => t.alias));
        this.tabelas.update(arr => [...arr, {
          schema: item.schema, nome: item.nome, alias,
          colunas: colunas ?? [], colunasSelecionadas: []
        }]);
        this.relacaoUsadaPorTabela.update(m => ({ ...m, [item.nomeCompleto]: item.relacao }));
        this.marcarAlterado();
        this.fecharModalTabelas();
        this.carregarRelacoes();
      },
      error: () => { /* mantém estado */ }
    });
  }

  verEvidencias(rel: DatabaseRelationship): void {
    this.relacaoDetalhe.set(rel);
  }

  /** Relação usada para ligar uma tabela adicionada ao restante da montagem. */
  joinDaTabela(t: TabelaMontagem): DatabaseRelationship | null {
    const chave = `${t.schema}.${t.nome}`;
    const direta = this.relacaoUsadaPorTabela()[chave];
    if (direta) return direta;
    const selecionadas = new Set(this.tabelas().map(x => `${x.schema}.${x.nome}`));
    const candidatas = this.relacoes().filter(r =>
      (r.tabelaOrigem === chave && selecionadas.has(r.tabelaDestino)) ||
      (r.tabelaDestino === chave && selecionadas.has(r.tabelaOrigem)));
    candidatas.sort((a, b) => Number(b.tipo === 'Confirmada') - Number(a.tipo === 'Confirmada') || b.score - a.score);
    return candidatas[0] ?? null;
  }

  descricaoJoin(t: TabelaMontagem): string {
    const r = this.joinDaTabela(t);
    if (!r) return 'Sem relacionamento direto conhecido';
    const tipo = r.tipo === 'Confirmada' ? 'Relacionamento confirmado' : `Relacionamento sugerido (${r.score}%)`;
    return `${tipo}: ${r.tabelaOrigem}.${r.colunaOrigem} = ${r.tabelaDestino}.${r.colunaDestino}`;
  }

  alternarExpansao(alias: string): void {
    this.tabelaExpandida.set(this.tabelaExpandida() === alias ? null : alias);
  }

  // ---------- etapa 2/3: campos ----------

  camposPrincipalFiltrados(): DatabaseColumn[] {
    const p = this.tabelaPrincipal();
    if (!p) return [];
    const f = this.buscaCampoPrincipal.trim().toLowerCase();
    if (!f) return p.colunas;
    return p.colunas.filter(c => c.coluna.toLowerCase().includes(f));
  }

  campoMarcado(t: TabelaMontagem, coluna: string): boolean {
    return this.tabelas().find(x => x.alias === t.alias)?.colunasSelecionadas.includes(coluna) ?? false;
  }

  alternarCampo(t: TabelaMontagem, coluna: string): void {
    this.tabelas.update(arr => arr.map(x => {
      if (x.alias !== t.alias) return x;
      const tem = x.colunasSelecionadas.includes(coluna);
      return {
        ...x,
        colunasSelecionadas: tem
          ? x.colunasSelecionadas.filter(c => c !== coluna)
          : [...x.colunasSelecionadas, coluna]
      };
    }));
    this.marcarAlterado();
  }

  todosCamposPrincipal(): void {
    const p = this.tabelaPrincipal();
    if (p) this.todosCampos(p);
  }

  limparCamposPrincipal(): void {
    const p = this.tabelaPrincipal();
    if (p) this.limparCampos(p);
  }

  todosCampos(t: TabelaMontagem): void {
    this.tabelas.update(arr => arr.map(x =>
      x.alias === t.alias ? { ...x, colunasSelecionadas: x.colunas.map(c => c.coluna) } : x));
    this.marcarAlterado();
  }

  limparCampos(t: TabelaMontagem): void {
    this.tabelas.update(arr => arr.map(x =>
      x.alias === t.alias ? { ...x, colunasSelecionadas: [] } : x));
    this.marcarAlterado();
  }

  totalCampos(): number {
    return this.tabelas().reduce((s, t) => s + t.colunasSelecionadas.length, 0);
  }

  nomeTabelaPorAlias(alias: string): string {
    return this.tabelas().find(t => t.alias === alias)?.nome ?? alias;
  }

  colunasDoAlias(alias: string): string[] {
    return this.tabelas().find(t => t.alias === alias)?.colunas.map(c => c.coluna) ?? [];
  }

  tipoColuna(alias: string, coluna: string): string {
    return this.tabelas().find(t => t.alias === alias)?.colunas.find(c => c.coluna === coluna)?.tipo ?? '';
  }

  // ---------- etapa 4: filtros ----------

  adicionarFiltro(): void {
    const primeira = this.tabelas()[0];
    if (!primeira) return;
    const coluna = primeira.colunas[0]?.coluna ?? '';
    this.filtros.update(arr => [...arr, {
      id: this.proximoFiltroId++, tabelaAlias: primeira.alias,
      coluna, operador: 'igual a', valor: '', valor2: ''
    }]);
    this.marcarAlterado();
  }

  removerFiltro(id: number): void {
    this.filtros.update(arr => arr.filter(f => f.id !== id));
    this.marcarAlterado();
  }

  private defOperador(rotulo: string): OperadorAmigavel {
    return this.operadores.find(o => o.rotulo === rotulo) ?? this.operadores[0];
  }

  precisaValor(f: FiltroSimples): boolean {
    return this.defOperador(f.operador).precisaValor;
  }

  precisaValor2(f: FiltroSimples): boolean {
    return this.defOperador(f.operador).precisaValor2;
  }

  tipoInput(f: FiltroSimples): string {
    const tipo = this.tipoColuna(f.tabelaAlias, f.coluna).toLowerCase();
    if (tipo.includes('date') && !tipo.includes('datetime')) return 'date';
    if (tipo.includes('time') || tipo.includes('datetime')) return 'datetime-local';
    if (tipo.includes('int') || tipo.includes('decimal') || tipo.includes('numeric') || tipo.includes('float')) return 'number';
    return 'text';
  }

  // ---------- etapa 5: ordenação ----------

  adicionarOrdenacao(): void {
    const primeira = this.tabelas()[0];
    if (!primeira) return;
    this.ordenacoes.update(arr => [...arr, {
      tabelaAlias: primeira.alias, coluna: primeira.colunas[0]?.coluna ?? '', direcao: 'ASC'
    }]);
    this.marcarAlterado();
  }

  removerOrdenacao(index: number): void {
    this.ordenacoes.update(arr => arr.filter((_, i) => i !== index));
    this.marcarAlterado();
  }

  // ---------- avançado ----------

  alternarAgrupar(chave: string): void {
    this.agruparPor.update(arr =>
      arr.includes(chave) ? arr.filter(x => x !== chave) : [...arr, chave]);
    this.marcarAlterado();
  }

  // ---------- navegação ----------

  etapaValida(id: number): boolean {
    if (id === 1) return this.tabelas().length >= 1;
    if (id === 2) return this.tabelas().length >= 1 && this.totalCampos() >= 1;
    return this.etapaValida(2);
  }

  podeIrPara(id: number): boolean {
    if (id <= this.etapa()) return true;
    for (let i = 1; i < id; i++) {
      if (i <= 2 && !this.etapaValida(i)) return false;
    }
    return this.etapaValida(2);
  }

  irParaEtapa(id: number): void {
    if (id < 1 || id > 7 || !this.podeIrPara(id)) return;
    this.etapa.set(id);
    if (id === 7 && !this.sqlGerado()) this.gerarSQL();
  }

  marcarAlterado(): void {
    this.sqlGerado.set('');
    this.avisoSql.set(null);
  }

  // ---------- SQL via backend ----------

  private montarRequisicao(): Record<string, unknown> {
    const tabelas = this.tabelas();
    const colunas: string[] = [];
    for (const t of tabelas) {
      for (const c of t.colunasSelecionadas) colunas.push(`${t.nome}.${c}`);
    }
    const selecionadas = new Set(tabelas.map(t => `${t.schema}.${t.nome}`));
    const relsBackend = this.relacoes()
      .filter(r => selecionadas.has(r.tabelaOrigem) && selecionadas.has(r.tabelaDestino))
      .map(r => ({
        Tipo: r.tipo, TabelaOrigem: r.tabelaOrigem, ColunaOrigem: r.colunaOrigem,
        TabelaDestino: r.tabelaDestino, ColunaDestino: r.colunaDestino,
        Score: r.score, Motivos: r.motivos ?? []
      }));
    for (const [chave, r] of Object.entries(this.relacaoUsadaPorTabela())) {
      if (!relsBackend.some(x => x['TabelaOrigem'] === r.tabelaOrigem && x['TabelaDestino'] === r.tabelaDestino
        && x['ColunaOrigem'] === r.colunaOrigem && x['ColunaDestino'] === r.colunaDestino)) {
        relsBackend.push({
          Tipo: r.tipo, TabelaOrigem: r.tabelaOrigem, ColunaOrigem: r.colunaOrigem,
          TabelaDestino: r.tabelaDestino, ColunaDestino: r.colunaDestino,
          Score: r.score, Motivos: r.motivos ?? []
        });
      }
    }
    const where = this.filtros()
      .filter(f => f.coluna && (!this.precisaValor(f) || f.valor !== ''))
      .map(f => {
        const def = this.defOperador(f.operador);
        const tabela = this.nomeTabelaPorAlias(f.tabelaAlias);
        let operador = def.sql;
        let valor: string | undefined = f.valor;
        if (def.sql === 'LIKE') {
          if (f.operador === 'contém') valor = `%${f.valor}%`;
          else if (f.operador === 'começa com') valor = `${f.valor}%`;
          else valor = `%${f.valor}`;
        }
        if (!def.precisaValor) { operador = def.sql; valor = undefined; }
        return {
          Coluna: `${tabela}.${f.coluna}`, Operador: operador,
          Valor: valor, Valor2: this.precisaValor2(f) ? f.valor2 : undefined, Logica: 'AND'
        };
      });
    const orderBy = this.ordenacoes()
      .filter(o => o.coluna)
      .map(o => ({
        Coluna: `${this.nomeTabelaPorAlias(o.tabelaAlias)}.${o.coluna}`,
        Ascendente: o.direcao === 'ASC'
      }));
    const groupBy = this.agruparPor().map(g => {
      const [alias, ...resto] = g.split('.');
      return { Coluna: `${this.nomeTabelaPorAlias(alias)}.${resto.join('.')}`, Agregacao: null };
    });
    return {
      Tabelas: tabelas.map(t => `${t.schema}.${t.nome}`),
      Colunas: colunas,
      Relacionamentos: relsBackend,
      WhereConditions: where,
      OrderBy: orderBy,
      GroupBy: groupBy,
      Limite: this.limite,
      Ctes: []
    };
  }

  verSQL(): void {
    this.gerarSQL(() => this.irParaEtapa(7));
  }

  gerarSQL(depois?: () => void): void {
    if (this.tabelas().length === 0 || this.totalCampos() === 0) return;
    this.gerandoSql.set(true);
    this.db.executarQueryBuilderAvançado(this.montarRequisicao()).subscribe({
      next: (r: { sqlGerado?: string; aviso?: string }) => {
        this.sqlGerado.set(r?.sqlGerado ?? '');
        this.avisoSql.set(r?.aviso ?? null);
        this.gerandoSql.set(false);
        depois?.();
      },
      error: () => {
        this.sqlGerado.set(this.montarSQLLocal());
        this.avisoSql.set('Serviço de montagem indisponível — SQL gerado localmente.');
        this.gerandoSql.set(false);
        depois?.();
      }
    });
  }

  /** Contingência local com os mesmos aliases amigáveis da tela. */
  private montarSQLLocal(): string {
    const tabelas = this.tabelas();
    const cols = tabelas.flatMap(t =>
      t.colunasSelecionadas.length > 0
        ? t.colunasSelecionadas.map(c => `${t.alias}.${c}`)
        : [`${t.alias}.*`]).join(', ');
    let sql = `SELECT TOP ${this.limite} ${cols}\nFROM ${tabelas[0].schema}.${tabelas[0].nome} ${tabelas[0].alias}`;
    for (const t of tabelas.slice(1)) {
      const r = this.joinDaTabela(t);
      if (r) {
        const origemSel = tabelas.some(x => `${x.schema}.${x.nome}` === r.tabelaOrigem);
        sql += `\nINNER JOIN ${t.schema}.${t.nome} ${t.alias}\n    ON ${r.tabelaOrigem}.${r.colunaOrigem} = ${r.tabelaDestino}.${r.colunaDestino}`;
        void origemSel;
      }
    }
    const wheres = this.filtros().filter(f => f.coluna).map(f => {
      const def = this.defOperador(f.operador);
      const ref = `${f.tabelaAlias}.${f.coluna}`;
      if (!def.precisaValor) return `${ref} ${def.sql}`;
      if (def.sql === 'BETWEEN') return `${ref} BETWEEN '${f.valor}' AND '${f.valor2}'`;
      if (def.sql === 'LIKE') {
        const v = f.operador === 'contém' ? `%${f.valor}%` : f.operador === 'começa com' ? `${f.valor}%` : `%${f.valor}`;
        return `${ref} LIKE '${v}'`;
      }
      return `${ref} ${def.sql} '${f.valor}'`;
    });
    if (wheres.length > 0) sql += `\nWHERE ${wheres.join(' AND ')}`;
    if (this.ordenacoes().length > 0) {
      sql += `\nORDER BY ${this.ordenacoes().map(o => `${o.tabelaAlias}.${o.coluna} ${o.direcao}`).join(', ')}`;
    }
    return sql + ';';
  }

  copiarSQL(): void {
    if (typeof window !== 'undefined' && this.sqlGerado()) {
      navigator.clipboard.writeText(this.sqlGerado());
    }
  }

  reiniciar(): void {
    this.tabelas.set([]);
    this.relacoes.set([]);
    this.relacaoUsadaPorTabela.set({});
    this.filtros.set([]);
    this.ordenacoes.set([]);
    this.agruparPor.set([]);
    this.having = '';
    this.sqlGerado.set('');
    this.avisoSql.set(null);
    this.etapa.set(1);
  }

  readonly resumo = computed(() => ({
    tabelas: this.tabelas().length,
    campos: this.totalCampos(),
    filtros: this.filtros().length,
    ordenacoes: this.ordenacoes().length
  }));
}
