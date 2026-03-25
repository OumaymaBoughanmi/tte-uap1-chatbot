import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { LanguageService, Language } from './language.service';

@Component({
  selector: 'app-language-dialog',
  template: `
    <div class="lang-dialog">
      <div class="lang-dialog__header">
        <img src="assets/logo-tte.jpg" alt="TTE" class="lang-dialog__logo" />
        <h2>Welcome / Bienvenue</h2>
        <p>Please select your preferred language<br>Veuillez choisir votre langue préférée</p>
      </div>
      <div class="lang-dialog__options">
        <div class="lang-option" (click)="select('en')">
          <span class="lang-option__flag">🇬🇧</span>
          <span class="lang-option__name">English</span>
          <span class="lang-option__desc">Continue in English</span>
        </div>
        <div class="lang-option" (click)="select('fr')">
          <span class="lang-option__flag">🇫🇷</span>
          <span class="lang-option__name">Français</span>
          <span class="lang-option__desc">Continuer en Français</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lang-dialog {
      padding: 32px;
      text-align: center;
      min-width: 380px;
    }
    .lang-dialog__header {
      margin-bottom: 32px;
      img { height: 48px; border-radius: 8px; margin-bottom: 16px; }
      h2 { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
      p { color: #888; font-size: 0.9rem; line-height: 1.6; margin: 0; }
    }
    .lang-dialog__options {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .lang-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px 32px;
      border: 2px solid #e0e0e0;
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s;
      &:hover {
        border-color: #0056a2;
        background: #f0f4ff;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0,86,162,0.15);
      }
      &__flag { font-size: 2.5rem; }
      &__name { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; }
      &__desc { font-size: 0.78rem; color: #888; }
    }
  `]
})
export class LanguageDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<LanguageDialogComponent>,
    private languageService: LanguageService
  ) {}

  select(lang: Language): void {
    this.languageService.set(lang);
    this.dialogRef.close(lang);
  }
}