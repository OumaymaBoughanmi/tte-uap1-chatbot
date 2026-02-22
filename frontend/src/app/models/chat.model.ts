export interface ChatRequest {
  message: string;
  history: ConversationTurn[];
}

export interface ConversationTurn {
  question: string;
  sql: string;
}

export interface ChatResponse {
  generatedSql: string;
  type: 'table' | 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter' | 'radar' | 'mixed' | 'horizontalBar' | 'error';
  columns: string[];
  data: Record<string, any>[];
  chartConfig?: ChartConfig;
  totalRows: number;
  error?: string;
}

export interface ChartConfig {
  title: string;
  labelColumn: string;
  valueColumns: string[];
}

export interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  response?: ChatResponse;
  timestamp: Date;
  loading?: boolean;
}
