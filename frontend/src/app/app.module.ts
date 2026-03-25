import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


// Angular Material
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';

// Routing
import { AppRoutingModule } from './app-routing.module';
import { RouterModule } from '@angular/router';

// Components
import { AppComponent } from './app.component';
import { ChatComponent } from './chat/chat.component';
import { TableRendererComponent } from './renderers/table-renderer/table-renderer.component';
import { ChartRendererComponent } from './renderers/chart-renderer/chart-renderer.component';
import { ConversationHistoryComponent } from './conversation/conversation-history.component';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SessionWarningComponent } from './session/session-warning.component';

import { ProfileComponent } from './profile/profile.component';

import { AdminComponent } from './admin/admin.component';
// add to declarations:

// Auth
import { JwtInterceptor } from './auth/jwt.interceptor';
import { AdminGuard } from './auth/admin.guard';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { FilterPipe } from './shared/filter.pipe';

import { LanguageDialogComponent } from './shared/language-dialog.component';




@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    TableRendererComponent,
    ChartRendererComponent,
    ConversationHistoryComponent,
    LoginComponent,
    DashboardComponent,
    SessionWarningComponent,
    AdminComponent,
    ProfileComponent,
    FilterPipe,
    LanguageDialogComponent

  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatTooltipModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatSelectModule,
    DragDropModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    AdminGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
