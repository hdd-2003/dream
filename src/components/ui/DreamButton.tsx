import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { cn } from '../../utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface DreamButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  glow?: boolean;
}

export const DreamButton: React.FC<DreamButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  className,
  ...props
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 hover:from-indigo-400 hover:via-purple-400 hover:to-indigo-400 text-white border-transparent',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/15 hover:border-white/25',
    ghost: 'bg-transparent hover:bg-white/5 text-slate-300 border-transparent hover:text-white',
    subtle: 'bg-white/3 hover:bg-white/7 text-slate-400 hover:text-slate-200 border-transparent',
  };

  const sizes = {
    sm: 'px-4 py-2.5 text-sm rounded-xl',
    md: 'px-6 py-3.5 text-base rounded-2xl',
    lg: 'px-8 py-4.5 text-lg rounded-2xl',
    xl: 'px-10 py-5 text-lg md:text-xl rounded-3xl',
  };

  const glowClasses = glow 
    ? 'shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]' 
    : '';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={cn(
        'relative overflow-hidden inline-flex items-center justify-center gap-2 font-light tracking-wide transition-all duration-300',
        variants[variant],
        sizes[size],
        glowClasses,
        className
      )}
      {...props}
    >
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};
