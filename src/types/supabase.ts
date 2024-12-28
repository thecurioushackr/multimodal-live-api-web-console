export interface Database {
  public: {
    Tables: {
      activities: {
        Row: {
          id: string;
          timestamp: string;
          application: string;
          url: string | null;
          time_spent: number;
          category: {
            type: 'development' | 'learning' | 'communication' | 'entertainment' | 'work';
            priority: number;
          };
          productivity_score: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
} 