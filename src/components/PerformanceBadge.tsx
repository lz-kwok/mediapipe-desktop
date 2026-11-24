import React from 'react';
import { Activity } from 'lucide-react';

interface PerformanceBadgeProps {
  fps: number;
  latency: number;
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({ fps, latency }) => {
  const getFpsColor = (val: number) => {
    if (val >= 45) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (val >= 25) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-700/40 text-xs font-mono shadow-inner">
      <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
      <span className={`px-1.5 py-0.5 rounded border font-semibold ${getFpsColor(fps)}`}>
        {fps} FPS
      </span>
      <span className="text-slate-400">
        {latency}ms
      </span>
    </div>
  );
};
