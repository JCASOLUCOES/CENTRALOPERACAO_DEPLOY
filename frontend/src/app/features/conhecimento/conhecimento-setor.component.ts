import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TrilhasComponent } from '@features/trilhas/trilhas.component';

@Component({
  selector: 'app-conhecimento-setor',
  standalone: true,
  imports: [CommonModule, RouterLink, TrilhasComponent],
  template: `
    <section class="adm-page">
      <app-trilhas></app-trilhas>
    </section>
  `
})
export class ConhecimentoSetorComponent {
}
