import React from 'react';
import { RequestStatus, STATUS_CONFIG } from '@/types';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status];
  const { t } = useLanguage();
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  // Get translated status label
  const statusKey = status as keyof typeof t.statuses;
  const label = t.statuses[statusKey] || config.label;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      config.bgColor,
      config.color,
      sizeClasses[size]
    )}>
      {label}
    </span>
  );
};

export default StatusBadge;
