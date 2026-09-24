import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DbQueryBuilderComponent } from '../components/db-query-builder.component';

@Component({
  selector: 'app-db-consultas',
  standalone: true,
  imports: [CommonModule, DbQueryBuilderComponent],
  template: `
    <div class="adm-aviso adm-aviso--info mb-3">
      <i class="bi bi-diagram-3"></i>
      <span>Monte a consulta no <strong>Criador de Consultas</strong> e copie o SQL gerado para o SSMS.</span>
    </div>
    <app-db-query-builder></app-db-query-builder>
  `
})
export class DbConsultasComponent {}
