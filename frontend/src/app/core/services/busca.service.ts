import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

export type BuscaOrigem = 'header' | 'home';

export interface BuscaEstado {
  aberta: boolean;
  origem: BuscaOrigem | null;
  consulta: string;
}

@Injectable({
  providedIn: 'root'
})
export class BuscaService {
  private readonly estadoSubject = new BehaviorSubject<BuscaEstado>({
    aberta: false,
    origem: null,
    consulta: ''
  });

  readonly estado$: Observable<BuscaEstado> = this.estadoSubject.asObservable();
  readonly buscaAberta$: Observable<boolean> = this.estado$.pipe(
    map(estado => estado.aberta),
    distinctUntilChanged()
  );

  get estadoAtual(): BuscaEstado {
    return this.estadoSubject.value;
  }

  get buscaAberta(): boolean {
    return this.estadoAtual.aberta;
  }

  abrirBusca(origem: BuscaOrigem = 'header'): void {
    this.estadoSubject.next({
      ...this.estadoAtual,
      aberta: true,
      origem
    });
  }

  atualizarConsulta(consulta: string, origem: BuscaOrigem): void {
    this.estadoSubject.next({
      aberta: true,
      origem,
      consulta
    });
  }

  fecharBusca(origem?: BuscaOrigem): void {
    if (origem && this.estadoAtual.origem !== origem) return;

    this.estadoSubject.next({
      ...this.estadoAtual,
      aberta: false,
      origem: null
    });
  }
}
