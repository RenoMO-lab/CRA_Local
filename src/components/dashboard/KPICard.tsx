import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
}

const KPICard = forwardRef<HTMLDivElement, KPICardProps>(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  className,
  onClick,
  isActive,
}, ref) => {
  const { t } = useLanguage();
  return (
    <div 
      ref={ref}
      className={cn(
        "kpi-card group",
        onClick && "cursor-pointer hover:border-primary/50",
        isActive && "border-primary ring-2 ring-primary/20",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 inline-flex items-center text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-muted-foreground">{t.dashboard.vsLastMonth}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-lg transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
        )}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

export default KPICard;
