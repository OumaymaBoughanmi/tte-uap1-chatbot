export interface WidgetConfig {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table';
  visible: boolean;
  size: 'small' | 'medium' | 'large';
  order: number;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
}