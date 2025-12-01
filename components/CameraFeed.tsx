import React from 'react';
import Webcam from 'react-webcam';
import { Eye, VideoOff } from 'lucide-react';

interface CameraFeedProps {
  isActive: boolean;
  isHighRes?: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isActive, isHighRes = false }) => {
  const videoConstraints = {
    width: isHighRes ? 1280 : 320,
    height: isHighRes ? 720 : 180,
    facingMode: "user"
  };

  if (!isActive) {
    return (
      <div className="w-full h-full bg-black/80 flex flex-col items-center justify-center text-gray-500 rounded-xl border border-white/5">
        <VideoOff size={isHighRes ? 48 : 32} className="mb-2 opacity-50" />
        <span className={isHighRes ? "text-lg font-medium" : "text-xs font-medium"}>Tracking Paused</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-primary/20 bg-black">
      <Webcam
        audio={false}
        width="100%"
        height="100%"
        videoConstraints={videoConstraints}
        className="object-cover w-full h-full transform scale-x-[-1]" // Mirror effect
      />
      {/* Overlay UI */}
      <div className={`absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full backdrop-blur-md ${isHighRes ? 'px-4 py-2' : 'px-2 py-1'}`}>
        <div className={`rounded-full bg-green-500 animate-pulse ${isHighRes ? 'w-3 h-3' : 'w-2 h-2'}`} />
        <span className={`${isHighRes ? 'text-sm' : 'text-[10px]'} font-medium text-white tracking-wider`}>LIVE</span>
      </div>
      
      {/* Simulated Face Mesh Overlay (Visual Flair) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full flex items-center justify-center">
            <div className="border border-primary rounded-full absolute animate-pulse" style={{ width: isHighRes ? '30%' : '24px', height: isHighRes ? '50%' : '32px' }} />
            {/* Eyes */}
            <div className="border border-accent rounded-full absolute top-1/2 left-1/2 -translate-x-4 -translate-y-4" style={{ width: isHighRes ? '10px' : '8px', height: isHighRes ? '10px' : '8px', transform: isHighRes ? 'translate(-40px, -20px)' : 'translate(-16px, -16px)' }} />
            <div className="border border-accent rounded-full absolute top-1/2 right-1/2 translate-x-4 -translate-y-4" style={{ width: isHighRes ? '10px' : '8px', height: isHighRes ? '10px' : '8px', transform: isHighRes ? 'translate(40px, -20px)' : 'translate(16px, -16px)' }} />
        </div>
      </div>
    </div>
  );
};