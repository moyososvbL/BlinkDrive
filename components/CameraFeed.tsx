import React from 'react';
import Webcam from 'react-webcam';
import { Eye, VideoOff } from 'lucide-react';

interface CameraFeedProps {
  isActive: boolean;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ isActive }) => {
  const videoConstraints = {
    width: 320,
    height: 180,
    facingMode: "user"
  };

  if (!isActive) {
    return (
      <div className="w-full h-full bg-black/80 flex flex-col items-center justify-center text-gray-500 rounded-xl border border-white/5">
        <VideoOff size={32} className="mb-2 opacity-50" />
        <span className="text-xs font-medium">Tracking Paused</span>
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
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full backdrop-blur-md">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] font-medium text-white tracking-wider">LIVE</span>
      </div>
      
      {/* Simulated Face Mesh Overlay (Visual Flair) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full flex items-center justify-center">
            <div className="border border-primary rounded-full w-24 h-32 absolute animate-pulse" />
            <div className="border border-accent rounded-full w-2 h-2 absolute top-1/2 left-1/2 -translate-x-4 -translate-y-4" />
            <div className="border border-accent rounded-full w-2 h-2 absolute top-1/2 right-1/2 translate-x-4 -translate-y-4" />
        </div>
      </div>
    </div>
  );
};