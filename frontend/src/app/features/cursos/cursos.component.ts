import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  Curso,
  categoriasCursos,
  trilhas,
  todosCursos,
  buscarCursos,
  listarCursosPorCategoria,
  buscarCursoPorId
} from './cursos-novos.data';
import { CursosService } from '../services/cursos.service';

@Component({
  selector: 'app-cursos',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cursos.component.html',
  styleUrl: './cursos.component.scss'
})
export class CursosComponent implements OnInit {
  private readonly service = inject(CursosService);
  private readonly modalService = inject(NgbModal);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);

  categorias = categoriasCursos;
  trilhasDisponiveis = trilhas;
  termoBusca = '';
  categoriaAtiva = 'todas';
  nivelSelecionado: string | null = null;
  abaAtiva: 'cursos' | 'trilhas' = 'cursos';

  cursoEmExibicao: Curso | null = null;
  iframeUrl: SafeResourceUrl | null = null;

  readonly niveis = ['Todos', 'Iniciante', 'Intermediario', 'Avancado'];

  ngOnInit(): void {}

  get totalCursos(): number {
    return todosCursos.length;
  }

  get cursosFiltrados(): Curso[] {
    let lista = this.termoBusca
      ? buscarCursos(this.termoBusca)
      : this.categoriaAtiva === 'todas'
        ? [...todosCursos]
        : listarCursosPorCategoria(this.categoriaAtiva);

    if (this.nivelSelecionado && this.nivelSelecionado !== 'Todos') {
      lista = lista.filter(c => c.nivel === this.nivelSelecionado);
    }

    return lista;
  }

  selecionarCategoria(categoriaId: string): void {
    this.categoriaAtiva = categoriaId;
  }

  selecionarNivel(nivel: string): void {
    this.nivelSelecionado = this.nivelSelecionado === nivel ? null : nivel;
  }

  aplicarBusca(event: Event): void {
    this.termoBusca = (event.target as HTMLInputElement).value;
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.categoriaAtiva = 'todas';
    this.nivelSelecionado = null;
  }

  alternarAba(aba: 'cursos' | 'trilhas'): void {
    this.abaAtiva = aba;
  }

  irParaCurso(cursoId: string): void {
    this.router.navigate(['/cursos/detalhe', cursoId]);
  }

  thumbnail(curso: Curso): string {
    if (curso.videoId) {
      return `https://i.ytimg.com/vi/${curso.videoId}/hqdefault.jpg`;
    }
    if (curso.playlistId) {
      return `https://i.ytimg.com/vi/${curso.playlistId}/hqdefault.jpg`;
    }
    return '';
  }

  corCategoria(categoriaId: string): string {
    return this.categorias.find(c => c.id === categoriaId)?.cor ?? '#2563eb';
  }

  iconeCategoria(categoriaId: string): string {
    return this.categorias.find(c => c.id === categoriaId)?.icone ?? 'bi-book';
  }

  nomeCategoria(categoriaId: string): string {
    return this.categorias.find(c => c.id === categoriaId)?.nome ?? categoriaId;
  }

  nivelSlug(nivel: string): string {
    return nivel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  cursosPorTrilha(trilhaId: string): Curso[] {
    const trilha = this.trilhasDisponiveis.find(t => t.id === trilhaId);
    if (!trilha) return [];
    return trilha.cursoIds.map(id => buscarCursoPorId(id)).filter((c): c is Curso => !!c);
  }

  abrirModal(curso: Curso, conteudo: unknown): void {
    this.cursoEmExibicao = curso;

    if (curso.playlistId) {
      this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/videoseries?list=${curso.playlistId}`
      );
    } else if (curso.videoId) {
      this.iframeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube-nocookie.com/embed/${curso.videoId}?rel=0`
      );
    }

    this.modalService.open(conteudo as never, {
      size: 'xl',
      centered: true,
      scrollable: false,
      windowClass: 'cursos-modal'
    });
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
