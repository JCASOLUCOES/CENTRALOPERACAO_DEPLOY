import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AdminDashboardService, AdminDashboardDto } from '@features/admin/services/admin-dashboard.service';
import { DashboardService } from '@features/implantacao/services/dashboard.service';
import { ProjetosService } from '@features/implantacao/services/projetos.service';
import { TarefasService } from '@features/implantacao/services/tarefas.service';
import { AgendaService, AgendaResumo } from '@features/agenda/services/agenda.service';
import type { DashboardGeral } from '@features/implantacao/models/dashboard.model';
import type { ProjetoResumo } from '@features/implantacao/models/projeto.model';
import type { TarefaResumo } from '@features/implantacao/models/tarefa.model';
import { MODULOS_REGISTRY } from '../data/modulos.registry';
import type { AlertaCritico, EquipeResumo, KpiResumo, ModuloResumo, ResumoExecutivo } from '../models/executivo.model';

const STATUS_FINAL = new Set(['Concluida', 'Concluido', 'Cancelada', 'Cancelado']);

function ehFinal(status?: string): boolean {
  return !!status && STATUS_FINAL.has(status);
}

@Injectable({ providedIn: 'root' })
export class ExecutivoDashboardService {
  private readonly admin = inject(AdminDashboardService);
  private readonly implantacao = inject(DashboardService);
  private readonly projetos = inject(ProjetosService);
  private readonly tarefas = inject(TarefasService);
  private readonly agenda = inject(AgendaService);

  obter(funcaoId?: number): Observable<ResumoExecutivo> {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

    return forkJoin({
      admin: this.admin.obter(funcaoId).pipe(catchError(() => of(null as AdminDashboardDto | null))),
      geral: this.implantacao.obter().pipe(catchError(() => of(null as DashboardGeral | null))),
      projetos: this.projetos.listar({}).pipe(catchError(() => of([] as ProjetoResumo[]))),
      tarefas: this.tarefas.listar({}).pipe(catchError(() => of([] as TarefaResumo[]))),
      agenda: this.agenda
        .listarEventos(agora.toISOString(), fim.toISOString(), undefined, funcaoId ?? undefined)
        .pipe(catchError(() => of([] as AgendaResumo[])))
    }).pipe(map(({ admin, geral, projetos, tarefas, agenda }) => this.montar(admin, geral, projetos, tarefas, agenda)));
  }

  private montar(
    admin: AdminDashboardDto | null,
    geral: DashboardGeral | null,
    projetos: ProjetoResumo[],
    tarefas: TarefaResumo[],
    agenda: AgendaResumo[]
  ): ResumoExecutivo {
    const abertas = tarefas.filter(t => !ehFinal(t.status));
    const bloqueadas = abertas.filter(t => t.bloqueada);
    const urgentes = abertas.filter(t => t.prioridade === 3);

    const total = admin?.totalTarefas ?? tarefas.length;
    const andamento = admin?.emAndamento ?? abertas.length;
    const concluidas = admin?.concluidas ?? tarefas.filter(t => !ehFinal(t.status) === false).length;
    const atrasadas = admin?.atrasadas ?? 0;

    const kpis: KpiResumo[] = [
      { chave: 'total', rotulo: 'Total de tarefas', valor: total, icone: 'bi-grid-3x3-gap', cor: '#0f4c81', fundo: 'rgba(15, 76, 129, 0.12)', rota: '/implantacao/tarefas' },
      { chave: 'andamento', rotulo: 'Em andamento', valor: andamento, icone: 'bi-hourglass-split', cor: '#d97706', fundo: 'rgba(217, 119, 6, 0.12)', rota: '/implantacao/tarefas', queryParams: { apenasEmAndamento: 'true' } },
      { chave: 'concluidas', rotulo: 'Concluídas', valor: concluidas, icone: 'bi-check-circle', cor: '#16a34a', fundo: 'rgba(22, 163, 74, 0.12)', rota: '/implantacao/tarefas', queryParams: { apenasConcluidas: 'true' } },
      { chave: 'atrasadas', rotulo: 'Atrasadas', valor: atrasadas, icone: 'bi-exclamation-triangle', cor: '#dc2626', fundo: 'rgba(220, 38, 38, 0.12)', rota: '/implantacao/tarefas', queryParams: { apenasAtrasadas: 'true' } },
      { chave: 'bloqueadas', rotulo: 'Bloqueadas', valor: bloqueadas.length, icone: 'bi-lock', cor: '#7c3aed', fundo: 'rgba(124, 58, 237, 0.12)', rota: '/implantacao/kanban' },
      { chave: 'urgentes', rotulo: 'Urgentes', valor: urgentes.length, icone: 'bi-lightning-charge', cor: '#ea580c', fundo: 'rgba(234, 88, 12, 0.12)', rota: '/implantacao/tarefas' }
    ];

    const tarefasImplantacao = total;
    const modulos: ModuloResumo[] = MODULOS_REGISTRY.map(m => {
      if (m.chave === 'implantacao') {
        return {
          chave: m.chave, titulo: m.titulo, descricao: m.descricao, icone: m.icone,
          cor: m.cor, rota: m.rota, botao: m.botao,
          tarefas: tarefasImplantacao, atrasadas, bloqueadas: bloqueadas.length,
          extra: `${geral?.kpis.projetosAtivos ?? 0} projetos ativos`
        };
      }
      if (m.chave === 'financeiro') {
        return {
          chave: m.chave, titulo: m.titulo, descricao: m.descricao, icone: m.icone,
          cor: m.cor, rota: m.destinoEmBreve ?? m.rota, botao: m.botao,
          tarefas: 0, atrasadas: 0, bloqueadas: 0,
          extra: 'Conteúdo interno · sem pendências operacionais',
          emBreve: true
        };
      }
      return {
        chave: m.chave, titulo: m.titulo, descricao: m.descricao, icone: m.icone,
        cor: m.cor, rota: m.rota, botao: m.botao,
        tarefas: 0, atrasadas: 0, bloqueadas: 0, emBreve: true
      };
    });

    const equipes: EquipeResumo[] = (admin?.funcoes ?? []).map(f => ({
      ...f,
      percentualConclusao: f.total > 0 ? Math.round((f.concluidas / f.total) * 100) : 0
    }));

    const alertas: AlertaCritico[] = [];
    if (bloqueadas.length > 0) {
      alertas.push({
        tipo: 'bloqueada', titulo: `${bloqueadas.length} tarefa(s) bloqueada(s)`,
        detalhe: this.descreverTarefas(bloqueadas), quantidade: bloqueadas.length,
        rota: '/implantacao/kanban'
      });
    }
    if (atrasadas > 0) {
      alertas.push({
        tipo: 'atrasada', titulo: `${atrasadas} tarefa(s) atrasada(s)`,
        detalhe: 'Revise prazos e prioridades com os responsáveis.',
        quantidade: atrasadas, rota: '/implantacao/tarefas',
        queryParams: { apenasAtrasadas: 'true' }
      });
    }
    if (urgentes.length > 0) {
      alertas.push({
        tipo: 'urgente', titulo: `${urgentes.length} tarefa(s) urgente(s) em aberto`,
        detalhe: this.descreverTarefas(urgentes), quantidade: urgentes.length,
        rota: '/implantacao/tarefas'
      });
    }
    if (alertas.length === 0) {
      alertas.push({
        tipo: 'ok', titulo: 'Tudo em dia',
        detalhe: 'Nenhuma tarefa bloqueada, atrasada ou urgente no momento.',
        quantidade: 0, rota: '/implantacao/dashboard'
      });
    }

    const criticas = [...bloqueadas, ...urgentes.filter(u => !u.bloqueada)]
      .sort((a, b) => (a.dataPrevisao ?? '').localeCompare(b.dataPrevisao ?? ''))
      .slice(0, 6);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const projetosTop = projetos
      .filter(p => !ehFinal(p.status))
      .sort((a, b) => {
        const aAtrasado = (a.dataPrevisao && new Date(a.dataPrevisao) < hoje ? 0 : 1) as number;
        const bAtrasado = (b.dataPrevisao && new Date(b.dataPrevisao) < hoje ? 0 : 1) as number;
        if (aAtrasado !== bAtrasado) return aAtrasado - bAtrasado;
        return (a.dataPrevisao ?? '').localeCompare(b.dataPrevisao ?? '');
      })
      .slice(0, 6);

    return {
      kpis,
      modulos,
      equipes,
      alertas,
      proximasEntregas: geral?.proximosPrazo ?? [],
      projetosTop,
      tarefasCriticas: criticas,
      agendaSemana: agenda.slice(0, 6),
      atualizadoEm: admin?.atualizadoEm ?? new Date().toISOString(),
      projetosAtivos: geral?.kpis.projetosAtivos ?? 0,
      projetosAtrasados: geral?.kpis.projetosAtrasados ?? 0,
      horasApontadas: geral?.kpis.horasApontadas ?? 0
    };
  }

  private descreverTarefas(lista: TarefaResumo[]): string {
    const nomes = lista.slice(0, 3).map(t => `#${t.id} ${t.titulo}`);
    const resto = lista.length > 3 ? ` e mais ${lista.length - 3}` : '';
    return nomes.length ? `${nomes.join(' · ')}${resto}` : 'Verifique o Kanban e reatribua se necessário.';
  }
}
