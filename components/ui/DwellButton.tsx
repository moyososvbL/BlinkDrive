import React, { useState, useEffect, useRef } from 'react';

interface DwellButtonProps {
  onClick: () => void;
  dwellTimeMs?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  activeColor?: string;
}

export const DwellButton: React.FC<DwellButtonProps> = ({
  onClick,
  dwellTimeMs = 1500,
  children,
  className = '',
  disabled = false,
  activeColor = '#3B82F6'
}) => {
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      
      const newProgress = Math.min((elapsed / dwellTimeMs) * 100, 100);
      setProgress(newProgress);

      if (elapsed < dwellTimeMs) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Trigger click
        onClick();
        setIsHovered(false);
        setProgress(0);
        startTimeRef.current = null;
      }
    };

    if (isHovered && !disabled) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      setProgress(0);
      startTimeRef.current = null;
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isHovered, dwellTimeMs, onClick, disabled]);

  return (
    <button
      className={`relative overflow-hidden group outline-none focus:ring-2 focus:ring-primary ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)} // Accessibility support
      onBlur={() => setIsHovered(false)}
      disabled={disabled}
      type="button"
    >
      {/* Background fill based on dwell */}
      <div 
        className="absolute bottom-0 left-0 h-1 bg-primary/50 transition-all duration-75 ease-linear"
        style={{ width: `${progress}%`, backgroundColor: activeColor }}
      />
      
      {/* Radial overlay for more obvious feedback */}
      {isHovered && (
        <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      )}

      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
};