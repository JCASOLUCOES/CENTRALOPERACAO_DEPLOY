import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modelo-chamados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modelo-chamados.component.html',
  styleUrl: './modelo-chamados.component.scss'
})
export class ModeloChamadosComponent {
  abaAtiva: 'modelo' | 'chamado' = 'modelo';

  // ── Aba: Modelo de Passagem ──
  identificacao: Record<string, string> = {
    contratante: '',
    produto: '',
    modulo: '',
    prioridade: ''
  };

  problema = '';
  objetivo = '';
  jaVisto = '';
  cenarioTeste = '';
  resultadoEsperado = '';
  tentouCopiar = false;

  // ── Aba: Chamados de Atendimento ──
  quemSolicitou = '';
  oQueFoiSolicitado = '';
  oQueFoiFeito = '';
  conclusao = '';
  anexarWhatsApp = false;
  conversaWhatsApp = '';

  toastVisivel = false;
  toastMensagem = '';
  toastTipo: 'ok' | 'alerta' = 'ok';

  // ── Validações (aba Modelo) ──
  campoInvalido(campo: string): boolean {
    return this.tentouCopiar && this.identificacao[campo].trim().length === 0;
  }

  campoTextoInvalido(campo: 'problema' | 'objetivo' | 'cenarioTeste' | 'resultadoEsperado'): boolean {
    return this.tentouCopiar && this[campo].trim().length === 0;
  }

  // ── Gerar texto (aba Modelo) ──
  gerarTextoChamado(): void {
    this.tentouCopiar = true;

    const vazios = [
      this.campoInvalido('contratante'),
      this.campoTextoInvalido('problema'),
      this.campoTextoInvalido('objetivo'),
      this.campoTextoInvalido('cenarioTeste'),
      this.campoTextoInvalido('resultadoEsperado')
    ];

    if (vazios.some(Boolean)) {
      this.mostrarToast('Preencha os campos obrigatórios destacados antes de copiar.', 'alerta');
      return;
    }

    const linhas: string[] = [
      'PROTOCOLO DE PASSAGEM DE CHAMADO',
      `Contratante: ${this.identificacao['contratante'].trim()}` +
        (this.identificacao['produto'].trim() ? ` | Produto: ${this.identificacao['produto'].trim()}` : '') +
        (this.identificacao['modulo'].trim() ? ` | Responsável: ${this.identificacao['modulo'].trim()}` : '') +
        (this.identificacao['prioridade'] ? ` | Prioridade: ${this.identificacao['prioridade']}` : ''),
      '',
      'PROBLEMA',
      this.problema.trim(),
      '',
      'OBJETIVO',
      this.objetivo.trim()
    ];

    if (this.jaVisto.trim()) {
      linhas.push('', 'O QUE JÁ FOI VISTO', this.jaVisto.trim());
    }

    linhas.push('', 'CENÁRIO PARA TESTE', this.cenarioTeste.trim());
    linhas.push('', 'RESULTADO ESPERADO', this.resultadoEsperado.trim());

    this.copiarTexto(linhas.join('\n'));
  }

  // ── Gerar Markdown (aba Chamado) ──
  gerarMarkdownChamado(): string {
    const linhas: string[] = [
      `**Quem solicitou:**`,
      this.quemSolicitou.trim(),
      '',
      `**O que foi solicitado:**`,
      this.oQueFoiSolicitado.trim(),
      '',
      `**O que foi feito:**`,
      this.oQueFoiFeito.trim(),
      '',
      `**Conclusão:**`,
      this.conclusao.trim()
    ];

    if (this.anexarWhatsApp && this.conversaWhatsApp.trim()) {
      linhas.push('', '---', '', '### Conversa do WhatsApp', '', this.conversaWhatsApp.trim());
    }

    return linhas.join('\n');
  }

  copiarMarkdownChamado(): void {
    const markdown = this.gerarMarkdownChamado();
    this.copiarTexto(markdown);
  }

  // ── Limpar (aba Chamado) ──
  limparCamposChamado(): void {
    this.quemSolicitou = '';
    this.oQueFoiSolicitado = '';
    this.oQueFoiFeito = '';
    this.conclusao = '';
    this.anexarWhatsApp = false;
    this.conversaWhatsApp = '';
  }

  // ── Utilitários ──
  private copiarMarkdownFallback(texto: string): boolean {
    if (typeof document === 'undefined') {
      return false;
    }
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  copiarTexto(texto: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(texto)
        .then(() => this.copiarTextoSucesso())
        .catch(() => this.copiarTextoFallback(texto));
      return;
    }
    this.copiarTextoFallback(texto);
  }

  private copiarTextoSucesso(): void {
    this.mostrarToast('Texto copiado para a área de transferência.', 'ok');
  }

  private copiarTextoFallback(texto: string): void {
    const ok = this.copiarMarkdownFallback(texto);
    if (ok) {
      this.mostrarToast('Texto copiado para a área de transferência.', 'ok');
    } else {
      this.mostrarToast('Não foi possível copiar o texto automaticamente.', 'alerta');
    }
  }

  private mostrarToast(mensagem: string, tipo: 'ok' | 'alerta'): void {
    this.toastMensagem = mensagem;
    this.toastTipo = tipo;
    this.toastVisivel = true;
    setTimeout(() => {
      this.toastVisivel = false;
    }, 3000);
  }
}
