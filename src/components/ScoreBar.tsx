import React from 'react';
import { LungClass } from '../types';

interface ScoreBarProps {
  label: LungClass;
  score: number; // 0.0 to 1.0
  isSynthetic: boolean;
  isPrimary: boolean;
  description?: string;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({
  label,
  score,
  isSynthetic,
  isPrimary,
  description
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round(score * 1000) / 10));

  // Domain color tokens:
  // Benign: Teal (#0D9488)
  // Malignant: Crimson (#E11D48)
  // Normal: Cobalt (#2563EB)
  const colorMap: Record<LungClass, { bar: string; text: string; bg: string }> = {
    Benign: {
      bar: 'bg-teal-600',
      text: 'text-teal-900',
      bg: 'bg-teal-50'
    },
    Malignant: {
      bar: 'bg-rose-600',
      text: 'text-rose-900',
      bg: 'bg-rose-50'
    },
    Normal: {
      bar: 'bg-blue-600',
      text: 'text-blue-900',
      bg: 'bg-blue-50'
    }
  };

  const colors = colorMap[label];

  return (
    <div
      className={`p-3.5 rounded-lg border transition-all ${
        isPrimary
          ? 'border-slate-300 bg-white shadow-xs'
          : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold tracking-tight ${colors.text}`}>
            {label}
          </span>
          {isPrimary && (
            <span className="text-[10px] uppercase font-mono font-medium tracking-wider text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              Top Softmax Rank
            </span>
          )}
          {isSynthetic && (
            <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2">
              [SYNTHETIC]
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
            {percentage.toFixed(1)}%
          </span>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            ({score.toFixed(3)})
          </span>
        </div>
      </div>

      {/* Progress track */}
      <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && (
        <p className="mt-1.5 text-[11px] text-slate-500 leading-tight">
          {description}
        </p>
      )}
    </div>
  );
};
