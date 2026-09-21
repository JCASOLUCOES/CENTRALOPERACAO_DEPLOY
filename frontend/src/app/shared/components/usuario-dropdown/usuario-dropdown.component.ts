import { Component, EventEmitter, Input, Output, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClickOutsideDirective } from '@shared/directives/click-outside.directive';
import { TarefasService } from '@features/implantacao/services/tarefas.service';

interface Operador { id: string; nome: string; }

@Component({
  selector: 'app-usuario-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective],
  templateUrl: './usuario-dropdown.component.html',
  styleUrl: './usuario-dropdown.component.scss'
})
export class UsuarioDropdownComponent {
  private tarefasSvc = inject(TarefasService);
  
  @Input() selecionados: string[] = [];
  @Output() selecaoChange = new EventEmitter<string[]>();
  
  aberto = signal(false);
  busca = signal('');
  operadores = signal<Operador[]>([]);
  carregando = signal(false);

  ngOnInit() { this.carregar(); }

  async carregar() {
    this.carregando.set(true);
    try {
      const ops = await this.tarefasSvc.listarOperadores().toPromise();
      this.operadores.set(ops ?? []);
    } finally { this.carregando.set(false); }
  }

  filtrados = computed(() => {
    const b = this.busca().toLowerCase();
    return this.operadores().filter(o => o.nome.toLowerCase().includes(b));
  });

  toggle(opId: string) {
    const atuais = [...this.selecionados];
    const idx = atuais.indexOf(opId);
    if (idx >= 0) atuais.splice(idx, 1);
    else atuais.push(opId);
    this.selecaoChange.emit(atuais);
  }

  isSelecionado(opId: string) { return this.selecionados.includes(opId); }

  getOperadorNome(opId: string): string {
    const op = this.operadores().find(o => o.id === opId);
    return op?.nome ?? opId;
  }

  fechar() { this.aberto.set(false); }

  toggleAberto() { this.aberto.update(v => !v); }
}