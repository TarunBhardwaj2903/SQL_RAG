/**
 * API client to communicate with the FastAPI backend.
 *
 * In development: Vite proxies /api → http://localhost:8000
 * In production:  Set VITE_API_BASE_URL to your deployed backend URL
 *                 e.g. https://your-backend.railway.app
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : '/api';

/**
 * Send a natural language question to the backend along with the
 * conversation history of the current session.
 *
 * @param {string} question       - The user's current question.
 * @param {Array}  chat_history   - Prior turns: [{ role, content, sql? }]
 *                                  Defaults to [] for the first message.
 */
export async function queryBackend(question, chat_history = []) {
  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, chat_history }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query processing failed');
    }

    return await res.json();
  } catch (error) {
    console.error('API Client Error:', error);
    throw error;
  }
}
