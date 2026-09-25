import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { AuthService } from '@core/services/auth.service';
import { ColunasKanbanService } from '../../services/cadastros.service';
import { ProjetosService } from '../../services/projetos.service';
import {
  TarefasService,
  TarefaAtualizarRequest,
  TarefaCriarRequest,
  TarefaDetalhe
} from '../../services/tarefas.service';
import { ProjetoEtapaResumo } from '../../models/projeto.model';
import { TarefaFormComponent } from './tarefa-form.component';

function etapa(id: number, ordem: number, estado: ProjetoEtapaResumo['estado']): ProjetoEtapaResumo {
  return {
    id,
    ordem,
    nome: `Etapa ${ordem}`,
    estado,
    percentual: estado === 'Concluida' ? 100 : 50,
    checklistTotal: 0,
    checklistConcluidos: 0
  };
}

function tarefa(overrides: Partial<TarefaDetalhe> = {}): TarefaDetalhe {
  return {
    id: 77,
    projetoId: 10,
    projetoCodigo: 'PRJ-010',
    projetoNome: 'Projeto Alfa',
    projetoEtapaId: 102,
    colunaKanbanId: 3,
    titulo: 'Tarefa original',
    descricao: 'Descrição original',
    responsavelId: 'op-01',
    responsavelNome: 'Operador Um',
    criadorId: 'op-01',
    criadorNome: 'Operador Um',
    status: 'EmAndamento',
    prioridade: 2,
    ordem: 4,
    dataPrevisao: '2026-09-20',
    dataEntrega: '2026-10-15',
    tipo: 1,
    horasEstimadas: 8,
    bloqueada: false,
    arquivada: false,
    responsaveis: [{ operadorId: 'op-01', nome: 'Operador Um' }],
    chamados: [{ chamadoId: 500, titulo: 'Chamado de teste' }],
    apontamentos: [],
    comentarios: [],
    dataInclusao: '2026-09-01T10:00:00Z',
    usuarioInclusao: 'Operador Um',
    ...overrides
  };
}

describe('TarefaFormComponent', () => {
  let fixture: ComponentFixture<TarefaFormComponent>;
  let component: TarefaFormComponent;
  let tarefasSpy: jasmine.SpyObj<TarefasService>;
  let projetosSpy: jasmine.SpyObj<ProjetosService>;
  let colunasSpy: jasmine.SpyObj<ColunasKanbanService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRoute: ActivatedRoute;

  beforeEach(async () => {
    tarefasSpy = jasmine.createSpyObj<TarefasService>('TarefasService', [
      'obter',
      'criar',
      'atualizar',
      'listarOperadores',
      'buscarChamados'
    ]);
    projetosSpy = jasmine.createSpyObj<ProjetosService>('ProjetosService', ['listar', 'obterEtapasProjeto']);
    colunasSpy = jasmine.createSpyObj<ColunasKanbanService>('ColunasKanbanService', ['listar']);
    authSpy = jasmine.createSpyObj<AuthService>('AuthService', ['getOperadorLogado', 'getOperadorLogadoCompleto']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    activatedRoute = {
      snapshot: {
        paramMap: convertToParamMap({}),
        queryParamMap: convertToParamMap({})
      }
    } as unknown as ActivatedRoute;

    tarefasSpy.obter.and.returnValue(of(tarefa()));
    tarefasSpy.criar.and.returnValue(of(tarefa()));
    tarefasSpy.atualizar.and.returnValue(of(tarefa()));
    tarefasSpy.listarOperadores.and.returnValue(of([]));
    tarefasSpy.buscarChamados.and.returnValue(of([]));
    projetosSpy.listar.and.returnValue(of([]));
    projetosSpy.obterEtapasProjeto.and.returnValue(of([
      etapa(101, 1, 'Concluida'),
      etapa(102, 2, 'EmAndamento'),
      etapa(103, 3, 'Pendente')
    ]));
    colunasSpy.listar.and.returnValue(of([]));
    authSpy.getOperadorLogado.and.returnValue('op-01');
    authSpy.getOperadorLogadoCompleto.and.returnValue({ id: 'op-01', nome: 'Operador Um', perfil: 'Usuario' });
    routerSpy.navigate.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [TarefaFormComponent],
      providers: [
        { provide: TarefasService, useValue: tarefasSpy },
        { provide: ProjetosService, useValue: projetosSpy },
        { provide: ColunasKanbanService, useValue: colunasSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
  });

  function configurarRota(params: Record<string, string> = {}, queryParams: Record<string, string> = {}): void {
    (activatedRoute.snapshot as { paramMap: ParamMap; queryParamMap: ParamMap }).paramMap = convertToParamMap(params);
    (activatedRoute.snapshot as { paramMap: ParamMap; queryParamMap: ParamMap }).queryParamMap = convertToParamMap(queryParams);
  }

  async function iniciar(): Promise<void> {
    fixture = TestBed.createComponent(TarefaFormComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  }

  function preencherCamposObrigatorios(): void {
    component.titulo.set('Tarefa válida');
    component.responsavelIds.set(['op-01']);
    component.dataEntrega.set('2026-10-15');
  }

  function selecionar(id: string): HTMLSelectElement {
    return fixture.nativeElement.querySelector(`#${id}`) as HTMLSelectElement;
  }

  function mensagemEtapa(): HTMLElement | null {
    return fixture.nativeElement.querySelector('#etapaFixa-mensagem');
  }

  function botaoTentarNovamente(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('.imp-form__hint-action');
  }

  function alterarEtapa(select: HTMLSelectElement, valor: string): void {
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('mantém Etapa visível e desabilitada no create sem projeto', async () => {
    await iniciar();
    preencherCamposObrigatorios();
    fixture.detectChanges();

    const etapaSelect = selecionar('etapaFixa');
    expect(etapaSelect).not.toBeNull();
    expect(etapaSelect.disabled).toBeTrue();
    expect(etapaSelect.options[0].textContent).toContain('Selecione um projeto primeiro');
    expect(fixture.nativeElement.textContent).toContain('Selecione um projeto para carregar e escolher uma etapa válida.');
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.podeSalvar()).toBeTrue();
  });

  it('carrega as etapas, mostra o loading e seleciona um default válido no create', async () => {
    const etapas = new Subject<ProjetoEtapaResumo[]>();
    projetosSpy.obterEtapasProjeto.and.returnValue(etapas);
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    fixture.detectChanges();

    const etapaSelect = selecionar('etapaFixa');
    expect(projetosSpy.obterEtapasProjeto).toHaveBeenCalledWith(10);
    expect(component.etapasLoading()).toBeTrue();
    expect(component.podeSalvar()).toBeFalse();
    expect(etapaSelect.disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Carregando etapas do projeto selecionado');

    etapas.next([
      etapa(101, 1, 'Concluida'),
      etapa(102, 2, 'EmAndamento'),
      etapa(103, 3, 'Pendente')
    ]);
    etapas.complete();
    fixture.detectChanges();

    expect(component.etapasLoading()).toBeFalse();
    expect(component.projetoEtapaId()).toBe(102);
    expect(selecionar('etapaFixa').disabled).toBeFalse();
    expect(selecionar('etapaFixa').selectedOptions[0].textContent?.trim()).toBe('2 — Etapa 2');
    expect(component.podeSalvar()).toBeTrue();

    component.onSubmit();

    const request = tarefasSpy.criar.calls.mostRecent().args[0] as TarefaCriarRequest;
    expect(request.projetoId).toBe(10);
    expect(request.projetoEtapaId).toBe(102);
  });

  it('exibe erro de etapas e bloqueia o create quando a carga do projeto falha', async () => {
    projetosSpy.obterEtapasProjeto.and.returnValue(throwError(() => new Error('falha ao carregar etapas')));
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    fixture.detectChanges();

    expect(component.etapasLoading()).toBeFalse();
    expect(component.etapasError()).toContain('Não foi possível carregar as etapas do projeto');
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.podeSalvar()).toBeFalse();
    expect(selecionar('etapaFixa').disabled).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar as etapas do projeto');
  });

  it('limpa etapas ao trocar ou remover projeto e ignora respostas antigas', async () => {
    const respostaProjetoDez = new Subject<ProjetoEtapaResumo[]>();
    const respostaProjetoVinte = new Subject<ProjetoEtapaResumo[]>();
    projetosSpy.obterEtapasProjeto.and.returnValues(respostaProjetoDez, respostaProjetoVinte);
    await iniciar();

    component.aoMudarProjeto(10);
    component.projetoEtapaId.set(999);
    component.aoMudarProjeto(20);
    fixture.detectChanges();

    expect(component.projetoId()).toBe(20);
    expect(component.etapasFixas()).toEqual([]);
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.etapasLoading()).toBeTrue();
    expect(component.podeSalvar()).toBeFalse();

    respostaProjetoDez.next([etapa(109, 1, 'EmAndamento')]);
    respostaProjetoDez.complete();
    fixture.detectChanges();

    expect(component.projetoId()).toBe(20);
    expect(component.etapasFixas()).toEqual([]);
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.etapasLoading()).toBeTrue();

    component.aoMudarProjeto(null);
    respostaProjetoVinte.next([etapa(209, 1, 'EmAndamento')]);
    respostaProjetoVinte.complete();
    fixture.detectChanges();

    expect(component.projetoId()).toBeNull();
    expect(component.etapasFixas()).toEqual([]);
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.etapasLoading()).toBeFalse();
    expect(component.etapasError()).toBeNull();
    expect(selecionar('etapaFixa').disabled).toBeTrue();
  });

  it('preserva projeto e etapa no edit e não envia projetoId no update', async () => {
    const detalhe = tarefa({ id: 99, projetoId: 10, projetoEtapaId: 102 });
    configurarRota({ id: '99' });
    tarefasSpy.obter.and.returnValue(of(detalhe));
    projetosSpy.obterEtapasProjeto.and.returnValue(of([
      etapa(101, 1, 'Concluida'),
      etapa(102, 2, 'EmAndamento'),
      etapa(103, 3, 'Pendente')
    ]));
    await iniciar();
    fixture.detectChanges();

    expect(component.modoAtual()).toBe('edit');
    expect(component.projetoId()).toBe(10);
    expect(component.projetoEtapaId()).toBe(102);
    expect(selecionar('projeto').disabled).toBeTrue();
    expect(selecionar('etapaFixa').disabled).toBeFalse();
    expect(selecionar('etapaFixa').selectedOptions[0].textContent?.trim()).toBe('2 — Etapa 2');
    expect(component.podeSalvar()).toBeTrue();

    tarefasSpy.atualizar.and.returnValue(of(detalhe));
    component.onSubmit();
    fixture.detectChanges();

    expect(tarefasSpy.criar).not.toHaveBeenCalled();
    expect(tarefasSpy.atualizar).toHaveBeenCalledTimes(1);
    expect(projetosSpy.obterEtapasProjeto).toHaveBeenCalledTimes(1);
    expect(component.projetoEtapaId()).toBe(102);
    expect(component.etapasError()).toBeNull();
    expect(component.podeSalvar()).toBeTrue();
    const request = tarefasSpy.atualizar.calls.mostRecent().args[1] as TarefaAtualizarRequest;
    expect(request.projetoEtapaId).toBe(102);
    expect(Object.prototype.hasOwnProperty.call(request, 'projetoId')).toBeFalse();
  });

  it('consome tarefaId no create de duplicação e cria uma nova tarefa com projeto e etapa', async () => {
    const detalhe = tarefa({
      id: 77,
      projetoId: 20,
      projetoEtapaId: 202,
      titulo: 'Tarefa duplicada',
      descricao: 'Conteúdo para a cópia',
      responsaveis: [{ operadorId: 'op-02', nome: 'Operador Dois' }]
    });
    configurarRota({}, { tarefaId: '77' });
    tarefasSpy.obter.and.returnValue(of(detalhe));
    projetosSpy.obterEtapasProjeto.and.returnValue(of([
      etapa(201, 1, 'Pendente'),
      etapa(202, 2, 'EmAndamento')
    ]));
    await iniciar();
    fixture.detectChanges();

    expect(tarefasSpy.obter).toHaveBeenCalledWith(77);
    expect(component.modoAtual()).toBe('create');
    expect(component.tarefaId()).toBeNull();
    expect(component.tituloPagina()).toBe('Nova Tarefa');
    expect(component.titulo()).toBe('Tarefa duplicada');
    expect(component.descricao()).toBe('Conteúdo para a cópia');
    expect(component.responsavelIds()).toEqual(['op-02']);
    expect(component.projetoId()).toBe(20);
    expect(component.projetoEtapaId()).toBe(202);
    expect(selecionar('projeto').disabled).toBeFalse();
    expect(selecionar('etapaFixa').selectedOptions[0].textContent?.trim()).toBe('2 — Etapa 2');

    tarefasSpy.criar.and.returnValue(of({ ...detalhe, id: 78 }));
    component.onSubmit();

    expect(tarefasSpy.atualizar).not.toHaveBeenCalled();
    expect(tarefasSpy.criar).toHaveBeenCalledTimes(1);
    const request = tarefasSpy.criar.calls.mostRecent().args[0] as TarefaCriarRequest;
    expect(request.projetoId).toBe(20);
    expect(request.projetoEtapaId).toBe(202);
  });

  it('troca a etapa pelo evento change e volta ao placeholder bloqueando o save', async () => {
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    fixture.detectChanges();

    const etapaSelect = selecionar('etapaFixa');
    expect(component.projetoEtapaId()).toBe(102);

    alterarEtapa(etapaSelect, '103');

    expect(component.projetoEtapaId()).toBe(103);
    expect(etapaSelect.selectedOptions[0].textContent?.trim()).toBe('3 — Etapa 3');
    expect(component.podeSalvar()).toBeTrue();

    alterarEtapa(etapaSelect, '');

    expect(component.projetoEtapaId()).toBeNull();
    expect(component.podeSalvar()).toBeFalse();
    expect(etapaSelect.options[0].textContent?.trim()).toBe('Selecione a etapa...');
  });

  it('escolhe a primeira etapa como fallback quando todas estão concluídas', async () => {
    projetosSpy.obterEtapasProjeto.and.returnValue(of([
      etapa(101, 1, 'Concluida'),
      etapa(102, 2, 'Concluida')
    ]));
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    fixture.detectChanges();

    expect(component.projetoEtapaId()).toBe(101);
    expect(component.etapasVazia()).toBeFalse();
    expect(component.etapasError()).toBeNull();
    expect(component.podeSalvar()).toBeTrue();
  });

  it('trata lista vazia como nenhuma etapa cadastrada, sem virar erro de comunicação', async () => {
    projetosSpy.obterEtapasProjeto.and.returnValue(of([]));
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    fixture.detectChanges();

    expect(component.etapasVazia()).toBeTrue();
    expect(component.etapasError()).toBeNull();
    expect(component.projetoEtapaId()).toBeNull();
    expect(component.podeSalvar()).toBeFalse();
    expect(selecionar('etapaFixa').required).toBeTrue();

    const mensagem = mensagemEtapa();
    expect(mensagem).not.toBeNull();
    expect(mensagem!.getAttribute('role')).toBe('status');
    expect(mensagem!.textContent).toContain('Nenhuma etapa cadastrada para este projeto.');
    expect(selecionar('etapaFixa').getAttribute('aria-describedby')).toBe('etapaFixa-mensagem');
    expect(botaoTentarNovamente()).toBeNull();
  });

  it('cria sem projeto sem enviar projetoEtapaId no payload', async () => {
    await iniciar();
    preencherCamposObrigatorios();
    fixture.detectChanges();

    expect(component.temProjeto()).toBeFalse();
    expect(component.projetoEtapaId()).toBeNull();
    expect(selecionar('etapaFixa').hasAttribute('required')).toBeFalse();
    expect(selecionar('etapaFixa').getAttribute('aria-describedby')).toBe('etapaFixa-mensagem');
    expect(selecionar('etapaFixa').options[0].textContent?.trim()).toBe('Selecione um projeto primeiro');

    component.onSubmit();

    expect(tarefasSpy.criar).toHaveBeenCalledTimes(1);
    const request = tarefasSpy.criar.calls.mostRecent().args[0] as TarefaCriarRequest;
    expect(request.projetoId).toBeUndefined();
    expect(request.projetoEtapaId).toBeUndefined();
    expect(JSON.parse(JSON.stringify(request)).projetoEtapaId).toBeUndefined();
  });

  it('descarta resposta obsoleta que chega por error sem contaminar o estado', async () => {
    const respostaProjetoDez = new Subject<ProjetoEtapaResumo[]>();
    projetosSpy.obterEtapasProjeto.and.returnValues(
      respostaProjetoDez,
      of([etapa(209, 1, 'EmAndamento')])
    );
    await iniciar();
    preencherCamposObrigatorios();
    component.aoMudarProjeto(10);
    component.aoMudarProjeto(20);
    respostaProjetoDez.error(new Error('falha antiga do projeto 10'));
    fixture.detectChanges();

    expect(component.projetoId()).toBe(20);
    expect(component.etapasError()).toBeNull();
    expect(component.etapasVazia()).toBeFalse();
    expect(component.etapasFixas().map(e => e.id)).toEqual([209]);
    expect(component.projetoEtapaId()).toBe(209);
    expect(component.podeSalvar()).toBeTrue();
  });

  it('recupera as etapas no edit pelo Tentar novamente com o projeto desabilitado', async () => {
    const detalhe = tarefa({ id: 99, projetoId: 10, projetoEtapaId: 102 });
    configurarRota({ id: '99' });
    tarefasSpy.obter.and.returnValue(of(detalhe));
    projetosSpy.obterEtapasProjeto.and.returnValues(
      throwError(() => new Error('falha ao carregar etapas')),
      of([etapa(101, 1, 'Concluida'), etapa(102, 2, 'EmAndamento')])
    );
    await iniciar();
    fixture.detectChanges();

    expect(component.etapasError()).toContain('Não foi possível carregar as etapas do projeto');
    expect(component.etapasError()).not.toContain('Selecione o projeto');
    expect(component.podeSalvar()).toBeFalse();
    expect(selecionar('projeto').disabled).toBeTrue();
    expect(selecionar('etapaFixa').disabled).toBeTrue();
    expect(mensagemEtapa()!.getAttribute('role')).toBe('alert');

    const botao = botaoTentarNovamente();
    expect(botao).not.toBeNull();
    expect(botao!.textContent).toContain('Tentar novamente');

    botao!.click();
    fixture.detectChanges();

    expect(projetosSpy.obterEtapasProjeto).toHaveBeenCalledTimes(2);
    expect(projetosSpy.obterEtapasProjeto).toHaveBeenCalledWith(10);
    expect(component.etapasError()).toBeNull();
    expect(component.etapasVazia()).toBeFalse();
    expect(component.projetoEtapaId()).toBe(102);
    expect(component.podeSalvar()).toBeTrue();
    expect(mensagemEtapa()).toBeNull();
    expect(botaoTentarNovamente()).toBeNull();
    expect(selecionar('etapaFixa').getAttribute('aria-describedby')).toBeNull();
  });
});
