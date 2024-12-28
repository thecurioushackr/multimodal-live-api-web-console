export interface ActivityData {
  timestamp: Date;
  application: string;
  url: string;
  timeSpent: number;
  category: {
    type: 'development' | 'learning' | 'communication' | 'entertainment' | 'work';
    priority: number;
  };
  productivity_score: number;
}

export interface BrowserHistory {
  url: string;
  timestamp: Date;
  duration: number;
}

export interface MonitorConfig {
  captureInterval: number;
  browserTracking: boolean;
  applicationTracking: boolean;
}

export interface ProductivityReport {
  mostProductiveHours: string[];
  distractionPatterns: string[];
  focusSessions: string[];
  recommendations: string[];
}

export interface ChromeHistoryItem {
  id: string;
  url: string;
  title: string;
  lastVisitTime: number;
  typedCount?: number;
  visitCount?: number;
} 