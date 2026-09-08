import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarLink {
  label: string;
  route: string;
  icone: string;
  badge?: string;
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

const GRUPO_EMPRESA_EXPANDIDO = 'Empresa';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Input() collapsed = false;

  readonly gruposExpandidos = new Set<string>([GRUPO_EMPRESA_EXPANDIDO]);

  sections: SidebarSection[] = [
    {
      title: 'Inicio',
      subtitle: 'Panorama do Actyon',
      links: [
        { label: 'Home', route: '/', icone: 'bi-house-fill' },
        { label: 'Stack', route: '/stack', icone: 'bi-stack' },
        { label: 'Agenda', route: '/agenda', icone: 'bi-calendar-week-fill' }
      ]
    },
    {
      title: 'Atendimento',
      subtitle: 'Central operacional',
      links: [
        { label: 'Fluxo de Atendimento e Fraseologias', route: '/fraseologia', icone: 'bi-diagram-3-fill' },
        { label: 'Modelo de Chamados', route: '/modelo-chamados', icone: 'bi-file-earmark-text-fill' },
        { label: 'Como resolver esse problema?', route: '/trilhas/resolver', icone: 'bi-compass-fill' },
        { label: 'Dicas de SQL', route: '/trilhas/sql', icone: 'bi-database-fill' },
        { label: 'Dicas de Rede', route: '/trilhas/rede', icone: 'bi-diagram-3-fill' },
        { label: 'Dicas de Infra', route: '/trilhas/infra', icone: 'bi-hdd-network-fill' }
      ]
    },
    {
      title: 'Implantação',
      subtitle: 'Projetos e tarefas',
      links: [
        { label: 'Dashboard', route: '/implantacao/dashboard', icone: 'bi-speedometer2' },
        { label: 'Kanban', route: '/implantacao/kanban', icone: 'bi-kanban-fill' },
        { label: 'Projetos', route: '/implantacao/projetos', icone: 'bi-folder2-open' },
        { label: 'Tarefas', route: '/implantacao/tarefas', icone: 'bi-list-check' },
        { label: 'Cadastros', route: '/implantacao/cadastros', icone: 'bi-gear-fill' }
      ]
    },
    {
      title: 'Ferramentas',
      subtitle: 'Central de utilidades',
      links: [
        { label: 'Central de Utilidades', route: '/ferramentas', icone: 'bi-grid-fill' },
        { label: 'Acessos das Empresas', route: '/ferramentas/acessos', icone: 'bi-building' },
        { label: 'Banco de Dados', route: '/database', icone: 'bi-hdd-network-fill' },
        { label: 'Cursos', route: '/cursos', icone: 'bi-mortarboard-fill' },
        { label: 'Glossário', route: '/ferramentas/faq', icone: 'bi-journal-bookmark-fill' }
      ]
    },
    {
      title: 'Administrativo',
      subtitle: 'Procedimentos internos',
      links: [
        { label: 'Visão ADM', route: '/visao-adm', icone: 'bi-clipboard-data-fill' }
      ]
    },
    {
      title: 'Integração',
      subtitle: 'Conheça a JCA',
      grupos: [
        {
          rotulo: 'Empresa',
          icone: 'bi-building',
          itens: [
            { label: 'Onboarding Corporativo', route: '/empresa/onboarding', icone: 'bi-rocket-takeoff' }
          ]
        }
      ]
    }
  ];

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
