import React from 'react';
import { Database, Plus, Clock, Zap, TrendingUp, BarChart3, Users, Activity, DollarSign } from 'lucide-react';
import { PRESET_QUERIES } from '../data/dbSimulator';

const PRESET_ICONS = [TrendingUp, BarChart3, Users, Activity, DollarSign];

export default function Sidebar({ history, onSelectQuery, onNewChat, isQuerying }) {
  return (
    <aside className="w-60 shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 overflow-hidden">

      {/* Brand */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500
                          flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Query Mitra</h1>
            <p className="text-[10px] text-slate-500">Your Data Friend</p>
          </div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-3 pt-3">
        <button
          onClick={onNewChat}
          disabled={isQuerying}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium
                     bg-indigo-600 hover:bg-indigo-500 text-white transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus size={13} />
          New Analysis
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-3 flex flex-col gap-5">

        {/* Recent history */}
        {history.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
              Recent
            </p>
            <div className="flex flex-col gap-0.5">
              {history.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectQuery(item.query)}
                  disabled={isQuerying}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer
                             text-slate-400 hover:text-slate-200 hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Clock size={11} className="shrink-0 text-slate-600" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.messageCount > 1 && (
                    <span className="shrink-0 text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded-full">
                      {item.messageCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick insights */}
        <div>
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
            Quick Insights
          </p>
          <div className="flex flex-col gap-0.5">
            {PRESET_QUERIES.map((p, i) => {
              const Icon = PRESET_ICONS[i % PRESET_ICONS.length];
              return (
                <button
                  key={i}
                  onClick={() => onSelectQuery(p.query)}
                  disabled={isQuerying}
                  className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all cursor-pointer
                             text-slate-500 hover:text-slate-200 hover:bg-slate-800
                             disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Icon size={11} className="shrink-0 text-indigo-500" />
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* DB status footer */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
          <Zap size={9} className="text-emerald-400 shrink-0" />
          <p className="text-[10px] text-emerald-600 truncate">Synced with Supabase Cloud DB</p>
        </div>
      </div>
    </aside>
  );
}
