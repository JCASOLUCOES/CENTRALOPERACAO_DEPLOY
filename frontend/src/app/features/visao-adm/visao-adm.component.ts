import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Procedimento, SetorProcedimento } from './data/procedimentos.data';
import { Utilidade } from './data/utilidades.data';
import { ProcedimentosService, SetorInfo } from './procedimentos.service';
import { UtilidadesService } from './utilidades.service';

@Component({
  selector: 'app-visao-adm',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './visao-adm.component.html',
  styleUrl: './visao-adm.component.scss'
})
export class VisaoAdmComponent {
  readonly service = inject(ProcedimentosService);
  readonly utilidadesService = inject(UtilidadesService);

  // ── Procedimentos ──
  setores: SetorInfo[] = this.service.setores();
  setorAtivo: SetorProcedimento | 'todos' = 'todos';
  termoBusca = '';

  // ── Central de Utilidades ──
  utilidades: Utilidade[] = this.utilidadesService.listar();
  termoUtilidade = '';
  categoriaUtilidade = 'todas';
  ordenacaoUtilidade: 'nome' | 'categoria' | 'acessos' = 'categoria';
  exibicaoUtilidade: 'grade' | 'lista' = 'grade';

  get totalProcedimentos(): number {
    return this.service.listarTodos().length;
  }

  contagemPorSetor(setor: SetorProcedimento): number {
    return this.service.listarPorSetor(setor).length;
  }

  get procedimentosFiltrados(): Procedimento[] {
    return this.service.buscar(this.termoBusca, this.setorAtivo);
  }

  get setorAtivoNome(): string {
    if (this.setorAtivo === 'todos') return 'todos os setores';
    return this.service.setorInfo(this.setorAtivo).nome;
  }

  selecionarSetor(setor: SetorProcedimento | 'todos'): void {
    this.setorAtivo = setor;
  }

  aplicarBusca(event: Event): void {
    this.termoBusca = (event.target as HTMLInputElement).value;
  }

  limparFiltros(): void {
    this.termoBusca = '';
    this.setorAtivo = 'todos';
  }

  // ── Central de Utilidades ──
  get totalUtilidades(): number {
    return this.utilidadesService.listar().length;
  }

  get favoritas(): Utilidade[] {
    return this.utilidadesService
      .listaFavoritos(this.utilidadesService.listar())
      .slice(0, 6);
  }

  get ultimosUtilizados(): Utilidade[] {
    return this.utilidadesService.ultimosUtilizados(this.utilidadesService.listar(), 6);
  }

  get utilidadesFiltradas(): Utilidade[] {
    const base = this.utilidadesService.buscar(this.termoUtilidade, this.categoriaUtilidade);
    return this._ordenar(base);
  }

  get utilidadesOrdenadas(): Utilidade[] {
    return this._ordenar([...this.utilidadesService.listar()]);
  }

  private _ordenar(lista: Utilidade[]): Utilidade[] {
    switch (this.ordenacaoUtilidade) {
      case 'nome':
        return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      case 'acessos':
        return [...lista].sort(
          (a, b) => this.utilidadesService.acessos(b.id) - this.utilidadesService.acessos(a.id)
        );
      case 'categoria':
      default:
        return [...lista].sort((a, b) => a.ordem - b.ordem);
    }
  }

  ehFavorito(id: string): boolean {
    return this.utilidadesService.ehFavorito(id) || this.utilidadesService.favoritoInicial(this.utilidadesService.listar().find(u => u.id === id)!);
  }

  alternarFavorito(id: string): void {
    this.utilidadesService.alternarFavorito(id);
  }

  registrarAcesso(id: string): void {
    this.utilidadesService.registrarAcesso(id);
  }

  acessosDe(id: string): number {
    return this.utilidadesService.acessos(id);
  }

  selecionarCategoriaUtilidade(categoria: string): void {
    this.categoriaUtilidade = categoria;
  }

  alterarOrdenacao(event: Event): void {
    this.ordenacaoUtilidade = (event.target as HTMLSelectElement).value as 'nome' | 'categoria' | 'acessos';
  }

  alterarExibicao(modo: 'grade' | 'lista'): void {
    this.exibicaoUtilidade = modo;
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
