import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import { Component, OnInit, OnDestroy, signal, inject, Input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgbActiveModal } from "@ng-bootstrap/ng-bootstrap";
import { AgendaService, AgendaResumo, AgendaDetalhe, TipoEventoResponse, AgendaCriarRequest, AgendaAtualizarRequest, ErroConflito, AgendaCriarLoteRequest, AgendaLoteResponse } from "./services/agenda.service";
import { OperadoresService, OperadorResumo } from "@core/services/operadores.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-agenda-evento-modal",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./agenda-evento-modal.component.html",
  styleUrl: "./agenda-evento-modal.component.scss"
})
export class AgendaEventoModalComponent implements OnInit, OnDestroy {
  private readonly activeModal = inject(NgbActiveModal);
  private readonly agendaSvc = inject(AgendaService);
  private readonly operadoresSvc = inject(OperadoresService);
  private readonly destroy$ = new Subject<void>();

  @Input() inicio = signal<Date>(new Date());
  @Input() eventoEdicao?: AgendaResumo;
  @Input() usuarioLogado = "admin";
  @Input() isAdmin = false;
  @Input() somenteLeitura = false;
  @Input() tipos: TipoEventoResponse[] = [];
  @Input() operadores: OperadorResumo[] = [];

  readonly closed = new Subject<void>();

  readonly salvando = signal(false);
  readonly erroMsg = signal<string | null>(null);
  readonly conflitos = signal<AgendaResumo[]>([]);

  // form
  titulo = "";
  descricao = "";
  local = "";
  dataInicio = "";
  horaInicio = "09:00";
  dataFim = "";
  horaFim = "";
  diaInteiro = false;
  tipoId: number | null = null;
  responsavelId = "";
  projetoId?: number;
  /** 0=Normal, 1=Alta, 2=Cr�tica */
  prioridade = 0;
  dataRepeticaoFim = "";
  /** Padrão de recorrência do lote: 1=Diária, 2=Semanal, 3=Mensal. */
  padraoRecorrencia = 1;

  ngOnInit(): void {
    if (this.eventoEdicao) {
      const e = this.eventoEdicao;
      this.titulo = e.titulo;
      this.tipoId = e.tipoId ?? null;
      this.responsavelId = e.operadorId;
      this.projetoId = e.projetoId ?? undefined;
      this.prioridade = e.prioridade ?? 0;
      this.diaInteiro = e.diaInteiro;
      this.carregarDetalhes(e.id);
    } else {
      const d = this.inicio();
      this.dataInicio = this.formatarData(d);
      this.horaInicio = this.formatarHora(d);
      // Preencher respons�vel automaticamente ao criar novo evento
      this.responsavelId = this.usuarioLogado;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarDetalhes(id: number): void {
    this.agendaSvc.obterEvento(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: d => {
          this.descricao = d.descricao ?? "";
          this.local = d.local ?? "";
          this.prioridade = d.prioridade ?? 0;
          const ini = new Date(d.dataInicio);
          this.dataInicio = this.formatarData(ini);
          this.horaInicio = this.formatarHora(ini);
          if (d.dataFim) {
            const fim = new Date(d.dataFim);
            this.dataFim = this.formatarData(fim);
            this.horaFim = this.formatarHora(fim);
          }
        },
        error: () => this.erroMsg.set("N�o foi poss�vel carregar o evento.")
      });
  }

  private formatarData(d: Date): string {
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  private formatarHora(d: Date): string {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  private combinar(data: string, hora: string): Date {
    const [a, m, d] = data.split("-").map(Number);
    const [h, mm] = (hora || "00:00").split(":").map(Number);
    return new Date(a, (m || 1) - 1, d || 1, h || 0, mm || 0, 0, 0);
  }

  /** Hora in�cio + 1h (sugest�o de fim quando s� a data fim � informada). */
  private sugerirHoraFim(): string {
    const [h, m] = (this.horaInicio || "09:00").split(":").map(Number);
    const total = (((h || 0) * 60 + (m || 0) + 60) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  /** Fim efetivo: completa a parte faltante em vez de descartar o fim. */
  private combinarFim(): Date | null {
    if (!this.dataFim && !this.horaFim) return null;
    return this.combinar(this.dataFim || this.dataInicio, this.horaFim || this.horaInicio);
  }

  aoAlterarHoraFim(): void {
    this.conflitos.set([]);
    if (this.horaFim && !this.dataFim) this.dataFim = this.dataInicio;
  }

  aoAlterarDataFim(): void {
    this.conflitos.set([]);
    if (this.dataFim && !this.horaFim) this.horaFim = this.sugerirHoraFim();
  }

  // ---------- regras rígidas por tipo (espelho do backend) ----------

  private normalizarTipo(s: string): string {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  private nomeTipoSelecionado(): string {
    return this.tipos.find(t => t.id === this.tipoId)?.nome ?? "";
  }

  /** FÉRIAS: sempre dia inteiro, sem horário. */
  regraFerias(): boolean {
    return this.normalizarTipo(this.nomeTipoSelecionado()) === "FERIAS";
  }

  /** TREINAMENTO/DAILY/REUNIÃO/ATENDIMENTO: exigem horário, proíbem dia inteiro. */
  regraComHorario(): boolean {
    return ["TREINAMENTO", "DAILY", "REUNIAO", "ATENDIMENTO"].includes(this.normalizarTipo(this.nomeTipoSelecionado()));
  }

  /** REUNIÃO/ATENDIMENTO: apenas um dia (sem repetição/span). */
  regraDiaUnico(): boolean {
    return ["REUNIAO", "ATENDIMENTO"].includes(this.normalizarTipo(this.nomeTipoSelecionado()));
  }

  /** TREINAMENTO/DAILY: permitem recorrência semanal/mensal. */
  regraPermitePadrao(): boolean {
    return ["TREINAMENTO", "DAILY"].includes(this.normalizarTipo(this.nomeTipoSelecionado()));
  }

  aoAlterarTipo(): void {
    this.conflitos.set([]);
    if (this.regraFerias()) {
      this.diaInteiro = true;
      this.dataRepeticaoFim = "";
    } else if (this.regraComHorario()) {
      this.diaInteiro = false;
    }
    if (this.regraDiaUnico()) {
      this.dataRepeticaoFim = "";
    }
    if (!this.regraPermitePadrao()) {
      this.padraoRecorrencia = 1;
    }
  }

  validarFormulario(): boolean {
    this.erroMsg.set(null);
    if (!this.titulo.trim()) {
      this.erroMsg.set("T�tulo � obrigat�rio.");
      return false;
    }
    if (!this.dataInicio) {
      this.erroMsg.set("Data de in�cio � obrigat�ria.");
      return false;
    }
    if (!this.tipoId) {
      this.erroMsg.set("Tipo � obrigat�rio.");
      return false;
    }
    if (!this.responsavelId) {
      this.erroMsg.set("Respons�vel � obrigat�rio.");
      return false;
    }

    const isLote = this.dataRepeticaoFim;
    if (isLote) {
      if (!this.dataRepeticaoFim) {
        this.erroMsg.set("Data de repeti��o � obrigat�ria para eventos repetidos.");
        return false;
      }
      if (this.dataRepeticaoFim < this.dataInicio) {
        this.erroMsg.set("Data de repeti��o deve ser maior ou igual � data de in�cio.");
        return false;
      }
    }

    const fimValidacao = (this.dataFim || this.horaFim)
      ? this.combinar(this.dataFim || this.dataInicio, this.horaFim || this.horaInicio)
      : null;
    if (fimValidacao) {
      const ini = this.combinar(this.dataInicio, this.horaInicio);
      if (fimValidacao <= ini) {
        this.erroMsg.set("Data/hora final deve ser posterior � inicial.");
        return false;
      }
    }

    // Regras rígidas por tipo (espelho do backend).
    const tipoNome = this.nomeTipoSelecionado() || "Este tipo";
    if (this.regraFerias()) {
      // Férias é um período simples: Data fim (retorno) obrigatória após o início, sem repetição.
      if (!this.dataFim || this.dataFim <= this.dataInicio) {
        this.erroMsg.set(`${tipoNome}: defina a data de retorno (após o início).`);
        return false;
      }
    } else {
      if (this.regraComHorario() && this.diaInteiro) {
        this.erroMsg.set(`${tipoNome} exige horário específico e não pode ser dia inteiro.`);
        return false;
      }
      if (this.regraComHorario() && !this.dataFim && !this.horaFim) {
        this.erroMsg.set(`${tipoNome}: informe hora de início e fim.`);
        return false;
      }
    }
    if (this.regraDiaUnico()) {
      if ((this.dataFim && this.dataFim > this.dataInicio) ||
          (this.dataRepeticaoFim && this.dataRepeticaoFim > this.dataInicio)) {
        this.erroMsg.set(`${tipoNome} permite apenas um dia.`);
        return false;
      }
    }
    // Span multi-dia (fora Férias) só via repetição: o lote gera uma
    // ocorrência por dia, que é o que a grade renderiza.
    if (!this.regraFerias() && !this.eventoEdicao && this.dataFim && this.dataFim > this.dataInicio && !this.dataRepeticaoFim) {
      this.erroMsg.set("Para vários dias, use o campo Repetir até.");
      return false;
    }
    return true;
  }

  /** Extrai a lista de conflitos de um HTTP 409 (null se n�o for conflito). */
  private extrairConflitos(err: unknown): AgendaResumo[] | null {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      const body = err.error as Partial<ErroConflito> | undefined;
      if (body?.code === "CONFLICT_HORARIOS") return body.conflitos ?? [];
    }
    return null;
  }

  private tratarErroSalvar(err: unknown, mensagemPadrao: string): void {
    this.salvando.set(false);
    const conflitos = this.extrairConflitos(err);
    if (conflitos) {
      this.conflitos.set(conflitos);
      const body = (err as HttpErrorResponse).error as Partial<ErroConflito> | undefined;
      this.erroMsg.set(body?.mensagem ?? "Conflito de hor�rios detectado.");
      return;
    }
    if (err instanceof HttpErrorResponse && err.status === 403) {
      this.erroMsg.set("Sem permiss�o para alterar este evento.");
      return;
    }
    if (err instanceof HttpErrorResponse && err.status === 400) {
      const body = err.error as { mensagem?: string } | undefined;
      this.erroMsg.set(body?.mensagem ?? mensagemPadrao);
      return;
    }
    this.erroMsg.set(mensagemPadrao);
  }

  salvar(): void {
    if (this.somenteLeitura) return;
    if (!this.validarFormulario()) return;

    this.conflitos.set([]);
    const ini = this.combinar(this.dataInicio, this.horaInicio);
    const fim = this.combinarFim();
    this.salvando.set(true);

    const isLote = this.dataRepeticaoFim;

    if (this.eventoEdicao) {
      const req: AgendaAtualizarRequest = {
        titulo: this.titulo.trim(),
        descricao: this.descricao || undefined,
        local: this.local || undefined,
        dataInicio: ini.toISOString(),
        dataFim: fim?.toISOString(),
        diaInteiro: this.regraFerias() ? true : this.diaInteiro,
        tipoId: this.tipoId ?? undefined,
        responsavelId: this.responsavelId,
        projetoId: this.projetoId,
        participantesIds: undefined,
        usuarioAlteracao: this.usuarioLogado,
        prioridade: this.prioridade
      };
      this.agendaSvc.atualizarEvento(this.eventoEdicao.id, req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.salvando.set(false); this.fechar(); },
          error: (err) => this.tratarErroSalvar(err, "Falha ao atualizar evento.")
        });
    } else if (isLote) {
      const req: AgendaCriarLoteRequest = {
        titulo: this.titulo.trim(),
        descricao: this.descricao || undefined,
        local: this.local || undefined,
        dataInicio: ini.toISOString(),
        dataFim: fim?.toISOString(),
        diaInteiro: this.regraFerias() ? true : this.diaInteiro,
        tipoId: this.tipoId ?? undefined,
        responsavelId: this.responsavelId,
        projetoId: this.projetoId,
        participantesIds: undefined,
        prioridade: this.prioridade,
        dataRepeticaoFim: this.combinar(this.dataRepeticaoFim, "23:59").toISOString(),
        padraoRecorrencia: this.regraFerias() ? 1 : this.padraoRecorrencia
      };
      this.agendaSvc.criarEventosLote(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.salvando.set(false); this.fechar(); },
          error: (err) => this.tratarErroSalvar(err, "Falha ao criar eventos em lote.")
        });
    } else {
      const req: AgendaCriarRequest = {
        titulo: this.titulo.trim(),
        descricao: this.descricao || undefined,
        local: this.local || undefined,
        dataInicio: ini.toISOString(),
        dataFim: fim?.toISOString(),
        diaInteiro: this.regraFerias() ? true : this.diaInteiro,
        tipoId: this.tipoId ?? undefined,
        responsavelId: this.responsavelId,
        projetoId: this.projetoId,
        participantesIds: undefined,
        prioridade: this.prioridade
      };
      this.agendaSvc.criarEvento(req)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => { this.salvando.set(false); this.fechar(); },
          error: (err) => this.tratarErroSalvar(err, "Falha ao criar evento.")
        });
    }
  }

  excluir(): void {
    if (!this.eventoEdicao || this.somenteLeitura) return;
    if (!confirm("Excluir este evento?")) return;
    this.salvando.set(true);
    this.agendaSvc.excluirEvento(this.eventoEdicao.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.salvando.set(false); this.fechar(); },
        error: (err) => {
          this.salvando.set(false);
          if (err instanceof HttpErrorResponse && err.status === 403) {
            this.erroMsg.set("Sem permiss�o para excluir este evento.");
          } else {
            this.erroMsg.set("Falha ao excluir evento.");
          }
        }
      });
  }

  fechar(): void {
    this.closed.next();
    this.closed.complete();
    this.activeModal.close();
  }

  obterCorTipo(tipoId: number | null): string {
    if (!tipoId) return "#0f4c81";
    return this.tipos.find(t => t.id === tipoId)?.cor ?? "#0f4c81";
  }
}
