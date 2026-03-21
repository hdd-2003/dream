import React from 'react';
import { cn } from '../../utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  blur?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  blur = 'xl' 
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl'
  };

  return (
    <div className={cn(
      'relative bg-white/5 border border-white/10 rounded-3xl shadow-2xl overflow-hidden',
      blurClasses[blur],
      className
    )}>
      {children}
    </div>
  );
};
