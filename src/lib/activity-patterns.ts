import type { ActivityData } from '../components/activity-monitor';
import type { ProductivityInsights } from '../types';

interface ProductivityMetrics {
  productiveTime: number;
  unproductiveTime: number;
  focusedSessions: number;
  distractions: number;
}

// Productivity scores for different activity types
const PRODUCTIVITY_WEIGHTS = {
  work: 1.0,
  development: 1.0,
  learning: 0.8,
  communication: 0.6,
  entertainment: 0.2
} as const;

// Time thresholds in milliseconds
const TIME_THRESHOLDS = {
  FOCUS_SESSION: 25 * 60 * 1000, // 25 minutes
  DISTRACTION: 5 * 60 * 1000,    // 5 minutes
  INTERVENTION: 15 * 60 * 1000   // 15 minutes
} as const;

export function analyzeProductivityPatterns(activities: ActivityData[]): ProductivityInsights {
  if (!activities.length) {
    return getDefaultInsights();
  }

  const recentActivities = getRecentActivities(activities);
  const metrics = calculateProductivityMetrics(recentActivities);
  const currentActivity = getCurrentActivity(recentActivities);
  
  return {
    requiresIntervention: shouldIntervene(currentActivity, metrics),
    currentActivity: {
      name: currentActivity.application,
      isUnproductive: isUnproductiveActivity(currentActivity)
    },
    timeSpent: formatTimeSpent(currentActivity.timeSpent),
    recommendedActivity: getRecommendedActivity(recentActivities, metrics)
  };
}

function getRecentActivities(activities: ActivityData[]): ActivityData[] {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return activities.filter(activity => 
    new Date(activity.timestamp).getTime() > oneHourAgo
  );
}

function calculateProductivityMetrics(activities: ActivityData[]): ProductivityMetrics {
  return activities.reduce((metrics, activity) => {
    const productivityScore = getProductivityScore(activity);
    
    return {
      productiveTime: metrics.productiveTime + (productivityScore >= 0.8 ? activity.timeSpent : 0),
      unproductiveTime: metrics.unproductiveTime + (productivityScore <= 0.2 ? activity.timeSpent : 0),
      focusedSessions: metrics.focusedSessions + (activity.timeSpent >= TIME_THRESHOLDS.FOCUS_SESSION ? 1 : 0),
      distractions: metrics.distractions + (isUnproductiveActivity(activity) ? 1 : 0)
    };
  }, {
    productiveTime: 0,
    unproductiveTime: 0,
    focusedSessions: 0,
    distractions: 0
  });
}

function getCurrentActivity(activities: ActivityData[]): ActivityData {
  return activities[activities.length - 1];
}

function shouldIntervene(
  currentActivity: ActivityData, 
  metrics: ProductivityMetrics
): boolean {
  const isUnproductive = isUnproductiveActivity(currentActivity);
  const longUnproductiveSession = currentActivity.timeSpent >= TIME_THRESHOLDS.INTERVENTION;
  const highDistractionCount = metrics.distractions >= 5; // 5 distractions per hour
  
  return isUnproductive && (longUnproductiveSession || highDistractionCount);
}

function isUnproductiveActivity(activity: ActivityData): boolean {
  const productivityScore = getProductivityScore(activity);
  return productivityScore <= 0.2;
}

function getProductivityScore(activity: ActivityData): number {
  return PRODUCTIVITY_WEIGHTS[activity.category.type] || 0;
}

function formatTimeSpent(timeSpent: number): string {
  const minutes = Math.floor(timeSpent / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

function getRecommendedActivity(
  activities: ActivityData[], 
  metrics: ProductivityMetrics
): string {
  // If we've been unproductive, suggest the most recent productive activity
  if (metrics.unproductiveTime > metrics.productiveTime) {
    const lastProductiveActivity = activities.slice().reverse().find(activity => 
      getProductivityScore(activity) >= 0.8
    );
    
    if (lastProductiveActivity) {
      return lastProductiveActivity.application;
    }
  }

  // If we've been focused for too long, suggest a break
  if (metrics.focusedSessions >= 4) { // 4 pomodoro sessions
    return "taking a short break";
  }

  // Default recommendations based on time of day
  const hour = new Date().getHours();
  if (hour < 12) {
    return "planning your day";
  } else if (hour < 15) {
    return "focused work session";
  } else if (hour < 18) {
    return "learning something new";
  } else {
    return "reviewing today's progress";
  }
}

function getDefaultInsights(): ProductivityInsights {
  return {
    requiresIntervention: false,
    currentActivity: {
      name: "No activity",
      isUnproductive: false
    },
    timeSpent: "0m",
    recommendedActivity: "starting your day"
  };
} 