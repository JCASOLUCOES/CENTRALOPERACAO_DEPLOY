import { BuscaService } from './busca.service';

describe('BuscaService', () => {
  let service: BuscaService;

  beforeEach(() => {
    service = new BuscaService();
  });

  it('começa fechado sem origem e com consulta vazia', () => {
    expect(service.buscaAberta).toBeFalse();
    expect(service.estadoAtual).toEqual({ aberta: false, origem: null, consulta: '' });
  });

  it('mantém uma única origem aberta', () => {
    service.abrirBusca('home');
    expect(service.estadoAtual.origem).toBe('home');

    service.abrirBusca('header');
    expect(service.estadoAtual.origem).toBe('header');
    expect(service.buscaAberta).toBeTrue();
  });

  it('compartilha a consulta entre as entradas', () => {
    service.atualizarConsulta('sql', 'home');
    service.abrirBusca('header');

    expect(service.estadoAtual.consulta).toBe('sql');
    expect(service.estadoAtual.origem).toBe('header');
  });

  it('fecha sem apagar a consulta e permite fechar por origem', () => {
    service.atualizarConsulta('rede', 'home');
    service.fecharBusca('header');

    expect(service.buscaAberta).toBeTrue();
    expect(service.estadoAtual.origem).toBe('home');

    service.fecharBusca('home');
    expect(service.buscaAberta).toBeFalse();
    expect(service.estadoAtual.origem).toBeNull();
    expect(service.estadoAtual.consulta).toBe('rede');
  });

  it('mantém o observable booleano compatível', () => {
    const valores: boolean[] = [];
    const assinatura = service.buscaAberta$.subscribe(valor => valores.push(valor));

    service.abrirBusca('header');
    service.fecharBusca();
    service.abrirBusca('home');
    assinatura.unsubscribe();

    expect(valores).toEqual([false, true, false, true]);
  });
});
