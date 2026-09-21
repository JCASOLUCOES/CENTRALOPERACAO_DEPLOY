import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PapelUsuarioService } from '../../core/services/papel-usuario.service';

interface SidebarLink {
  label: string;
  route: string;
  icone: string;
  badge?: string;
  /** Dica exibida no tooltip (Corretor #7: clareza Resolver vs Executar). */
  dica?: string;
  /** Query parameters para a rota. */
  queryParams?: Record<string, string>;
}

interface SidebarGrupo {
  rotulo: string;
  icone: string;
  badge?: string;
  itens: SidebarLink[];
}

interface SidebarSection {
  title: string;
  subtitle: string;
  links?: SidebarLink[];
  grupos?: SidebarGrupo[];
}

const LINK_KANBAN_ADM = {
  label: 'Kanban ADM',
  route: '/administrativo',
  icone: 'bi-kanban-fill'
};

const LINK_CENTRAL_EXECUTIVA = {
  label: 'Central Executiva',
  route: '/executivo',
  icone: 'bi-speedometer2'
};

const LINK_GESTAO_CENTRAL = {
  label: 'Gestão da Central',
  route: '/admin/dashboard',
  icone: 'bi-shield-lock-fill'
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private auth = inject(AuthService);
  readonly papelSvc = inject(PapelUsuarioService);

  @Input() collapsed = false;

  readonly gruposExpandidos = new Set<string>(['Atendimento']);

  sections: SidebarSection[] = [
    {
      title: 'Início',
      subtitle: 'Comece por aqui',
      links: [
        ...(this.ehAdministrador() ? [LINK_CENTRAL_EXECUTIVA] : []),
        { label: 'Visão Geral', route: '/', icone: 'bi-house-fill' },
        { label: 'Agenda', route: '/agenda', icone: 'bi-calendar-week-fill' }
      ]
    },
    {
      title: 'SUPORTE',
      subtitle: 'Resolver problemas',
      grupos: [
        {
          rotulo: 'Atendimento',
          icone: 'bi-headset',
          itens: [
            { label: 'Modelo de Chamados', route: '/modelo-chamados', icone: 'bi-file-earmark-text-fill', dica: 'Modelos para registrar chamados' },
            { label: 'Fraseologias', route: '/fraseologia', icone: 'bi-diagram-3-fill', dica: 'Respostas prontas de atendimento' }
          ]
        },
        {
          rotulo: 'Conhecimento Rápido',
          icone: 'bi-mortarboard-fill',
          itens: [
            { label: 'Como resolver esse problema?', route: '/conhecimento', icone: 'bi-book-fill', dica: 'Diagnóstico guiado e resolução de incidentes' },
            { label: 'SQL', route: '/trilhas/sql', icone: 'bi-database-fill', dica: 'Guias e consultas SQL' },
            { label: 'Rede', route: '/trilhas/rede', icone: 'bi-diagram-3-fill', dica: 'Guias de rede' },
            { label: 'Infra', route: '/trilhas/infra', icone: 'bi-hdd-network-fill', dica: 'Guias de infraestrutura' }
          ]
        }
      ]
    },
    {
      title: 'Implantação',
      subtitle: 'Projetos, tarefas e equipe',
      links: [
        { label: 'Visão geral', route: '/implantacao/dashboard', icone: 'bi-bar-chart-fill', dica: 'Indicadores da operação de implantação' },
        { label: 'Projetos', route: '/implantacao/projetos', icone: 'bi-folder2-open', dica: 'Gerenciar projetos — planejar e acompanhar entregas' },
        { label: 'Kanban', route: '/implantacao/kanban', icone: 'bi-kanban-fill', dica: 'Quadro de tarefas — arrastar, criar e mover' },
        { label: 'Tarefas', route: '/implantacao/tarefas', icone: 'bi-list-check', dica: 'Lista de tarefas com filtros' },
      ]
    },
    {
      title: 'Ferramentas',
      subtitle: 'Execute atividades',
      links: [
        { label: 'Banco de Dados', route: '/database', icone: 'bi-hdd-network-fill' },
        { label: 'Acessos', route: '/ferramentas/acessos', icone: 'bi-building' },
        { label: 'Central de Utilidades', route: '/ferramentas', icone: 'bi-grid-fill' }
      ]
    },
    {
      title: 'Conhecimento',
      subtitle: 'Aprenda e consulte',
      links: [
        { label: 'Cursos', route: '/cursos', icone: 'bi-mortarboard-fill' },
        { label: 'FAQ', route: '/ferramentas/faq', icone: 'bi-question-circle-fill' },
        { label: 'Stack', route: '/stack', icone: 'bi-stack' }
      ]
    },
    {
      title: 'JCA - Administração Interna',
      subtitle: 'Empresa, rotinas e gestão administrativa',
      links: [
        { label: 'Empresa', route: '/empresa', icone: 'bi-building' },
        { label: 'Onboarding', route: '/empresa/onboarding', icone: 'bi-rocket-takeoff' },
        { label: 'Políticas', route: '/politica', icone: 'bi-file-earmark-text-fill' },
        { label: 'Procedimentos', route: '/visao-adm', icone: 'bi-clipboard-data-fill' },
        ...(this.auth.hasRole('F') ? [this.getKanbanAdmLink()] : []),
        ...(this.ehAdministrador() ? [LINK_GESTAO_CENTRAL] : [])
      ]
    }
  ];

  /** Link para Kanban ADM com query param perfil=F. */
  getKanbanAdmLink(): SidebarLink {
    return { label: 'Kanban ADM', route: '/implantacao/kanban', icone: 'bi-kanban-fill', queryParams: { perfil: 'F' } };
  }

  /** Verificação estrita: só Administrador (adminGuard barra perfil F). */
  ehAdministrador(): boolean {
    return this.auth.getCurrentUser()?.perfil === 'Administrador';
  }

  isExpandido(rotulo: string): boolean {
    return this.gruposExpandidos.has(rotulo);
  }

  alternarGrupo(rotulo: string): void {
    if (this.gruposExpandidos.has(rotulo)) {
      this.gruposExpandidos.delete(rotulo);
    } else {
      this.gruposExpandidos.add(rotulo);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }
}