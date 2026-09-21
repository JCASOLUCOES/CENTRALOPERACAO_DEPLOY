import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbDatepickerModule, NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule, NgbInputDatepicker],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {
  @Input() placeholder = 'Data';
  @Input() value: Date | null = null;
  @Output() valueChange = new EventEmitter<Date | null>();

  dataStr = '';

  ngOnInit() { this.formatar(); }

  formatar() {
    this.dataStr = this.value ? this.value.toISOString().split('T')[0] : '';
  }

  onChange(v: string) {
    this.dataStr = v;
    this.value = v ? new Date(v + 'T00:00:00') : null;
    this.valueChange.emit(this.value);
  }

  onDateSelect(date: any) {
    const d = new Date(date.year, date.month - 1, date.day);
    this.value = d;
    this.formatar();
    this.valueChange.emit(d);
  }
}