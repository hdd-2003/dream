import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface DreamInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const DreamInput: React.FC<DreamInputProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-2 text-sm font-light text-slate-300 tracking-wide">
          {label}
        </label>
      )}
      <motion.textarea
        whileFocus={{
          boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 30px rgba(99, 102, 241, 0.15)'
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'w-full px-5 py-4 bg-slate-900/60 border border-white/10 rounded-2xl',
          'text-slate-100 placeholder:text-slate-500',
          'focus:outline-none focus:border-indigo-400/50',
          'resize-none transition-all duration-300',
          error && 'border-rose-500/50 focus:border-rose-500/70',
          className
        )}
        {...(props as any)}
      />
      {error && (
        <p className="mt-2 text-sm text-rose-400 font-light">{error}</p>
      )}
    </div>
  );
};
