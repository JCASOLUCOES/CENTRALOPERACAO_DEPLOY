import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CursosService } from '../services/cursos.service';
import { Curso, buscarCursoPorId, categoriasCursos, trilhas } from './cursos-novos.data';

@Component({
  selector: 'app-curso-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './curso-detalhe.component.html',
  styleUrl: './curso-detalhe.component.scss'
})
export class CursoDetalheComponent implements OnInit {
  curso: Curso | null = null;
  naoEncontrado = false;
  categoriaNome = '';
  categoriaCor = '';
  categoriaIcone = '';
  trilhasRelacionadas: { nome: string; cor: string; icone: string }[] = [];
  proximoCurso: Curso | null = null;
  embedUrl: SafeResourceUrl | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sanitizer: DomSanitizer,
    private readonly service: CursosService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const curso = id ? buscarCursoPorId(id) : undefined;

    if (!curso) {
      this.naoEncontrado = true;
      return;
    }

    this.curso = curso;

    const cat = categoriasCursos.find(c => c.id === curso.categoria);
    if (cat) {
      this.categoriaNome = cat.nome;
      this.categoriaCor = cat.cor;
      this.categoriaIcone = cat.icone;
    }

    this.trilhasRelacionadas = trilhas
      .filter(t => curso.trilhas?.includes(t.id))
      .map(t => ({ nome: t.nome, cor: t.cor, icone: t.icone }));

    if (curso.playlistId) {
      this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube.com/embed/videoseries?list=${curso.playlistId}`
      );
    } else if (curso.videoId) {
      this.embedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.youtube-nocookie.com/embed/${curso.videoId}?rel=0`
      );
    }

    this.proximoCurso = this.buscarProximoCurso(curso);
  }

  private buscarProximoCurso(atual: Curso): Curso | null {
    const todos = this.service.listarCursos();
    const idx = todos.findIndex(c => c.id === atual.id);
    if (idx === -1 || idx >= todos.length - 1) return null;
    return todos[idx + 1];
  }

  nivelClass(): string {
    if (!this.curso) return '';
    return 'nivel--' + this.curso.nivel.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  trackByIndex(index: number): number {
    return index;
  }
}
