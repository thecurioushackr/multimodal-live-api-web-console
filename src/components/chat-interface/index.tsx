"use client";

import { useState, useRef } from "react";
import { Button, Input, Tooltip } from "@nextui-org/react";
import { useLiveAPIContext } from "@/contexts/LiveAPIContext";
import { ChatHistory } from "./chat-history";
import { ThinkingIndicator } from "./thinking-indicator";
import { 
  Camera, 
  Mic, 
  Screen, 
  Send,
  Memory,
  Pause,
  Play 
} from "lucide-react";

interface ChatInputProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onVideoStreamChange: (stream: MediaStream | null) => void;
}

export function ChatInterface() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const { connected, connect, disconnect, client } = useLiveAPIContext();
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isMemoryActive, setIsMemoryActive] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    setIsThinking(true);
    try {
      await client.sendMessage(input);
      setInput("");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHistory />
      
      <div className="border-t border-divider bg-content1 p-4">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-2 bg-content2 rounded-full px-4 py-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="border-none bg-transparent"
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
            />
            
            <div className="flex items-center gap-2">
              <ControlButtons 
                videoRef={videoRef}
                onVideoStreamChange={setVideoStream}
              />
              
              <Tooltip content={isMemoryActive ? "Memory Active" : "Memory Inactive"}>
                <Button
                  isIconOnly
                  variant="light"
                  onClick={() => setIsMemoryActive(!isMemoryActive)}
                >
                  <Memory className={isMemoryActive ? "text-primary" : "text-default-400"} />
                </Button>
              </Tooltip>

              <Button
                isIconOnly
                variant="light"
                onClick={connected ? disconnect : connect}
              >
                {connected ? <Pause /> : <Play />}
              </Button>
            </div>
          </div>

          <Button
            color="primary"
            isIconOnly
            onClick={handleSend}
            isLoading={isThinking}
          >
            <Send />
          </Button>
        </div>
      </div>

      {isThinking && <ThinkingIndicator />}
    </div>
  );
} 