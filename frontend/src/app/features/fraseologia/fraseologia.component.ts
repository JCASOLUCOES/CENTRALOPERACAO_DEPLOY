import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type CategoriaAtendimento =
  | 'duvida'
  | 'erro'
  | 'configuracao'
  | 'integracao'
  | 'banco'
  | 'infraestrutura'
  | 'api'
  | 'certificado'
  | 'implantacao'
  | 'desenvolvimento'
  | 'comercial'
  | 'financeiro';

interface VariavelEdicao {
  nome: string;
  valor: string;
}

@Component({
  selector: 'app-fraseologia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fraseologia.component.html',
  styleUrl: './fraseologia.component.scss'
})
export class FraseologiaComponent {
  buscaTexto = '';
  categoriaSelecionada: CategoriaAtendimento | null = null;

  toastVisivel = false;
  toastMensagem = '';

  modalAberto = false;
  textoEditavel = '';
  variaveis: VariavelEdicao[] = [];

  filtrar(): void {
    if (typeof document === 'undefined') return;
    const termo = this.buscaTexto.toLowerCase().trim();

    document.querySelectorAll<HTMLElement>('.frase-msg').forEach(card => {
      const cats = (card.dataset['cats'] ?? '').split('|').filter(Boolean);
      const okCategoria = !this.categoriaSelecionada || cats.includes(this.categoriaSelecionada);
      const okBusca = !termo || (card.textContent ?? '').toLowerCase().includes(termo);
      card.classList.toggle('frase-msg--oculto', !(okCategoria && okBusca));
    });

    document.querySelectorAll<HTMLElement>('.frase-grupo').forEach(grupo => {
      const visivel = Array.from(grupo.querySelectorAll<HTMLElement>('.frase-msg'))
        .some(m => !m.classList.contains('frase-msg--oculto'));
      grupo.classList.toggle('frase-grupo--oculto', !visivel);
    });
  }

  onBuscaChange(): void {
    this.filtrar();
  }

  selecionarCategoria(cat: CategoriaAtendimento | null): void {
    this.categoriaSelecionada = this.categoriaSelecionada === cat ? null : cat;
    this.filtrar();
  }

  limparFiltros(): void {
    this.buscaTexto = '';
    this.categoriaSelecionada = null;
    this.filtrar();
  }

  private textoDoCard(event: Event): string {
    const alvo = event.target as HTMLElement;
    const card = alvo.closest('.frase-msg') as HTMLElement | null;
    return card?.querySelector('.frase-msg__texto')?.textContent ?? '';
  }

  abrirEdicao(event: Event): void {
    const texto = this.textoDoCard(event);
    if (!texto) return;
    this.textoEditavel = texto;
    this.variaveis = this.extrairVariaveis(texto);
    this.modalAberto = true;
  }

  copiarDoCard(event: Event): void {
    this.copiarTexto(this.textoDoCard(event));
  }

  private extrairVariaveis(texto: string): VariavelEdicao[] {
    const nomes = new Set<string>();
    const regex = /\[([^\]\[]+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(texto)) !== null) {
      nomes.add(match[1].trim());
    }
    return Array.from(nomes).map(nome => ({ nome, valor: '' }));
  }

  copiarComVariaveis(): void {
    let texto = this.textoEditavel;
    this.variaveis.forEach(v => {
      texto = texto.split(`[${v.nome}]`).join(v.valor.trim());
    });
    this.modalAberto = false;
    this.copiarTexto(texto);
  }

  copiarTexto(texto: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(texto)
        .then(() => {
          this.mostrarToast('Mensagem copiada com sucesso.');
        })
        .catch(() => this.copiarFallback(texto));
      return;
    }
    this.copiarFallback(texto);
  }

  private copiarFallback(texto: string): void {
    if (typeof document === 'undefined') return;
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    try {
      document.execCommand('copy');
      this.mostrarToast('Mensagem copiada com sucesso.');
    } catch {
      this.mostrarToast('Erro ao copiar mensagem.');
    }
    document.body.removeChild(area);
  }

  private mostrarToast(mensagem: string): void {
    this.toastMensagem = mensagem;
    this.toastVisivel = true;
    setTimeout(() => {
      this.toastVisivel = false;
    }, 3000);
  }

  fecharModal(): void {
    this.modalAberto = false;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
