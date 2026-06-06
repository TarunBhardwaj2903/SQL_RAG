import React from 'react';

/**
 * Pulse-animation placeholder shown while the Recharts chunk loads
 * (Suspense fallback — first query only, ~60-300ms).
 */
export default function ChartSkeleton() {
  return (
    <div className="mt-4 rounded-xl border border-slate-700/60 overflow-hidden animate-pulse"
         style={{ height: 260 }}>
      <div className="h-full bg-slate-800/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-30">
          {/* Fake bar chart silhouette */}
          <div className="flex items-end gap-2 h-20">
            {[40, 70, 55, 90, 65, 45, 80].map((h, i) => (
              <div key={i}
                   className="w-5 bg-slate-600 rounded-t"
                   style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="h-1.5 w-48 bg-slate-600 rounded" />
        </div>
      </div>
    </div>
  );
}
