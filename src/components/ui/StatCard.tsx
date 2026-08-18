import clsx from 'clsx';
import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
}

export function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6 flex items-start gap-4">
      {icon && (
        <div className={clsx('shrink-0 h-12 w-12 rounded-xl flex items-center justify-center', color ?? 'bg-(--primary-tint)')}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--text-secondary) font-medium truncate">{title}</p>
        <p className="mt-1 text-2xl font-bold text-(--text-primary) truncate">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-(--text-muted) truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
