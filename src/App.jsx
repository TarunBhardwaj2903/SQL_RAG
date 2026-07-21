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
  const textareaRef   = useRef(null);
  // Always-current mirror of messages state — avoids stale closure in handleQuery.
  const messagesRef   = useRef([]);
  // Tracks the current session's history entry id.
  // null = no session yet (new chat or first load). Set on the first query of a session.
  // Each session maps to exactly ONE entry in the sidebar "Recent" list.
  const sessionIdRef  = useRef(null);

  // Keep messagesRef in sync with messages state on every render
  useEffect(() => { messagesRef.current = messages; }, [messages]);

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

    // ── Build chat history from the current messages BEFORE adding the new user message.
    // We read from messagesRef.current (not the stale closure variable) so we always
    // get the latest messages regardless of when this callback was last memoised.
    // Cap at last 10 messages (5 Q&A pairs) to stay within LLM context budget.
    const chatHistory = messagesRef.current
      .slice(-10)
      .map(m => m.sender === 'user'
        ? { role: 'user',      content: m.text }
        : { role: 'assistant', content: m.summary ?? '', sql: m.sql ?? null }
      );

    // Add user message
    const userMsg = {
      id:        uid(),
      sender:    'user',
      text:      query,
      timestamp: timestamp(),
    };
    setMessages(prev => [...prev, userMsg]);

    // ── Session management: one sidebar entry per conversation ──
    // If this is the first message in a new session, create a history entry and
    // record its id in sessionIdRef. All subsequent messages in this session
    // update the SAME entry (incrementing the message count) instead of creating
    // new entries. A new session starts only when the user clicks "New Analysis".
    if (sessionIdRef.current === null) {
      // First message of a new session — create the sidebar entry
      const sessionId   = uid();
      const shortLabel  = query.length > 42 ? query.slice(0, 42) + '…' : query;
      sessionIdRef.current = sessionId;
      setHistory(prev => [
        { id: sessionId, label: shortLabel, query, messageCount: 1 },
        ...prev.slice(0, 19),
      ]);
    } else {
      // Follow-up message — increment the message count on the existing entry
      const currentSessionId = sessionIdRef.current;
      setHistory(prev =>
        prev.map(h =>
          h.id === currentSessionId
            ? { ...h, messageCount: (h.messageCount ?? 1) + 1 }
            : h
        )
      );
    }

    try {
      // Start the API call immediately — don't wait for the animation
      const resultPromise = resolveQuery(query, chatHistory);

      // Run the animation concurrently as visual feedback while the API is working
      const steps = getLoadingSteps();
      for (const step of steps) {
        await new Promise(r => setTimeout(r, step.delay - (steps[0]?.delay ?? 0)));
        setLoadingSteps(prev => [...prev, { text: step.text, color: step.color }]);
      }

      // Now wait for the actual result (API call started well before the animation finished)
      const result = await resultPromise;

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

  // ── New chat ───────────────────────────────────────────
  const handleNewChat = useCallback(() => {
    if (isQuerying) return;
    setMessages([]);
    setLoadingSteps([]);
    setInputText('');
    // Reset session so the next query creates a fresh sidebar entry
    sessionIdRef.current = null;
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
          <span className="text-sm font-semibold text-slate-300">Query Mitra</span>
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
