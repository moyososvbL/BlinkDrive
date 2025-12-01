import React, { useEffect, useState } from 'react';

interface GazeCursorProps {
  enabled: boolean;
  smoothing: number;
  x: number;
  y: number;
  isPrecisionMode?: boolean;
}

export const GazeCursor: React.FC<GazeCursorProps> = ({ 
    enabled, 
    smoothing, 
    x, 
    y,
    isPrecisionMode = false 
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Smooth animation loop using Linear Interpolation (Lerp)
  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      setPosition(prev => {
        // Dynamic Smoothing:
        // If precision mode is ON, we effectively increase the "smoothing" factor to make it sluggish (more precise)
        const effectiveSmoothing = isPrecisionMode ? smoothing + 15 : smoothing;
        
        // Calculate the interpolation factor.
        // Higher smoothing prop = lower interpolation factor (slower movement)
        const factor = 0.1 + (0.5 / (Math.max(effectiveSmoothing, 1))); 
        
        const dx = x - prev.x;
        const dy = y - prev.y;
        
        // Snap if very close to stop jitter
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return prev;

        return {
          x: prev.x + dx * factor,
          y: prev.y + dy * factor
        };
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    if (enabled) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [x, y, enabled, smoothing, isPrecisionMode]);

  if (!enabled) return null;

  const color = isPrecisionMode ? 'bg-orange-500' : 'bg-primary';
  const shadowColor = isPrecisionMode ? 'rgba(249, 115, 22, 0.8)' : 'rgba(59,130,246,0.8)';

  return (
    <div 
      className="fixed pointer-events-none z-[9999] transition-opacity duration-300"
      style={{ 
        left: position.x, 
        top: position.y, 
        transform: 'translate(-50%, -50%)' 
      }}
    >
      {/* Outer Glow */}
      <div className={`w-12 h-12 rounded-full ${isPrecisionMode ? 'bg-orange-500/20' : 'bg-primary/20'} blur-md absolute inset-0 animate-pulse`} />
      
      {/* Inner Core */}
      <div 
        className={`w-4 h-4 rounded-full ${color}/80 border-2 border-white relative transition-colors duration-300`}
        style={{ boxShadow: `0 0 15px ${shadowColor}` }}
      />
      
      {/* Helper crosshair for precision */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[1px] ${isPrecisionMode ? 'bg-orange-500/50' : 'bg-primary/30'}`} />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[150%] w-[1px] ${isPrecisionMode ? 'bg-orange-500/50' : 'bg-primary/30'}`} />
      
      {isPrecisionMode && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/50 px-2 py-0.5 rounded text-[10px] text-white">
              Precision
          </div>
      )}
    </div>
  );
};