import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Input,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { BuscaEstado, BuscaOrigem, BuscaService } from '@core/services/busca.service';
import { BuscaIndexService, ResultadoBusca } from '@core/services/busca-index.service';
import { ClickOutsideDirective } from '@shared/directives/click-outside.directive';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, RouterLink, ClickOutsideDirective],
  templateUrl: './global-search.component.html',
  styleUrl: './global-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalSearchComponent {
  @Input({ required: true }) origem!: BuscaOrigem;
  @Input() variante: 'header' | 'home' = 'header';
  @Input() placeholder?: string;
  @Input() label?: string;

  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('searchContainer', { static: false }) searchContainer?: ElementRef<HTMLElement>;
  @ViewChildren('searchOption') searchOptions?: QueryList<ElementRef<HTMLElement>>;

  readonly estado$: Observable<BuscaEstado>;
  readonly resultados$: Observable<ResultadoBusca[]>;

  activeIndex = -1;

  private readonly isBrowser: boolean;

  constructor(
    private readonly buscaService: BuscaService,
    private readonly indiceBusca: BuscaIndexService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.estado$ = this.buscaService.estado$;
    this.resultados$ = this.estado$.pipe(
      map(estado => this.indiceBusca.buscar(estado.consulta, 8))
    );
  }

  get inputId(): string {
    return `global-search-${this.origem}-input`;
  }

  get listboxId(): string {
    return `global-search-${this.origem}-listbox`;
  }

  get searchPlaceholder(): string {
    return this.placeholder ?? (this.origem === 'home' ? 'Buscar na Central...' : 'Pesquisar qualquer conteúdo...');
  }

  get searchLabel(): string {
    return this.label ?? (this.origem === 'home' ? 'Buscar na Central na página inicial' : 'Buscar na Central');
  }

  get activeOptionId(): string | null {
    const estado = this.buscaService.estadoAtual;
    if (!estado.aberta || estado.origem !== this.origem || this.activeIndex < 0) return null;
    return this.optionId(this.activeIndex);
  }

  get resultadosBusca(): ResultadoBusca[] {
    return this.indiceBusca.buscar(this.buscaService.estadoAtual.consulta, 8);
  }

  optionId(index: number): string {
    return `global-search-${this.origem}-option-${index}`;
  }

  isExpanded(estado: BuscaEstado): boolean {
    return estado.aberta && estado.origem === this.origem;
  }

  onActivate(): void {
    this.buscaService.abrirBusca(this.origem);
    this.activeIndex = -1;
    this.focusInput(false);
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.buscaService.atualizarConsulta(value, this.origem);
    this.activeIndex = -1;
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) return;

    if (this.isSearchShortcut(event)) {
      if (this.origem === 'header') {
        event.preventDefault();
        event.stopPropagation();
        this.openAndSelectHeader();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Enter':
        this.selectActive(event);
        break;
      case 'Escape':
        event.preventDefault();
        this.fecharBusca();
        break;
      case 'Tab':
        this.activeIndex = -1;
        break;
    }
  }

  onFocusOut(event: FocusEvent): void {
    if (!this.isBrowser) return;

    const relatedTarget = event.relatedTarget;
    const container = this.searchContainer?.nativeElement;
    if (relatedTarget instanceof Node && container?.contains(relatedTarget)) return;
    this.fecharBusca();
  }

  onClickOutside(): void {
    this.fecharBusca();
  }

  onOptionMouseEnter(index: number): void {
    this.activeIndex = index;
  }

  onOptionMouseDown(event: MouseEvent): void {
    if (event.button === 0) event.preventDefault();
  }

  onOptionClick(): void {
    this.fecharBusca();
  }

  trackByIndex(index: number): number {
    return index;
  }

  statusText(estado: BuscaEstado, resultados: ResultadoBusca[]): string {
    const termo = estado.consulta.trim();
    if (!termo) {
      return resultados.length
        ? `${resultados.length} sugestões para explorar`
        : 'Digite para encontrar um destino';
    }
    if (!resultados.length) {
      return `Nenhum resultado encontrado para “${termo}”. Tente outro termo.`;
    }
    const quantidade = resultados.length === 1 ? 'resultado' : 'resultados';
    return `${resultados.length} ${quantidade} encontrado${resultados.length === 1 ? '' : 's'}.`;
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.isBrowser || this.origem !== 'header' || event.isComposing) return;
    if (!this.isSearchShortcut(event)) return;

    event.preventDefault();
    this.openAndSelectHeader();
  }

  private isSearchShortcut(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K');
  }

  private openAndSelectHeader(): void {
    this.buscaService.abrirBusca('header');
    this.activeIndex = -1;
    this.focusInput(true);
  }

  private focusInput(selecionar: boolean): void {
    if (!this.isBrowser) return;

    const input = this.searchInput?.nativeElement;
    if (!input) return;

    input.focus({ preventScroll: true });
    if (selecionar) input.select();
  }

  private moveActive(delta: number): void {
    this.buscaService.abrirBusca(this.origem);
    const resultados = this.resultadosBusca;
    if (!resultados.length) {
      this.activeIndex = -1;
      return;
    }

    if (this.activeIndex < 0) {
      this.activeIndex = delta > 0 ? 0 : resultados.length - 1;
    } else {
      this.activeIndex = (this.activeIndex + delta + resultados.length) % resultados.length;
    }
    this.scrollActiveIntoView();
  }

  private selectActive(event: KeyboardEvent): void {
    const resultados = this.resultadosBusca;
    if (!resultados.length) return;

    const index = this.activeIndex >= 0 ? this.activeIndex : 0;
    const resultado = resultados[index];
    if (!resultado) return;

    event.preventDefault();
    this.fecharBusca();
    void this.router.navigateByUrl(resultado.rota);
  }

  private fecharBusca(): void {
    this.buscaService.fecharBusca(this.origem);
    this.activeIndex = -1;
  }

  private scrollActiveIntoView(): void {
    if (!this.isBrowser) return;

    const activeOption = this.searchOptions?.get(this.activeIndex)?.nativeElement;
    if (activeOption && typeof activeOption.scrollIntoView === 'function') {
      activeOption.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
}
