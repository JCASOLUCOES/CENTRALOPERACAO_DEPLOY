import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SecaoMeta {
  id: string;
  numero: number;
  titulo: string;
  chaves: string;
}

interface ExemploRapido {
  titulo: string;
  descricao: string;
  icone: string;
}

@Component({
  selector: 'app-trilhas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trilhas.component.html',
  styleUrl: './trilhas.component.scss'
})
export class TrilhasComponent {
  @ViewChild('conteudo') conteudo?: ElementRef<HTMLElement>;

  // Lista de IDs das seções para controle do acordeão
  secoes = [
    'classificacao',
    'diagnostico',
    'documentos',
    'plano-acao',
    'comunicacao',
    'fechamento',
    'fluxo-resumido',
    'exemplos-praticos'
  ];

  readonly secoesMeta: SecaoMeta[] = [
    { id: 'classificacao', numero: 1, titulo: 'Classificação do Incidente', chaves: 'p1 p2 p3 prioridade urgencia impacto' },
    { id: 'diagnostico', numero: 2, titulo: 'Diagnóstico Inicial', chaves: 'health iis sql ping porta checklist 60 segundos' },
    { id: 'documentos', numero: 3, titulo: 'Documentos e Histórico', chaves: 'pop historico evidencias logs' },
    { id: 'plano-acao', numero: 4, titulo: 'Plano de Ação', chaves: 'pool restart credenciais sessoes cpu memoria disco' },
    { id: 'comunicacao', numero: 5, titulo: 'Comunicação com o Cliente', chaves: 'avisar cliente status' },
    { id: 'fechamento', numero: 6, titulo: 'Fechamento do Incidente', chaves: 'causa raiz categoria encerrar' },
    { id: 'fluxo-resumido', numero: 7, titulo: 'Fluxo Resumido', chaves: 'resumo passo passo' },
    { id: 'exemplos-praticos', numero: 8, titulo: 'Exemplos Práticos', chaves: 'lentidao lentidão erro 500 acesso caso pratico' }
  ];

  readonly exemplosRapidos: ExemploRapido[] = [
    { titulo: 'Lentidão no CRM', descricao: 'Normalmente P2 — /api/health, IIS e waits do SQL', icone: 'bi-hourglass-split' },
    { titulo: 'Erro 500 geral', descricao: 'P1 — application pool, IIS ↔ SQL, logs do CRM', icone: 'bi-x-octagon' },
    { titulo: 'Usuário sem acesso', descricao: 'Isolar ambiente, permissões, senha/bloqueio', icone: 'bi-person-exclamation' }
  ];

  filtro = '';

  // Controle de qual seção está aberta
  secaoAbertaId: string | null = this.secoes[0] ?? null;

  // Alterna abertura/fechamento de seção
  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }

  secoesVisiveis(): SecaoMeta[] {
    const termo = this.filtro.trim().toLowerCase();
    if (!termo) return this.secoesMeta;
    return this.secoesMeta.filter(s =>
      (s.titulo + ' ' + s.chaves).toLowerCase().includes(termo)
    );
  }

  abrirSecao(id: string): void {
    this.secaoAbertaId = id;
    if (typeof document !== 'undefined') {
      setTimeout(() => this.conteudo?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }
}