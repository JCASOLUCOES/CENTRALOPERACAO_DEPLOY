import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BuscaService } from '@core/services/busca.service';
import { BuscaIndexService, ResultadoBusca } from '@core/services/busca-index.service';
import { GlobalSearchComponent } from './global-search.component';

const RESULTADOS: ResultadoBusca[] = [
  { titulo: 'SQL', tipo: 'SQL', rota: '/trilhas/sql', icone: 'bi-code-slash' },
  { titulo: 'Rede', tipo: 'Atendimento', rota: '/trilhas/rede', icone: 'bi-diagram-3' },
  { titulo: 'Agenda', tipo: 'Ferramenta', rota: '/agenda', icone: 'bi-calendar-week' }
];

describe('GlobalSearchComponent', () => {
  let busca: BuscaService;
  let indice: jasmine.SpyObj<BuscaIndexService>;
  let router: Router;
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let component: GlobalSearchComponent;

  beforeEach(async () => {
    indice = jasmine.createSpyObj<BuscaIndexService>('BuscaIndexService', ['buscar']);
    indice.buscar.and.callFake((termo: string, limite = 8) => {
      const query = termo.trim().toLowerCase();
      const resultados = query
        ? RESULTADOS.filter(resultado => resultado.titulo.toLowerCase().includes(query))
        : RESULTADOS;
      return resultados.slice(0, limite);
    });

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        provideRouter([]),
        { provide: BuscaIndexService, useValue: indice }
      ]
    }).compileComponents();

    busca = TestBed.inject(BuscaService);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    component.origem = 'home';
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  function elemento<T extends Element>(selector: string): T {
    return fixture.nativeElement.querySelector(selector) as T;
  }

  function focar(input: HTMLInputElement): void {
    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    input.focus();
    fixture.detectChanges();
  }

  function digitar(input: HTMLInputElement, valor: string): void {
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  it('mantém o foco local da Home sem navegar pelo Header', () => {
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const headerFixture = TestBed.createComponent(GlobalSearchComponent);
    headerFixture.componentInstance.origem = 'header';
    headerFixture.detectChanges();
    document.body.appendChild(headerFixture.nativeElement);
    const headerInput = headerFixture.nativeElement.querySelector('input') as HTMLInputElement;
    const headerFocusSpy = spyOn(headerInput, 'focus').and.callThrough();
    const input = elemento<HTMLInputElement>('input');
    const focusSpy = spyOn(input, 'focus').and.callThrough();

    focar(input);
    fixture.detectChanges();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(headerFocusSpy).not.toHaveBeenCalled();
    expect(input.id).not.toBe(headerInput.id);
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(busca.estadoAtual.origem).toBe('home');
    expect(fixture.nativeElement.querySelector('.global-search__panel')).not.toBeNull();
    expect(headerFixture.nativeElement.querySelector('.global-search__panel')).toBeNull();

    headerFixture.destroy();
    headerFixture.nativeElement.remove();
  });

  it('mantém copy e atalhos distintos conforme a origem', () => {
    const input = elemento<HTMLInputElement>('input');
    const label = elemento<HTMLLabelElement>('label');
    const badge = elemento<HTMLElement>('.global-search__kbd');

    expect(input.placeholder).toBe('Buscar na Central...');
    expect(label.textContent?.trim()).toBe('Buscar na Central na página inicial');
    expect(input.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');
    expect(badge.textContent?.trim()).toBe('Ctrl/⌘ K');

    const headerFixture = TestBed.createComponent(GlobalSearchComponent);
    headerFixture.componentInstance.origem = 'header';
    headerFixture.detectChanges();
    document.body.appendChild(headerFixture.nativeElement);
    const headerInput = headerFixture.nativeElement.querySelector('input') as HTMLInputElement;
    const headerLabel = headerFixture.nativeElement.querySelector('label') as HTMLLabelElement;
    const headerBadge = headerFixture.nativeElement.querySelector('.global-search__kbd') as HTMLElement;

    expect(headerInput.placeholder).toBe('Pesquisar qualquer conteúdo...');
    expect(headerLabel.textContent?.trim()).toBe('Buscar na Central');
    expect(headerInput.getAttribute('aria-keyshortcuts')).toBe('Control+K Meta+K');
    expect(headerBadge.textContent?.trim()).toBe('Ctrl/⌘ K');

    headerFixture.destroy();
    headerFixture.nativeElement.remove();
  });

  it('filtra usando a consulta compartilhada e limita os resultados', () => {
    const input = elemento<HTMLInputElement>('input');
    digitar(input, 'sql');

    expect(indice.buscar).toHaveBeenCalledWith('sql', 8);
    expect(busca.estadoAtual.consulta).toBe('sql');
    expect(Array.from(fixture.nativeElement.querySelectorAll('[role="option"]')).length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('SQL');
  });

  it('trata Ctrl+K e Meta+K com preventDefault, foco e seleção no Header', () => {
    const headerFixture = TestBed.createComponent(GlobalSearchComponent);
    headerFixture.componentInstance.origem = 'header';
    headerFixture.detectChanges();
    document.body.appendChild(headerFixture.nativeElement);
    const input = headerFixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'sql';
    busca.atualizarConsulta('sql', 'header');
    headerFixture.detectChanges();
    const focusSpy = spyOn(input, 'focus').and.callThrough();
    const selectSpy = spyOn(input, 'select').and.callThrough();

    const ctrlEvent = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(ctrlEvent);
    headerFixture.detectChanges();

    expect(ctrlEvent.defaultPrevented).toBeTrue();
    expect(busca.estadoAtual.origem).toBe('header');
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(selectSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(input);

    const metaEvent = new KeyboardEvent('keydown', {
      key: 'K',
      metaKey: true,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(metaEvent);

    expect(metaEvent.defaultPrevented).toBeTrue();
    headerFixture.destroy();
    headerFixture.nativeElement.remove();
  });

  it('navega com setas e Enter usando a opção ativa', () => {
    const input = elemento<HTMLInputElement>('input');
    const navigateSpy = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    digitar(input, '');
    focar(input);
    fixture.detectChanges();

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-home-option-0');
    expect(elemento('[role="option"]').getAttribute('aria-selected')).toBe('true');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(input.getAttribute('aria-activedescendant')).toBe('global-search-home-option-2');

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(navigateSpy).toHaveBeenCalledWith('/agenda');
    expect(busca.buscaAberta).toBeFalse();
  });

  it('mantém opções fora da ordem de Tab e fecha quando o foco sai', () => {
    const input = elemento<HTMLInputElement>('input');
    focar(input);
    digitar(input, '');
    const option = elemento<HTMLAnchorElement>('[role="option"]');

    expect(option.getAttribute('tabindex')).toBe('-1');
    expect(option.tabIndex).toBe(-1);

    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    input.dispatchEvent(tabEvent);
    expect(tabEvent.defaultPrevented).toBeFalse();

    const outside = document.createElement('button');
    document.body.appendChild(outside);
    input.dispatchEvent(new FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: outside
    }));
    fixture.detectChanges();

    expect(busca.buscaAberta).toBeFalse();
    outside.remove();
  });

  it('fecha com Escape sem retirar o foco da busca local', () => {
    const input = elemento<HTMLInputElement>('input');
    focar(input);
    digitar(input, 'sql');
    focar(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(busca.buscaAberta).toBeFalse();
    expect(document.activeElement).toBe(input);
    expect(fixture.nativeElement.querySelector('.global-search__panel')).toBeNull();
  });

  it('expõe a semântica combobox/listbox e associa o status', () => {
    const input = elemento<HTMLInputElement>('input');
    focar(input);
    digitar(input, 'sql');

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('global-search-home-listbox');
    expect(elemento('label').getAttribute('for')).toBe(input.id);
    expect(elemento('[role="listbox"]').id).toBe('global-search-home-listbox');
    expect(elemento('[role="option"]').hasAttribute('aria-selected')).toBeTrue();
    expect(elemento('[role="status"]').textContent).toContain('resultado');
  });

  it('fecha somente ao sair do container e preserva clique no resultado', () => {
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const input = elemento<HTMLInputElement>('input');
    const container = elemento<HTMLElement>('.global-search');
    focar(input);
    digitar(input, '');
    const option = elemento<HTMLAnchorElement>('[role="option"]');

    option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(busca.buscaAberta).toBeFalse();

    focar(input);
    digitar(input, 'sql');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    container.dispatchEvent(new FocusEvent('focusout', {
      bubbles: true,
      relatedTarget: outside
    }));
    fixture.detectChanges();
    expect(busca.buscaAberta).toBeFalse();

    focar(input);
    digitar(input, 'sql');
    document.body.click();
    fixture.detectChanges();
    expect(busca.buscaAberta).toBeFalse();
    outside.remove();
  });

  it('mostra sugestões para termo vazio e mensagem útil sem correspondência', () => {
    const input = elemento<HTMLInputElement>('input');
    focar(input);
    fixture.detectChanges();

    expect(elemento('[role="status"]').textContent).toContain('sugestões');
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum resultado para');

    digitar(input, 'termo-inexistente');
    expect(elemento('[role="status"]').textContent).toContain('Nenhum resultado encontrado');
    expect(fixture.nativeElement.textContent).toContain('Tente outro termo');
  });

  it('respeita composição e pode ser destruído sem timer pendente', fakeAsync(() => {
    const input = elemento<HTMLInputElement>('input');
    focar(input);
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    input.dispatchEvent(composingEvent);

    expect(input.getAttribute('aria-activedescendant')).toBeNull();
    expect(busca.buscaAberta).toBeTrue();

    fixture.destroy();
    tick(200);
    expect(busca.buscaAberta).toBeTrue();
  }));
});
