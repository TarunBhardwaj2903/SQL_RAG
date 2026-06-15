/**
 * feedbackStore.jsx
 * Global in-memory store for answer votes and flagged queries.
 * Provides FeedbackProvider + useFeedback() hook.
 */
import React, { createContext, useContext, useReducer, useCallback } from 'react';

// ─── State shape ──────────────────────────────────────────────────────────────
const initialState = {
  votes:  {},   // { [msgId]: 'up' | 'down' }
  flags:  [],   // [{ id, msgId, question, sql, meta, reasons[], note, ts }]
};

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {

    case 'VOTE': {
      const { msgId, vote } = action;
      const current = state.votes[msgId];
      const next = current === vote ? undefined : vote;
      const votes = { ...state.votes };
      if (next) votes[msgId] = next; else delete votes[msgId];
      return { ...state, votes };
    }

    case 'FLAG': {
      const { msgId, question, sql, meta, reasons, note } = action;
      const withoutPrior = state.flags.filter(f => f.msgId !== msgId);
      const entry = {
        id:       `flag-${Date.now()}`,
        msgId,
        question,
        sql,
        meta,
        reasons,
        note,
        ts:       new Date().toISOString(),
      };
      return { ...state, flags: [entry, ...withoutPrior] };
    }

    case 'REMOVE_FLAG': {
      return { ...state, flags: state.flags.filter(f => f.msgId !== action.msgId) };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────
const FeedbackCtx = createContext(null);

export function FeedbackProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const voteAnswer = useCallback((msgId, vote) => {
    dispatch({ type: 'VOTE', msgId, vote });
  }, []);

  const flagAnswer = useCallback((msgId, question, sql, meta, reasons, note) => {
    dispatch({ type: 'FLAG', msgId, question, sql, meta, reasons, note });
    dispatch({ type: 'VOTE', msgId, vote: 'down' });
  }, []);

  const removeFlag = useCallback((msgId) => {
    dispatch({ type: 'REMOVE_FLAG', msgId });
  }, []);

  const exportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      stats: {
        total:    Object.keys(state.votes).length,
        verified: Object.values(state.votes).filter(v => v === 'up').length,
        flagged:  state.flags.length,
      },
      flags: state.flags,
      votes: state.votes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `queryMitra-feedback-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const stats = {
    total:    Object.keys(state.votes).length,
    verified: Object.values(state.votes).filter(v => v === 'up').length,
    flagged:  state.flags.length,
  };

  return (
    <FeedbackCtx.Provider value={{ state, voteAnswer, flagAnswer, removeFlag, exportJSON, stats }}>
      {children}
    </FeedbackCtx.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackCtx);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

// ─── Prompt improvement suggestions ───────────────────────────────────────────
export const PROMPT_IMPROVEMENTS = {
  'Wrong numbers': {
    before: 'Summarise the result set and highlight key metrics.',
    after:  'Summarise the result set. **Always verify that aggregated totals match the SUM of individual rows before stating any figure.** If a discrepancy exists, note it explicitly.',
  },
  'Bad JOIN / duplicate rows': {
    before: 'Generate a SQL query that answers the user question.',
    after:  'Generate a SQL query. **When joining tables, prefer INNER JOINs and always add a DISTINCT or GROUP BY to prevent row fan-out. After every JOIN, add an inline comment explaining the cardinality assumption.**',
  },
  'Missing data': {
    before: 'Query the database and return all relevant records.',
    after:  'Query the database. **If the WHERE clause filters on a date range or status column, explicitly state the filter applied in the summary so the user can verify no records were accidentally excluded.**',
  },
  'Wrong time range': {
    before: "Interpret the user's time reference and filter accordingly.",
    after:  "Interpret the user's time reference. **Echo back the resolved date range (e.g., \"filtering Jan 1 – Mar 31 2024\") at the top of the summary so the user can confirm it before reading the numbers.**",
  },
  'Misunderstood question': {
    before: "Map the user's natural language question to a SQL query.",
    after:  "Map the user's question to SQL. **If the question is ambiguous (e.g., \"revenue\" could mean booked or recognised), state your interpretation explicitly and offer an alternative query.**",
  },
  'Other': {
    before: 'Answer the question as accurately as possible.',
    after:  'Answer the question accurately. **If confidence is below 0.7, append a "Confidence caveat" section flagging what assumptions were made.**',
  },
};
