import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'outline' | 'interactive';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-white border border-slate-100 shadow-soft rounded-2xl p-4 sm:p-5',
    flat: 'bg-surface-100 rounded-2xl p-4 sm:p-5',
    outline: 'bg-white border border-slate-200 rounded-2xl p-4 sm:p-5',
    interactive: 'bg-white border border-slate-100 shadow-soft hover:shadow-card active:scale-[0.99] transition-all rounded-2xl p-4 sm:p-5 cursor-pointer',
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
};
