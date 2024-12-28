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