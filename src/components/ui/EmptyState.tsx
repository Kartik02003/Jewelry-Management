import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-100 rounded-3xl shadow-soft ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 shrink-0 shadow-inner">
          {icon}
        </div>
      )}
      <h4 className="text-base font-bold text-slate-800 mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 max-w-xs mb-5 leading-relaxed">{description}</p>
      )}
      {actionText && onAction && (
        <Button size="md" onClick={onAction} className="shadow-soft">
          {actionText}
        </Button>
      )}
    </div>
  );
};
