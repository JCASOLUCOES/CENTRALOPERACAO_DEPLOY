import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BuscaService {
  private buscaAbertaSubject = new BehaviorSubject<boolean>(false);
  readonly buscaAberta$ = this.buscaAbertaSubject.asObservable();

  fecharBusca(): void {
    this.buscaAbertaSubject.next(false);
  }

  get buscaAberta(): boolean {
    return this.buscaAbertaSubject.value;
  }
}
