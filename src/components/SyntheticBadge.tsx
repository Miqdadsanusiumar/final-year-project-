import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface SyntheticBadgeProps {
  isSynthetic: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SyntheticBadge: React.FC<SyntheticBadgeProps> = ({
  isSynthetic,
  size = 'md',
  className = ''
}) => {
  if (isSynthetic) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded px-2 py-0.5 ${
          size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs px-2.5 py-1' : 'text-xs'
        } ${className}`}
        title="Candidate prediction generated in mock/synthetic mode because verified weights are pending."
      >
        <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>[SYNTHETIC] Mock Score</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded px-2 py-0.5 ${
        size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs px-2.5 py-1' : 'text-xs'
      } ${className}`}
      title="Calibrated weights checkpoint loaded."
    >
      <CheckCircle2 className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>Calibrated Weights</span>
    </span>
  );
};
