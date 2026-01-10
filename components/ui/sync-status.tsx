import React from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh?: () => void;
};

function timeAgo(date: Date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `hace ${diff} seg`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} hrs`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} días`;
}

export function SyncStatus({ loading, lastUpdated, onRefresh }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="relative w-full max-w-xs h-2 rounded bg-slate-200 overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-slate-900 animate-[progress_1.2s_linear_infinite]" />
            </div>
            <span className="text-sm text-slate-600">Sincronizando…</span>
          </div>
        ) : (
          <span className="text-sm text-slate-600">
            {lastUpdated ? `Actualizado ${timeAgo(lastUpdated)}` : 'Listo'}
          </span>
        )}
      </div>
      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Actualizar
        </Button>
      )}
      <style jsx>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

