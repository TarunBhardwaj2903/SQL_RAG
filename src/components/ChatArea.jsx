import React, { useRef, useEffect } from 'react';
import {
  Database, TrendingUp, DollarSign, BarChart3,
  User, Bot, Sparkles, Terminal, Activity,
} from 'lucide-react';
import DataTable from './DataTable';
import SQLViewer from './SQLViewer';
import FeedbackButtons from './FeedbackButtons';
import { PRESET_QUERIES } from '../data/dbSimulator';

/* ─── Markdown-lite summary renderer ───────────────────────── */
function renderSummary(text) {
  return text.split('\n').map((line, i) => {
    // Bold text
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="text-slate-300 leading-relaxed text-sm mb-1.5 last:mb-0">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="text-blue-300 font-semibold">{part.slice(2, -2)}</strong>
            : part
        )}
      </p>
    );
  });
}

/* ─── Loading terminal ──────────────────────────────────────── */
function LoadingTerminal({ steps }) {
  return (
    <div className="animate-slide-in max-w-3xl">
      {/* Bot avatar */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500
                        flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <Bot size={15} className="text-white" />
        </div>

        {/* Terminal card */}
        <div className="flex-1 rounded-2xl rounded-tl-sm border border-slate-700/60
                        bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/60">
            <Terminal size={13} className="text-yellow-400" />
            <span className="text-xs font-medium text-slate-400 font-mono">Query Execution Log</span>
            <span className="ml-auto flex gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500/60" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
              <span className="w-2 h-2 rounded-full bg-green-500/60" />
            </span>
          </div>
          <div className="p-4 font-mono text-xs space-y-1.5 min-h-24">
            {steps.map((s, i) => (
              <div key={i} className={`${s.color} flex items-start gap-2 animate-slide-in`}
                   style={{ animationDelay: `${i * 0.05}s` }}>
                <span className="text-slate-600 select-none">{String(i + 1).padStart(2, '0')}</span>
                <span>{s.text}</span>
              </div>
            ))}
            {steps.length > 0 && (
              <span className="inline-block text-slate-500 cursor-blink ml-6">▌</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── User message bubble ────────────────────────────────────── */
function UserMessage({ msg }) {
  return (
    <div className="flex justify-end animate-slide-in">
      <div className="max-w-lg">
        <div className="flex items-center gap-2 justify-end mb-1.5">
          <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
            <User size={12} className="text-slate-400" />
          </div>
        </div>
        <div className="px-4 py-3 rounded-2xl rounded-tr-sm
                        bg-gradient-to-br from-indigo-600 to-indigo-700
                        text-white text-sm leading-relaxed shadow-lg shadow-indigo-500/10">
          {msg.text}
        </div>
      </div>
    </div>
  );
}

/* ─── Assistant response bubble ──────────────────────────────── */
function AssistantMessage({ msg, onToggleSQL }) {
  return (
    <div className="flex items-start gap-3 animate-slide-in max-w-4xl">
      {/* Bot avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500
                      flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 mt-0.5">
        <Bot size={15} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-indigo-400">RevIntel AI</span>
          <span className="text-[10px] text-slate-600">{msg.timestamp}</span>
        </div>

        {/* Executive Summary card */}
        <div className="rounded-2xl rounded-tl-sm border border-slate-700/60
                        bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-700/40
                          bg-gradient-to-r from-indigo-500/10 to-cyan-500/5">
            <Sparkles size={13} className="text-indigo-400" />
            <span className="text-xs font-semibold text-indigo-300">Executive Summary</span>
          </div>
          <div className="px-4 py-4 prose-dark">
            {renderSummary(msg.summary)}
          </div>
        </div>

        {/* SQL audit panel */}
        {msg.sql && (
          <SQLViewer
            sql={msg.sql}
            meta={msg.meta}
            isOpen={msg.isCodeOpen}
            onToggle={() => onToggleSQL(msg.id)}
          />
        )}

        {/* Data table */}
        {msg.tableData && (
          <DataTable
            columns={msg.tableData.columns}
            rows={msg.tableData.rows}
            queryLabel={msg.text?.slice(0, 30) || 'results'}
          />
        )}

        {/* Feedback bar */}
        <FeedbackButtons msg={msg} onToggleSQL={onToggleSQL} />
      </div>
    </div>
  );
}

/* ─── Welcome screen ─────────────────────────────────────────── */
function WelcomeScreen({ onSelectQuery }) {
  const features = [
    { icon: Database,   label: 'Natural Language SQL',   desc: 'Ask questions in plain English' },
    { icon: TrendingUp, label: 'Revenue Intelligence',   desc: 'ARR, NRR, pipeline analysis'   },
    { icon: DollarSign, label: 'Margin Analytics',       desc: 'Gross margin by product/region' },
    { icon: BarChart3,  label: 'Churn & Retention',      desc: 'Cohort and segment breakdown'   },
    { icon: Activity,   label: 'Live Pipeline Data',     desc: 'Real-time deal stage tracking'  },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center animate-slide-in">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500
                      flex items-center justify-center shadow-2xl shadow-indigo-500/30 mb-6">
        <Database size={30} className="text-white" />
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">
        Chat with Your Revenue Data
      </h2>
      <p className="text-slate-500 text-sm max-w-md mb-10 leading-relaxed">
        Ask natural language questions and get instant SQL-powered insights,
        executive summaries, and exportable data tables.
      </p>

      {/* Feature grid */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl w-full mb-10">
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl
                                    bg-slate-800/50 border border-slate-700/50
                                    hover:border-indigo-500/40 hover:bg-slate-800/80 transition-all">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Icon size={18} className="text-indigo-400" />
              </div>
              <p className="text-xs font-semibold text-slate-300">{f.label}</p>
              <p className="text-[10px] text-slate-600 leading-snug">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Quick-start prompts */}
      <p className="text-[11px] text-slate-600 uppercase tracking-widest mb-3">Try a sample query</p>
      <div className="flex flex-wrap justify-center gap-2 max-w-xl">
        {PRESET_QUERIES.map((p, i) => (
          <button
            key={i}
            id={`welcome-preset-${i}`}
            onClick={() => onSelectQuery(p.query)}
            className="px-3.5 py-2 rounded-full text-xs font-medium
                       bg-slate-800 border border-slate-700 text-slate-400
                       hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-slate-800/80
                       transition-all cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ChatArea ──────────────────────────────────────────── */
export default function ChatArea({ messages, isQuerying, loadingSteps, onToggleSQL, onSelectQuery }) {
  const bottomRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingSteps]);

  const isEmpty = messages.length === 0 && !isQuerying;

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative">
      {/* Ambient background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full
                        bg-indigo-500/4 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full
                        bg-cyan-500/4 blur-3xl" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 relative z-10">
        {isEmpty ? (
          <WelcomeScreen onSelectQuery={onSelectQuery} />
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {messages.map(msg =>
              msg.sender === 'user'
                ? <UserMessage key={msg.id} msg={msg} />
                : <AssistantMessage key={msg.id} msg={msg} onToggleSQL={onToggleSQL} />
            )}

            {/* Live loading terminal */}
            {isQuerying && loadingSteps.length > 0 && (
              <LoadingTerminal steps={loadingSteps} />
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </main>
  );
}
