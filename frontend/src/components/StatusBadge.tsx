import React from 'react';

interface StatusBadgeProps {
  type: 'direction' | 'data_status' | 'score';
  value: string | number;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (type === 'direction') {
    const val = String(value).toUpperCase();
    if (val === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          BUY
        </span>
      );
    }
    if (val === 'SELL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
          SELL
        </span>
      );
    }
    if (val === 'WAIT') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          WAIT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
        NO TRADE
      </span>
    );
  }

  if (type === 'data_status') {
    const val = String(value).toUpperCase();
    if (val === 'REALTIME') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          ● TIEMPO REAL
        </span>
      );
    }
    if (val === 'DELAYED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
          ▲ RETRASADO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
        ○ NO DISPONIBLE
      </span>
    );
  }

  if (type === 'score') {
    const num = Number(value);
    let colorClass = 'text-slate-400 bg-slate-800 border-slate-700';
    if (num >= 75) colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 font-bold';
    else if (num >= 60) colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    else if (num >= 40) colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    else colorClass = 'text-rose-400 bg-rose-500/10 border-rose-500/30';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${colorClass}`}>
        {num}/100
      </span>
    );
  }

  return <span>{String(value)}</span>;
};
