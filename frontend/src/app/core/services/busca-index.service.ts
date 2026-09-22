import { Injectable } from '@angular/core';
import { ferramentas } from '@features/ferramentas/ferramentas.data';
import { todosCursos, trilhas } from '@features/cursos/cursos-novos.data';
import { bibliotecaSql } from '@features/trilha-sql/biblioteca-sql.data';
import { todosProcedimentos } from '@features/visao-adm/data/procedimentos.data';
import { utilidades } from '@features/visao-adm/data/utilidades.data';
import { POLITICA_INTERNA } from '@features/politica/politica.data';
import { CAPITULOS } from '@features/empresa/onboarding/onboarding-data';

export interface ResultadoBusca {
  titulo: string;
  tipo: string;
  rota: string;
  icone: string;
}

interface EntradaIndice extends ResultadoBusca {
  busca: string;
}

const PAGINAS: ResultadoBusca[] = [
  { titulo: 'Resolver um problema', tipo: 'Atendimento', rota: '/trilhas/resolver', icone: 'bi-compass' },
  { titulo: 'Fraseologias de atendimento', tipo: 'Atendimento', rota: '/fraseologia', icone: 'bi-diagram-3' },
  { titulo: 'Modelo de chamado', tipo: 'Atendimento', rota: '/modelo-chamados', icone: 'bi-file-earmark-text' },
  { titulo: 'SQL — biblioteca de consultas', tipo: 'Atendimento', rota: '/trilhas/sql', icone: 'bi-database' },
  { titulo: 'Dicas de Rede', tipo: 'Atendimento', rota: '/trilhas/rede', icone: 'bi-diagram-3' },
  { titulo: 'Dicas de Infra', tipo: 'Atendimento', rota: '/trilhas/infra', icone: 'bi-hdd-network' },
  { titulo: 'Kanban Total', tipo: 'Implantação', rota: '/implantacao/kanban', icone: 'bi-kanban' },
  { titulo: 'Projetos', tipo: 'Implantação', rota: '/implantacao/projetos', icone: 'bi-folder2-open' },
  { titulo: 'Tarefas', tipo: 'Implantação', rota: '/implantacao/tarefas', icone: 'bi-list-check' },
  { titulo: 'Visão geral da Implantação', tipo: 'Implantação', rota: '/implantacao/dashboard', icone: 'bi-bar-chart-fill' },
  { titulo: 'Banco de Dados', tipo: 'Ferramenta', rota: '/database', icone: 'bi-hdd-network' },
  { titulo: 'Acessos das empresas', tipo: 'Ferramenta', rota: '/ferramentas/acessos', icone: 'bi-building' },
  { titulo: 'Central de Utilidades', tipo: 'Ferramenta', rota: '/ferramentas', icone: 'bi-tools' },
  { titulo: 'Agenda', tipo: 'Ferramenta', rota: '/agenda', icone: 'bi-calendar-week' },
  { titulo: 'JOTA — assistente', tipo: 'Ferramenta', rota: '/chat', icone: 'bi-chat-dots' },
  { titulo: 'FAQ', tipo: 'Conhecimento', rota: '/ferramentas/faq', icone: 'bi-question-circle' },
  { titulo: 'Stack', tipo: 'Conhecimento', rota: '/stack', icone: 'bi-stack' },
  { titulo: 'Cursos', tipo: 'Conhecimento', rota: '/cursos', icone: 'bi-mortarboard' },
  { titulo: 'Procedimentos', tipo: 'JCA', rota: '/visao-adm', icone: 'bi-clipboard-data' },
  { titulo: 'Políticas internas', tipo: 'JCA', rota: '/politica', icone: 'bi-file-earmark-text' },
  { titulo: 'Onboarding corporativo', tipo: 'JCA', rota: '/empresa/onboarding', icone: 'bi-rocket-takeoff' }
];

function normalizar(texto: string): string {
  return (texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Índice de busca local: agrega todos os acervos estáticos + páginas
 * em um índice pesquisável no browser. Funcional de verdade, sem
 * backend e sem resultados fictícios.
 */
@Injectable({ providedIn: 'root' })
export class BuscaIndexService {
  private indice: EntradaIndice[] | null = null;

  buscar(termo: string, limite = 8): ResultadoBusca[] {
    const termos = normalizar(termo).split(/\s+/).filter(t => t.length > 1);
    const base = this.getIndice();
    if (!termos.length) return base.slice(0, limite).map(({ busca: _b, ...r }) => r);
    return base
      .filter(e => termos.every(t => e.busca.includes(t)))
      .slice(0, limite)
      .map(({ busca: _b, ...r }) => r);
  }

  private getIndice(): EntradaIndice[] {
    if (!this.indice) this.indice = this.construir();
    return this.indice;
  }

  private entrar(r: ResultadoBusca, textos: (string | undefined)[]): EntradaIndice {
    return { ...r, busca: normalizar([r.titulo, r.tipo, ...textos].filter(Boolean).join(' ')) };
  }

  private construir(): EntradaIndice[] {
    const out: EntradaIndice[] = PAGINAS.map(p => this.entrar(p, []));

    for (const f of ferramentas) {
      out.push(this.entrar(
        { titulo: f.nome, tipo: 'Ferramenta', rota: `/ferramentas/detalhe/${f.id}`, icone: 'bi-tools' },
        [f.descricao, f.categoria, (f.tags ?? []).join(' ')]
      ));
    }
    for (const c of todosCursos) {
      out.push(this.entrar(
        { titulo: c.titulo, tipo: 'Curso', rota: `/cursos/detalhe/${c.id}`, icone: 'bi-mortarboard' },
        [c.descricao, c.categoria, c.plataforma, c.autor, c.nivel, (c.tags ?? []).join(' '), (c.tecnologiasRelacionadas ?? []).join(' ')]
      ));
    }
    for (const t of trilhas) {
      out.push(this.entrar(
        { titulo: t.nome, tipo: 'Trilha', rota: '/cursos', icone: 'bi-signpost-2' },
        [t.descricao]
      ));
    }
    for (const cat of bibliotecaSql) {
      for (const q of cat.consultas) {
        out.push(this.entrar(
          { titulo: q.titulo, tipo: 'SQL', rota: '/trilhas/sql', icone: 'bi-code-slash' },
          [q.descricao, cat.nome, q.sql]
        ));
      }
    }
    for (const p of todosProcedimentos) {
      const extras = [
        p.resumo, p.objetivo, p.categoria,
        (p.tags ?? []).join(' '),
        (p.quandoUtilizar ?? []).join(' '),
        (p.errosComuns ?? []).map(e => `${e.problema ?? ''} ${e.solucao ?? ''}`).join(' '),
        (p.faq ?? []).map(f => `${f.pergunta ?? ''} ${f.resposta ?? ''}`).join(' ')
      ];
      out.push(this.entrar(
        { titulo: p.titulo, tipo: 'Procedimento', rota: `/visao-adm/detalhe/${p.id}`, icone: 'bi-clipboard-data' },
        extras
      ));
    }
    for (const u of utilidades) {
      out.push(this.entrar(
        { titulo: u.nome, tipo: 'Utilidade', rota: '/visao-adm', icone: 'bi-grid' },
        [u.descricao, u.categoria, (u.tags ?? []).join(' ')]
      ));
    }
    for (const secao of POLITICA_INTERNA.secoes) {
      for (const item of secao.itens) {
        out.push(this.entrar(
          { titulo: item.titulo, tipo: 'Política', rota: '/politica', icone: 'bi-file-earmark-text' },
          [item.detalhe, secao.titulo]
        ));
      }
    }
    for (const cap of CAPITULOS) {
      out.push(this.entrar(
        { titulo: cap.titulo, tipo: 'Onboarding', rota: `/empresa/onboarding/capitulo/${cap.id}`, icone: 'bi-rocket-takeoff' },
        [cap.subtitulo]
      ));
    }
    return out;
  }
}
