import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
  imports: [CommonModule],
})
export class LoaderComponent {
  @Input() show: boolean = false;
}
