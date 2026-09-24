import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface ItemRecente {
  rota: string;
  titulo: string;
  tipo: string;
  acessadoEm: string;
  usos: number;
}

const CHAVE = 'cc.recentes.v1';
const MAX_ITENS = 30;

/** Rótulos por prefixo de rota (mesma base do breadcrumb do header). */
const TITULOS: { prefixo: string; titulo: string; tipo: string }[] = [
  { prefixo: '/agenda', titulo: 'Agenda', tipo: 'Ferramenta' },
  { prefixo: '/implantacao/kanban', titulo: 'Kanban', tipo: 'Implantação' },
  { prefixo: '/implantacao/projetos', titulo: 'Projetos', tipo: 'Implantação' },
  { prefixo: '/implantacao/tarefas', titulo: 'Tarefas', tipo: 'Implantação' },
  { prefixo: '/implantacao/dashboard', titulo: 'Visão geral da Implantação', tipo: 'Implantação' },
  { prefixo: '/implantacao', titulo: 'Implantação', tipo: 'Implantação' },
  { prefixo: '/database', titulo: 'Banco de Dados', tipo: 'Ferramenta' },
  { prefixo: '/ferramentas/acessos', titulo: 'Acessos', tipo: 'Ferramenta' },
  { prefixo: '/ferramentas/faq', titulo: 'FAQ', tipo: 'Conhecimento' },
  { prefixo: '/ferramentas/detalhe', titulo: 'Detalhe da Ferramenta', tipo: 'Ferramenta' },
  { prefixo: '/ferramentas', titulo: 'Central de Utilidades', tipo: 'Ferramenta' },
  { prefixo: '/trilhas/resolver', titulo: 'Resolver um problema', tipo: 'Atendimento' },
  { prefixo: '/trilhas/sql', titulo: 'SQL', tipo: 'Atendimento' },
  { prefixo: '/trilhas/rede', titulo: 'Rede', tipo: 'Atendimento' },
  { prefixo: '/trilhas/infra', titulo: 'Infra', tipo: 'Atendimento' },
  { prefixo: '/fraseologia', titulo: 'Fraseologias', tipo: 'Atendimento' },
  { prefixo: '/modelo-chamados', titulo: 'Modelo de chamados', tipo: 'Atendimento' },
  { prefixo: '/cursos/detalhe', titulo: 'Detalhe do Curso', tipo: 'Conhecimento' },
  { prefixo: '/cursos', titulo: 'Cursos', tipo: 'Conhecimento' },
  { prefixo: '/stack', titulo: 'Stack', tipo: 'Conhecimento' },
  { prefixo: '/visao-adm/detalhe', titulo: 'Detalhe do Procedimento', tipo: 'JCA' },
  { prefixo: '/visao-adm', titulo: 'Procedimentos', tipo: 'JCA' },
  { prefixo: '/empresa/onboarding', titulo: 'Onboarding', tipo: 'JCA' },
  { prefixo: '/politica', titulo: 'Políticas', tipo: 'JCA' }
];

/**
 * Registra navegação real (sem dados mockados): "Continue de onde parou"
 * e "Mais utilizados" partem vazios e aprendem com o uso.
 */
@Injectable({ providedIn: 'root' })
export class RecentesService {
  private readonly router = inject(Router);
  private readonly itens$ = new BehaviorSubject<ItemRecente[]>(this.ler());
  readonly mudancas$ = this.itens$.asObservable();

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.registrar(e.urlAfterRedirects));
  }

  recentes(limite = 6): ItemRecente[] {
    return [...this.itens$.value]
      .sort((a, b) => b.acessadoEm.localeCompare(a.acessadoEm))
      .slice(0, limite);
  }

  maisUtilizados(limite = 6): ItemRecente[] {
    return [...this.itens$.value]
      .sort((a, b) => b.usos - a.usos || b.acessadoEm.localeCompare(a.acessadoEm))
      .slice(0, limite);
  }

  private registrar(url: string): void {
    const rota = (url.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';
    if (rota === '/' || rota === '/login') return;
    const meta = TITULOS.filter(t => rota === t.prefixo || rota.startsWith(t.prefixo + '/'))
      .sort((a, b) => b.prefixo.length - a.prefixo.length)[0];
    if (!meta) return;

    const agora = new Date().toISOString();
    const lista = this.ler();
    const existente = lista.find(i => i.rota === rota);
    if (existente) {
      existente.acessadoEm = agora;
      existente.usos += 1;
    } else {
      lista.push({ rota, titulo: meta.titulo, tipo: meta.tipo, acessadoEm: agora, usos: 1 });
    }
    this.salvar(lista.slice(-MAX_ITENS));
  }

  private ler(): ItemRecente[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(CHAVE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  private salvar(lista: ItemRecente[]): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(CHAVE, JSON.stringify(lista));
    } catch { /* armazenamento indisponível: segue sem persistir */ }
    this.itens$.next(lista);
  }
}
