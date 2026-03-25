import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  matricule: string;
  role: string;
  createdAt: string;
}

interface ConversationAdmin {
  id: number;
  title: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

interface SchemaVersion {
  schemaText: string;
  updatedAt: string;
  updatedBy: string;
}

interface TablePreview {
  name: string;
  columns: string[];
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  // ─── Sidebar ───────────────────────────────────────────────────────────────
  sidebarCollapsed = false;
  activeSection: 'users' | 'stats' | 'conversations' | 'audit' | 'schema' = 'users';

  // ─── Users ────────────────────────────────────────────────────────────────
  users: AdminUser[] = [];
  filteredUsers: AdminUser[] = [];
  searchQuery = '';

  // ─── Conversations ────────────────────────────────────────────────────────
  conversations: ConversationAdmin[] = [];
  filteredConversations: ConversationAdmin[] = [];
  convSearchQuery = '';
  convsLoading = false;

  // ─── Schema ───────────────────────────────────────────────────────────────
  schemaText = '';
  schemaUpdatedAt = '';
  schemaUpdatedBy = '';
  schemaSaving = false;
  schemaLoading = false;

  // Version history
  schemaHistory: SchemaVersion[] = [];
  showHistory = false;

  // Preview
  tablePreview: TablePreview[] = [];
  showPreview = false;

  // Test
  testQuestion = '';
  testResult = '';
  testLoading = false;
  showTest = false;

  // Auto-detect
  autoDetecting = false;

  // ─── Common ───────────────────────────────────────────────────────────────
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser = this.authService.getCurrentUser();

  readonly BASE_URL = 'http://localhost:8080/api/admin';

  readonly navItems = [
    { id: 'users',         label: 'User Management',    icon: 'people' },
    { id: 'stats',         label: 'System Statistics',  icon: 'bar_chart' },
    { id: 'conversations', label: 'Conversations',      icon: 'chat_bubble' },
    { id: 'audit',         label: 'Audit Log',          icon: 'history' },
    { id: 'schema',        label: 'Schema Management',  icon: 'storage' },
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  setSection(section: any): void {
    this.activeSection = section;
    if (section === 'conversations' && this.conversations.length === 0) this.loadConversations();
    if (section === 'schema') this.loadSchema();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  // ─── Users ────────────────────────────────────────────────────────────────
  loadUsers(): void {
    this.isLoading = true;
    this.http.get<AdminUser[]>(`${this.BASE_URL}/users`).subscribe({
      next: (users) => {
        this.users = users;
        this.filteredUsers = [...this.users];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load users';
        this.isLoading = false;
      }
    });
  }

  filterUsers(): void {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) { this.filteredUsers = [...this.users]; return; }
    this.filteredUsers = this.users.filter(u =>
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.matricule.toLowerCase().includes(q)
    );
  }

  changeRole(user: AdminUser): void {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    this.http.put(`${this.BASE_URL}/users/${user.id}/role`, { role: newRole }).subscribe({
      next: () => {
        user.role = newRole;
        this.filteredUsers = [...this.users];
        this.showSuccess(`Role of ${user.username} changed to ${newRole}`);
      },
      error: () => { this.errorMessage = 'Failed to change role'; }
    });
  }

  deleteUser(user: AdminUser): void {
    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;
    this.http.delete(`${this.BASE_URL}/users/${user.id}`).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        this.filteredUsers = [...this.users];
        this.showSuccess(`User ${user.username} deleted successfully`);
      },
      error: () => { this.errorMessage = 'Failed to delete user'; }
    });
  }

  // ─── Conversations ────────────────────────────────────────────────────────
  loadConversations(): void {
    this.convsLoading = true;
    this.http.get<ConversationAdmin[]>(`${this.BASE_URL}/conversations`).subscribe({
      next: (convs) => {
        this.conversations = convs;
        this.filteredConversations = [...convs];
        this.convsLoading = false;
      },
      error: () => { this.convsLoading = false; }
    });
  }

  filterConversations(): void {
    const q = this.convSearchQuery.toLowerCase().trim();
    if (!q) { this.filteredConversations = [...this.conversations]; return; }
    this.filteredConversations = this.conversations.filter(c =>
      c.title.toLowerCase().includes(q) ||
      (c.username && c.username.toLowerCase().includes(q))
    );
  }

  // ─── Schema ───────────────────────────────────────────────────────────────
  loadSchema(): void {
  this.schemaLoading = true;
  this.http.get<any>(`${this.BASE_URL}/schema`).subscribe({
    next: (res) => {
      this.schemaText = res.schema;
      this.schemaUpdatedAt = res.updatedAt;
      this.schemaUpdatedBy = res.updatedBy;
      this.schemaLoading = false;
      this.parseTablePreview();
      this.loadHistory();
    },
    error: () => { this.schemaLoading = false; }
  });
}

 saveSchema(): void {
  if (!this.schemaText.trim()) {
    this.errorMessage = 'Schema cannot be empty';
    return;
  }
  this.schemaSaving = true;
  this.http.put(`${this.BASE_URL}/schema`, { schema: this.schemaText }).subscribe({
    next: () => {
      this.schemaSaving = false;
      this.schemaUpdatedAt = new Date().toISOString();
      this.schemaUpdatedBy = this.currentUser?.username || '';
      this.parseTablePreview();
      this.loadHistory();
      this.showSuccess('Schema updated successfully!');
    },
    error: () => {
      this.schemaSaving = false;
      this.errorMessage = 'Failed to save schema';
    }
  });
}

  // ─── Auto-detect ──────────────────────────────────────────────────────────
  autoDetect(): void {
    this.autoDetecting = true;
    this.http.get<any>(`${this.BASE_URL}/schema/auto-detect`).subscribe({
      next: (res) => {
        this.schemaText = res.schema;
        this.autoDetecting = false;
        this.parseTablePreview();
        this.showSuccess('Schema auto-detected from MySQL! Review and click Save.');
      },
      error: () => {
        this.autoDetecting = false;
        this.errorMessage = 'Auto-detect failed';
      }
    });
  }

  // ─── Preview ──────────────────────────────────────────────────────────────
  parseTablePreview(): void {
    this.tablePreview = [];
    const lines = this.schemaText.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^(\w+)\((.+)\)$/);
      if (match) {
        this.tablePreview.push({
          name: match[1],
          columns: match[2].split(',').map(c => c.trim())
        });
      }
    }
  }

  togglePreview(): void {
    this.showPreview = !this.showPreview;
    if (this.showPreview) this.parseTablePreview();
  }

  // ─── Test Schema ──────────────────────────────────────────────────────────
  toggleTest(): void {
    this.showTest = !this.showTest;
    this.testResult = '';
  }

  testSchema(): void {
    if (!this.testQuestion.trim()) return;
    this.testLoading = true;
    this.testResult = '';
    this.http.post<any>(`${this.BASE_URL}/schema/test`, {
      question: this.testQuestion,
      schema: this.schemaText
    }).subscribe({
      next: (res) => {
        this.testResult = res.sql || 'No SQL generated';
        this.testLoading = false;
      },
      error: () => {
        this.testResult = 'Test failed — check backend logs';
        this.testLoading = false;
      }
    });
  }

  // ─── Version History ──────────────────────────────────────────────────────
  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  restoreVersion(version: SchemaVersion): void {
    if (!confirm('Restore this version? Current schema will be replaced.')) return;
    this.schemaText = version.schemaText;
    this.showHistory = false;
    this.parseTablePreview();
  }

  // ─── Common ───────────────────────────────────────────────────────────────
  goToDashboard(): void { this.router.navigate(['/dashboard']); }
  logout(): void { this.authService.logout(); }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    setTimeout(() => this.successMessage = '', 4000);
  }

loadHistory(): void {
  this.http.get<any[]>(`${this.BASE_URL}/schema/history`).subscribe({
    next: (history) => {
      this.schemaHistory = history.map(h => ({
        schemaText: h.schemaText,
        updatedAt: h.updatedAt,
        updatedBy: h.updatedBy
      }));
    },
    error: () => {}
  });
}

}