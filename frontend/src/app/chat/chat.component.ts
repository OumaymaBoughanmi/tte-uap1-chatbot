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
import { Conversation } from '../models/conversation.model';
import { ChatMessage } from '../models/chat.model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  messages: ChatMessage[] = [];
  isLoading = false;
  isSidebarOpen = true;
  messageControl = new FormControl({ value: '', disabled: false }, [
    Validators.required,
    Validators.minLength(1)
  ]);

  private subscription!: Subscription;

  constructor(
    private chatService: ChatService,
    private exportService: ExportService,
    private historyService: ConversationHistoryService
  ) {}

  ngOnInit(): void {
    this.subscription = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      this.isLoading = messages.some(m => m.loading);
      if (this.isLoading) {
        this.messageControl.disable();
      } else {
        this.messageControl.enable();
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  sendMessage(): void {
    const text = this.messageControl.value?.trim();
    if (!text || this.isLoading) return;
    this.messageControl.reset();
    this.chatService.sendMessage(text).subscribe();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.chatService.clearHistory();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
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
}
