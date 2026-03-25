import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-session-warning',
  templateUrl: './session-warning.component.html',
  styleUrls: ['./session-warning.component.scss']
})
export class SessionWarningComponent implements OnInit, OnDestroy {

  show = false;
  countdown = 60;
  private subs: Subscription[] = [];

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.showSessionWarning$.subscribe(show => this.show = show)
    );
    this.subs.push(
      this.authService.warningCountdown$.subscribe(c => this.countdown = c)
    );
  }

  extendSession(): void {
    this.authService.extendSession();
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
