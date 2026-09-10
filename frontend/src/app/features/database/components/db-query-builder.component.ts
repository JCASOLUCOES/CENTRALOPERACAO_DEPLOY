import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DatabaseService } from '../services/database.service';
import { DatabaseTable, DatabaseColumn, DatabaseRelationship } from '../models/database.model';

interface TabelaSelecionada {
  schema: string;
  nome: string;
  alias: string;
  colunas: DatabaseColumn[];
  colunasSelecionadas: string[];
}

interface JoinConfig {
  origem: string;
  destino: string;
  colunaOrigem: string;
  colunaDestino: string;
  tipo: 'INNER' | 'LEFT';
  confirmada: boolean;
}

interface CondicaoWhere {
  coluna: string;
  tabelaAlias: string;
  operador: string;
  valor: string;
  valor2?: string;
  conector: 'AND' | 'OR';
}

interface GrupoWhere {
  condicoes: CondicaoWhere[];
  conectorGrupo: 'AND' | 'OR';
}

interface CondicaoOrderBy {
  coluna: string;
  tabelaAlias: string;
  direcao: 'ASC' | 'DESC';
}

interface CteConfig {
  nome: string;
  sql: string;
}

@Component({
  selector: 'app-db-query-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="db-qb">
    <!-- Header -->
    <div class="db-qb__header">
      <h4><i class="bi bi-diagram-3"></i> Query Builder Visual</h4>
      <div class="db-qb__acoes">
        <button class="btn btn-outline-secondary btn-sm" (click)="limpar()">
          <i class="bi bi-trash"></i> Limpar
        </button>
        <button class="btn btn-outline-primary btn-sm" (click)="adicionarTabela()">
          <i class="bi bi-plus"></i> Adicionar Tabela
        </button>
        <!-- LIMIT/TOP -->
        <div class="db-qb__limit-group">
          <label class="db-qb__limit-label">LIMIT/TOP</label>
          <input type="number" class="form-control form-control-sm db-qb__limit-input"
            [(ngModel)]="limitTop" min="1" max="10000" placeholder="100">
        </div>
        <button class="btn btn-primary btn-sm" (click)="gerarSQL()" [disabled]="tabelasSelecionadas().length === 0">
          <i class="bi bi-code"></i> Gerar SQL
        </button>
        <button class="btn btn-success btn-sm" (click)="executarSQL()" [disabled]="!sqlGerado()">
          <i class="bi bi-play-fill"></i> Executar
        </button>
      </div>
    </div>

    <!-- Painel lateral: Tabelas disponíveis -->
    <div class="db-qb__layout">
      <aside class="db-qb__lateral">
        <div class="db-qb__secao">
          <h6><i class="bi bi-table"></i> Tabelas Selecionadas ({{ tabelasSelecionadas().length }}/5)</h6>
          <div *ngIf="tabelasSelecionadas().length === 0" class="db-qb__vazio">
            <i class="bi bi-plus-circle"></i>
            <span>Nenhuma tabela adicionada</span>
            <button class="btn btn-sm btn-primary mt-2" (click)="adicionarTabela()">Adicionar primeira tabela</button>
          </div>
          <div *ngFor="let t of tabelasSelecionadas(); let i = index" class="db-qb__tabela-card">
            <div class="db-qb__tabela-header">
              <strong>{{ t.schema }}.{{ t.nome }}</strong>
              <small class="text-muted ms-2">{{ t.alias }}</small>
              <button class="btn btn-sm btn-outline-danger" (click)="removerTabela(i)" title="Remover">
                <i class="bi bi-x"></i>
              </button>
            </div>
            <div class="db-qb__colunas">
              <label class="form-check form-check-inline" *ngFor="let c of t.colunas">
                <input class="form-check-input" type="checkbox"
                  [checked]="t.colunasSelecionadas.includes(c.coluna)"
                  (change)="toggleColuna(i, c.coluna)">
                <span class="form-check-label small">{{ c.coluna }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="db-qb__secao">
          <h6><i class="bi bi-search"></i> Buscar Tabelas</h6>
          <input type="text" class="form-control form-control-sm mb-2"
            placeholder="Filtrar tabelas..."
            [(ngModel)]="filtroTabelas">
          <div class="db-qb__lista-tabelas" *ngIf="tabelasDisponiveisFiltradas().length > 0">
            <button *ngFor="let t of tabelasDisponiveisFiltradas()"
              class="db-qb__tabela-item"
              (click)="adicionarTabelaExistente(t)"
              [disabled]="jaSelecionada(t)">
              <i class="bi bi-table"></i>
              <span>{{ t.schema }}.{{ t.nome }}</span>
              <span *ngIf="jaSelecionada(t)" class="badge bg-success ms-auto">Adicionada</span>
            </button>
          </div>
        </div>

        <!-- CTEs -->
        <div class="db-qb__secao">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 style="margin:0"><i class="bi bi-stack"></i> CTEs ({{ ctes().length }})</h6>
            <button class="btn btn-sm btn-outline-primary" (click)="abrirModalCte()">
              <i class="bi bi-plus"></i> Adicionar CTE
            </button>
          </div>
          <div *ngIf="ctes().length > 0" class="db-qb__cte-lista">
            <div *ngFor="let cte of ctes(); let i = index" class="db-qb__cte-item">
              <strong>{{ cte.nome }}</strong>
              <button class="btn btn-sm btn-outline-danger" (click)="removerCte(i)">
                <i class="bi bi-x"></i>
              </button>
            </div>
          </div>
          <div *ngIf="ctes().length === 0" class="db-qb__vazio db-qb__vazio--pequeno">
            <span>Nenhuma CTE definida</span>
          </div>
        </div>
      </aside>

      <!-- Painel central: Joins, WHERE, GROUP BY, ORDER BY e SQL -->
      <main class="db-qb__central">
        <!-- Joins -->
        <div class="db-qb__secao" *ngIf="joinsSugeridos().length > 0 || joinsManuais().length > 0">
          <h6><i class="bi bi-share"></i> Relacionamentos (JOINs)</h6>

          <!-- Joins sugeridos (automáticos) -->
          <div *ngIf="joinsSugeridos().length > 0" class="db-qb__joins-grupo">
            <h6 class="small text-muted mb-2">Sugeridos automaticamente</h6>
            <div *ngFor="let j of joinsSugeridos()" class="db-qb__join-card">
              <div class="db-qb__join-main">
                <span class="badge" [class.bg-primary]="j.confirmada" [class.bg-warning]="!j.confirmada">
                  {{ j.confirmada ? 'FK Confirmada' : 'Possível' }}
                </span>
                <code>{{ j.origem }}.{{ j.colunaOrigem }}</code>
                <i class="bi bi-arrow-right mx-2"></i>
                <code>{{ j.destino }}.{{ j.colunaDestino }}</code>
                <select class="form-select form-select-sm w-auto" [(ngModel)]="j.tipo" style="max-width: 100px;">
                  <option [ngValue]="'INNER'">INNER</option>
                  <option [ngValue]="'LEFT'">LEFT</option>
                </select>
              </div>
              <div class="db-qb__join-acoes">
                <button class="btn btn-sm btn-outline-primary" (click)="adicionarJoin(j)" [disabled]="joinJaAdicionado(j)">
                  <i class="bi bi-plus"></i> Adicionar
                </button>
                <button class="btn btn-sm btn-outline-secondary" (click)="removerJoinSugerido(j)">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Joins manuais adicionados -->
          <div *ngIf="joinsManuais().length > 0" class="db-qb__joins-grupo">
            <h6 class="small text-muted mb-2">Adicionados à consulta</h6>
            <div *ngFor="let j of joinsManuais()" class="db-qb__join-card db-qb__join-card--ativo">
              <div class="db-qb__join-main">
                <span class="badge bg-success">{{ j.tipo }} JOIN</span>
                <code>{{ j.origem }}.{{ j.colunaOrigem }}</code>
                <i class="bi bi-arrow-right mx-2"></i>
                <code>{{ j.destino }}.{{ j.colunaDestino }}</code>
              </div>
              <button class="btn btn-sm btn-outline-danger" (click)="removerJoinManual(j)">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>

          <!-- Adicionar join manual -->
          <div class="db-qb__join-manual" *ngIf="tabelasSelecionadas().length >= 2">
            <h6 class="small text-muted mb-2">Adicionar JOIN manual</h6>
            <div class="row g-2 align-items-end">
              <div class="col-md-3">
                <label class="form-label small">Tabela Origem</label>
                <select class="form-select form-select-sm" [(ngModel)]="joinManual.origem">
                  <option *ngFor="let t of tabelasSelecionadas()" [ngValue]="t.alias">{{ t.alias }} ({{ t.schema }}.{{ t.nome }})</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label small">Coluna Origem</label>
                <select class="form-select form-select-sm" [(ngModel)]="joinManual.colunaOrigem">
                  <option *ngFor="let c of colunasTabelaOrigem()" [ngValue]="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-3">
                <label class="form-label small">Tabela Destino</label>
                <select class="form-select form-select-sm" [(ngModel)]="joinManual.destino">
                  <option *ngFor="let t of tabelasSelecionadas()" [ngValue]="t.alias">{{ t.alias }} ({{ t.schema }}.{{ t.nome }})</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label small">Coluna Destino</label>
                <select class="form-select form-select-sm" [(ngModel)]="joinManual.colunaDestino">
                  <option *ngFor="let c of colunasTabelaDestino()" [ngValue]="c">{{ c }}</option>
                </select>
              </div>
              <div class="col-md-1">
                <label class="form-label small">Tipo</label>
                <select class="form-select form-select-sm" [(ngModel)]="joinManual.tipo">
                  <option [ngValue]="'INNER'">INNER</option>
                  <option [ngValue]="'LEFT'">LEFT</option>
                </select>
              </div>
            </div>
            <button class="btn btn-sm btn-outline-primary mt-2" (click)="adicionarJoinManual()">
              <i class="bi bi-plus"></i> Adicionar JOIN
            </button>
          </div>
        </div>

        <!-- WHERE -->
        <div class="db-qb__secao" *ngIf="tabelasSelecionadas().length > 0">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 style="margin:0"><i class="bi bi-funnel"></i> WHERE</h6>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" (click)="adicionarCondicao()">
                <i class="bi bi-plus"></i> Adicionar Condição
              </button>
              <button class="btn btn-sm btn-outline-secondary" (click)="adicionarGrupo()">
                <i class="bi bi-stack"></i> Grupo
              </button>
            </div>
          </div>

          <!-- Grupos WHERE -->
          <div *ngFor="let grupo of condicoesWhere(); let gi = index" class="db-qb__where-grupo">
            <div class="db-qb__where-grupo-header">
              <span class="badge" [class.bg-info]="grupo.conectorGrupo === 'AND'" [class.bg-warning]="grupo.conectorGrupo === 'OR'">
                {{ grupo.conectorGrupo }}
              </span>
              <button class="btn btn-sm btn-outline-danger" (click)="removerGrupo(gi)">
                <i class="bi bi-trash"></i>
              </button>
              <button class="btn btn-sm btn-outline-secondary" (click)="trocarConectorGrupo(gi)">
                <i class="bi bi-arrow-repeat"></i>
              </button>
            </div>
            <div class="db-qb__where-condicoes">
              <div *ngFor="let cond of grupo.condicoes; let ci = index" class="db-qb__where-row">
                <!-- Primeira condição não tem conector, as seguintes têm -->
                <span *ngIf="ci > 0" class="db-qb__where-conector">
                  <button class="btn btn-sm btn-outline-info btn-conector"
                    (click)="trocarConectorCondicao(gi, ci)">{{ cond.conector }}</button>
                </span>
                <span *ngIf="ci === 0" class="db-qb__where-conector db-qb__where-conector--vazio"></span>

                <select class="form-select form-select-sm" [(ngModel)]="cond.tabelaAlias">
                  <option *ngFor="let t of tabelasSelecionadas()" [ngValue]="t.alias">{{ t.alias }}</option>
                </select>
                <select class="form-select form-select-sm" [(ngModel)]="cond.coluna">
                  <option *ngFor="let c of colunasPorAlias(cond.tabelaAlias)" [ngValue]="c">{{ c }}</option>
                </select>
                <select class="form-select form-select-sm" [(ngModel)]="cond.operador">
                  <option *ngFor="let op of operadoresWhere" [ngValue]="op">{{ op }}</option>
                </select>
                <!-- Input de valor (ou dois para BETWEEN) -->
                <input *ngIf="cond.operador !== 'BETWEEN' && cond.operador !== 'IS NULL' && cond.operador !== 'IS NOT NULL'"
                  type="text" class="form-control form-control-sm"
                  [(ngModel)]="cond.valor" placeholder="Valor...">
                <div *ngIf="cond.operador === 'BETWEEN'" class="db-qb__between">
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="cond.valor" placeholder="Início">
                  <span class="text-muted">E</span>
                  <input type="text" class="form-control form-control-sm" [(ngModel)]="cond.valor2" placeholder="Fim">
                </div>
                <!-- IS NULL / IS NOT NULL não têm input -->
                <input *ngIf="cond.operador === 'IS NULL' || cond.operador === 'IS NOT NULL'" type="hidden" [(ngModel)]="cond.valor" value="">

                <button class="btn btn-sm btn-outline-danger" (click)="removerCondicao(gi, ci)">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- GROUP BY / HAVING -->
        <div class="db-qb__secao" *ngIf="tabelasSelecionadas().length > 0">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 style="margin:0"><i class="bi bi-arrow-repeat"></i> GROUP BY</h6>
            <button class="btn btn-sm btn-outline-primary" (click)="limparGroupBy()">
              <i class="bi bi-x"></i> Limpar
            </button>
          </div>
          <div class="db-qb__groupby">
            <div *ngFor="let t of tabelasSelecionadas()" class="db-qb__groupby-tabela">
              <strong class="small">{{ t.alias }}:</strong>
              <div class="db-qb__checkboxes">
                <label class="form-check form-check-inline" *ngFor="let c of t.colunas">
                  <input class="form-check-input" type="checkbox"
                    [checked]="colunasGroupBy().includes(t.alias + '.' + c.coluna)"
                    (change)="toggleColunaGroupBy(t.alias + '.' + c.coluna)">
                  <span class="form-check-label small">{{ c.coluna }}</span>
                </label>
              </div>
            </div>
          </div>
          <!-- Função de agregação -->
          <div class="db-qb__agregacao mt-2">
            <label class="form-label small">Função de Agregação:</label>
            <select class="form-select form-select-sm" [(ngModel)]="funcaoAgregacao">
              <option *ngFor="let fn of funcoesAgregacao" [ngValue]="fn">{{ fn }}</option>
            </select>
          </div>
          <!-- HAVING -->
          <div class="db-qb__having mt-2">
            <label class="form-label small">HAVING (condição pós-agregação):</label>
            <input type="text" class="form-control form-control-sm"
              [(ngModel)]="havingClause" placeholder="Ex: COUNT(*) > 1">
          </div>
        </div>

        <!-- ORDER BY -->
        <div class="db-qb__secao" *ngIf="tabelasSelecionadas().length > 0">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 style="margin:0"><i class="bi bi-arrow-down-up"></i> ORDER BY</h6>
            <button class="btn btn-sm btn-outline-primary" (click)="adicionarOrderBy()">
              <i class="bi bi-plus"></i> Adicionar Ordenação
            </button>
          </div>
          <div *ngFor="let ord of condicoesOrderBy(); let i = index" class="db-qb__orderby-row">
            <select class="form-select form-select-sm" [(ngModel)]="ord.coluna">
              <option *ngFor="let c of colunasDeTodasTabelas()" [ngValue]="c">{{ c }}</option>
            </select>
            <button class="btn btn-sm btn-outline-info" (click)="trocarDirecaoOrderBy(i)">
              {{ ord.direcao === 'ASC' ? 'ASC' : 'DESC' }}
            </button>
            <button class="btn btn-sm btn-outline-secondary" (click)="moverOrderByUp(i)" [disabled]="i === 0">
              <i class="bi bi-chevron-up"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" (click)="moverOrderByDown(i)" [disabled]="i === condicoesOrderBy().length - 1">
              <i class="bi bi-chevron-down"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" (click)="removerOrderBy(i)">
              <i class="bi bi-x"></i>
            </button>
          </div>
          <div *ngIf="condicoesOrderBy().length === 0" class="db-qb__vazio db-qb__vazio--pequeno">
            <span>Nenhuma ordenação definida</span>
          </div>
        </div>

        <!-- SQL Gerado -->
        <div class="db-qb__secao" *ngIf="sqlGerado()">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6><i class="bi bi-code"></i> SQL Gerado</h6>
            <button class="btn btn-sm btn-outline-secondary" (click)="copiarSQL()">
              <i class="bi bi-clipboard"></i> Copiar
            </button>
          </div>
          <pre class="db-qb__sql">{{ sqlGerado() }}</pre>
        </div>

        <!-- Preview dos dados (quando executado) -->
        <div *ngIf="resultado()" class="db-qb__secao mt-3">
          <h6><i class="bi bi-table"></i> Resultado</h6>
          <div *ngIf="!resultado()!.sucesso" class="alert alert-danger">
            <strong>Erro:</strong> {{ resultado()!.mensagemErro }}
          </div>
          <div *ngIf="resultado()!.sucesso">
            <div class="db-qb__meta mb-2">
              <span>{{ resultado()!.quantidadeRegistros }} registros</span>
              <span>{{ resultado()!.duracaoMs }} ms</span>
            </div>
            <div class="adm-table-wrap">
              <table class="adm-table">
                <thead><tr><th *ngFor="let c of resultado()!.colunas">{{ c }}</th></tr></thead>
                <tbody>
                  <tr *ngFor="let linha of resultado()!.linhas">
                    <td *ngFor="let celula of linha">{{ celula === null ? '—' : celula }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>

  <!-- Modal CTE -->
  <div class="modal fade show db-qb__modal-overlay" *ngIf="cteAberta" (click)="fecharModalCte()">
    <div class="modal-content db-qb__modal" (click)="$event.stopPropagation()">
      <div class="modal-header">
        <h5 class="modal-title">Nova CTE (Common Table Expression)</h5>
        <button class="btn btn-sm btn-outline-secondary" (click)="fecharModalCte()">
          <i class="bi bi-x"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="mb-3">
          <label class="form-label small">Nome da CTE</label>
          <input type="text" class="form-control" [(ngModel)]="cteNome" placeholder="Ex: vendas_mensais">
        </div>
        <div class="mb-3">
          <label class="form-label small">SQL da CTE</label>
          <textarea class="form-control" rows="4" [(ngModel)]="cteSql" placeholder="SELECT coluna1, coluna2 FROM tabela WHERE ..."></textarea>
        </div>
        <div class="mb-3">
          <label class="form-label small">Referenciar no SELECT principal</label>
          <select class="form-select" [(ngModel)]="cteReferencia">
            <option [ngValue]="true">Sim — incluir CTE no SELECT</option>
            <option [ngValue]="false">Não — apenas definir</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline-secondary btn-sm" (click)="fecharModalCte()">Cancelar</button>
        <button class="btn btn-primary btn-sm" (click)="salvarCte()">Salvar CTE</button>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .db-qb {
      padding: 1rem;
    }

    .db-qb__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .db-qb__header h4 {
      margin: 0;
      font-size: 1.1rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .db-qb__acoes {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      align-items: center;
    }

    .db-qb__limit-group {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.4rem;
      padding: 0.25rem 0.5rem;
    }

    .db-qb__limit-label {
      font-size: 0.72rem;
      font-weight: 600;
      color: #475569;
      white-space: nowrap;
    }

    .db-qb__limit-input {
      width: 70px;
      text-align: center;
    }

    .db-qb__layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 1rem;
    }

    .db-qb__lateral {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .db-qb__secao {
      margin-bottom: 1.5rem;
    }

    .db-qb__secao h6 {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      margin: 0 0 0.5rem;
    }

    .db-qb__vazio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.5rem;
      color: #64748b;
      text-align: center;
    }

    .db-qb__vazio--pequeno {
      padding: 0.75rem;
      font-size: 0.75rem;
    }

    .db-qb__vazio i {
      font-size: 2rem;
      color: #cbd5e1;
    }

    .db-qb__tabela-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.4rem;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .db-qb__tabela-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .db-qb__tabela-header strong {
      font-size: 0.85rem;
      color: #1e293b;
    }

    .db-qb__colunas {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      max-height: 150px;
      overflow-y: auto;
    }

    .db-qb__colunas .form-check {
      margin: 0;
    }

    .db-qb__colunas .form-check-label {
      font-size: 0.72rem;
      cursor: pointer;
    }

    .db-qb__lista-tabelas {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .db-qb__tabela-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.6rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 0.8rem;
    }

    .db-qb__tabela-item:hover:not(:disabled) {
      background: #dbeafe;
      border-color: #3b82f6;
    }

    .db-qb__tabela-item:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .db-qb__central {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      padding: 1rem;
      min-height: 500px;
    }

    .db-qb__joins-grupo {
      margin-bottom: 1rem;
    }

    .db-qb__join-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.4rem;
      margin-bottom: 0.35rem;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .db-qb__join-card--ativo {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .db-qb__join-main {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .db-qb__join-main code {
      font-size: 0.75rem;
    }

    .db-qb__join-acoes {
      display: flex;
      gap: 0.35rem;
    }

    .db-qb__join-manual {
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 0.4rem;
    }

    /* WHERE styles */
    .db-qb__where-grupo {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.4rem;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .db-qb__where-grupo-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .db-qb__where-condicoes {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .db-qb__where-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .db-qb__where-conector {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
    }

    .db-qb__where-conector--vazio {
      visibility: hidden;
    }

    .btn-conector {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      min-width: 45px;
    }

    .db-qb__between {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .db-qb__between .form-control-sm {
      width: 100px;
    }

    /* GROUP BY / HAVING styles */
    .db-qb__groupby {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .db-qb__groupby-tabela {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .db-qb__checkboxes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .db-qb__agregacao select,
    .db-qb__having input {
      max-width: 400px;
    }

    /* ORDER BY styles */
    .db-qb__orderby-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }

    .db-qb__orderby-row .form-select-sm {
      max-width: 250px;
    }

    /* CTE styles */
    .db-qb__cte-lista {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .db-qb__cte-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.6rem;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.35rem;
      font-size: 0.8rem;
    }

    .db-qb__modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.4);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .db-qb__modal {
      background: #fff;
      border-radius: 0.5rem;
      max-width: 600px;
      width: 90%;
      z-index: 1051;
    }

    .db-qb__sql {
      background: #0f172a;
      color: #e2e8f0;
      padding: 1rem;
      border-radius: 0.4rem;
      font-family: 'IBM Plex Mono', 'Cascadia Code', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      max-height: 300px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .db-qb__meta {
      display: flex;
      gap: 1.5rem;
      color: #475569;
      font-size: 0.85rem;
    }

    .adm-table-wrap {
      border-radius: 0.4rem;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    .adm-table {
      width: 100%;
      margin: 0;
      font-size: 0.82rem;
    }

    .adm-table th {
      background: #f8fafc;
      color: #6c757d;
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
      white-space: nowrap;
    }

    .adm-table td {
      padding: 0.5rem 0.75rem;
      vertical-align: middle;
      border-bottom: 1px solid #e2e8f0;
    }

    .adm-table tbody tr:hover {
      background: #f1f5f9;
    }

    @media (max-width: 992px) {
      .db-qb__layout {
        grid-template-columns: 1fr;
      }
      .db-qb__lateral {
        max-height: none;
      }
    }
  `]
})
export class DbQueryBuilderComponent implements OnInit {
  private readonly db = inject(DatabaseService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tabelasSelecionadas = signal<TabelaSelecionada[]>([]);
  readonly joinsManuais = signal<JoinConfig[]>([]);
  readonly joinsSugeridos = signal<JoinConfig[]>([]);
  readonly tabelasDisponiveis = signal<DatabaseTable[]>([]);
  readonly filtroTabelas = signal('');
  readonly sqlGerado = signal<string>('');
  readonly resultado = signal<any>(null);
  readonly carregando = signal(false);

  // LIMIT/TOP (propriedade regular para [(ngModel)])
  limitTop = 100;

  // WHERE
  readonly condicoesWhere = signal<GrupoWhere[]>([]);
  readonly operadoresWhere = ['=', '<>', '>', '<', '>=', '<=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL', 'BETWEEN'];

  // ORDER BY
  readonly condicoesOrderBy = signal<CondicaoOrderBy[]>([]);

  // GROUP BY / HAVING (propriedades regulares para [(ngModel)])
  readonly colunasGroupBy = signal<string[]>([]);
  readonly funcoesAgregacao = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
  funcaoAgregacao = 'COUNT';
  havingClause = '';

  // CTEs (propriedades regulares para [(ngModel)])
  readonly ctes = signal<CteConfig[]>([]);
  cteAberta = false;
  cteNome = '';
  cteSql = '';
  cteReferencia = true;

  joinManual: JoinConfig = {
    origem: '',
    destino: '',
    colunaOrigem: '',
    colunaDestino: '',
    tipo: 'INNER',
    confirmada: false
  };

  private aliasCounter = 0;

  ngOnInit(): void {
    this.carregarTabelasDisponiveis();

    // Verifica se veio com tabelas pré-selecionadas do TableDetail
    this.route.queryParams.subscribe(params => {
      if (params['builder'] === 'true') {
        const builderData = sessionStorage.getItem('db-query-builder-tables');
        if (builderData) {
          try {
            const tabelas = JSON.parse(builderData);
            for (const t of tabelas) {
              const [schema, nome] = t.split('.');
              this.adicionarTabelaPorNome(schema || 'dbo', nome);
            }
            sessionStorage.removeItem('db-query-builder-tables');
          } catch {}
        }
      }
    });
  }

  carregarTabelasDisponiveis(): void {
    this.db.listarTabelas().subscribe(t => this.tabelasDisponiveis.set(t));
  }

  readonly tabelasDisponiveisFiltradas = computed(() => {
    const filtro = this.filtroTabelas().toLowerCase();
    if (!filtro) return this.tabelasDisponiveis();
    return this.tabelasDisponiveis().filter(t =>
      t.nome.toLowerCase().includes(filtro) ||
      t.nomeCompleto.toLowerCase().includes(filtro)
    );
  });

  jaSelecionada(t: DatabaseTable): boolean {
    return this.tabelasSelecionadas().some(s => s.schema === t.schema && s.nome === t.nome);
  }

  adicionarTabela(): void {
    // Abre modal ou usa a lista lateral
  }

  adicionarTabelaExistente(t: DatabaseTable): void {
    this.adicionarTabelaPorNome(t.schema, t.nome);
  }

  adicionarTabelaPorNome(schema: string, nome: string): void {
    if (this.tabelasSelecionadas().length >= 5) return;
    if (this.jaSelecionada({ schema, nome, nomeCompleto: '', quantidadeRegistros: 0, quantidadeColunas: 0, quantidadeIndices: 0, quantidadeRelacionamentos: 0 } as any)) return;

    this.carregando.set(true);
    this.db.listarColunas(schema, nome).subscribe(colunas => {
      const alias = `t${++this.aliasCounter}`;
      this.tabelasSelecionadas.update(arr => [...arr, {
        schema,
        nome,
        alias,
        colunas,
        colunasSelecionadas: []
      }]);
      this.atualizarJoinsSugeridos();
      this.carregando.set(false);
    });
  }

  /**
   * Bug fix: renumerar aliases após remoção de tabela.
   * Após remover a tabela no índice `index`, todos os aliases
   * subsequentes são renumerados para manter a sequência contínua (t1, t2, t3...).
   */
  removerTabela(index: number): void {
    const tabelas = this.tabelasSelecionadas();
    if (index < 0 || index >= tabelas.length) return;

    const tabelaRemovida = tabelas[index];
    const novaLista = tabelas.filter((_, i) => i !== index);

    // Renumerar aliases para manter t1, t2, t3... sequencial
    const tabelasRenumeradas = novaLista.map((t, i) => {
      const novoAlias = `t${i + 1}`;
      if (t.alias === novoAlias) return t; // Já está correto
      return { ...t, alias: novoAlias };
    });

    this.tabelasSelecionadas.set(tabelasRenumeradas);

    // Atualizar joins manuais: remover referências ao alias removido e atualizar aliases renumerados
    const aliasAntigo = tabelaRemovida.alias;
    this.joinsManuais.update(joins =>
      joins
        .filter(j => j.origem !== aliasAntigo && j.destino !== aliasAntigo)
        .map(j => ({
          ...j,
          origem: tabelasRenumeradas.find(x => x.alias === j.origem)?.alias || j.origem,
          destino: tabelasRenumeradas.find(x => x.alias === j.destino)?.alias || j.destino
        }))
    );

    this.atualizarJoinsSugeridos();
  }

  toggleColuna(tabelaIndex: number, coluna: string): void {
    this.tabelasSelecionadas.update(arr => arr.map((t, i) => {
      if (i !== tabelaIndex) return t;
      const selecionadas = t.colunasSelecionadas;
      const idx = selecionadas.indexOf(coluna);
      if (idx >= 0) {
        return { ...t, colunasSelecionadas: selecionadas.filter(c => c !== coluna) };
      } else {
        return { ...t, colunasSelecionadas: [...selecionadas, coluna] };
      }
    }));
  }

  // ========== WHERE ==========

  adicionarCondicao(): void {
    const novoGrupo: GrupoWhere = {
      condicoes: [{
        coluna: '',
        tabelaAlias: this.tabelasSelecionadas()[0]?.alias || '',
        operador: '=',
        valor: '',
        valor2: '',
        conector: 'AND'
      }],
      conectorGrupo: 'AND'
    };
    this.condicoesWhere.update(arr => [...arr, novoGrupo]);
  }

  removerCondicao(grupoIndex: number, condicaoIndex: number): void {
    this.condicoesWhere.update(grupos => {
      const novosGrupos = [...grupos];
      const grupo = { ...novosGrupos[grupoIndex] };
      grupo.condicoes = grupo.condicoes.filter((_, i) => i !== condicaoIndex);
      if (grupo.condicoes.length === 0) {
        novosGrupos.splice(grupoIndex, 1);
      } else {
        novosGrupos[grupoIndex] = grupo;
      }
      return novosGrupos.length > 0 ? novosGrupos : [this.criarGrupoPadrao()];
    });
  }

  adicionarGrupo(): void {
    this.condicoesWhere.update(arr => [...arr, this.criarGrupoPadrao()]);
  }

  removerGrupo(index: number): void {
    this.condicoesWhere.update(grupos => {
      const novos = grupos.filter((_, i) => i !== index);
      return novos.length > 0 ? novos : [this.criarGrupoPadrao()];
    });
  }

  trocarConectorGrupo(index: number): void {
    this.condicoesWhere.update(grupos =>
      grupos.map((g, i) =>
        i === index ? { ...g, conectorGrupo: g.conectorGrupo === 'AND' ? 'OR' : 'AND' } : g
      )
    );
  }

  trocarConectorCondicao(grupoIndex: number, condicaoIndex: number): void {
    this.condicoesWhere.update(grupos =>
      grupos.map((g, gi) => {
        if (gi !== grupoIndex) return g;
        const condicoes = [...g.condicoes];
        if (condicaoIndex < condicoes.length) {
          condicoes[condicaoIndex] = {
            ...condicoes[condicaoIndex],
            conector: condicoes[condicaoIndex].conector === 'AND' ? 'OR' : 'AND'
          };
        }
        return { ...g, condicoes };
      })
    );
  }

  private criarGrupoPadrao(): GrupoWhere {
    return {
      condicoes: [{
        coluna: '',
        tabelaAlias: this.tabelasSelecionadas()[0]?.alias || '',
        operador: '=',
        valor: '',
        valor2: '',
        conector: 'AND'
      }],
      conectorGrupo: 'AND'
    };
  }

  colunasPorAlias(alias: string): string[] {
    const t = this.tabelasSelecionadas().find(x => x.alias === alias);
    return t ? t.colunas.map(c => c.coluna) : [];
  }

  // ========== ORDER BY ==========

  adicionarOrderBy(): void {
    const primeiraTabela = this.tabelasSelecionadas()[0];
    if (!primeiraTabela) return;
    this.condicoesOrderBy.update(arr => [
      ...arr,
      { coluna: '', tabelaAlias: primeiraTabela.alias, direcao: 'ASC' }
    ]);
  }

  removerOrderBy(index: number): void {
    this.condicoesOrderBy.update(arr => arr.filter((_, i) => i !== index));
  }

  trocarDirecaoOrderBy(index: number): void {
    this.condicoesOrderBy.update(arr =>
      arr.map((o, i) => i === index ? { ...o, direcao: o.direcao === 'ASC' ? 'DESC' : 'ASC' } : o)
    );
  }

  moverOrderByUp(index: number): void {
    if (index <= 0) return;
    this.condicoesOrderBy.update(arr => {
      const novos = [...arr];
      [novos[index - 1], novos[index]] = [novos[index], novos[index - 1]];
      return novos;
    });
  }

  moverOrderByDown(index: number): void {
    const arr = this.condicoesOrderBy();
    if (index >= arr.length - 1) return;
    this.condicoesOrderBy.update(arr => {
      const novos = [...arr];
      [novos[index], novos[index + 1]] = [novos[index + 1], novos[index]];
      return novos;
    });
  }

  // ========== GROUP BY / HAVING ==========

  toggleColunaGroupBy(colunaComAlias: string): void {
    this.colunasGroupBy.update(arr => {
      const idx = arr.indexOf(colunaComAlias);
      if (idx >= 0) {
        return arr.filter(c => c !== colunaComAlias);
      } else {
        return [...arr, colunaComAlias];
      }
    });
  }

  limparGroupBy(): void {
    this.colunasGroupBy.set([]);
    this.havingClause = '';
  }

  // ========== CTEs ==========

abrirModalCte(): void {
    this.cteNome = '';
    this.cteSql = '';
    this.cteReferencia = true;
    this.cteAberta = true;
  }

  fecharModalCte(): void {
    this.cteAberta = false;
  }

  salvarCte(): void {
    if (!this.cteNome.trim() || !this.cteSql.trim()) return;
    const cte: CteConfig = {
      nome: this.cteNome.trim(),
      sql: this.cteSql.trim()
    };
    this.ctes.update(arr => [...arr, cte]);
    this.fecharModalCte();
  }

  removerCte(index: number): void {
    this.ctes.update(arr => arr.filter((_, i) => i !== index));
  }

  // ========== Utilidades ==========

  readonly colunasTabelaOrigem = computed(() => {
    const t = this.tabelasSelecionadas().find(x => x.alias === this.joinManual.origem);
    return t ? t.colunas.map(c => c.coluna) : [];
  });

  readonly colunasTabelaDestino = computed(() => {
    const t = this.tabelasSelecionadas().find(x => x.alias === this.joinManual.destino);
    return t ? t.colunas.map(c => c.coluna) : [];
  });

  readonly colunasDeTodasTabelas = computed(() => {
    const cols: string[] = [];
    for (const t of this.tabelasSelecionadas()) {
      for (const c of t.colunas) {
        cols.push(`${t.alias}.${c.coluna}`);
      }
    }
    return cols;
  });

  getSchemaByAlias(alias: string): string {
    const t = this.tabelasSelecionadas().find(x => x.alias === alias);
    return t?.schema || 'dbo';
  }

  getNomeByAlias(alias: string): string {
    const t = this.tabelasSelecionadas().find(x => x.alias === alias);
    return t?.nome || '';
  }

  atualizarJoinsSugeridos(): void {
    const tabelas = this.tabelasSelecionadas();
    if (tabelas.length < 2) {
      this.joinsSugeridos.set([]);
      return;
    }

    const sugestoes: JoinConfig[] = [];
    for (let i = 0; i < tabelas.length; i++) {
      for (let j = i + 1; j < tabelas.length; j++) {
        const t1 = tabelas[i];
        const t2 = tabelas[j];
        this.db.relacionamentos(t1.schema, true, 100).subscribe(rels => {
          for (const rel of rels) {
            if ((rel.tabelaOrigem === `${t1.schema}.${t1.nome}` && rel.tabelaDestino === `${t2.schema}.${t2.nome}`) ||
                (rel.tabelaOrigem === `${t2.schema}.${t2.nome}` && rel.tabelaDestino === `${t1.schema}.${t1.nome}`)) {
              const origem = rel.tabelaOrigem === `${t1.schema}.${t1.nome}` ? t1.alias : t2.alias;
              const destino = rel.tabelaOrigem === `${t1.schema}.${t1.nome}` ? t2.alias : t1.alias;
              const colOrigem = rel.tabelaOrigem === `${t1.schema}.${t1.nome}` ? rel.colunaOrigem : rel.colunaDestino;
              const colDestino = rel.tabelaOrigem === `${t1.schema}.${t1.nome}` ? rel.colunaDestino : rel.colunaOrigem;

              sugestoes.push({
                origem,
                destino,
                colunaOrigem: colOrigem,
                colunaDestino: colDestino,
                tipo: rel.tipo === 'Confirmada' ? 'INNER' : 'LEFT',
                confirmada: rel.tipo === 'Confirmada'
              });
            }
          }
          this.joinsSugeridos.set([...sugestoes]);
        });
      }
    }
  }

  joinJaAdicionado(j: JoinConfig): boolean {
    return this.joinsManuais().some(m =>
      m.origem === j.origem && m.destino === j.destino &&
      m.colunaOrigem === j.colunaOrigem && m.colunaDestino === j.colunaDestino
    );
  }

  adicionarJoin(j: JoinConfig): void {
    if (this.joinJaAdicionado(j)) return;
    this.joinsManuais.update(arr => [...arr, { ...j }]);
  }

  adicionarJoinManual(): void {
    if (!this.joinManual.origem || !this.joinManual.destino ||
        !this.joinManual.colunaOrigem || !this.joinManual.colunaDestino) return;
    if (this.joinManual.origem === this.joinManual.destino) return;

    this.joinsManuais.update(arr => [...arr, { ...this.joinManual }]);
    this.joinManual = { origem: '', destino: '', colunaOrigem: '', colunaDestino: '', tipo: 'INNER', confirmada: false };
  }

  removerJoinManual(j: JoinConfig): void {
    this.joinsManuais.update(arr => arr.filter(m => m !== j));
  }

  removerJoinSugerido(j: JoinConfig): void {
    this.joinsSugeridos.update(arr => arr.filter(s => s !== j));
  }

  // ========== GERAR SQL ==========

  gerarSQL(): void {
    const tabelas = this.tabelasSelecionadas();
    if (tabelas.length === 0) return;

    const joins = this.joinsManuais();
    const ctes = this.ctes();
    const where = this.condicoesWhere();
    const orderBy = this.condicoesOrderBy();
    const groupBy = this.colunasGroupBy();
    const having = this.havingClause;
    const limitTop = this.limitTop;

    let sql = '';

    // WITH (CTEs)
    if (ctes.length > 0) {
      const cteClauses = ctes.map(cte => `${cte.nome} AS (${cte.sql})`).join(',\n');
      sql += `WITH ${cteClauses}\n`;
    }

    // SELECT
    const primeiraTabela = tabelas[0];

    if (tabelas.length === 1) {
      const t = tabelas[0];
      const cols = t.colunasSelecionadas.length > 0
        ? t.colunasSelecionadas.map(c => `${t.alias}.[${c}]`).join(', ')
        : `${t.alias}.*`;
      sql += `SELECT ${cols}\nFROM [${t.schema}].[${t.nome}] ${t.alias}`;
    } else {
      // Múltiplas tabelas com JOINs
      const cols = tabelas.flatMap(t =>
        t.colunasSelecionadas.length > 0
          ? t.colunasSelecionadas.map(c => `${t.alias}.[${c}]`)
          : [`${t.alias}.*`]
      ).join(', ');

      sql += `SELECT ${cols}\nFROM [${primeiraTabela.schema}].[${primeiraTabela.nome}] ${primeiraTabela.alias}`;

      for (const j of joins) {
        sql += `\n${j.tipo} JOIN [${this.getSchemaByAlias(j.destino)}].[${this.getNomeByAlias(j.destino)}] ${j.destino}
  ON ${j.origem}.[${j.colunaOrigem}] = ${j.destino}.[${j.colunaDestino}]`;
      }
    }

    // WHERE
    if (where.length > 0) {
      const whereClauses = where.map(grupo => {
        const condicoesStr = grupo.condicoes.map(c => {
          let valorStr = c.valor;
          if (c.operador === 'BETWEEN') {
            return `${c.tabelaAlias}.[${c.coluna}] ${c.operador} '${c.valor}' AND '${c.valor2 || ''}'`;
          }
          if (c.operador === 'IS NULL' || c.operador === 'IS NOT NULL') {
            return `${c.tabelaAlias}.[${c.coluna}] ${c.operador}`;
          }
          if (c.operador === 'IN') {
            return `${c.tabelaAlias}.[${c.coluna}] ${c.operador} (${c.valor})`;
          }
          return `${c.tabelaAlias}.[${c.coluna}] ${c.operador} '${valorStr}'`;
        });
        const grupoStr = condicoesStr.join(` ${grupo.conectorGrupo} `);
        return `(${grupoStr})`;
      });
      sql += `\nWHERE ${whereClauses.join('\n  ')}`;
    }

    // GROUP BY
    if (groupBy.length > 0) {
      sql += `\nGROUP BY ${groupBy.map(gb => gb).join(', ')}`;
    }

    // HAVING
    if (having) {
      sql += `\nHAVING ${having}`;
    }

    // ORDER BY
    if (orderBy.length > 0) {
      const orderClauses = orderBy.map(o => {
        const alias = o.tabelaAlias;
        const col = o.coluna;
        return `${alias}.[${col}] ${o.direcao}`;
      });
      sql += `\nORDER BY ${orderClauses.join(', ')}`;
    }

    // LIMIT/TOP
    // Se já usou SELECT TOP na primeira tabela, substituir; senão adicionar
    if (limitTop > 0) {
      // Verifica se a query já começa com SELECT TOP
      if (ctes.length > 0) {
        // Com CTE, adiciona TOP após SELECT
        sql = sql.replace('SELECT ', `SELECT TOP ${limitTop} `);
      } else if (tabelas.length === 1) {
        // Substitui SELECT por SELECT TOP
        sql = sql.replace('SELECT ', `SELECT TOP ${limitTop} `);
      } else {
        sql += `\nOFFSET 0 ROWS FETCH NEXT ${limitTop} ROWS ONLY`;
      }
    }

    this.sqlGerado.set(sql);
  }

  executarSQL(): void {
    const sql = this.sqlGerado();
    if (!sql) return;
    this.carregando.set(true);
    this.db.executarQuery({ sql, limite: this.limitTop, timeoutSegundos: 30 }).subscribe({
      next: r => { this.resultado.set(r); this.carregando.set(false); },
      error: () => { this.resultado.set({ sucesso: false, mensagemErro: 'Falha ao executar' }); this.carregando.set(false); }
    });
  }

  copiarSQL(): void {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(this.sqlGerado());
    }
  }

  limpar(): void {
    this.tabelasSelecionadas.set([]);
    this.joinsManuais.set([]);
    this.joinsSugeridos.set([]);
    this.sqlGerado.set('');
    this.resultado.set(null);
    this.aliasCounter = 0;
    this.condicoesWhere.set([]);
    this.condicoesOrderBy.set([]);
    this.colunasGroupBy.set([]);
    this.havingClause = '';
    this.limitTop = 100;
    this.ctes.set([]);
  }
}
