import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from '../shared/api.service';
import { ConversationHistoryService } from '../conversation/conversation.service';
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

  private conversationHistory: ConversationTurn[] = [];

  constructor(
    private apiService: ApiService,
    private historyService: ConversationHistoryService
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
      history: [...this.conversationHistory]
    };

    return this.apiService.sendMessage(request).pipe(
      tap({
        next: async (response: ChatResponse) => {
          if (response.generatedSql) {
            this.conversationHistory.push({
              question: userText,
              sql: response.generatedSql
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

    for (const msg of messages) {
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

        if (msg.generatedSql && chatMessages.length >= 2) {
          const prevUserMsg = chatMessages[chatMessages.length - 2];
          if (prevUserMsg.role === 'user') {
            this.conversationHistory.push({
              question: prevUserMsg.text,
              sql: msg.generatedSql
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

  private async autoSaveToHistory(userText: string, response: ChatResponse): Promise<void> {
    try {
      let conversationId = this.historyService.getActiveConversationId();

      // Create new conversation if none is active
      if (!conversationId) {
        const title = userText.length > 50 ? userText.substring(0, 47) + '...' : userText;
        const conversation = await this.historyService.createConversation(title).toPromise();
        if (conversation) {
          conversationId = conversation.id;
          this.historyService.setActiveConversationId(conversationId);
        }
      }

      if (!conversationId) return;

      // Save user message
      await this.historyService.saveMessage(conversationId, {
        role: 'user',
        messageText: userText
      }).toPromise();

      // Save bot response
      await this.historyService.saveMessage(conversationId, {
        role: 'bot',
        messageText: this.buildBotSummary(response),
        generatedSql: response.generatedSql,
        responseType: response.type,
        responseData: response
      }).toPromise();

    } catch (err) {
      console.warn('Failed to save conversation to history:', err);
    }
  }

  private buildBotSummary(response: ChatResponse): string {
    if (response.error) return response.error;
    if (response.totalRows === 0) return 'No data found for your query.';
    return `Found ${response.totalRows} result(s) — displayed as ${response.type}.`;
  }
}
