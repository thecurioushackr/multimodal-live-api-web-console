import { useCallback, useEffect, useState, useRef } from 'react';
import type { ActivityData } from '../components/activity-monitor';
import { supabase } from '../lib/supabase';

interface ActivityMonitor {
  getActivities: () => ActivityData[];
  getCurrentActivity: () => ActivityData | null;
  addActivity: (activity: ActivityData) => void;
  clearActivities: () => void;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

const STORAGE_KEY = 'activity-monitor-data';
const MAX_STORED_ACTIVITIES = 1000; // Limit storage to prevent memory issues

export function useActivityMonitor(): ActivityMonitor {
  const [activities, setActivities] = useState<ActivityData[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const [isTracking, setIsTracking] = useState(false);
  const trackingInterval = useRef<NodeJS.Timer>();

  // Sync with Supabase on mount
  useEffect(() => {
    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_STORED_ACTIVITIES);

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      setActivities(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    void fetchActivities();
  }, []);

  // Clean up old activities
  useEffect(() => {
    const cleanup = () => {
      setActivities(current => {
        if (current.length > MAX_STORED_ACTIVITIES) {
          return current.slice(-MAX_STORED_ACTIVITIES);
        }
        return current;
      });
    };

    // Run cleanup every hour
    const cleanupInterval = setInterval(cleanup, 60 * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  const startTracking = useCallback(() => {
    if (trackingInterval.current) return;

    setIsTracking(true);
    trackingInterval.current = setInterval(() => {
      // Get current window/tab information
      if (typeof window !== 'undefined') {
        const now = new Date();
        const newActivity: ActivityData = {
          timestamp: now,
          application: window.document.title,
          url: window.location.href,
          timeSpent: 0, // Will be calculated when activity changes
          category: determineCategory(window.location.href),
          productivity_score: 0 // Will be calculated by activity patterns
        };

        setActivities(current => {
          const previous = current[current.length - 1];
          if (previous) {
            // Calculate time spent on previous activity
            const updatedPrevious = {
              ...previous,
              timeSpent: now.getTime() - new Date(previous.timestamp).getTime()
            };
            return [...current.slice(0, -1), updatedPrevious, newActivity];
          }
          return [...current, newActivity];
        });
      }
    }, 1000); // Track every second
  }, []);

  const stopTracking = useCallback(() => {
    if (trackingInterval.current) {
      clearInterval(trackingInterval.current);
      trackingInterval.current = undefined;
    }
    setIsTracking(false);
  }, []);

  const getActivities = useCallback(() => {
    return activities;
  }, [activities]);

  const getCurrentActivity = useCallback(() => {
    return activities[activities.length - 1] || null;
  }, [activities]);

  const addActivity = useCallback(async (activity: ActivityData) => {
    // Add to local state
    setActivities(current => {
      const newActivities = [...current, activity];
      return newActivities.slice(-MAX_STORED_ACTIVITIES);
    });

    // Sync to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    }

    // Sync to Supabase
    const { error } = await supabase
      .from('activities')
      .insert([activity]);

    if (error) {
      console.error('Error syncing activity to Supabase:', error);
    }
  }, [activities]);

  const clearActivities = useCallback(async () => {
    // Clear local state
    setActivities([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Clear Supabase data
    const { error } = await supabase
      .from('activities')
      .delete()
      .neq('id', 0); // Delete all records

    if (error) {
      console.error('Error clearing activities from Supabase:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackingInterval.current) {
        clearInterval(trackingInterval.current);
      }
    };
  }, []);

  return {
    getActivities,
    getCurrentActivity,
    addActivity,
    clearActivities,
    isTracking,
    startTracking,
    stopTracking
  };
}

// Helper function to determine activity category
function determineCategory(url: string): ActivityData['category'] {
  const urlLower = url.toLowerCase();
  
  // Development sites
  if (urlLower.includes('github.com') || 
      urlLower.includes('stackoverflow.com') ||
      urlLower.includes('localhost')) {
    return {
      type: 'development',
      priority: 1
    };
  }
  
  // Learning sites
  if (urlLower.includes('coursera.org') ||
      urlLower.includes('udemy.com') ||
      urlLower.includes('pluralsight.com')) {
    return {
      type: 'learning',
      priority: 2
    };
  }
  
  // Communication sites
  if (urlLower.includes('gmail.com') ||
      urlLower.includes('slack.com') ||
      urlLower.includes('teams.microsoft.com')) {
    return {
      type: 'communication',
      priority: 3
    };
  }
  
  // Entertainment sites
  if (urlLower.includes('youtube.com') ||
      urlLower.includes('netflix.com') ||
      urlLower.includes('reddit.com')) {
    return {
      type: 'entertainment',
      priority: 4
    };
  }
  
  // Default to work category
  return {
    type: 'work',
    priority: 1
  };
} 