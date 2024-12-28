import { useCallback, useEffect, useState } from "react";
import type { FC } from "react";
import { ScreenMonitor } from "../../lib/screen-monitor";
import { supabase } from "../../lib/supabase";
import type { ActivityData } from "../../types/activity-monitor";

export const ActivityMonitor: FC = () => {
  console.log('ActivityMonitor rendering');

  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [currentFocus, setCurrentFocus] = useState<string>();
  
  const processActivityData = useCallback((data: ActivityData): void => {
    console.log('Processing activity data:', data);
    setActivities(prev => [...prev, data]);
    analyzeProductivity(data);
    updateFocus(data);
  }, []);

  useEffect(() => {
    console.log('Initializing ScreenMonitor...');
    const monitor = new ScreenMonitor({
      captureInterval: 5000, // Increased for testing
      browserTracking: true,
      applicationTracking: true,
    });

    const handleActivity = (data: ActivityData): void => {
      console.log('Activity received:', data);
      processActivityData(data);
    };

    monitor.addEventListener('activity', handleActivity);
    console.log('Event listener added');

    // Load existing activities from Supabase
    const loadActivities = async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Failed to load activities:', error);
        return;
      }

      if (data) {
        console.log('Loaded activities:', data);
        setActivities(data);
      }
    };

    void loadActivities();
    void testSupabaseConnection();

    return () => {
      console.log('Cleaning up ScreenMonitor...');
      monitor.disconnect();
      monitor.removeEventListener('activity', handleActivity);
    };
  }, [processActivityData]);

  const analyzeProductivity = (data: ActivityData): void => {
    // Implementation
    console.log('Analyzing productivity:', data);
  };

  const updateFocus = (data: ActivityData): void => {
    // Implementation
    setCurrentFocus(data.application);
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('count')
        .single();
      
      if (error) throw error;
      console.log('Supabase connection successful:', data);
      return true;
    } catch (error) {
      console.error('Supabase connection failed:', error);
      return false;
    }
  };

  // Add this to your useEffect to test on mount
  useEffect(() => {
    void testSupabaseConnection();
  }, []);

  // Add a basic render to use the state variables
  return (
    <div 
      style={{ 
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '400px',
        backgroundColor: 'white',
        padding: '20px',
        boxShadow: '0 0 10px rgba(0,0,0,0.2)',
        border: '1px solid #ccc',
        zIndex: 9999,
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '15px' }}>
        Activity Monitor
      </h2>
      <div>
        <div style={{ padding: '10px', backgroundColor: '#f3f4f6', marginBottom: '10px', borderRadius: '4px' }}>
          <strong>Current Focus:</strong> {currentFocus || 'None'}
        </div>
        <div style={{ padding: '10px', backgroundColor: '#f3f4f6', marginBottom: '10px', borderRadius: '4px' }}>
          <strong>Activities tracked:</strong> {activities.length}
        </div>
        <button 
          onClick={() => void testSupabaseConnection()}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '4px',
            marginBottom: '10px',
            cursor: 'pointer'
          }}
        >
          Test Supabase Connection
        </button>
        {activities.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Latest Activity:</h3>
            <pre style={{ 
              padding: '10px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(activities[activities.length - 1], null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}; 