/**
 * SQLViewer.jsx — Audit Panel
 * Expandable SQL viewer enhanced with:
 *   • Join-risk badge (amber warning when joinCount >= 2)
 *   • Execution metadata strip (time, rows, tables, confidence)
 *   • Copy SQL + Copy as Markdown buttons
 */
import React, { useState, useCallback } from 'react';
import {
  Copy, Check, ChevronDown, ChevronUp, Code2,
  AlertTriangle, Clock, Database, Rows3,
  FileText, ShieldCheck,
} from 'lucide-react';

/* ─── SQL syntax highlighter (no external deps) ───────────────────────── */
function highlightSQL(sql) {
  const KEYWORDS = /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|GROUP BY|ORDER BY|HAVING|LIMIT|WITH|AS|AND|OR|NOT|IN|LIKE|IS|NULL|BETWEEN|CASE|WHEN|THEN|ELSE|END|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|DISTINCT|COUNT|SUM|AVG|MIN|MAX|ROUND|DATE_TRUNC|CURRENT_DATE|INTERVAL|OVER|PARTITION|BY|DESC|ASC|COALESCE|NULLIF|CAST|CONVERT|UNION|ALL|EXISTS|EXTRACT|YEAR|MONTH|DAY)\b/gi;
  const STRINGS  = /'[^']*'/g;
  const NUMBERS  = /\b\d+(\.\d+)?\b/g;
  const COMMENTS = /--[^\n]*/g;

  const patterns = [
    { regex: COMMENTS, cls: 'token-comment' },
    { regex: STRINGS,  cls: 'token-string'  },
    { regex: KEYWORDS, cls: 'token-keyword' },
    { regex: NUMBERS,  cls: 'token-number'  },
  ];

  const combined = new RegExp(
    patterns.map(p => `(${p.regex.source})`).join('|'),
    'gi'
  );

  let result = [], key = 0, lastIndex = 0, match;
  while ((match = combined.exec(sql)) !== null) {
    if (match.index > lastIndex)
      result.push(<span key={key++}>{sql.slice(lastIndex, match.index)}</span>);
    const groupIndex = patterns.findIndex((_, i) => match[i + 1] !== undefined);
    const cls = groupIndex >= 0 ? patterns[groupIndex].cls : '';
    result.push(<span key={key++} className={cls}>{match[0]}</span>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < sql.length)
    result.push(<span key={key++}>{sql.slice(lastIndex)}</span>);
  return result;
}

/* ─── Confidence bar ──────────────────────────────────────────────────── */
function ConfidenceBar({ value }) {
  const pct   = Math.round(value * 100);
  const color = value >= 0.90 ? '#10b981' : value >= 0.75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700/60 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-semibold shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────── */
export default function SQLViewer({ sql, meta, isOpen, onToggle }) {
  const [copied,       setCopied]       = useState(false);
  const [copiedMd,     setCopiedMd]     = useState(false);

  const joinRisk = meta && meta.joinCount >= 2;

  const handleCopySql = useCallback(async () => {
    try { await navigator.clipboard.writeText(sql); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = sql; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sql]);

  const handleCopyMarkdown = useCallback(async () => {
    const metaBlock = meta
      ? `\n\n<!-- Audit metadata: ${meta.executionMs}ms · ${meta.rowsReturned} rows · tables: ${meta.tablesScanned.join(', ')} · confidence: ${Math.round(meta.confidence * 100)}% -->`
      : '';
    const md = `\`\`\`sql\n${sql}\n\`\`\`${metaBlock}`;
    try { await navigator.clipboard.writeText(md); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = md; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }, [sql, meta]);

  return (
    <div className="mt-3 rounded-xl border overflow-hidden
                    border-slate-700/60 transition-all">

      {/* ── Toggle header ── */}
      <button
        id="sql-toggle-btn"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5
                   bg-slate-800/80 hover:bg-slate-700/60 transition-colors
                   text-sm font-medium text-slate-300 cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Code2 size={14} className="text-indigo-400" />
          Audit SQL Query

          {/* Join risk badge */}
          {joinRisk && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]
                             font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/35
                             animate-risk-pulse">
              <AlertTriangle size={10} />
              {meta.joinCount}-table JOIN — verify row fan-out
            </span>
          )}
        </span>

        <span className="flex items-center gap-2">
          {meta && (
            <span className="text-[10px] text-slate-600 font-normal">
              {meta.executionMs}ms · {meta.rowsReturned} rows
            </span>
          )}
          {isOpen
            ? <ChevronUp size={14} className="text-slate-500" />
            : <ChevronDown size={14} className="text-slate-500" />
          }
        </span>
      </button>

      {/* ── Expanded body ── */}
      {isOpen && (
        <div className="bg-slate-950 border-t border-slate-700/60">

          {/* ── Metadata strip ── */}
          {meta && (
            <div className="grid grid-cols-2 gap-px bg-slate-800/40
                            border-b border-slate-700/50">
              {/* Execution time */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80">
                <Clock size={11} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Exec time</p>
                  <p className="text-xs font-semibold text-slate-300">{meta.executionMs} ms</p>
                </div>
              </div>

              {/* Rows returned */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80">
                <Rows3 size={11} className="text-slate-500 shrink-0" />
                <div>
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Rows</p>
                  <p className="text-xs font-semibold text-slate-300">{meta.rowsReturned}</p>
                </div>
              </div>

              {/* Tables scanned */}
              <div className="flex items-start gap-2 px-4 py-2.5 bg-slate-900/80">
                <Database size={11} className="text-slate-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest">Tables</p>
                  <p className="text-xs font-semibold text-slate-300 truncate">
                    {meta.tablesScanned.join(', ')}
                  </p>
                  {joinRisk && (
                    <p className="text-[9px] text-amber-400 mt-0.5">
                      ⚠ Multi-join — check for duplicate rows
                    </p>
                  )}
                </div>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80">
                <ShieldCheck size={11} className="text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">Confidence</p>
                  <ConfidenceBar value={meta.confidence} />
                </div>
              </div>
            </div>
          )}

          {/* ── RAG Debug Panel ── */}
          {meta && (meta.ragRetrievedTables?.length > 0 || meta.ragRerankedTables?.length > 0) ? (
            <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-700/50">
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Code2 size={11} className="text-indigo-400" /> NVIDIA RAG Search Introspection
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Retrieved */}
                <div>
                  <h4 className="text-[10px] text-slate-500 font-semibold mb-1.5">Vector Retrieved (Top Candidates)</h4>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {meta.ragRetrievedTables.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950 px-2 py-1 rounded border border-slate-800/40 text-[10px]">
                        <span className="text-slate-400 font-mono truncate mr-2">{t.name}</span>
                        <span className="text-cyan-400 font-semibold shrink-0">{Math.round(t.score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Reranked */}
                <div>
                  <h4 className="text-[10px] text-slate-500 font-semibold mb-1.5">Reranked & Selected (Sent to LLM)</h4>
                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {meta.ragRerankedTables.map((t, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-950/80 px-2 py-1 rounded border border-indigo-500/20 text-[10px]">
                        <span className="text-slate-300 font-mono truncate mr-2">{t.name}</span>
                        <span className="text-emerald-400 font-semibold shrink-0 flex items-center gap-0.5">
                          ✓ {Math.round(t.score * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            meta && (
              <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-700/50 text-[10px] text-slate-500 flex items-center gap-1.5">
                <AlertTriangle size={11} className="text-slate-600" />
                RAG Status: Brute-force schema fallback (no-RAG baseline)
              </div>
            )
          )}

          {/* ── SQL code block ── */}
          <div className="relative">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
              {/* Copy as Markdown */}
              <button
                id="sql-copy-md-btn"
                onClick={handleCopyMarkdown}
                title="Copy as Markdown (for Slack / Notion)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                           bg-slate-800 hover:bg-slate-700 border border-slate-600/50
                           text-xs text-slate-300 transition-all cursor-pointer"
              >
                {copiedMd
                  ? <><Check size={11} className="text-emerald-400" /> Copied MD</>
                  : <><FileText size={11} /> Markdown</>
                }
              </button>

              {/* Copy SQL */}
              <button
                id="sql-copy-btn"
                onClick={handleCopySql}
                title="Copy SQL"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md
                           bg-slate-800 hover:bg-slate-700 border border-slate-600/50
                           text-xs text-slate-300 transition-all cursor-pointer"
              >
                {copied
                  ? <><Check size={11} className="text-emerald-400" /> Copied</>
                  : <><Copy size={11} /> Copy</>
                }
              </button>
            </div>

            <pre className="p-4 pr-40 text-xs leading-6 overflow-x-auto
                            font-mono text-slate-300 whitespace-pre">
              {highlightSQL(sql)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
