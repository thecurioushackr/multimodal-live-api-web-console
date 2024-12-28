import type { ActivityData, BrowserHistory, MonitorConfig, ProductivityReport, ChromeHistoryItem } from "../types/activity-monitor";
import { supabase } from "./supabase";

export class ScreenMonitor {
  private readonly activities: ActivityData[] = [];
  private readonly browserHistory: BrowserHistory[] = [];
  private readonly observers: Set<(data: ActivityData) => void> = new Set();
  
  constructor(private readonly config: MonitorConfig) {
    console.log('ScreenMonitor initialized with config:', config);
    this.initializeBrowserTracking();
    this.initializeApplicationTracking();
  }

  addEventListener(event: string, handler: (data: ActivityData) => void): void {
    if (event === 'activity') {
      this.observers.add(handler);
    }
  }

  removeEventListener(event: string, handler: (data: ActivityData) => void): void {
    if (event === 'activity') {
      this.observers.delete(handler);
    }
  }

  private async initializeBrowserTracking(): Promise<void> {
    if (!chrome?.history?.onVisited) {
      console.warn("Chrome history API not available - running in development mode");
      // Add mock data for testing
      setInterval(() => {
        void this.processBrowserActivity({
          id: Math.random().toString(),
          url: 'https://test.com',
          title: 'Test Page',
          lastVisitTime: Date.now(),
        });
      }, this.config.captureInterval);
      return;
    }
    chrome.history.onVisited.addListener((result) => {
      if (!result.url || !result.title) return;
      return void this.processBrowserActivity({
        url: result.url,
        title: result.title,
        id: result.id,
        lastVisitTime: result.lastVisitTime ?? Date.now(),
        typedCount: result.typedCount ?? 0,
        visitCount: result.visitCount ?? 1
      });
    });
  }

  private async initializeApplicationTracking(): Promise<void> {
    // Implementation
  }

  private async processBrowserActivity(activity: ChromeHistoryItem): Promise<void> {
    const categorized = this.categorizeActivity(activity);
    if (categorized) {
      this.activities.push(categorized);
      console.log('New activity tracked:', categorized);
      
      // Store in Supabase
      try {
        const { error } = await supabase
          .from('activities')
          .insert([categorized]);
        
        if (error) throw error;
      } catch (err) {
        console.error('Failed to store activity:', err);
      }

      // Notify observers
      this.notifyObservers(categorized);
    }
  }

  categorizeActivity(activity: ChromeHistoryItem): ActivityData {
    return {
      timestamp: new Date(activity.lastVisitTime),
      application: 'browser',
      url: activity.url,
      timeSpent: 0, // Will be calculated based on subsequent visits
      category: {
        type: 'development', // You might want to implement proper categorization logic
        priority: 1
      },
      productivity_score: 0 // Implement scoring logic
    };
  }

  public analyzeProductivity(): ProductivityReport {
    return {
      mostProductiveHours: this.calculateProductiveHours() ?? [],
      distractionPatterns: this.identifyDistractions() ?? [],
      focusSessions: this.analyzeFocusSessions() ?? [],
      recommendations: this.generateRecommendations() ?? []
    };
  }

  private calculateProductiveHours(): string[] {
    return [];
  }

  private identifyDistractions(): string[] {
    return [];
  }

  private analyzeFocusSessions(): string[] {
    return [];
  }

  private generateRecommendations(): string[] {
    return [];
  }

  private notifyObservers(data: ActivityData): void {
    console.log('Notifying observers with data:', data);
    this.observers.forEach((observer) => {
      try {
        observer(data);
      } catch (err) {
        console.error('Observer error:', err);
      }
    });
  }

  public disconnect(): void {
    this.observers.clear();
  }
} 
