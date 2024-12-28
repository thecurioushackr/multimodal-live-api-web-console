import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { isModelTurn, ServerContent, ToolCall } from "../../multimodal-live-types";
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
  const embedRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const onUserMessage = async (data: ServerContent) => {
      if (!currentSessionId) return;
      
      // Check if it's a model turn with text content
      if (isModelTurn(data) && data.modelTurn.parts) {
        const textContent = data.modelTurn.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join(' ');

        if (textContent) {
          await memoryManager.addMemory(currentSessionId, [{
            content: `User message: ${textContent}`
          }]);
        }
      }
    };

    // Use the correct event type "content"
    client.on("content", onUserMessage);
    return () => {
      client.off("content", onUserMessage);
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

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);

  return (
    <div className="relative min-h-screen">
      <div className="vega-embed" ref={embedRef} />
    </div>
  );
}

export const Altair = memo(AltairComponent);
