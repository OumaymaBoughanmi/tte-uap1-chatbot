export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ConversationMessage[];
}

export interface ConversationMessage {
  id: number;
  role: 'user' | 'bot';
  messageText: string;
  generatedSql?: string;
  responseType?: string;
  responseData?: string;
  createdAt: string;
}

export interface SaveMessageRequest {
  role: string;
  messageText: string;
  generatedSql?: string;
  responseType?: string;
  responseData?: any;
}
