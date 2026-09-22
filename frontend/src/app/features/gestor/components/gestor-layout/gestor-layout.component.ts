import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Component } from '@angular/core';
import { GestorNavComponent } from '../gestor-nav/gestor-nav.component';

@Component({
  selector: 'app-gestor-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, GestorNavComponent],
  templateUrl: './gestor-layout.component.html',
  styleUrl: './gestor-layout.component.scss'
})
export class GestorLayoutComponent {}