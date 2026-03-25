import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Conversation, ConversationMessage, SaveMessageRequest } from '../models/conversation.model';

@Injectable({
  providedIn: 'root'
})
export class ConversationHistoryService {

  private readonly BASE_URL = 'http://localhost:8080/api/conversations';

  private conversationsSubject = new BehaviorSubject<Conversation[]>([]);
  public conversations$ = this.conversationsSubject.asObservable();

  private activeConversationId: number | null = null;

  constructor(private http: HttpClient) {}

  loadAllConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(this.BASE_URL).pipe(
      tap(conversations => this.conversationsSubject.next(conversations))
    );
  }

  getConversation(id: number): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.BASE_URL}/${id}`);
  }

  createConversation(title: string): Observable<Conversation> {
    return this.http.post<Conversation>(this.BASE_URL, { title }).pipe(
      tap(() => this.loadAllConversations().subscribe())
    );
  }

  saveMessage(conversationId: number, request: SaveMessageRequest): Observable<ConversationMessage> {
    return this.http.post<ConversationMessage>(
      `${this.BASE_URL}/${conversationId}/messages`,
      request
    );
  }

  updateTitle(id: number, title: string): Observable<Conversation> {
    return this.http.put<Conversation>(`${this.BASE_URL}/${id}/title`, { title }).pipe(
      tap(() => this.loadAllConversations().subscribe())
    );
  }

  deleteConversation(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`).pipe(
      tap(() => {
        const current = this.conversationsSubject.getValue();
        this.conversationsSubject.next(current.filter(c => c.id !== id));
      })
    );
  }

  setActiveConversationId(id: number | null): void {
    this.activeConversationId = id;
  }

  getActiveConversationId(): number | null {
    return this.activeConversationId;
  }

  clearConversations(): void {
  this.conversationsSubject.next([]);
  this.activeConversationId = null;
}

searchConversations(query: string): Observable<Conversation[]> {
  return this.http.get<Conversation[]>(`${this.BASE_URL}/search?query=${encodeURIComponent(query)}`);
}
}
