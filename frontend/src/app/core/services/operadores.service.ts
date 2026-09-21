import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "@env/environment";

export interface OperadorResumo {
  id: string;
  nome: string;
  email: string | null;
}

@Injectable({ providedIn: "root" })
export class OperadoresService {
  private readonly http = inject(HttpClient);

  /** Retorna lista de operadores para uso em selects/dropdowns. */
  listar(): Observable<OperadorResumo[]> {
    return this.http.get<OperadorResumo[]>(`${environment.apiBaseUrl}/agenda/operadores`);
  }
}
