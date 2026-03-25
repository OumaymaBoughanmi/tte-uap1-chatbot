import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AuthResponse, AuthUser, LoginRequest, RegisterRequest } from '../models/auth.model';
import { ConversationHistoryService } from '../conversation/conversation.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly BASE_URL = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'chatbot_token';
  private readonly USER_KEY = 'chatbot_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // ─── Inactivity Timer ─────────────────────────────────────────────────────
  private inactivityTimer: any = null;
  private warningTimer: any = null;
  private readonly INACTIVITY_LIMIT = 30 * 60 * 1000;    // 5 minutes
  private readonly WARNING_BEFORE   = 1 * 60 * 1000;    // warn 1 minute before

  //private readonly INACTIVITY_LIMIT = 30 * 1000;  // 30 seconds
  //private readonly WARNING_BEFORE   = 10 * 1000;  // warn 10 seconds before

  public showSessionWarning$ = new BehaviorSubject<boolean>(false);
  public warningCountdown$ = new BehaviorSubject<number>(60);
  private countdownInterval: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private ngZone: NgZone,
    private conversationHistoryService: ConversationHistoryService
  ) {
    // If user is already logged in (e.g. page refresh within same session), start timer
    if (this.isLoggedIn()) {
      this.startInactivityTimer();
      this.listenToUserActivity();
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/login`, request).pipe(
      tap(response => {
        this.storeAuthData(response);
        this.startInactivityTimer();
        this.listenToUserActivity();
      })
    );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/register`, request).pipe(
      tap(response => {
        this.storeAuthData(response);
        this.startInactivityTimer();
        this.listenToUserActivity();
      })
    );
  }

  logout(): void {
    this.stopInactivityTimer();
    sessionStorage.clear();
    this.currentUserSubject.next(null);
    this.showSessionWarning$.next(false);
    this.conversationHistoryService.setActiveConversationId(null);
    this.conversationHistoryService.clearConversations();
    this.router.navigate(['/login']);
  }

  extendSession(): void {
    this.showSessionWarning$.next(false);
    this.resetInactivityTimer();
  }

  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.getValue();
  }

  // ─── Inactivity Logic ─────────────────────────────────────────────────────

  private listenToUserActivity(): void {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => {
      window.addEventListener(event, () => this.onUserActivity(), { passive: true });
    });
  }

  private onUserActivity(): void {
    if (this.isLoggedIn() && !this.showSessionWarning$.getValue()) {
      this.resetInactivityTimer();
    }
  }

  private startInactivityTimer(): void {
    this.ngZone.runOutsideAngular(() => {
      this.stopInactivityTimer();

      // Warning timer — fires at 4 minutes
      this.warningTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.showSessionWarning$.next(true);
          this.startWarningCountdown();
        });
      }, this.INACTIVITY_LIMIT - this.WARNING_BEFORE);

      // Logout timer — fires at 5 minutes
      this.inactivityTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.logout();
        });
      }, this.INACTIVITY_LIMIT);
    });
  }

  private resetInactivityTimer(): void {
    this.startInactivityTimer();
  }

  private stopInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private startWarningCountdown(): void {
    this.warningCountdown$.next(60);
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.ngZone.runOutsideAngular(() => {
      this.countdownInterval = setInterval(() => {
        this.ngZone.run(() => {
          const current = this.warningCountdown$.getValue();
          if (current <= 1) {
            clearInterval(this.countdownInterval);
          } else {
            this.warningCountdown$.next(current - 1);
          }
        });
      }, 1000);
    });
  }

  // ─── Storage ──────────────────────────────────────────────────────────────

  private storeAuthData(response: AuthResponse): void {
    // Use sessionStorage so data is cleared when browser/tab closes
    sessionStorage.clear();
    sessionStorage.setItem(this.TOKEN_KEY, response.token);
    const user: AuthUser = {
      token: response.token,
      username: response.username,
      matricule: response.matricule,
      email: response.email,
      role: response.role
    };
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): AuthUser | null {
    const stored = sessionStorage.getItem(this.USER_KEY);
    return stored ? JSON.parse(stored) : null;
  }
}
