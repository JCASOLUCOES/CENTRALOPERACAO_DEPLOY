import { CommonModule } from '@angular/common';
import { Component, Input, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PapelUsuarioService } from '../../core/services/papel-usuario.service';
import { SIDEBAR_SECTIONS, SidebarLink } from '@shared/config/header-nav.config';

interface TransformedSection {
  title: string;
  subtitle: string;
  links?: SidebarLink[];
  grupos?: TransformedGrupo[];
}

interface TransformedGrupo {
  rotulo: string;
  icone: string;
  badge?: string;
  itens: SidebarLink[];
}

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

  private rawSections = SIDEBAR_SECTIONS;

  sections = computed<TransformedSection[]>(() => {
    return this.rawSections.map(s => {
      const sec: TransformedSection = {
        title: s.label,
        subtitle: this.getSubtitle(s.label),
      };

      if (s.children) {
        const links = s.children
          .filter(c => !c.children)
          .filter(c => {
            if (c.roles?.includes('Administrador') && !this.ehAdministrador()) return false;
            if (c.roles?.includes('F') && !this.auth.hasRole('F')) return false;
            return true;
          })
          .map(c => ({
            label: c.label,
            route: c.route,
            icone: c.icone,
            dica: c.dica,
            queryParams: c.queryParams,
            badge: c.badge,
          }));

        const grupos = s.children
          .filter(c => c.children)
          .map(c => ({
            rotulo: c.label,
            icone: c.icone,
            badge: c.badge,
            itens: c.children?.map(i => ({
              label: i.label,
              route: i.route,
              icone: i.icone,
              dica: i.dica,
              queryParams: i.queryParams,
              badge: i.badge,
            })) ?? [],
          }));

        if (links.length) sec.links = links;
        if (grupos.length) sec.grupos = grupos;
      }

      return sec;
    });
  });

  private getSubtitle(title: string): string {
    const subtitles: Record<string, string> = {
      'Início': 'Comece por aqui',
      'SUPORTE': 'Resolver problemas',
      'Implantação': 'Projetos, tarefas e equipe',
      'Ferramentas': 'Execute atividades',
      'Conhecimento': 'Aprenda e consulte',
      'JCA - Administração Interna': 'Empresa, rotinas e gestão administrativa',
    };
    return subtitles[title] ?? '';
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

  /** Verificação estrita: só Administrador (adminGuard barra perfil F). */
  ehAdministrador(): boolean {
    return this.auth.getCurrentUser()?.perfil === 'Administrador';
  }
}