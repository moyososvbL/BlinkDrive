import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  onClick,
  hoverEffect = false
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-surface/30 
        backdrop-blur-xl 
        border border-white/10 
        rounded-2xl 
        p-6 
        shadow-xl
        ${hoverEffect ? 'transition-all duration-300 hover:bg-surface/50 hover:border-primary/50 hover:shadow-primary/20 hover:-translate-y-1' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};