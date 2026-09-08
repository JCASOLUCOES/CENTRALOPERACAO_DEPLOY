import { Injectable } from '@angular/core';
import { buscarComSinonimos, normalizar } from '@shared/utils/texto.helper';
import {
  Utilidade,
  UtilidadeRuntime,
  categoriasUtilidades,
  corPorCategoria,
  iconePorCategoria,
  utilidades
} from './data/utilidades.data';

export interface CategoriaUtilidadeInfo {
  id: string;
  nome: string;
  icone: string;
  cor: string;
}

const STORAGE_FAV = 'cc.adm.utilidades.favoritos';
const STORAGE_RUNTIME = 'cc.adm.utilidades.runtime';

@Injectable({ providedIn: 'root' })
export class UtilidadesService {
  private favoritos: Set<string> = new Set(this.carregarFavoritos());
  private runtime: Record<string, UtilidadeRuntime> = this.carregarRuntime();

  // ── Dados base ──
  listar(): Utilidade[] {
    return utilidades;
  }

  categorias(): CategoriaUtilidadeInfo[] {
    return categoriasUtilidades;
  }

  categoriaInfo(categoria: string): CategoriaUtilidadeInfo {
    return (
      categoriasUtilidades.find(c => c.id === categoria) ?? {
        id: categoria,
        nome: categoria,
        icone: 'bi-box',
        cor: '#2563eb'
      }
    );
  }

  corCategoria(categoria: string): string {
    return corPorCategoria[categoria] ?? '#2563eb';
  }

  iconeCategoria(categoria: string): string {
    return iconePorCategoria[categoria] ?? 'bi-box';
  }

  // ── Favoritos ──
  ehFavorito(id: string): boolean {
    return this.favoritos.has(id);
  }

  favoritoInicial(u: Utilidade): boolean {
    return u.favoritoDefault;
  }

  alternarFavorito(id: string): void {
    if (this.favoritos.has(id)) {
      this.favoritos.delete(id);
    } else {
      this.favoritos.add(id);
    }
    this._salvarFavoritos();
  }

  listaFavoritos(utilidades: Utilidade[]): Utilidade[] {
    return utilidades
      .filter(u => this.ehFavorito(u.id) || u.favoritoDefault)
      .sort((a, b) => a.ordem - b.ordem);
  }

  // ── Acessos ──
  registrarAcesso(id: string): void {
    const atual = this.runtime[id] ?? { acessos: 0, ultimoAcesso: null };
    atual.acessos += 1;
    atual.ultimoAcesso = new Date().toISOString();
    this.runtime[id] = atual;
    this._salvarRuntime();
  }

  ultimoAcesso(id: string): string | null {
    return this.runtime[id]?.ultimoAcesso ?? null;
  }

  acessos(id: string): number {
    return this.runtime[id]?.acessos ?? 0;
  }

  ultimosUtilizados(utilidadesTotal: Utilidade[], limite = 5): Utilidade[] {
    const comAcesso = utilidadesTotal
      .filter(u => this.runtime[u.id]?.ultimoAcesso)
      .sort((a, b) => {
        const ta = this.runtime[a.id]?.ultimoAcesso ?? '';
        const tb = this.runtime[b.id]?.ultimoAcesso ?? '';
        return tb.localeCompare(ta);
      });
    return comAcesso.slice(0, limite);
  }

  // ── Pesquisa ──
  private readonly _sinonimos: Record<string, string> = {
    nf: 'nota fiscal',
    receita: 'receita federal',
    gympass: 'wellhub',
    sodex: 'pluxee',
    previdencia: 'iob'
  };

  buscar(termo: string, categoria: string): Utilidade[] {
    let lista = utilidades;
    if (categoria !== 'todas') {
      lista = lista.filter(u => u.categoria === categoria);
    }

    if (!normalizar(termo)) {
      return [...lista].sort((a, b) => a.ordem - b.ordem);
    }

    return lista.filter(u =>
      buscarComSinonimos(termo, this._sinonimos,
        u.nome, u.descricao, u.categoria, u.responsavel ?? '', ...(u.tags ?? []))
    );
  }

  // ── Persistência ──
  private _carregarJson(chave: string): unknown {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private _salvarJson(chave: string, valor: unknown): void {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* storage indisponível */
    }
  }

  private carregarFavoritos(): string[] {
    const data = this._carregarJson(STORAGE_FAV) as string[] | null;
    return Array.isArray(data) ? data : [];
  }

  private _salvarFavoritos(): void {
    this._salvarJson(STORAGE_FAV, [...this.favoritos]);
  }

  private carregarRuntime(): Record<string, UtilidadeRuntime> {
    const data = this._carregarJson(STORAGE_RUNTIME) as Record<string, UtilidadeRuntime> | null;
    return data && typeof data === 'object' ? data : {};
  }

  private _salvarRuntime(): void {
    this._salvarJson(STORAGE_RUNTIME, this.runtime);
  }
}