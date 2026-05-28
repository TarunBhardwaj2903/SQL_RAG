/**
 * API client to communicate with the FastAPI backend.
 */
const API_BASE = '/api';

export async function queryBackend(question) {
  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ question }),
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
