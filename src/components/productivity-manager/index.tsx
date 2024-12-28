"use client";

import { useEffect, useState, useCallback } from "react";
import type { FC } from "react";
import { useActivityMonitor } from "../../hooks/use-activity-monitor";
import type { ProductivityInsights } from "../../types";
import { analyzeProductivityPatterns } from "../../lib/activity-patterns";
import React from "react";

interface NotificationOptions {
  readonly type: 'warning' | 'info' | 'success';
  readonly message: string;
  readonly action?: {
    readonly label: string;
    readonly onClick: () => void;
  };
}

export const ProductivityManager: FC = () => {
  const activityMonitor = useActivityMonitor();
  const [insights, setInsights] = useState<ProductivityInsights>();
  
  const switchToRecommendedActivity = useCallback((activity: string) => {
    // Implementation
    console.log(`Switching to ${activity}`);
  }, []);

  const notifyUser = useCallback(async (options: NotificationOptions): Promise<void> => {
    // Implementation
    console.log('Notification:', options);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newInsights = analyzeProductivityPatterns(activityMonitor.getActivities());
      setInsights(newInsights);
      
      if (newInsights.requiresIntervention) {
        void provideProductivityGuidance(newInsights);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [activityMonitor]);

  const provideProductivityGuidance = async (productivityInsights: ProductivityInsights): Promise<void> => {
    if (productivityInsights.currentActivity.isUnproductive) {
      await notifyUser({
        type: 'warning',
        message: `Noticed you've been on ${productivityInsights.currentActivity.name} for ${productivityInsights.timeSpent}. 
                 Consider switching to ${productivityInsights.recommendedActivity}?`,
        action: {
          label: 'Switch Now',
          onClick: () => void switchToRecommendedActivity(productivityInsights.recommendedActivity)
        }
      });
    }
  };

  if (!insights) return null;

  return (
    <div className="productivity-manager">
      {/* Render productivity insights */}
      <div className="current-activity">
        Current Activity: {insights.currentActivity.name}
      </div>
      <div className="time-spent">
        Time Spent: {insights.timeSpent}
      </div>
    </div>
  );
};
