import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FerramentasService } from '../services/ferramentas.service';
import { Ferramenta, FerramentaCategoria } from './ferramentas.data';

@Component({
  selector: 'app-ferramentas',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ferramentas.component.html',
  styleUrl: './ferramentas.component.scss'
})
export class FerramentasComponent implements OnInit {
  termoBusca = '';
  categoriaSelecionada = 'todas';

  categorias: FerramentaCategoria[] = [];
  private isBrowser: boolean;

  constructor(
    private readonly service: FerramentasService,
    private readonly route: ActivatedRoute,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get totalFerramentas(): number {
    return this.service.listarFerramentas().length;
  }

  get totalCategorias(): number {
    return this.service.listarCategorias().length;
  }

  ngOnInit(): void {
    this.categorias = this.service.listarCategorias();
    this.route.queryParamMap.subscribe(params => {
      const categoria = params.get('categoria');
      if (categoria) {
        this.categoriaSelecionada = categoria;
      }
    });
  }

  get ferramentasFiltradas(): Ferramenta[] {
    return this.service.buscar(
      this.termoBusca,
      this.categoriaSelecionada === 'todas'
        ? undefined
        : this.categoriaSelecionada
    );
  }

  selecionarCategoria(categoriaId: string): void {
    this.categoriaSelecionada = categoriaId;
  }

  categoriaPorId(categoriaId: string): FerramentaCategoria | undefined {
    return this.categorias.find(categoria => categoria.id === categoriaId);
  }

  aplicarBusca(event: Event): void {
    this.termoBusca = (event.target as HTMLInputElement).value;
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.categoriaSelecionada = 'todas';
  }

  abrirLink(url: string, externo: boolean): void {
    if (externo && this.isBrowser) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
