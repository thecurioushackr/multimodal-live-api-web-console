export interface ProductivityInsights {
  requiresIntervention: boolean;
  currentActivity: {
    name: string;
    isUnproductive: boolean;
  };
  timeSpent: string;
  recommendedActivity: string;
} 