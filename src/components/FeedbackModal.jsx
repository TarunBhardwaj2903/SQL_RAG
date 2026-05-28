/**
 * FeedbackModal.jsx
 * Dialog for flagging a wrong/suspect answer with structured reasons + free text.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Flag, Send, AlertTriangle } from 'lucide-react';
import { useFeedback } from '../data/feedbackStore';

const REASONS = [
  'Wrong numbers',
  'Bad JOIN / duplicate rows',
  'Missing data',
  'Wrong time range',
  'Misunderstood question',
  'Other',
];

export default function FeedbackModal({ msg, onClose }) {
  const { flagAnswer } = useFeedback();
  const [selected, setSelected] = useState([]);
  const [note, setNote]         = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const toggleReason = (r) =>
    setSelected(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const handleSubmit = useCallback(() => {
    if (selected.length === 0) return;
    flagAnswer(msg.id, msg.text, msg.sql, msg.meta, selected, note);
    setSubmitted(true);
    setTimeout(onClose, 1600);
  }, [msg, selected, note, flagAnswer, onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'rgba(2,6,23,0.80)', backdropFilter: 'blur(4px)' }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/70 rounded-2xl
                      shadow-2xl shadow-black/60 animate-modal-in overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
                        bg-gradient-to-r from-red-500/10 to-orange-500/5
                        border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
              <Flag size={14} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Flag this answer</p>
              <p className="text-[10px] text-slate-500">Help us improve the prompt</p>
            </div>
          </div>
          <button onClick={onClose}
            className="text-slate-600 hover:text-slate-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="flex flex-col items-center gap-3 py-10 px-6 text-center animate-slide-in">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30
                            flex items-center justify-center">
              <Flag size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white">Flagged for review</p>
            <p className="text-xs text-slate-500">This query has been added to the Feedback Dashboard</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Question preview */}
            <div className="px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">Query</p>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{msg.text}</p>
            </div>

            {/* Reason chips */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber-400" />
                What was wrong?  <span className="text-red-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button
                    key={r}
                    onClick={() => toggleReason(r)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all cursor-pointer
                                ${selected.includes(r)
                                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Free text */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-2">Additional context</p>
              <textarea
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Revenue was understated by 40% due to a duplicate LEFT JOIN on contracts table…"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700
                           text-xs text-slate-300 placeholder-slate-600 resize-none
                           focus:outline-none focus:border-red-500/40"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={selected.length === 0}
              id="feedback-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                         text-sm font-semibold bg-gradient-to-r from-red-600 to-red-500
                         hover:from-red-500 hover:to-red-400
                         disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500
                         text-white transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={13} />
              Submit Flag
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
