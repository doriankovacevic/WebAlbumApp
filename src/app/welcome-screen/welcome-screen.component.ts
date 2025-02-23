import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-welcome-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" *ngIf="showWelcome">
      <div class="welcome-card">
        <img src="welcome-image.jpg" alt="Wedding Pair" class="wedding-image" />
        <h1>Dobrodošli u našu galeriju!</h1>
        <p>Molimo da upišete svoje ime i prezime kako biste nastavili:</p>
        <input
          [(ngModel)]="visitorName"
          placeholder="Ime i prezime"
          (keyup.enter)="onEnter()"
        />
        <button (click)="onEnter()">NASTAVI</button>
      </div>
    </div>
  `,
  styles: [
    `
      .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }
      .welcome-card {
        background-color: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .wedding-image {
        width: 100%;
        max-width: 300px;
        border-radius: 5px;
        margin-bottom: 1rem;
      }
      input {
        width: 100%;
        padding: 0.5rem;
        margin: 1rem 0;
        border: 1px solid #ccc;
        border-radius: 4px;
      }
      button {
        background-color: #4caf50;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background-color: #45a049;
      }
    `,
  ],
})
export class WelcomeScreenComponent implements OnInit {
  showWelcome = true;
  visitorName = '';
  @Output() nameEntered = new EventEmitter<string>();

  ngOnInit() {
    const storedName = this.getCookie('visitorName');
    if (storedName) {
      this.showWelcome = false;
      this.nameEntered.emit(storedName);
    }
  }

  onEnter() {
    if (this.visitorName.trim()) {
      this.setCookie('visitorName', this.visitorName, 30);
      this.showWelcome = false;
      this.nameEntered.emit(this.visitorName);
    }
  }

  private setCookie(name: string, value: string, days: number) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = 'expires=' + date.toUTCString();
    document.cookie =
      name + '=' + encodeURIComponent(value) + ';' + expires + ';path=/';
  }

  private getCookie(name: string): string {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i].trim();
      if (c.indexOf(nameEQ) == 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return '';
  }
}
