import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar   from './components/Sidebar';
import ChatArea  from './components/ChatArea';
import { resolveQuery, getLoadingSteps } from './data/dbSimulator';
import { FeedbackProvider } from './data/feedbackStore';
import { Send, Loader2 } from 'lucide-react';

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

let msgCounter = 0;
const uid = () => `msg-${++msgCounter}-${Date.now()}`;

export default function App() {
  const [messages,     setMessages]     = useState([]);
  const [history,      setHistory]      = useState([]);
  const [inputText,    setInputText]    = useState('');
  const [isQuerying,   setIsQuerying]   = useState(false);
  const [loadingSteps, setLoadingSteps] = useState([]);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [inputText]);

  // ── Core query handler ──────────────────────────────────────
  const handleQuery = useCallback(async (rawQuery) => {
    const query = rawQuery.trim();
    if (!query || isQuerying) return;

    setInputText('');
    setIsQuerying(true);
    setLoadingSteps([]);

    // Add user message
    const userMsg = {
      id:        uid(),
      sender:    'user',
      text:      query,
      timestamp: timestamp(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Add to sidebar history
    const shortLabel = query.length > 42 ? query.slice(0, 42) + '…' : query;
    setHistory(prev => [
      { id: uid(), label: shortLabel, query },
      ...prev.slice(0, 19),
    ]);

    try {
      // Reveal loading steps progressively
      const steps = getLoadingSteps();
      for (const step of steps) {
        await new Promise(r => setTimeout(r, step.delay - (steps[0]?.delay ?? 0)));
        setLoadingSteps(prev => [...prev, { text: step.text, color: step.color }]);
      }

      // Fetch result
      const result = await resolveQuery(query);

      // Add assistant message
      const assistantMsg = {
        id:         uid(),
        sender:     'assistant',
        text:       query,
        summary:    result.summary,
        sql:        result.sql,
        meta:       result.meta,
        tableData:  { columns: result.columns, rows: result.rows },
        chartSpec:  result.chartSpec ?? null,   // from VDE — null = table fallback
        isCodeOpen: false,
        timestamp:  timestamp(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Query failed:', error);
      
      // Add error message
      const errorMsg = {
        id:         uid(),
        sender:     'assistant',
        text:       query,
        summary:    `**Error:** ${error.message}\n\nPlease try asking a database-related question like:\n- "What are the top 5 products by sales revenue?"\n- "Show me all employees in the Sales department"\n- "List customers with orders over $10,000"`,
        sql:        null,
        meta:       null,
        tableData:  null,
        isCodeOpen: false,
        timestamp:  timestamp(),
        isError:    true,
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoadingSteps([]);
      setIsQuerying(false);
    }
  }, [isQuerying]);

  // ── Submit handlers ─────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    handleQuery(inputText);
  }, [inputText, handleQuery]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // ── Toggle SQL viewer on a message ─────────────────────────
  const handleToggleSQL = useCallback((id) => {
    setMessages(prev =>
      prev.map(m => m.id === id ? { ...m, isCodeOpen: !m.isCodeOpen } : m)
    );
  }, []);

  // ── New chat ────────────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (isQuerying) return;
    setMessages([]);
    setLoadingSteps([]);
    setInputText('');
  }, [isQuerying]);

  return (
    <FeedbackProvider>
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Left sidebar */}
      <Sidebar
        history={history}
        onSelectQuery={handleQuery}
        onNewChat={handleNewChat}
        isQuerying={isQuerying}
      />

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar ─────────────────────────────────────── */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800
                           bg-slate-900/50 shrink-0">
          <span className="text-sm font-semibold text-slate-300">Executive Sales Intelligence</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold
                           bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            LIVE
          </span>
        </header>

        {/* ── Chat area ───────────────────────────────────── */}
        <ChatArea
          messages={messages}
          isQuerying={isQuerying}
          loadingSteps={loadingSteps}
          onToggleSQL={handleToggleSQL}
          onSelectQuery={handleQuery}
        />

        {/* ── Input panel ─────────────────────────────────── */}
        <div className="shrink-0 border-t border-slate-800 bg-slate-900/60 backdrop-blur-sm px-6 py-4">
          <div className="max-w-3xl mx-auto">
            {/* Main input */}
            <div className={`relative flex items-end gap-3 rounded-2xl border transition-all
                             bg-slate-800/60
                             ${isQuerying
                               ? 'border-slate-700 opacity-70'
                               : 'border-slate-700 focus-within:border-indigo-500/50'
                             }`}>
              <textarea
                ref={textareaRef}
                id="query-input"
                rows={1}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isQuerying}
                placeholder="Ask a revenue question…"
                className="flex-1 resize-none bg-transparent px-4 py-3.5 text-sm text-slate-200
                           placeholder-slate-600 disabled:placeholder-slate-700
                           focus:outline-none leading-relaxed"
                style={{ minHeight: '52px', maxHeight: '160px' }}
              />

              <div className="pr-3 pb-3 shrink-0">
                <button
                  id="submit-btn"
                  onClick={handleSubmit}
                  disabled={isQuerying || !inputText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                             bg-indigo-600 hover:bg-indigo-500
                             disabled:bg-slate-700 disabled:text-slate-500
                             text-white transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isQuerying
                    ? <><Loader2 size={15} className="animate-spin" /> Querying…</>
                    : <><Send size={15} /> Send</>
                  }
                </button>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-700 mt-2">
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-600 font-mono text-[9px]">Enter</kbd> to submit
              &nbsp;·&nbsp;
              <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-600 font-mono text-[9px]">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>
    </div>
    </FeedbackProvider>
  );
}
