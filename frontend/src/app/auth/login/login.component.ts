import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { ConversationHistoryService } from '../../conversation/conversation.service';
import { MatDialog } from '@angular/material/dialog';
import { LanguageDialogComponent } from '../../shared/language-dialog.component';

type ActiveTab = 'login' | 'register' | 'forgot';
type RegisterStep = 1 | 2;
type ForgotStep = 1 | 2;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideNewPassword = true;
  activeTab: ActiveTab = 'login';
  registerStep: RegisterStep = 1;
  forgotStep: ForgotStep = 1;
  sendingCode = false;

  readonly roles = [
    { value: 'RESPONSABLE UAP', label: 'Responsable UAP' },
    { value: 'QUALITE',     label: 'Qualité' },
    { value: 'PROD',        label: 'Production' },
    { value: 'Planificateur',  label: 'Planificateur' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'USER',        label: 'Utilisateur' }
  ];

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
  });

  registerForm = new FormGroup({
    matricule:        new FormControl('', [Validators.required]),
    username:         new FormControl('', [Validators.required, Validators.minLength(3)]),
    email:            new FormControl('', [Validators.required, Validators.email]),
    password:         new FormControl('', [Validators.required, Validators.minLength(6)]),
    role:             new FormControl('', [Validators.required]),
    verificationCode: new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)])
  });

  forgotForm = new FormGroup({
    email:       new FormControl('', [Validators.required, Validators.email]),
    code:        new FormControl('', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private conversationHistoryService: ConversationHistoryService,
    private dialog: MatDialog

  ) {}

  switchTab(tab: ActiveTab): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.registerStep = 1;
    this.forgotStep = 1;
  }

  // ─── Login ───────────────────────────────────────────────────────────────

 onLogin(): void {
  if (this.loginForm.invalid) return;
  this.isLoading = true;
  this.errorMessage = '';

  this.authService.login({
    username: this.loginForm.value.username!,
    password: this.loginForm.value.password!
  }).subscribe({
    next: () => {
      this.isLoading = false;
      this.conversationHistoryService.setActiveConversationId(null);
      this.conversationHistoryService.clearConversations();
      if (!localStorage.getItem('lang')) {
        const ref = this.dialog.open(LanguageDialogComponent, {
          disableClose: true,
          width: '480px'
        });
        ref.afterClosed().subscribe(() => {
          this.router.navigate(['/dashboard']);
        });
      } else {
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.errorMessage = err.error?.error || 'Invalid username or password';
    }
  });
}

  // ─── Register ────────────────────────────────────────────────────────────

  sendRegisterCode(): void {
    const email = this.registerForm.value.email;
    if (!email || this.registerForm.get('email')?.invalid) {
      this.errorMessage = 'Please enter a valid email first';
      return;
    }
    this.sendingCode = true;
    this.errorMessage = '';

    this.http.post('http://localhost:8080/api/auth/send-code', { email }).subscribe({
      next: () => {
        this.sendingCode = false;
        this.registerStep = 2;
      },
      error: (err) => {
        this.sendingCode = false;
        this.errorMessage = err.error?.error || 'Failed to send verification code';
      }
    });
  }

 onRegister(): void {
  if (this.registerForm.invalid) return;
  this.isLoading = true;
  this.errorMessage = '';

  this.authService.register({
    matricule:        this.registerForm.value.matricule!,
    username:         this.registerForm.value.username!,
    email:            this.registerForm.value.email!,
    password:         this.registerForm.value.password!,
    role:             this.registerForm.value.role!,
    verificationCode: this.registerForm.value.verificationCode!
  }).subscribe({
    next: () => {
      this.isLoading = false;
      this.conversationHistoryService.setActiveConversationId(null);
      this.conversationHistoryService.clearConversations();
      if (!localStorage.getItem('lang')) {
        const ref = this.dialog.open(LanguageDialogComponent, {
          disableClose: true,
          width: '480px'
        });
        ref.afterClosed().subscribe(() => {
          this.router.navigate(['/dashboard']);
        });
      } else {
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err) => {
      this.isLoading = false;
      this.errorMessage = err.error?.error || 'Registration failed';
    }
  });
}

  goBackRegister(): void {
    this.registerStep = 1;
    this.errorMessage = '';
    this.registerForm.get('verificationCode')?.reset();
  }

  isStep1Valid(): boolean {
    const f = this.registerForm;
    return f.get('matricule')!.valid && f.get('username')!.valid &&
           f.get('email')!.valid && f.get('password')!.valid && f.get('role')!.valid;
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────

  sendResetCode(): void {
    const email = this.forgotForm.value.email;
    if (!email || this.forgotForm.get('email')?.invalid) {
      this.errorMessage = 'Please enter a valid email';
      return;
    }
    this.sendingCode = true;
    this.errorMessage = '';

    this.http.post('http://localhost:8080/api/auth/forgot-password', { email }).subscribe({
      next: () => {
        this.sendingCode = false;
        this.forgotStep = 2;
      },
      error: (err) => {
        this.sendingCode = false;
        this.errorMessage = err.error?.error || 'Failed to send reset code';
      }
    });
  }

  onResetPassword(): void {
    if (this.forgotForm.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    this.http.post('http://localhost:8080/api/auth/reset-password', {
      email:       this.forgotForm.value.email,
      code:        this.forgotForm.value.code,
      newPassword: this.forgotForm.value.newPassword
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully! You can now login.';
        this.forgotForm.reset();
        setTimeout(() => this.switchTab('login'), 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'Failed to reset password';
      }
    });
  }

  goBackForgot(): void {
    this.forgotStep = 1;
    this.errorMessage = '';
    this.forgotForm.get('code')?.reset();
    this.forgotForm.get('newPassword')?.reset();
  }
}