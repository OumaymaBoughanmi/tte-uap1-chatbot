import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked
} from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService } from './chat.service';
import { ExportService } from '../shared/export.service';
import { ConversationHistoryService } from '../conversation/conversation.service';
import { AuthService } from '../auth/auth.service';
import { Conversation } from '../models/conversation.model';
import { ChatMessage } from '../models/chat.model';
import { AuthUser } from '../models/auth.model';
import { HttpClient } from '@angular/common/http';
import { LanguageService } from '../shared/language.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  isLoading = false;
  showCopiedTooltip = false;
  isSidebarOpen = true;
  currentUser: AuthUser | null = null;
  profilePicture = '';
  private shouldScrollToBottom = true;

  // Edit state
  editingIndex: number | null = null;
  editingText: string = '';

  // Search state
  searchOpen = false;
  searchQuery = '';
  searchResults: Conversation[] = [];
  searchLoading = false;

  messageControl = new FormControl({ value: '', disabled: false }, [
    Validators.required,
    Validators.minLength(1)
  ]);

  private subscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private exportService: ExportService,
    private historyService: ConversationHistoryService,
    private authService: AuthService,
    private http: HttpClient,
    private languageService: LanguageService
  ) {}

  ngOnInit(): void {
    this.historyService.loadAllConversations().subscribe();
    this.currentUser = this.authService.getCurrentUser();
    this.languageService.lang$.subscribe(lang => {
  this.currentLang = lang;
});

    this.http.get<any>('http://localhost:8080/api/profile').subscribe({
      next: (profile) => this.profilePicture = profile.profilePicture || ''
    });

    this.subscription = this.chatService.messages$.subscribe(messages => {
      const previousLength = this.messages.length;
      this.messages = messages;
      this.isLoading = messages.some(m => m.loading);
      if (messages.length > previousLength) {
        this.shouldScrollToBottom = true;
      }
      if (this.isLoading) {
        this.messageControl.disable();
      } else {
        this.messageControl.enable();
      }
      const draft = this.chatService.getDraft();
      if (draft) {
        this.messageControl.setValue(draft);
      }
    });

    setTimeout(() => {
      const container = this.messagesContainer?.nativeElement;
      if (container) {
        container.addEventListener('scroll', () => {
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          this.shouldScrollToBottom = distanceFromBottom < 100;
        });
      }
    }, 500);
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.chatService.saveDraft(this.messageControl.value || '');
  }

  // ─── Send Message ─────────────────────────────────────────────────────────

  sendMessage(): void {
  const text = this.messageControl.value?.trim();
  if (!text || this.isLoading) return;
  
  if (this.editingIndex !== null) {
    this.chatService.truncateFrom(this.editingIndex);
    this.editingIndex = null;
    this.editingText = '';
  }
  
  this.messageControl.reset();
  this.chatService.saveDraft('');
  this.chatService.sendMessage(text).subscribe();
}

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // ─── Edit Feature ─────────────────────────────────────────────────────────

 startEdit(index: number): void {
  if (this.isLoading) return;
  this.editingIndex = index;
  this.editingText = this.messages[index].text;
  this.messageControl.setValue(this.messages[index].text);
  // focus the input
  setTimeout(() => {
    const input = document.querySelector('.chat-input input') as HTMLElement;
    if (input) input.focus();
  }, 100);
}

  cancelEdit(): void {
    this.editingIndex = null;
    this.editingText = '';
  }

  submitEdit(index: number): void {
    const newText = this.editingText.trim();
    if (!newText || this.isLoading) return;
    this.chatService.truncateFrom(index);
    this.editingIndex = null;
    this.editingText = '';
    this.chatService.sendMessage(newText).subscribe();
  }

  onEditKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submitEdit(index);
    }
    if (event.key === 'Escape') {
      this.cancelEdit();
    }
  }

  // ─── Search ───────────────────────────────────────────────────────────────

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    if (!this.searchOpen) this.clearSearch();
  }

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }
    this.searchLoading = true;
    this.historyService.searchConversations(this.searchQuery).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.searchLoading = false;
      },
      error: () => this.searchLoading = false
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.searchOpen = false;
  }

  selectSearchResult(conversation: Conversation): void {
    this.clearSearch();
    this.onConversationSelected(conversation);
  }

  // ─── Other Methods ────────────────────────────────────────────────────────

  clearChat(): void {
    this.chatService.clearHistory();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  logout(): void {
    this.authService.logout();
  }

  onConversationSelected(conversation: Conversation): void {
    this.historyService.getConversation(conversation.id).subscribe(full => {
      if (full.messages) {
        this.chatService.loadConversation(full.messages);
      }
    });
  }

  onNewConversation(): void {
    this.chatService.clearHistory();
  }

  exportToExcel(message: ChatMessage): void {
    if (!message.response?.data?.length) return;
    this.exportService.exportToExcel(
      message.response.data,
      message.response.columns,
      'chatbot-data'
    );
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch {}
  }

  isChartType(type: string): boolean {
    return ['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'mixed', 'horizontalBar'].includes(type);
  }

  hasExportableData(message: ChatMessage): boolean {
    return !message.loading &&
      !!message.response?.data?.length &&
      message.response.type !== 'error';
  }

  copyMessage(message: ChatMessage): void {
  const text = message.response?.naturalAnswer || message.text || '';
  navigator.clipboard.writeText(text).then(() => {
    this.showCopiedTooltip = true;
    setTimeout(() => this.showCopiedTooltip = false, 2000);
  });
}

currentLang = this.languageService.current;

toggleLanguage(): void {
  const newLang = this.currentLang === 'fr' ? 'en' : 'fr';
  this.languageService.set(newLang);
  this.currentLang = newLang;
}

}