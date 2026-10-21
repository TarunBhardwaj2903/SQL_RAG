const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/files`
  : '/api/files';

/**
 * Upload a CSV or Excel file to the backend.
 *
 * @param {File} file - The file object from <input type="file">
 * @returns {Promise<UploadResponse>}
 */
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'File upload failed');
    }

    return await res.json();
  } catch (error) {
    console.error('File Upload Error:', error);
    throw error;
  }
}

/**
 * Analyze an uploaded file using a natural language prompt.
 *
 * @param {string} sessionId - The session_id returned from uploadFile
 * @param {string} prompt - User natural language query
 * @returns {Promise<AnalyzeResponse>}
 */
export async function analyzeFile(sessionId, prompt) {
  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'File analysis failed');
    }

    return await res.json();
  } catch (error) {
    console.error('File Analysis Error:', error);
    throw error;
  }
}
