import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { ChatComponent } from './chat/chat.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuard } from './auth/auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { AdminComponent } from './admin/admin.component';
import { ProfileComponent } from './profile/profile.component';

const routes: Routes = [
  { path: 'login',     component: LoginComponent },
  { path: 'chat',      component: ChatComponent,      canActivate: [AuthGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin',     component: AdminComponent,     canActivate: [AuthGuard, AdminGuard] },
  { path: 'profile',   component: ProfileComponent,   canActivate: [AuthGuard] },
  { path: '',          redirectTo: '/dashboard',       pathMatch: 'full' },
  { path: '**',        redirectTo: '/dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }