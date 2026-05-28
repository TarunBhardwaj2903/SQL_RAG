/**
 * FeedbackButtons.jsx
 * Per-message micro-action bar: thumbs up, flag, and audit SQL shortcut.
 */
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, ShieldAlert, Check } from 'lucide-react';
import { useFeedback } from '../data/feedbackStore';
import FeedbackModal from './FeedbackModal';

export default function FeedbackButtons({ msg, onToggleSQL }) {
  const { state, voteAnswer } = useFeedback();
  const [modalOpen,    setModalOpen]    = useState(false);
  const [thumbsToast,  setThumbsToast]  = useState(false);

  const vote = state.votes[msg.id];
  const isFlagged = state.flags.some(f => f.msgId === msg.id);

  const handleUp = () => {
    voteAnswer(msg.id, 'up');
    setThumbsToast(true);
    setTimeout(() => setThumbsToast(false), 1800);
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2 ml-0.5">
        {/* Verified toast */}
        {thumbsToast && (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 mr-2 animate-slide-in">
            <Check size={11} /> Marked as correct
          </span>
        )}

        {/* Thumbs up */}
        <button
          id={`vote-up-${msg.id}`}
          onClick={handleUp}
          title="Mark as correct"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                      border transition-all cursor-pointer
                      ${vote === 'up'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 hover:bg-emerald-500/8'
                      }`}
        >
          <ThumbsUp size={12} />
          Correct
        </button>

        {/* Flag issue */}
        <button
          id={`vote-down-${msg.id}`}
          onClick={() => setModalOpen(true)}
          title="Flag an issue"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                      border transition-all cursor-pointer
                      ${isFlagged || vote === 'down'
                        ? 'bg-red-500/15 border-red-500/40 text-red-400'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/8'
                      }`}
        >
          <ThumbsDown size={12} />
          {isFlagged ? 'Flagged' : 'Flag Issue'}
        </button>

        {/* Audit SQL shortcut */}
        {msg.sql && (
          <button
            id={`audit-sql-${msg.id}`}
            onClick={() => onToggleSQL(msg.id)}
            title="Audit the SQL query"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium
                       border border-slate-700/50 bg-slate-800/60 text-slate-500
                       hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/8
                       transition-all cursor-pointer"
          >
            <ShieldAlert size={12} />
            Audit SQL
          </button>
        )}

        {/* Confidence pill */}
        {msg.meta && (
          <span
            className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold border
                        ${msg.meta.confidence >= 0.90
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : msg.meta.confidence >= 0.75
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                            : 'bg-red-500/10 text-red-400 border-red-500/25'
                        }`}
          >
            {Math.round(msg.meta.confidence * 100)}% confidence
          </span>
        )}
      </div>

      {modalOpen && (
        <FeedbackModal
          msg={msg}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
