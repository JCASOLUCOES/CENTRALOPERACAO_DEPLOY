import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BuscaService } from '@core/services/busca.service';
import { AgendaService, AgendaResumo } from '@features/agenda/services/agenda.service';

interface AcaoRapida {
  titulo: string;
  descricao: string;
  rota: string;
  icone: string;
  cor: string;
}

const ACOES: AcaoRapida[] = [
  { titulo: 'Resolver um problema', descricao: 'Diagnóstico guiado do Actyon', rota: '/trilhas/resolver', icone: 'bi-compass', cor: '#0f4c81' },
  { titulo: 'Banco de Dados', descricao: 'Explorar tabelas e consultas', rota: '/database', icone: 'bi-hdd-network', cor: '#7c3aed' },
  { titulo: 'Acessos das Empresas', descricao: 'Credenciais e permissões', rota: '/ferramentas/acessos', icone: 'bi-building', cor: '#16a34a' },
  { titulo: 'Fraseologias', descricao: 'Fluxo e respostas de atendimento', rota: '/fraseologia', icone: 'bi-diagram-3', cor: '#d97706' },
  { titulo: 'Implantação', descricao: 'Projetos, kanban e tarefas', rota: '/implantacao', icone: 'bi-kanban', cor: '#0284c7' },
  { titulo: 'Cursos', descricao: 'Aprenda no seu ritmo', rota: '/cursos', icone: 'bi-mortarboard', cor: '#db2777' }
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly busca = inject(BuscaService);
  private readonly agendaSvc = inject(AgendaService);

  readonly acoes = ACOES;
  nome = signal('');
  saudacao = signal('Olá');
  compromissos = signal<AgendaResumo[]>([]);
  carregandoAgenda = signal(true);

  constructor() {
    const user = this.auth.getCurrentUser();
    this.nome.set(user?.nome?.split(' ')[0] ?? '');
    const hora = new Date().getHours();
    this.saudacao.set(hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite');
  }

  ngOnInit(): void {
    const agora = new Date();
    const fim = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
    this.agendaSvc.listarEventos(agora.toISOString(), fim.toISOString())
      .pipe(catchError(() => of([] as AgendaResumo[])))
      .subscribe(lista => {
        this.compromissos.set(lista.slice(0, 5));
        this.carregandoAgenda.set(false);
      });
  }

  abrirBusca(): void {
    this.busca.abrirBusca();
  }
}
