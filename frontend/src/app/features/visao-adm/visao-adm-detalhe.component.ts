import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Procedimento } from './data/procedimentos.data';
import { ProcedimentosService, SetorInfo } from './procedimentos.service';

@Component({
  selector: 'app-visao-adm-detalhe',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './visao-adm-detalhe.component.html',
  styleUrl: './visao-adm-detalhe.component.scss'
})
export class VisaoAdmDetalheComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(ProcedimentosService);

  procedimento: Procedimento | null = null;
  naoEncontrado = false;
  setor: SetorInfo | null = null;
  secaoAbertaId = 'objetivo';

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const proc = this.service.buscarPorId(id);
      if (proc) {
        this.procedimento = proc;
        this.setor = this.service.setorInfo(proc.setor);
      }
    }
    if (!this.procedimento) {
      this.naoEncontrado = true;
    }
  }

  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? '' : id;
  }

  imprimir(): void {
    window.print();
  }

  trackByIndex(index: number): number {
    return index;
  }
}
