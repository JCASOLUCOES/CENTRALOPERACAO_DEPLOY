import { Injectable, signal } from '@angular/core';

export interface FavoritoQuery {
  id: string;
  nome: string;
  descricao?: string;
  sql: string;
  tags: string[];
  dataCriacao: string;
  ultimoUso?: string;
}

/**
 * Corretor #6 Passos 1-2: favoritos de SQL persistidos em localStorage.
 * Reutilização de queries complexas em 1 clique, com tags para organizar.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseFavoritosService {
  private readonly CHAVE = 'cc.database.favoritos.v1';

  readonly favoritos = signal<FavoritoQuery[]>([]);

  constructor() {
    this.carregar();
  }

  listar(filtro = ''): FavoritoQuery[] {
    const termo = filtro.trim().toLowerCase();
    const todos = this.favoritos();
    if (!termo) return todos;
    return todos.filter(f =>
      f.nome.toLowerCase().includes(termo) ||
      (f.descricao ?? '').toLowerCase().includes(termo) ||
      f.tags.some(t => t.toLowerCase().includes(termo))
    );
  }

  adicionar(nome: string, sql: string, tags: string[] = [], descricao?: string): FavoritoQuery {
    const fav: FavoritoQuery = {
      id: `fav-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      nome: nome.trim() || this.sugerirNome(),
      descricao: descricao?.trim() || undefined,
      sql,
      tags: tags.map(t => t.trim()).filter(t => t.length > 0),
      dataCriacao: new Date().toISOString()
    };
    this.favoritos.update(arr => [fav, ...arr]);
    this.persistir();
    return fav;
  }

  excluir(id: string): void {
    this.favoritos.update(arr => arr.filter(f => f.id !== id));
    this.persistir();
  }

  duplicar(id: string): void {
    const origem = this.favoritos().find(f => f.id === id);
    if (!origem) return;
    const copia: FavoritoQuery = {
      ...origem,
      id: `fav-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`,
      nome: `${origem.nome} (cópia)`,
      dataCriacao: new Date().toISOString(),
      ultimoUso: undefined
    };
    this.favoritos.update(arr => [copia, ...arr]);
    this.persistir();
  }

  registrarUso(id: string): void {
    this.favoritos.update(arr => arr.map(f => f.id === id ? { ...f, ultimoUso: new Date().toISOString() } : f));
    this.persistir();
  }

  sugerirNome(): string {
    const agora = new Date();
    const dd = String(agora.getDate()).padStart(2, '0');
    const mm = String(agora.getMonth() + 1).padStart(2, '0');
    const hh = String(agora.getHours()).padStart(2, '0');
    const min = String(agora.getMinutes()).padStart(2, '0');
    return `Query ${dd}/${mm} ${hh}:${min}`;
  }

  private carregar(): void {
    try {
      const raw = localStorage.getItem(this.CHAVE);
      if (raw) {
        const parsed = JSON.parse(raw) as FavoritoQuery[];
        if (Array.isArray(parsed)) this.favoritos.set(parsed);
      }
    } catch {}
  }

  private persistir(): void {
    try {
      localStorage.setItem(this.CHAVE, JSON.stringify(this.favoritos()));
    } catch {}
  }
}
