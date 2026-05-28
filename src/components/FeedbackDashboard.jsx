/**
 * FeedbackDashboard.jsx
 * Slide-in sidebar panel showing all flagged queries with
 * "Improve Prompt" before/after diffs and JSON export.
 */
import React, { useState } from 'react';
import {
  Flag, Download, ChevronDown, ChevronUp,
  ArrowRight, Trash2, AlertTriangle, CheckCircle2,
  BarChart3, X,
} from 'lucide-react';
import { useFeedback, PROMPT_IMPROVEMENTS } from '../data/feedbackStore';

/* ─── Single flagged entry ─────────────────────────────────────────────── */
function FlagEntry({ entry, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [showDiff,  setShowDiff]  = useState(false);

  // Pick the first matching reason for the prompt diff
  const diffKey = entry.reasons.find(r => PROMPT_IMPROVEMENTS[r]) || 'Other';
  const diff    = PROMPT_IMPROVEMENTS[diffKey];

  const timeStr = new Date(entry.ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 overflow-hidden">
      {/* Entry header */}
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="w-6 h-6 rounded-lg bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
          <Flag size={11} className="text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-200 truncate">{entry.question}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {entry.reasons.map(r => (
              <span key={r}
                className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold
                           bg-red-500/12 text-red-400 border border-red-500/25">
                {r}
              </span>
            ))}
            <span className="text-[9px] text-slate-600 ml-auto shrink-0">{timeStr}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(v => !v)}
            className="p-1 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800
                       transition-colors cursor-pointer">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button onClick={() => onRemove(entry.msgId)}
            className="p-1 rounded-lg text-slate-700 hover:text-red-400 hover:bg-red-500/10
                       transition-colors cursor-pointer">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-slate-800 px-4 py-3 space-y-3 animate-slide-in">
          {/* Additional note */}
          {entry.note && (
            <div className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30">
              <p className="text-[10px] text-slate-500 mb-0.5">Note</p>
              <p className="text-xs text-slate-300 leading-relaxed">{entry.note}</p>
            </div>
          )}

          {/* SQL preview */}
          {entry.sql && (
            <div>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">
                SQL that ran
              </p>
              <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 rounded-lg p-3
                              overflow-x-auto leading-5 whitespace-pre-wrap border border-slate-800">
                {entry.sql}
              </pre>
            </div>
          )}

          {/* Improve Prompt button + diff */}
          <button
            onClick={() => setShowDiff(v => !v)}
            id={`improve-prompt-${entry.id}`}
            className="flex items-center gap-2 text-[11px] font-semibold text-indigo-400
                       hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <ArrowRight size={12} />
            {showDiff ? 'Hide' : 'Show'} Suggested Prompt Fix
          </button>

          {showDiff && diff && (
            <div className="space-y-2 animate-slide-in">
              <div className="rounded-lg border border-red-500/25 overflow-hidden">
                <div className="px-3 py-1.5 bg-red-500/10 text-[10px] font-semibold text-red-400
                                border-b border-red-500/20 flex items-center gap-1.5">
                  <X size={10} /> Before (current prompt)
                </div>
                <p className="px-3 py-2.5 text-xs text-slate-400 font-mono leading-relaxed">
                  {diff.before}
                </p>
              </div>
              <div className="rounded-lg border border-emerald-500/25 overflow-hidden">
                <div className="px-3 py-1.5 bg-emerald-500/10 text-[10px] font-semibold text-emerald-400
                                border-b border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCircle2 size={10} /> After (recommended fix)
                </div>
                <p className="px-3 py-2.5 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                  {diff.after}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export default function FeedbackDashboard({ onClose }) {
  const { state, stats, removeFlag, exportJSON } = useFeedback();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Flag size={13} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Feedback Dashboard</p>
              <p className="text-[10px] text-slate-500">Audit log & prompt improvements</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-600 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800
                       transition-colors cursor-pointer">
            <X size={15} />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: 'Total',    value: stats.total,    color: 'text-slate-300' },
            { label: 'Verified', value: stats.verified, color: 'text-emerald-400' },
            { label: 'Flagged',  value: stats.flagged,  color: 'text-red-400'   },
          ].map(s => (
            <div key={s.label}
              className="px-2 py-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-center">
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-600">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Flag list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {state.flags.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
              <BarChart3 size={20} className="text-slate-600" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No flags yet</p>
            <p className="text-xs text-slate-600 leading-relaxed max-w-[200px]">
              Click 👎 on any answer to flag it for review
            </p>
          </div>
        ) : (
          state.flags.map(entry => (
            <FlagEntry
              key={entry.id}
              entry={entry}
              onRemove={removeFlag}
            />
          ))
        )}
      </div>

      {/* Export footer */}
      {state.flags.length > 0 && (
        <div className="px-3 py-3 border-t border-slate-800">
          <button
            id="export-feedback-btn"
            onClick={exportJSON}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                       text-xs font-semibold border border-indigo-500/30
                       bg-indigo-500/10 text-indigo-400
                       hover:bg-indigo-500/20 hover:border-indigo-400/50
                       transition-all cursor-pointer"
          >
            <Download size={13} />
            Export Feedback Log (JSON)
          </button>
          <p className="text-center text-[9px] text-slate-700 mt-1.5">
            Share with your data / prompt-engineering team
          </p>
        </div>
      )}
    </div>
  );
}
