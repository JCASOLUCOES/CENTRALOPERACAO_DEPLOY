import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_VERSION } from '@shared/meta/app-version';
import { POLITICA_INTERNA } from './politica.data';

@Component({
  selector: 'app-politica',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './politica.component.html',
  styleUrl: './politica.component.scss'
})
export class PoliticaComponent {
  readonly politica = POLITICA_INTERNA;
  readonly appVersion = APP_VERSION;

  trackByIndex(index: number): number {
    return index;
  }
}