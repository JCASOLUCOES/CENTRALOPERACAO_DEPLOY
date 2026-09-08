import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { buscarMultiTerm } from '@shared/utils/texto.helper';
import { AcessosService, EmpresaDetalhe, EmpresaResumo } from '../services/acessos.service';
import { BuscaService } from '@core/services/busca.service';

interface CampoDetalhe {
  label: string;
  valor: string;
  informado: boolean;
  tipo: 'texto' | 'senha' | 'link';
  multilinha?: boolean;
  chave: string;
}

interface GrupoDetalhe {
  titulo: string;
  icone: string;
  classe: string;
  campos: CampoDetalhe[];
}

const TEMPO_EXPIRACAO_DETALHE_MS = 5 * 60 * 1000;

@Component({
  selector: 'app-acessos',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './acessos.component.html',
  styleUrl: './acessos.component.scss'
})
export class AcessosComponent implements OnInit, OnDestroy {
  @ViewChild('senhaModalRef') senhaRef!: TemplateRef<any>;
  @ViewChild('detalheModalRef') detalheRef!: TemplateRef<any>;

  empresas: EmpresaResumo[] = [];
  empresasFiltradas: EmpresaResumo[] = [];
  termoBusca = '';
  carregando = true;
  erro = '';

  empresaSelecionada: EmpresaResumo | null = null;
  empresaDetalhe: EmpresaDetalhe | null = null;
  gruposDetalhe: GrupoDetalhe[] = [];

  modalUsuario = '';
  modalSenha = '';
  senhaErro = '';
  carregandoDetalhe = false;

  senhasVisiveis: Record<string, boolean> = {};
  copiadoId: string | null = null;

  private isBrowser: boolean;
  private detalheModalRef: any = null;
  private senhaModalRefAtual: any = null;
  private timeoutDetalhe: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly service: AcessosService,
    private readonly modalService: NgbModal,
    private readonly buscaService: BuscaService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.carregarEmpresas();
  }

  ngOnDestroy(): void {
    this.pararTimeoutDetalhe();
    if (this.senhaModalRefAtual) {
      this.senhaModalRefAtual.dismiss();
      this.senhaModalRefAtual = null;
    }
  }

  carregarEmpresas(): void {
    this.carregando = true;
    this.erro = '';
    this.service.listarEmpresas().subscribe({
      next: (empresas) => {
        this.empresas = empresas;
        this.empresasFiltradas = [...empresas].sort((a, b) =>
          a.nomeEmpresa.localeCompare(b.nomeEmpresa)
        );
        this.carregando = false;
      },
      error: (err) => {
        this.erro = err.error?.mensagem || 'Erro ao carregar lista de empresas. Tente novamente.';
        this.carregando = false;
      }
    });
  }

  aplicarBusca(event: Event): void {
    this.termoBusca = (event.target as HTMLInputElement).value;
    this.filtrar();
  }

  filtrar(): void {
    this.empresasFiltradas = this.empresas
      .filter(e => !this.termoBusca.trim() || buscarMultiTerm(this.termoBusca, e.nomeEmpresa))
      .sort((a, b) => a.nomeEmpresa.localeCompare(b.nomeEmpresa));
  }

  abrirDetalhe(empresa: EmpresaResumo): void {
    this.empresaDetalhe = null;
    this.gruposDetalhe = [];
    this.empresaSelecionada = empresa;
    this.modalUsuario = '';
    this.modalSenha = '';
    this.senhaErro = '';
    this.carregandoDetalhe = false;

    this.buscaService.fecharBusca();

    this.abrirSenhaModal();
  }

  confirmarSenha(modal: any): void {
    if (!this.modalUsuario.trim() || !this.modalSenha.trim() || !this.empresaSelecionada) return;

    this.carregandoDetalhe = true;
    this.senhaErro = '';

    this.service.validarSenha(this.modalUsuario, this.modalSenha).subscribe({
      next: (response) => {
        if (!response.valid) {
          this.senhaErro = response.message || 'Credenciais incorretas.';
          this.carregandoDetalhe = false;
          return;
        }
        this.carregandoDetalhe = false;
        modal.close();
        this.abrirModalDetalhe();
      },
      error: (err) => {
        this.senhaErro = err.error?.mensagem || 'Erro ao validar credenciais. Tente novamente.';
        this.carregandoDetalhe = false;
      }
    });
  }

  private abrirSenhaModal(): void {
    // Garante uma única instância: fecha qualquer modal de senha pendente
    this.fecharSenhaModalPendente();

    const ref = this.modalService.open(this.senhaRef, { centered: true, size: 'sm' });
    this.senhaModalRefAtual = ref;

    const limpar = (): void => {
      if (this.senhaModalRefAtual === ref) {
        this.senhaModalRefAtual = null;
      }
    };
    ref.result.then(limpar, limpar);
  }

  private fecharSenhaModalPendente(): void {
    if (this.senhaModalRefAtual) {
      const pendente = this.senhaModalRefAtual;
      this.senhaModalRefAtual = null;
      pendente.dismiss('troca-empresa');
    }
  }

  private abrirModalDetalhe(): void {
    if (!this.empresaSelecionada) return;

    this.empresaDetalhe = null;
    this.gruposDetalhe = [];
    this.senhasVisiveis = {};
    this.copiadoId = null;
    this.carregandoDetalhe = true;

    this.service.obterDetalhe(this.empresaSelecionada.id, this.modalSenha).subscribe({
      next: (detalhe) => {
        this.empresaDetalhe = detalhe;
        this.gruposDetalhe = this.montarGrupos(detalhe);
        this.carregandoDetalhe = false;

        const ref = this.modalService.open(this.detalheRef, { centered: true, size: 'lg' });
        this.detalheModalRef = ref;
        this.iniciarTimeoutDetalhe();
        ref.result.then(
          () => this.limparDetalhe(),
          () => this.limparDetalhe()
        );
      },
      error: (err) => {
        this.carregandoDetalhe = false;
        this.senhaErro = err.error?.mensagem || 'Erro ao obter as credenciais. Tente novamente.';
        this.abrirSenhaModal();
      }
    });
  }

  private montarGrupos(detalhe: EmpresaDetalhe): GrupoDetalhe[] {
    const campo = (label: string, valor: string | undefined, tipo: CampoDetalhe['tipo'], chave: string, multilinha = false): CampoDetalhe => {
      const texto = valor?.trim() || '';
      return {
        label,
        valor: texto || 'Não informado',
        informado: texto.length > 0,
        tipo,
        multilinha,
        chave
      };
    };

    return [
      {
        titulo: 'TS (RDP)',
        icone: 'bi-hdd-network',
        classe: 'ts',
        campos: [
          campo('Possui acesso', detalhe.tsAcesso, 'texto', 'ts-acesso'),
          campo('Endereço', detalhe.tsEndereco, 'texto', 'ts-endereco'),
          campo('Usuário / Senha', detalhe.tsUsuarioSenha, 'senha', 'ts-senha')
        ]
      },
      {
        titulo: 'Banco de Dados',
        icone: 'bi-database',
        classe: 'banco',
        campos: [
          campo('Nome do banco', detalhe.bancoNome, 'texto', 'banco-nome'),
          campo('IP', detalhe.bancoIP, 'texto', 'banco-ip'),
          campo('Usuário / Senha', detalhe.bancoUsuarioSenha, 'senha', 'banco-senha')
        ]
      },
      {
        titulo: 'VPN',
        icone: 'bi-shield-lock',
        classe: 'vpn',
        campos: [
          campo('Possui VPN', detalhe.vpn, 'texto', 'vpn-tipo'),
          campo('Nome', detalhe.vpnNome, 'texto', 'vpn-nome'),
          campo('Gateway / Porta', detalhe.vpnGateway, 'texto', 'vpn-gateway'),
          campo('Usuário / Senha', detalhe.vpnUsuarioSenha, 'senha', 'vpn-senha')
        ]
      },
      {
        titulo: 'Actyon',
        icone: 'bi-globe',
        classe: 'actyon',
        campos: [
          campo('Versão COB', detalhe.versaoCob, 'texto', 'actyon-versao'),
          campo('Acesso Config Actyon COB', detalhe.acessoConfigActyonCob, 'texto', 'actyon-config'),
          campo('Acesso Actyon Web', detalhe.acessoActyonWeb, 'link', 'actyon-web')
        ]
      },
      {
        titulo: 'Suporte Remoto',
        icone: 'bi-display',
        classe: 'suporte',
        campos: [
          campo('AnyDesk', detalhe.anyDesk, 'senha', 'anydesk')
        ]
      },
      {
        titulo: 'Observações',
        icone: 'bi-chat-left-text',
        classe: 'observacoes',
        campos: [
          campo('Observações', detalhe.observacoes, 'texto', 'observacoes', true)
        ]
      }
    ];
  }

  private iniciarTimeoutDetalhe(): void {
    this.pararTimeoutDetalhe();
    this.timeoutDetalhe = setTimeout(() => this.fecharPorTimeout(), TEMPO_EXPIRACAO_DETALHE_MS);
  }

  private pararTimeoutDetalhe(): void {
    if (this.timeoutDetalhe !== null) {
      clearTimeout(this.timeoutDetalhe);
      this.timeoutDetalhe = null;
    }
  }

  private fecharPorTimeout(): void {
    if (this.detalheModalRef) {
      this.detalheModalRef.close();
      this.detalheModalRef = null;
    }
  }

  private limparDetalhe(): void {
    this.pararTimeoutDetalhe();
    this.detalheModalRef = null;
    this.empresaDetalhe = null;
    this.gruposDetalhe = [];
    this.empresaSelecionada = null;
    this.modalUsuario = '';
    this.modalSenha = '';
    this.senhaErro = '';
    this.senhasVisiveis = {};
    this.copiadoId = null;
  }

  toggleSenha(chave: string): void {
    this.senhasVisiveis[chave] = !this.senhasVisiveis[chave];
  }

  copiar(texto: string, chave: string): void {
    if (!texto || !this.isBrowser) return;
    navigator.clipboard.writeText(texto).then(() => {
      this.copiadoId = chave;
      setTimeout(() => {
        if (this.copiadoId === chave) this.copiadoId = null;
      }, 2000);
    });
  }

  abrirLink(url: string): void {
    if (url && this.isBrowser) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  ehUrl(valor: string): boolean {
    return /^https?:\/\//i.test(valor.trim());
  }

  get totalEmpresas(): number {
    return this.empresas.length;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
