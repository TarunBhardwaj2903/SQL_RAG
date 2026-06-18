/**
 * Database Simulator — Executive B2B Sales Intelligence Dashboard
 *
 * Provides a mock query engine that parses natural language prompts
 * and returns realistic SQL, executive summaries, and tabular data.
 */

import { queryBackend } from './apiClient';

export const getLoadingSteps = () => [
  { delay: 150,  text: '▶ Classifying query domain (sales / products / hr ...)...',  color: 'text-cyan-400' },
  { delay: 350,  text: '▶ Calling NVIDIA NIM API to generate query vector...',        color: 'text-cyan-400' },
  { delay: 600,  text: '▶ Running filtered similarity search in Supabase (pgvector)...', color: 'text-indigo-400' },
  { delay: 900,  text: '▶ Selecting top schema candidates for LLM context...',        color: 'text-indigo-400' },
  { delay: 1300, text: '▶ Synthesizing optimized PostgreSQL query statement...',       color: 'text-yellow-400' },
  { delay: 1700, text: '▶ Running query on Supabase production database...',           color: 'text-yellow-400' },
  { delay: 2100, text: '▶ Executing query self-correction checks...',                  color: 'text-green-400' },
  { delay: 2500, text: '▶ Formatting result set & synthesizing executive summary...', color: 'text-purple-400' },
  { delay: 2800, text: '✔ Done — rendering results.',                                 color: 'text-emerald-400' },
];

// ─── Main query resolver ───────────────────────────────────────────────────
/**
 * Resolve a natural language query against the backend.
 *
 * @param {string} query        - The user's current question.
 * @param {Array}  chatHistory  - Prior conversation turns to send as context.
 *                                Each entry: { role: 'user'|'assistant', content: string, sql?: string }
 *                                Pass [] (default) for the first message.
 */
export async function resolveQuery(query, chatHistory = []) {
  try {
    const data = await queryBackend(query, chatHistory);
    return {
      sql:       data.sql,
      summary:   data.summary,
      columns:   data.columns,
      rows:      data.rows,
      chartSpec: data.chart_spec ?? null,   // pass through — null if table fallback
      meta: {
        executionMs:        data.meta.execution_ms,
        rowsReturned:       data.meta.rows_returned,
        tablesScanned:      data.meta.tables_scanned,
        joinCount:          data.meta.join_count,
        confidence:         data.meta.confidence,
        retriesUsed:        data.meta.retries_used,
        ragRetrievedTables: data.meta.rag_retrieved_tables,
        ragRerankedTables:  data.meta.rag_reranked_tables,
        ragDomainsSelected: data.meta.rag_domains_selected ?? [],
        ragTablesSearched:  data.meta.rag_tables_searched ?? null
      }
    };
  } catch (error) {
    console.error('Failed to resolve query:', error);
    throw error;
  }
}

// ─── Sidebar preset queries ────────────────────────────────────────────────
export const PRESET_QUERIES = [
  { label: 'Sales by Subcategory',         query: 'What is the total sales revenue by product subcategory?' },
  { label: 'Top Customers by ARR',         query: 'List the top 10 customers by total sales order amount' },
  { label: 'Department Headcount',         query: 'Show the number of employees in each department' },
  { label: 'Vendor Lead Times',            query: 'List the top 10 vendors by their average product lead times' },
  { label: 'Monthly Sales Trends',         query: 'Show monthly sales trends by territory group for sales orders' },
];

export const SCHEMA_STATS = {
  tables:  68,
  rows:    '400K+',
  size:    '85.3 MB',
  updated: 'Synced with Supabase Cloud DB',
};
