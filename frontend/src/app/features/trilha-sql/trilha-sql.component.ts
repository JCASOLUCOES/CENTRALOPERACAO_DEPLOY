import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { bibliotecaSql, CategoriaSql } from './biblioteca-sql.data';

@Component({
  selector: 'app-trilha-sql',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trilha-sql.component.html',
  styleUrl: './trilha-sql.component.scss'
})
export class TrilhaSqlComponent {
  // Controle do acordeão
  secaoAbertaId: string | null = 'escopo';

  toggleSecao(id: string): void {
    this.secaoAbertaId = this.secaoAbertaId === id ? null : id;
  }

  // Lista de IDs das seções (para o índice e controle)
  secoes = [
    { id: 'escopo', titulo: '1. Escopo e Objetivos' },
    { id: 'principios', titulo: '2. Princípios Gerais' },
    { id: 'acesso', titulo: '3. Acesso ao SQL Server do Cliente' },
    { id: 'comportamento', titulo: '4. Comportamento Frente ao Cliente' },
    { id: 'encerramento', titulo: '5. Encerramento Correto das Conexões' },
    { id: 'consultas-genericas', titulo: '6. Consultas Genéricas e Demandas de Relatório' },
    { id: 'alteracoes-objetos', titulo: '7. Alterações em Objetos de Banco de Dados' },
    { id: 'whoisactive', titulo: '8. Análise do que o Banco Está Rodando' },
    { id: 'scripts-transacoes', titulo: '9. Cuidado com Scripts, Cursores e Transações' },
    { id: 'escalonamento', titulo: '10. Escalonamento de Problemas para o DBA' },
    { id: 'testes', titulo: '11. Testes em Ambiente Protegido' },
    { id: 'exemplos-praticos', titulo: '12. Exemplos Práticos de Consultas' },
    { id: 'checklist', titulo: '13. Checklist Resumido' },
    { id: 'biblioteca', titulo: '14. Biblioteca Prática de Consultas SQL' }
  ];

  // Biblioteca prática de consultas
  categoriasBiblioteca: CategoriaSql[] = bibliotecaSql;
  categoriaAtiva: string | null = null;
  buscaSql = '';
  copiadoId: string | null = null;

  get categoriasVisiveis(): CategoriaSql[] {
    const termo = this.buscaSql.trim().toLowerCase();

    return this.categoriasBiblioteca
      .filter((categoria) => this.categoriaAtiva === null || categoria.id === this.categoriaAtiva)
      .map((categoria) => {
        if (!termo) {
          return categoria;
        }
        return {
          ...categoria,
          consultas: categoria.consultas.filter(
            (consulta) =>
              consulta.titulo.toLowerCase().includes(termo) ||
              consulta.descricao.toLowerCase().includes(termo) ||
              consulta.sql.toLowerCase().includes(termo)
          )
        };
      })
      .filter((categoria) => categoria.consultas.length > 0);
  }

  alternarCategoria(id: string): void {
    this.categoriaAtiva = this.categoriaAtiva === id ? null : id;
  }

  copiarCodigo(consultaId: string, texto: string): void {
    const concluir = () => {
      this.copiadoId = consultaId;
      setTimeout(() => {
        if (this.copiadoId === consultaId) {
          this.copiadoId = null;
        }
      }, 1600);
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(concluir).catch(() => this.copiarFallback(texto, concluir));
      return;
    }
    this.copiarFallback(texto, concluir);
  }

  private copiarFallback(texto: string, concluir: () => void): void {
    if (typeof document === 'undefined') {
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = texto;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
    concluir();
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}