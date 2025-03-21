import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Input() isDarkMode: boolean = false;
  
  @Output() darkModeToggle = new EventEmitter<void>();
  
  toggleDarkMode() {
    this.darkModeToggle.emit();
  }
}
