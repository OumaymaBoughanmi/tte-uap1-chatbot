import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ChatRequest, ChatResponse } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly BASE_URL = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  sendMessage(request: ChatRequest): Observable<ChatResponse> {
    return this.http
      .post<ChatResponse>(`${this.BASE_URL}/chat`, request)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred.';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Network error: ${error.error.message}`;
    } else {
      errorMessage = `Server error ${error.status}: ${error.message}`;
    }
    return throwError(() => new Error(errorMessage));
  }
}
