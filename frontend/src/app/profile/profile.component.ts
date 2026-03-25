import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

  currentUser = this.authService.getCurrentUser();
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  profilePicture = '';
  hideCurrentPassword = true;
  hideNewPassword = true;

  readonly BASE_URL = 'http://localhost:8080/api/profile';

  readonly roles = [
    { value: 'RESPONSABLE', label: 'Responsable' },
    { value: 'QUALITE',     label: 'Qualité' },
    { value: 'PROD',        label: 'Production' },
    { value: 'LOGISTIQUE',  label: 'Logistique' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'USER',        label: 'Utilisateur' }
  ];

  usernameForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)])
  });

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword:     new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  roleForm = new FormGroup({
    role: new FormControl('', [Validators.required])
  });

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.http.get<any>(this.BASE_URL).subscribe({
      next: (profile) => {
        this.profilePicture = profile.profilePicture || '';
        this.usernameForm.patchValue({ username: profile.username });
        this.roleForm.patchValue({ role: profile.role });
      }
    });
  }

  // ─── Profile Picture ──────────────────────────────────────────────────────
  onImageSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.http.put(`${this.BASE_URL}/picture`, { image: base64 }).subscribe({
        next: () => {
          this.profilePicture = base64;
          this.showSuccess('Profile picture updated!');
        },
        error: () => this.showError('Failed to update profile picture')
      });
    };
    reader.readAsDataURL(file);
  }

  // ─── Username ─────────────────────────────────────────────────────────────
  updateUsername(): void {
    if (this.usernameForm.invalid) return;
    this.http.put<any>(`${this.BASE_URL}/username`, this.usernameForm.value).subscribe({
      next: (res) => {
        if (this.currentUser) {
          this.currentUser = { ...this.currentUser, username: res.username };
        }
        this.showSuccess('Username updated successfully!');
      },
      error: (err) => this.showError(err.error?.error || 'Failed to update username')
    });
  }

  // ─── Password ─────────────────────────────────────────────────────────────
  updatePassword(): void {
    if (this.passwordForm.invalid) return;
    this.http.put(`${this.BASE_URL}/password`, this.passwordForm.value).subscribe({
      next: () => {
        this.passwordForm.reset();
        this.showSuccess('Password updated successfully!');
      },
      error: (err) => this.showError(err.error?.error || 'Failed to update password')
    });
  }

  // ─── Role ─────────────────────────────────────────────────────────────────
  updateRole(): void {
    if (this.roleForm.invalid) return;
    this.http.put<any>(`${this.BASE_URL}/role`, this.roleForm.value).subscribe({
      next: (res) => {
        if (this.currentUser) {
          this.currentUser = { ...this.currentUser, role: res.role };
        }
        this.showSuccess('Role updated successfully!');
      },
      error: (err) => this.showError(err.error?.error || 'Failed to update role')
    });
  }

  goBack(): void {
    const role = this.authService.getCurrentUser()?.role;
    this.router.navigate([role === 'ADMIN' ? '/dashboard' : '/chat']);
  }

  logout(): void {
    this.authService.logout();
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 3000);
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    setTimeout(() => this.errorMessage = '', 4000);
  }
}
