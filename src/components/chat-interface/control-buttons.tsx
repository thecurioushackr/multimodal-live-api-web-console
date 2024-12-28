"use client";

import { Button, Tooltip } from "@nextui-org/react";
import { Camera, Mic, Screen } from "lucide-react";
import { useWebcam } from "@/hooks/use-webcam";
import { useScreenCapture } from "@/hooks/use-screen-capture";

interface ControlButtonsProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  onVideoStreamChange: (stream: MediaStream | null) => void;
}

export function ControlButtons({ videoRef, onVideoStreamChange }: ControlButtonsProps) {
  const webcam = useWebcam();
  const screenCapture = useScreenCapture();
  const [isMuted, setIsMuted] = useState(false);

  const handleWebcam = async () => {
    if (webcam.isStreaming) {
      webcam.stop();
      onVideoStreamChange(null);
    } else {
      const stream = await webcam.start();
      onVideoStreamChange(stream);
    }
  };

  const handleScreenShare = async () => {
    if (screenCapture.isStreaming) {
      screenCapture.stop();
      onVideoStreamChange(null);
    } else {
      const stream = await screenCapture.start();
      onVideoStreamChange(stream);
    }
  };

  return (
    <>
      <Tooltip content="Toggle Webcam">
        <Button
          isIconOnly
          variant="light"
          onClick={handleWebcam}
          className={webcam.isStreaming ? "text-primary" : "text-default-400"}
        >
          <Camera />
        </Button>
      </Tooltip>

      <Tooltip content="Share Screen">
        <Button
          isIconOnly
          variant="light"
          onClick={handleScreenShare}
          className={screenCapture.isStreaming ? "text-primary" : "text-default-400"}
        >
          <Screen />
        </Button>
      </Tooltip>

      <Tooltip content={isMuted ? "Unmute" : "Mute"}>
        <Button
          isIconOnly
          variant="light"
          onClick={() => setIsMuted(!isMuted)}
          className={!isMuted ? "text-primary" : "text-default-400"}
        >
          <Mic />
        </Button>
      </Tooltip>
    </>
  );
} 