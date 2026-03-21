import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface DreamStarProps {
  color: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const DreamStar: React.FC<DreamStarProps> = ({
  color,
  size = 'md',
  onClick,
  icon,
  className
}) => {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14 md:w-16 md:h-16',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6 md:w-8 md:h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.3, y: -8 }}
      whileTap={{ scale: 1.1 }}
      onClick={onClick}
      className={cn('relative group cursor-pointer', className)}
    >
      <div 
        className="absolute -inset-4 rounded-full opacity-0 group-hover:opacity-40 transition-all duration-300"
        style={{ backgroundColor: color, filter: 'blur(20px)' }}
      />
      
      <div 
        className={cn(
          'rounded-full relative flex items-center justify-center transition-all duration-300',
          sizeClasses[size]
        )}
        style={{ 
          backgroundColor: color,
          boxShadow: `0 0 30px ${color}, 0 0 60px ${color}40`
        }}
      >
        <div className="absolute inset-1 rounded-full bg-white/20 backdrop-blur-sm" />
        <div className={cn('relative z-10 flex items-center justify-center text-white', iconSizeClasses[size])}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
};
