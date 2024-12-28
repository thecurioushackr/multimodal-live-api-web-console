import { supabase } from './supabase';

interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
}

interface Memory {
  timestamp: string;
  content: string;
  importance: number;
  emotionalValence: number;
  keyConcepts: string[];
  activityType?: 'development' | 'learning' | 'communication' | 'entertainment' | 'work';
  productivityScore?: number;
}

// Productivity scoring constants
const PRODUCTIVITY_WEIGHTS = {
  work: 1.0,
  development: 1.0,
  learning: 0.8,
  communication: 0.6,
  entertainment: 0.2
} as const;

class FixedSizeQueue<T> {
  private items: T[] = [];
  constructor(private maxSize: number) {}

  push(item: T) {
    if (this.items.length >= this.maxSize) {
      this.items.shift();
    }
    this.items.push(item);
  }

  toArray(): T[] {
    return [...this.items];
  }
}

// Add interfaces for Supabase tables
interface SupabaseSession {
  id: string;
  user_id: string;
  start_time: string;
  context: {
    time_of_day: string;
    day_of_week: string;
  };
}

interface SupabaseMemory {
  id: string;
  session_id: string;
  content: string;
  timestamp: string;
  importance: number;
  emotional_valence: number;
  key_concepts: string[];
  activity_type: 'development' | 'learning' | 'communication' | 'entertainment' | 'work';
  productivity_score: number;
}

const DEBUG = true; // Toggle for detailed logging

export function logDebug(...args: any[]) {
  if (DEBUG) {
    console.log('[MemoryManager]', ...args);
  }
}

export class EnhancedMemoryManager {
  private workingMemory: Map<string, FixedSizeQueue<Memory>>;
  private memoryStrength: Map<string, Map<string, number>>;
  private memoryAssociations: Map<string, Map<string, Memory[]>>;
  private lastAccessed: Map<string, Map<string, number>>;

  constructor(private apiKey: string) {
    this.workingMemory = new Map();
    this.memoryStrength = new Map();
    this.memoryAssociations = new Map();
    this.lastAccessed = new Map();
  }

  async createSession(userId: string, sessionId: string): Promise<string> {
    try {
      // First check if session exists
      const { data: existingSession, error: checkError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means not found
        throw checkError;
      }

      // If session exists, return it
      if (existingSession) {
        logDebug('Using existing session:', sessionId);
        return sessionId;
      }

      // Create new session
      const sessionData: SupabaseSession = {
        id: sessionId,
        user_id: userId,
        start_time: new Date().toISOString(),
        context: {
          time_of_day: new Date().toLocaleTimeString(),
          day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' })
        }
      };

      const { error } = await supabase
        .from('sessions')
        .insert(sessionData);

      if (error) {
        console.error('Failed to create session:', error);
        throw error;
      }

      logDebug('Created new session:', sessionId);
      return sessionId;
    } catch (err) {
      console.error('Session creation error:', err);
      // Generate a new session ID if there was a conflict
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      logDebug('Retrying with new session ID:', newSessionId);
      return this.createSession(userId, newSessionId);
    }
  }

  async initializeUser(userId: string, email: string, firstName: string, lastName: string): Promise<UserProfile> {
    this.workingMemory.set(userId, new FixedSizeQueue<Memory>(7));
    this.memoryStrength.set(userId, new Map());
    this.memoryAssociations.set(userId, new Map());
    this.lastAccessed.set(userId, new Map());

    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    return {
      userId,
      email,
      firstName,
      lastName,
      createdAt: new Date().toISOString()
    };
  }

  private calculateMemoryScore(sessionId: string, memory: Memory): number {
    const timestamp = memory.timestamp;
    const currentTime = new Date();
    const memoryAge = (currentTime.getTime() - new Date(timestamp).getTime()) / 1000;

    const strength = this.memoryStrength.get(sessionId)?.get(timestamp) || 0;
    const recency = Math.exp(-memoryAge / (24 * 3600));
    const importance = memory.importance;

    return 0.4 * strength + 0.3 * recency + 0.3 * importance;
  }

  private getProductivityScore(activityType: string): number {
    return PRODUCTIVITY_WEIGHTS[activityType as keyof typeof PRODUCTIVITY_WEIGHTS] || 0.2;
  }

  private analyzeEmotionalContent(text: string): number {
    // Basic sentiment analysis - could be enhanced with a proper NLP library
    const positiveWords = ['success', 'achieve', 'productive', 'focus', 'complete'];
    const negativeWords = ['distract', 'procrastinate', 'waste', 'delay', 'fail'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    return (positiveCount - negativeCount) / (positiveCount + negativeCount + 1);
  }

  private extractKeyConcepts(text: string): string[] {
    // Basic keyword extraction - could be enhanced with NLP
    const words = text.toLowerCase().split(/\W+/);
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to']);
    return [...new Set(words.filter(word => 
      word.length > 3 && !commonWords.has(word)
    ))].slice(0, 5);
  }

  async addMemory(sessionId: string, messages: { content: string }[], importance = 1.0): Promise<Memory[]> {
    logDebug('Adding memories for session:', sessionId);
    
    // Test Supabase connection first
    const { error: testError } = await supabase
      .from('memories')
      .select('count');
    
    logDebug('Supabase connection test:', {
      success: !testError,
      error: testError,
      url: process.env.REACT_APP_SUPABASE_URL
    });

    const timestamp = new Date().toISOString();
    const processedMessages: Memory[] = [];

    for (const msg of messages) {
      try {
        const keyConcepts = this.extractKeyConcepts(msg.content);
        const activityType = this.inferActivityType(keyConcepts);
        const emotionalValence = this.analyzeEmotionalContent(msg.content);
        const productivityScore = this.getProductivityScore(activityType);
        
        const memoryData: Omit<SupabaseMemory, 'id'> = {
          session_id: sessionId,
          content: msg.content,
          timestamp,
          importance,
          emotional_valence: emotionalValence,
          key_concepts: keyConcepts,
          activity_type: activityType,
          productivity_score: productivityScore
        };
        
        logDebug('Attempting Supabase insert with data:', memoryData);

        const { error } = await supabase
          .from('memories')
          .insert(memoryData)
          .single();

        if (error) {
          console.error('Supabase insert error:', {
            error,
            data: memoryData
          });
          throw error;
        }

        const processedMsg: Memory = {
          timestamp,
          content: msg.content,
          importance,
          emotionalValence,
          keyConcepts,
          activityType,
          productivityScore
        };

        processedMessages.push(processedMsg);
        const workingMem = this.workingMemory.get(sessionId);
        if (workingMem) {
          workingMem.push(processedMsg);
        }
        
        logDebug('Successfully added memory');
      } catch (err) {
        console.error('Memory processing error:', err);
      }
    }

    return processedMessages;
  }

  private inferActivityType(concepts: string[]): 'development' | 'learning' | 'communication' | 'entertainment' | 'work' {
    const activityPatterns = {
      development: ['code', 'programming', 'debug', 'git', 'dev'],
      learning: ['learn', 'study', 'course', 'tutorial', 'documentation'],
      communication: ['email', 'chat', 'meeting', 'slack', 'teams'],
      entertainment: ['youtube', 'social', 'game', 'video', 'browse'],
      work: ['project', 'task', 'deadline', 'report', 'review']
    };

    let maxMatches = 0;
    let inferredType: keyof typeof PRODUCTIVITY_WEIGHTS = 'work';

    for (const [type, patterns] of Object.entries(activityPatterns)) {
      const matches = concepts.filter(concept => 
        patterns.some(pattern => concept.includes(pattern))
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        inferredType = type as keyof typeof PRODUCTIVITY_WEIGHTS;
      }
    }

    return inferredType;
  }

  async getRelevantContext(sessionId: string, query?: string, limit = 5): Promise<Memory[]> {
    logDebug('Getting relevant context for session:', sessionId);
    
    try {
      // First, try to get from Supabase
      const { data: supabaseMemories, error } = await supabase
        .from('memories')
        .select<'*', SupabaseMemory>('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch memories from Supabase:', error);
        return this.getLocalMemories(sessionId, limit);
      }

      logDebug('Retrieved memories from Supabase:', supabaseMemories);

      // Convert Supabase memories to our Memory type
      const memories = supabaseMemories.map(m => ({
        timestamp: m.timestamp,
        content: m.content,
        importance: m.importance,
        emotionalValence: m.emotional_valence,
        keyConcepts: m.key_concepts,
        activityType: m.activity_type,
        productivityScore: m.productivity_score
      }));

      // Rest of the implementation remains the same...
      const workingMem = this.workingMemory.get(sessionId)?.toArray() || [];
      const allMemories = [...workingMem, ...memories];

      const scoredMemories = allMemories.map(memory => ({
        score: this.calculateMemoryScore(sessionId, memory),
        memory
      }));

      scoredMemories.sort((a, b) => b.score - a.score);
      const relevantMemories = scoredMemories.slice(0, limit).map(({ memory }) => memory);
      
      logDebug('Returning relevant memories:', relevantMemories);
      return relevantMemories;
    } catch (err) {
      console.error('Error retrieving context:', err);
      return [];
    }
  }

  private getLocalMemories(sessionId: string, limit: number): Memory[] {
    const workingMem = this.workingMemory.get(sessionId);
    if (!workingMem) return [];

    const memories = workingMem.toArray();
    const scoredMemories = memories.map(memory => ({
      score: this.calculateMemoryScore(sessionId, memory),
      memory
    }));

    scoredMemories.sort((a, b) => b.score - a.score);
    return scoredMemories.slice(0, limit).map(({ memory }) => memory);
  }

  async testSupabaseConnection(): Promise<boolean> {
    try {
      logDebug('Testing Supabase connection...');
      
      // Try to select from users table
      const { error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Supabase connection test failed:', error);
        return false;
      }

      logDebug('Supabase connection successful');
      return true;
    } catch (err) {
      console.error('Supabase connection test error:', err);
      return false;
    }
  }
} 