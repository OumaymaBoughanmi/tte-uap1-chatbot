import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../shared/api.service';
import { ConversationHistoryService } from '../conversation/conversation.service';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../shared/language.service';
import {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ConversationTurn
} from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$: Observable<ChatMessage[]> = this.messagesSubject.asObservable();

  private conversationHistory: { question: string; sql: string; answer: string }[] = [];

  private draftMessage: string = '';

saveDraft(text: string): void {
  this.draftMessage = text;
}

getDraft(): string {
  return this.draftMessage;
}

  constructor(
    private apiService: ApiService,
    private historyService: ConversationHistoryService,
    private languageService: LanguageService,

  ) {}

  sendMessage(userText: string): Observable<ChatResponse> {
    const currentMessages = this.messagesSubject.getValue();

    const userMessage: ChatMessage = {
      role: 'user',
      text: userText,
      timestamp: new Date()
    };

    const botPlaceholder: ChatMessage = {
      role: 'bot',
      text: '',
      timestamp: new Date(),
      loading: true
    };

    this.messagesSubject.next([...currentMessages, userMessage, botPlaceholder]);

   const request: ChatRequest = {
  message: userText,
  history: [...this.conversationHistory],
  language: this.languageService.current
};

    return this.apiService.sendMessage(request).pipe(
        tap({
          next: async (response: ChatResponse) => {
            console.log('Response from backend:', response); // ← add here
            if (response.generatedSql) {
              this.conversationHistory.push({
              question: userText,
              sql: response.generatedSql,
              answer: response.naturalAnswer || ''
            });
            }

          // Replace loading placeholder with actual bot response
          const updated = this.messagesSubject.getValue().map((msg, idx, arr) => {
            if (idx === arr.length - 1 && msg.loading) {
              return {
                role: 'bot' as const,
                text: this.buildBotSummary(response),
                response,
                timestamp: new Date(),
                loading: false
              };
            }
            return msg;
          });
          this.messagesSubject.next(updated);

          // Auto-save to conversation history
          await this.autoSaveToHistory(userText, response);
        },
        error: (err: Error) => {
          const updated = this.messagesSubject.getValue().map((msg, idx, arr) => {
            if (idx === arr.length - 1 && msg.loading) {
              return {
                role: 'bot' as const,
                text: `Error: ${err.message}`,
                timestamp: new Date(),
                loading: false
              };
            }
            return msg;
          });
          this.messagesSubject.next(updated);
        }
      })
    );
  }

  /**
   * Loads an existing conversation from history into the chat view.
   */
  loadConversation(messages: any[]): void {
  this.conversationHistory = [];
  const chatMessages: ChatMessage[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      chatMessages.push({
        role: 'user',
        text: msg.messageText,
        timestamp: new Date(msg.createdAt)
      });
    } else if (msg.role === 'bot') {
      let response: ChatResponse | undefined;
      try {
        if (msg.responseData) {
          response = JSON.parse(msg.responseData);
        }
      } catch {}

      chatMessages.push({
        role: 'bot',
        text: msg.messageText,
        response,
        timestamp: new Date(msg.createdAt),
        loading: false
      });

      if (msg.generatedSql && i >= 1) {
        const prevMsg = messages[i - 1];
        if (prevMsg?.role === 'user') {
          this.conversationHistory.push({
            question: prevMsg.messageText,
            sql: msg.generatedSql,
            answer: response?.naturalAnswer || ''
          });
        }
      }
    }
  }

  this.messagesSubject.next(chatMessages);
}
  clearHistory(): void {
    this.messagesSubject.next([]);
    this.conversationHistory = [];
    this.historyService.setActiveConversationId(null);
  }

  truncateFrom(index: number): void {
  const current = this.messagesSubject.getValue();
  // Keep only messages before the edited question
  this.messagesSubject.next(current.slice(0, index));
  // Reset conversation history up to that point
  const userMessagesBeforeIndex = current
    .slice(0, index)
    .filter(m => m.role === 'user').length;
  this.conversationHistory = this.conversationHistory.slice(0, userMessagesBeforeIndex);
}

 private async autoSaveToHistory(userText: string, response: ChatResponse): Promise<void> {
  try {
    let conversationId = this.historyService.getActiveConversationId();

    if (!conversationId) {
      const title = userText.length > 50 ? userText.substring(0, 47) + '...' : userText;
      const conversation = await firstValueFrom(this.historyService.createConversation(title));
      if (conversation) {
        conversationId = conversation.id;
        this.historyService.setActiveConversationId(conversationId);
      }
    }

    if (!conversationId) return;

    await firstValueFrom(this.historyService.saveMessage(conversationId, {
      role: 'user',
      messageText: userText
    }));

    await firstValueFrom(this.historyService.saveMessage(conversationId, {
      role: 'bot',
      messageText: this.buildBotSummary(response),
      generatedSql: response.generatedSql,
      responseType: response.type,
      responseData: JSON.stringify(response)
    }));

  } catch (err) {
    console.warn('Failed to save conversation to history:', err);
  }
}

 private buildBotSummary(response: ChatResponse): string {
  if (response.type === 'text' && response.naturalAnswer) return '';
  if (response.error) return '❌ Sorry, I could not find an answer to your question. Please try rephrasing it or ask something related to the production data.';
  if (response.totalRows === 0) return '🔍 No data found for your query. Try asking with different filters or keywords.';
  return `✅ Found ${response.totalRows} result(s) — displayed as ${response.type}.`;
}
}
