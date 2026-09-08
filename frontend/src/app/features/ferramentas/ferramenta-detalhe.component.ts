import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FerramentasService } from '../services/ferramentas.service';
import { Ferramenta, FerramentaCategoria } from './ferramentas.data';

@Component({
  selector: 'app-ferramenta-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ferramenta-detalhe.component.html',
  styleUrl: './ferramenta-detalhe.component.scss'
})
export class FerramentaDetalheComponent implements OnInit {
  ferramenta: Ferramenta | null = null;
  categoria: FerramentaCategoria | null = null;
  naoEncontrada = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: FerramentasService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const ferramenta = id ? this.service.buscarFerramenta(id) : undefined;

    if (!ferramenta) {
      this.naoEncontrada = true;
      return;
    }

    this.ferramenta = ferramenta;
    this.categoria = this.service.listarCategorias()
      .find(categoria => categoria.id === ferramenta.categoria) ?? null;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
