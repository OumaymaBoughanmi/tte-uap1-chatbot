import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ConversationHistoryService } from './conversation.service';
import { Conversation } from '../models/conversation.model';

@Component({
  selector: 'app-conversation-history',
  templateUrl: './conversation-history.component.html',
  styleUrls: ['./conversation-history.component.scss']
})
export class ConversationHistoryComponent implements OnInit {

  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() newConversation = new EventEmitter<void>();

  conversations: Conversation[] = [];
  activeId: number | null = null;
  editingId: number | null = null;
  editingTitle: string = '';

  constructor(public historyService: ConversationHistoryService) {}

  ngOnInit(): void {
    this.historyService.loadAllConversations().subscribe();
    this.historyService.conversations$.subscribe(conversations => {
      this.conversations = conversations;
    });
    this.activeId = this.historyService.getActiveConversationId();
  }

  selectConversation(conversation: Conversation): void {
    this.activeId = conversation.id;
    this.historyService.setActiveConversationId(conversation.id);
    this.conversationSelected.emit(conversation);
  }

  startNewConversation(): void {
    this.activeId = null;
    this.historyService.setActiveConversationId(null);
    this.newConversation.emit();
  }

  startEditing(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    this.editingId = conversation.id;
    this.editingTitle = conversation.title;
  }

  saveTitle(conversation: Conversation): void {
    if (this.editingTitle.trim()) {
      this.historyService.updateTitle(conversation.id, this.editingTitle.trim()).subscribe();
    }
    this.editingId = null;
  }

  deleteConversation(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete "${conversation.title}"?`)) {
      this.historyService.deleteConversation(conversation.id).subscribe(() => {
        if (this.activeId === conversation.id) {
          this.activeId = null;
          this.historyService.setActiveConversationId(null);
          this.newConversation.emit();
        }
      });
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }
}
