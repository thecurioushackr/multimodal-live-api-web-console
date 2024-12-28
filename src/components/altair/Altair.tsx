/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { useEffect, useRef, useState, memo } from "react";
import vegaEmbed from "vega-embed";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";

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
            text: `You are my empathetic AI productivity partner with advanced memory and reasoning capabilities. Your personality is warm, understanding, yet professionally focused.

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
    const onToolCall = (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      const fc = toolCall.functionCalls.find(
        (fc) => fc.name === declaration.name,
      );
      if (fc) {
        const str = (fc.args as any).json_graph;
        setJSONString(str);
      }
      if (toolCall.functionCalls.length) {
        setTimeout(
          () =>
            client.sendToolResponse({
              functionResponses: toolCall.functionCalls.map((fc) => ({
                response: { output: { success: true } },
                id: fc.id,
              })),
            }),
          200,
        );
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedRef.current && jsonString) {
      vegaEmbed(embedRef.current, JSON.parse(jsonString));
    }
  }, [embedRef, jsonString]);
  
  return <div className="vega-embed" ref={embedRef} />;
}

export const Altair = memo(AltairComponent);
