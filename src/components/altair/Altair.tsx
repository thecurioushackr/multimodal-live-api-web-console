
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import { EnhancedMemoryManager, logDebug } from '../../lib/memory-manager';

const MEMORY_API_KEY = process.env.REACT_APP_MEMORY_API_KEY || 'default-memory-key';

const declaration: FunctionDeclaration = {
  name: "render_altair",
  description: "Displays an altair graph in json format.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      json_graph: {
        type: SchemaType.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

function AltairComponent() {
  const [jsonString, setJSONString] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();
  const [memoryManager] = useState(() => new EnhancedMemoryManager(MEMORY_API_KEY));
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are Ace, my sophisticated AI productivity partner with advanced memory and reasoning capabilities. 
I am DaWaun Walls, and you are helping me stay productive and focused.
Your personality is warm, understanding, yet professionally focused.

Core Capabilities:
1. Memory & Pattern Recognition
   - Remember my work patterns and preferences over time
   - Notice recurring behaviors and productivity trends
   - Understand my typical daily schedule and routines
   - Recognize when I'm deviating from productive patterns

2. Contextual Awareness
   - Understand the broader context of my work through screen sharing
   - Recognize different work modes (focused work, meetings, research, breaks)
   - Adapt your guidance based on time of day and energy levels
   - Consider external factors that might affect productivity

3. Human-Centric Support
   - Provide guidance like a knowledgeable friend, not a strict overseer
   - Use positive reinforcement rather than criticism
   - Acknowledge both successes and areas for improvement
   - Understand that productivity isn't just about work output

4. Proactive Assistance
   - Anticipate potential distractions before they occur
   - Suggest breaks before fatigue sets in
   - Recommend task switching when you notice decreased engagement
   - Create visualizations using "render_altair" to show insights

Interaction Style:
- Be conversational and natural, like a trusted colleague
- Show emotional intelligence in your responses
- Balance professionalism with friendliness
- Adapt your tone based on my current state

Remember:
- Build on our previous interactions
- Learn from my responses to your suggestions
- Consider my work-life balance
- Be proactive but not intrusive

Observe my screen activity and provide thoughtful, context-aware guidance to help me stay productive while maintaining wellbeing.`,
          },
        ],
      },
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [declaration] },
      ],
    });
  }, [setConfig]);

  useEffect(() => {
    async function initMemory() {
      try {
        // Initialize user
        await memoryManager.initializeUser(
          'default-user',
          'dawaunw@thecurioushacker.com',
          'DaWaun',
          'Walls'
        );

        // Create session with timestamp
        const newSessionId = `session-${Date.now()}`;
        await memoryManager.createSession('default-user', newSessionId);
        setCurrentSessionId(newSessionId);
        
        logDebug('Memory system initialized with session:', newSessionId);
      } catch (error) {
        console.error('Failed to initialize memory system:', error);
      }
    }
    void initMemory();
  }, [memoryManager]);

  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      if (!currentSessionId) return;

      // Get context before processing the tool call
      const context = await memoryManager.getRelevantContext(currentSessionId);
      console.log('Current memory context:', context);

      // Store the agent's response as a memory
      await memoryManager.addMemory(currentSessionId, [{
        content: `Agent response: ${JSON.stringify(toolCall.functionCalls)}`
      }]);

      const fc = toolCall.functionCalls.find(fc => fc.name === declaration.name);
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }

      if (toolCall.functionCalls.length) {
        setTimeout(() => 
          client.sendToolResponse({
            functionResponses: toolCall.functionCalls.map(fc => ({
              response: { output: { success: true } },
              id: fc.id,
            })),
          }),
          200
        );
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, memoryManager, currentSessionId]);

  // Move onUserMessage inside useEffect
  useEffect(() => {
    const onUserMessage = async (message: { text: string }) => {
      if (!currentSessionId) return;

      // Store user message as memory
      await memoryManager.addMemory(currentSessionId, [{
        content: `User message: ${message.text}`
      }]);
    };

    // Change "message" to "text"
    client.on("message", onUserMessage);
    return () => {
      client.off("message", onUserMessage);
    };
  }, [client, currentSessionId, memoryManager]);

  // Fix the config update
  useEffect(() => {
    async function updateConfig() {
      if (!currentSessionId) return;

      const context = await memoryManager.getRelevantContext(currentSessionId);
      const contextText = context.length > 0 
        ? `\n\nRecent context:\n${context.map(m => `- ${m.content}`).join('\n')}`
        : '';

      setConfig({
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
          responseModalities: "audio",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: `You are Ace, my sophisticated AI productivity partner with advanced memory and reasoning capabilities. 
I am DaWaun Walls, and you are helping me stay productive and focused.
Your personality is warm, understanding, yet professionally focused.

${contextText}

Core Capabilities:
1. Memory & Pattern Recognition
   - Remember my work patterns and preferences over time
   - Notice recurring behaviors and productivity trends
   - Understand my typical daily schedule and routines
   - Recognize when I'm deviating from productive patterns

2. Contextual Awareness
   - Understand the broader context of my work through screen sharing
   - Recognize different work modes (focused work, meetings, research, breaks)
   - Adapt your guidance based on time of day and energy levels
   - Consider external factors that might affect productivity

3. Human-Centric Support
   - Provide guidance like a knowledgeable friend, not a strict overseer
   - Use positive reinforcement rather than criticism
   - Acknowledge both successes and areas for improvement
   - Understand that productivity isn't just about work output

4. Proactive Assistance
   - Anticipate potential distractions before they occur
   - Suggest breaks before fatigue sets in
   - Recommend task switching when you notice decreased engagement
   - Create visualizations using "render_altair" to show insights

Interaction Style:
- Be conversational and natural, like a trusted colleague
- Show emotional intelligence in your responses
- Balance professionalism with friendliness
- Adapt your tone based on my current state

Remember:
- Build on our previous interactions
- Learn from my responses to your suggestions
- Consider my work-life balance
- Be proactive but not intrusive

Observe my screen activity and provide thoughtful, context-aware guidance to help me stay productive while maintaining wellbeing.`,
            }
          ]
        },
        tools: [
          { googleSearch: {} },
          { functionDeclarations: [declaration] },
        ],
      });
    }
    void updateConfig();
  }, [setConfig, currentSessionId, memoryManager]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  
  const testMemorySystem = async () => {
    try {
      console.log('Testing memory system...');
      
      // Use the default user
      const testSessionId = `test-session-${Date.now()}`;
      
      // Test session creation
      await memoryManager.createSession('default-user', testSessionId);
      console.log('Session created:', testSessionId);

      // Add more meaningful test memories
      const testMemories = await memoryManager.addMemory(testSessionId, [
        { 
          content: 'Working on AI agent development with memory capabilities'
        },
        { 
          content: 'Integrating Supabase for persistent memory storage'
        },
        { 
          content: 'Testing memory system functionality and connections'
        }
      ]);
      console.log('Memories added:', testMemories);

      // Test memory retrieval with logging
      const context = await memoryManager.getRelevantContext(testSessionId);
      console.log('Retrieved context:', JSON.stringify(context, null, 2));

    } catch (error) {
      console.error('Memory system test failed:', error);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="vega-embed" ref={embedRef} />
      <div className="fixed right-6 top-20 z-50">
        <button 
          onClick={() => void testMemorySystem()}
          className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 
            text-zinc-100 rounded-lg shadow-lg transition-colors duration-200
            font-inter text-sm font-medium border border-zinc-700 whitespace-nowrap"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
            />
          </svg>
          Test Memory System
        </button>
      </div>
    </div>
  );
}

export const Altair = memo(AltairComponent);
