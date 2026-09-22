import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { GestorPermissionService } from '../../services/gestor-permission.service';
import { APP_VERSION } from '@shared/meta/app-version';

interface FeatureItem {
  icone: string;
  texto: string;
}

interface ModuloCard {
  id: 'ceo' | 'cto' | 'coo';
  titulo: string;
  cargo: string;
  cargoEn: string;
  descricao: string;
  features: FeatureItem[];
  rota: string;
  corPrimaria: string;
  corEscura: string;
  corClara: string;
  corRgb: string;
  corHover: string;
}

@Component({
  selector: 'app-gestor-modulo-entrada',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modulo-entrada.component.html',
  styleUrl: './modulo-entrada.component.scss'
})
export class GestorModuloEntradaComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly perm = inject(GestorPermissionService);
  private readonly router = inject(Router);

  readonly versao = APP_VERSION;
  readonly anoAtual = new Date().getFullYear();
  animado = false;
  navegando: string | null = null;

  readonly dataHoje = new Date().toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  modulos: ModuloCard[] = [
    {
      id: 'ceo',
      titulo: 'CEO',
      cargo: 'Chief Executive Officer',
      cargoEn: 'Strategic Leadership',
      descricao:
        'Visão estratégica de crescimento, rentabilidade e mercado. Foco em resultados financeiros, pipeline e satisfação de clientes.',
      features: [
        { icone: 'bi-cash-stack', texto: 'Resultados Financeiros' },
        { icone: 'bi-kanban', texto: 'Pipeline Comercial' },
        { icone: 'bi-people', texto: 'Satisfação Cliente' },
        { icone: 'bi-bullseye', texto: 'KPIs Executivos' }
      ],
      rota: '/gestor/ceo',
      corPrimaria: '#0052a3',
      corEscura: '#003366',
      corClara: '#e6f2ff',
      corRgb: '0, 82, 163',
      corHover: '#003d7a'
    },
    {
      id: 'cto',
      titulo: 'CTO',
      cargo: 'Chief Technology Officer',
      cargoEn: 'Technology Excellence',
      descricao:
        'Visão técnica de infraestrutura, desenvolvimento e qualidade. Acompanhe produtividade, segurança e maturidade do código.',
      features: [
        { icone: 'bi-rocket-takeoff', texto: 'Desenvolvimento' },
        { icone: 'bi-diagram-3', texto: 'Infraestrutura' },
        { icone: 'bi-shield-lock', texto: 'Segurança' },
        { icone: 'bi-check2-circle', texto: 'Qualidade de Código' }
      ],
      rota: '/gestor/cto',
      corPrimaria: '#00875d',
      corEscura: '#004d38',
      corClara: '#e6f9f2',
      corRgb: '0, 135, 93',
      corHover: '#005a42'
    },
    {
      id: 'coo',
      titulo: 'COO',
      cargo: 'Chief Operating Officer',
      cargoEn: 'Operational Excellence',
      descricao:
        'Visão operacional de eficiência, processos e conformidade. Monitore custos, pessoas e indicadores de operação.',
      features: [
        { icone: 'bi-gear-wide-connected', texto: 'Operações & Processos' },
        { icone: 'bi-graph-down-arrow', texto: 'Eficiência & Custos' },
        { icone: 'bi-person-badge', texto: 'Recursos Humanos' },
        { icone: 'bi-clipboard2-check', texto: 'Conformidade' }
      ],
      rota: '/gestor/coo',
      corPrimaria: '#d97706',
      corEscura: '#92400e',
      corClara: '#fff5e6',
      corRgb: '217, 119, 6',
      corHover: '#b45309'
    }
  ];

  ngOnInit(): void {
    if (!this.perm.podeAcessarGestor()) {
      this.router.navigate(['/']);
      return;
    }
    requestAnimationFrame(() => (this.animado = true));
  }

  get usuarioAtual() {
    return this.auth.getCurrentUser();
  }

  get primeiroNome(): string {
    return this.usuarioAtual?.nome?.split(' ')[0] ?? '';
  }

  get nomeCompleto(): string {
    return this.formatarNome(this.usuarioAtual?.nome ?? '');
  }

  get saudacao(): string {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  formatarNome(nome: string): string {
    return nome
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  navegar(modulo: ModuloCard): void {
    if (this.navegando) return;
    this.navegando = modulo.id;
    this.router
      .navigate([modulo.rota])
      .catch(() => (this.navegando = null));
  }

  irParaCentral(event: Event, rota = '/'): void {
    event.preventDefault();
    this.router.navigate([rota]);
  }
}
