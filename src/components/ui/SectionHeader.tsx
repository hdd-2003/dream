import React from 'react';
import { cn } from '../../utils/cn';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  className
}) => {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex items-center gap-3 mb-2">
        {icon && (
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <span className="text-indigo-300">{icon}</span>
          </div>
        )}
        <span className="text-base font-medium text-slate-200 tracking-wider">
          {title}
        </span>
      </div>
      {subtitle && (
        <p className="text-slate-400 font-light pl-11">
          {subtitle}
        </p>
      )}
    </div>
  );
};
