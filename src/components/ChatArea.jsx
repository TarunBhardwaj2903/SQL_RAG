import React, { useRef, useEffect, useState } from 'react';
import { Bot, User, Sparkles } from 'lucide-react';
import DataTable   from './DataTable';
import SQLViewer   from './SQLViewer';
import FeedbackButtons from './FeedbackButtons';
import { PRESET_QUERIES } from '../data/dbSimulator';

/* ─── Markdown-lite renderer ────────────────────────────────── */
function renderSummary(text) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-slate-300 leading-relaxed text-sm mb-1.5 last:mb-0">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-white font-semibold">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

/* ─── Gemini-style 3-dot loader ─────────────────────────────── */
function ThinkingIndicator({ steps }) {
  const [statusIndex, setStatusIndex] = useState(0);

  // Cycle through status messages
  useEffect(() => {
    if (!steps || steps.length === 0) return;
    setStatusIndex(steps.length - 1);
  }, [steps]);

  const currentStatus = steps && steps.length > 0
    ? steps[statusIndex]?.text ?? ''
    : 'Thinking…';

  // Strip the leading ▶ or ✔ symbol
  const cleanStatus = currentStatus.replace(/^[▶✔]\s*/, '');

  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500
                      flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex items-center gap-3 pt-1.5">
        {/* 3 bouncing dots */}
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-1" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-2" />
          <span className="w-2 h-2 rounded-full bg-indigo-400 dot-3" />
        </div>
        {/* Status text */}
        <span key={cleanStatus} className="text-xs text-slate-500 status-text">
          {cleanStatus}
        </span>
      </div>
    </div>
  );
}

/* ─── User bubble ────────────────────────────────────────────── */
function UserMessage({ msg }) {
  return (
    <div className="flex justify-end animate-slide-in">
      <div className="max-w-lg">
        <div className="flex items-center gap-2 justify-end mb-1">
          <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
            <User size={11} className="text-slate-400" />
          </div>
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-tr-sm
                        bg-indigo-600 text-white text-sm leading-relaxed">
          {msg.text}
        </div>
      </div>
    </div>
  );
}

/* ─── Assistant bubble ───────────────────────────────────────── */
function AssistantMessage({ msg, onToggleSQL }) {
  return (
    <div className="flex items-start gap-3 animate-slide-in max-w-4xl">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500
                      flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 mt-0.5">
        <Bot size={15} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-indigo-400">RevIntel AI</span>
          <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
        </div>

        {/* Summary */}
        <div className="rounded-2xl rounded-tl-sm border border-slate-700/50
                        bg-slate-900/80 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/40
                          bg-indigo-500/5">
            <Sparkles size={12} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Executive Summary</span>
          </div>
          <div className="px-4 py-4">
            {renderSummary(msg.summary)}
          </div>
        </div>

        {/* SQL viewer */}
        {msg.sql && (
          <SQLViewer
            sql={msg.sql}
            meta={msg.meta}
            isOpen={msg.isCodeOpen}
            onToggle={() => onToggleSQL(msg.id)}
          />
        )}

        {/* Data table */}
        {msg.tableData?.columns?.length > 0 && (
          <DataTable
            columns={msg.tableData.columns}
            rows={msg.tableData.rows}
            queryLabel={msg.text?.slice(0, 30) || 'results'}
          />
        )}

        {/* Feedback */}
        <FeedbackButtons msg={msg} onToggleSQL={onToggleSQL} />
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────── */
function EmptyState({ onSelectQuery }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500
                      flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-5">
        <Sparkles size={26} className="text-white" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Ask your data anything</h2>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        Type a business question and get instant SQL-powered insights with executive summaries.
      </p>

      {/* Sample queries */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {PRESET_QUERIES.map((p, i) => (
          <button
            key={i}
            onClick={() => onSelectQuery(p.query)}
            className="px-3.5 py-2 rounded-full text-xs font-medium
                       bg-slate-800/80 border border-slate-700 text-slate-400
                       hover:border-indigo-500/50 hover:text-indigo-300
                       transition-all cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────── */
export default function ChatArea({ messages, isQuerying, loadingSteps, onToggleSQL, onSelectQuery }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  const isEmpty = messages.length === 0 && !isQuerying;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      {isEmpty ? (
        <EmptyState onSelectQuery={onSelectQuery} />
      ) : (
        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {messages.map(msg =>
            msg.sender === 'user'
              ? <UserMessage    key={msg.id} msg={msg} />
              : <AssistantMessage key={msg.id} msg={msg} onToggleSQL={onToggleSQL} />
          )}

          {/* Gemini-style loader */}
          {isQuerying && (
            <ThinkingIndicator steps={loadingSteps} />
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </main>
  );
}
