import React, { useState } from 'react';
import {
  Database, Clock, Search, Plus, Zap,
  TrendingUp, DollarSign, Users, BarChart3,
  Activity, ChevronRight, Circle, Flag,
} from 'lucide-react';
import { PRESET_QUERIES, SCHEMA_STATS } from '../data/dbSimulator';
import { useFeedback } from '../data/feedbackStore';
import FeedbackDashboard from './FeedbackDashboard';

const PRESET_ICONS = [TrendingUp, BarChart3, Users, Activity, DollarSign];

function HistoryItem({ item, onClick, isActive }) {
  return (
    <button
      onClick={() => onClick(item.query)}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer group
                  ${isActive
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-300'
                    : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
    >
      <div className="flex items-center gap-2.5">
        <Clock size={12} className="shrink-0 text-slate-600 group-hover:text-slate-400 transition-colors" />
        <span className="truncate">{item.label}</span>
      </div>
    </button>
  );
}

export default function Sidebar({ history, onSelectQuery, onNewChat, isQuerying }) {
  const [search,    setSearch]    = useState('');
  const [showFlags, setShowFlags] = useState(false);
  const { stats } = useFeedback();

  const filteredHistory = history.filter(h =>
    h.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-slate-900/70 border-r border-slate-800
                      backdrop-blur-sm overflow-hidden">

      {/* ── Brand header ──────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500
                          flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Database size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">RevIntel</h1>
            <p className="text-[10px] text-slate-500 leading-none">Sales Intelligence</p>
          </div>
        </div>

        {/* Connection status */}
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60
                        border border-slate-700/40">
          <Circle size={7} className="text-emerald-400 fill-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-400 font-mono truncate">postgresql-prod-cluster</span>
        </div>
      </div>

      {/* ── Tab switcher: Queries / Feedback ────────────── */}
      <div className="flex gap-1 px-3 pt-3 pb-1">
        <button
          onClick={() => setShowFlags(false)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                      ${!showFlags
                        ? 'bg-slate-800 text-slate-200'
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
        >
          Queries
        </button>
        <button
          id="feedback-tab-btn"
          onClick={() => setShowFlags(true)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer
                      relative flex items-center justify-center gap-1.5
                      ${showFlags
                        ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                        : 'text-slate-500 hover:text-slate-300'
                      }`}
        >
          <Flag size={11} />
          Feedback
          {stats.flagged > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full
                             bg-red-500 text-white text-[9px] font-bold
                             flex items-center justify-center shadow-sm">
              {stats.flagged}
            </span>
          )}
        </button>
      </div>

      {showFlags ? (
        /* ── Feedback Dashboard ──── */
        <FeedbackDashboard onClose={() => setShowFlags(false)} />
      ) : (
        <>
          {/* ── New Chat button ────────────────────────────────── */}
          <div className="px-3 pt-2">
            <button
              id="new-chat-btn"
              onClick={onNewChat}
              disabled={isQuerying}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium
                         bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700
                         text-white transition-all shadow-lg shadow-indigo-500/20
                         disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus size={15} />
              New Analysis
            </button>
          </div>

          {/* ── Query history ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-3 pt-4 pb-2">
            {history.length > 0 && (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                    Recent Queries
                  </span>
                </div>

                {/* Search bar */}
                {history.length > 3 && (
                  <div className="relative mb-2">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                      id="sidebar-search"
                      type="text"
                      placeholder="Search history…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg
                                 bg-slate-800 border border-slate-700 text-slate-300
                                 placeholder-slate-600"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  {filteredHistory.map((item, i) => (
                    <HistoryItem
                      key={item.id}
                      item={item}
                      isActive={i === 0}
                      onClick={onSelectQuery}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── Preset suggestions ─────────────────────────── */}
            <div className="mt-4">
              <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
                Quick Insights
              </span>
              <div className="flex flex-col gap-0.5 mt-2">
                {PRESET_QUERIES.map((p, i) => {
                  const Icon = PRESET_ICONS[i % PRESET_ICONS.length];
                  return (
                    <button
                      key={i}
                      id={`preset-query-${i}`}
                      onClick={() => onSelectQuery(p.query)}
                      disabled={isQuerying}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all cursor-pointer
                                 hover:bg-slate-800/60 text-slate-500 hover:text-slate-300
                                 border border-transparent hover:border-slate-700/40
                                 disabled:opacity-40 disabled:cursor-not-allowed group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={12} className="shrink-0 text-indigo-500 group-hover:text-indigo-400" />
                        <span className="text-xs truncate">{p.label}</span>
                        <ChevronRight size={10} className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Database schema stats ─────────────────────────── */}
          <div className="px-3 pb-4 pt-2 border-t border-slate-800">
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">
              Data Warehouse
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Tables', value: SCHEMA_STATS.tables },
                { label: 'Rows',   value: SCHEMA_STATS.rows   },
                { label: 'Size',   value: SCHEMA_STATS.size   },
              ].map(s => (
                <div key={s.label} className="px-2.5 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30">
                  <p className="text-[10px] text-slate-600">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-300 mt-0.5">{s.value}</p>
                </div>
              ))}
              <div className="col-span-2 px-2.5 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-1.5">
                  <Zap size={9} className="text-emerald-400" />
                  <p className="text-[10px] text-emerald-500">{SCHEMA_STATS.updated}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
