/**
 * API Service Client
 * Clean interface to backend Express server
 */

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = localStorage.getItem('aura_api_key');
  if (key) headers['x-gemini-key'] = key;
  return headers;
}

export const api = {
  // Config
  async getConfig() {
    const res = await fetch('/api/config');
    return res.json();
  },

  async saveApiKey(apiKey) {
    const res = await fetch('/api/config/save-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });
    return res.json();
  },

  // Token & Quotas
  async getTokens() {
    const res = await fetch('/api/tokens');
    return res.json();
  },

  async resetSessionTokens() {
    const res = await fetch('/api/tokens/reset-session', { method: 'POST' });
    return res.json();
  },

  // Tasks
  async getTasks() {
    const res = await fetch('/api/tasks');
    return res.json();
  },

  async createTask(task) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return res.json();
  },

  async createBulkTasks(items) {
    const res = await fetch('/api/tasks/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items })
    });
    return res.json();
  },

  async updateTask(id, updates) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  async deleteTask(id) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    return res.json();
  },

  async clearCompletedTasks() {
    const res = await fetch('/api/tasks/clear-completed', { method: 'POST' });
    return res.json();
  },

  async extractTasks(contextText) {
    const res = await fetch('/api/tasks/extract', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ contextText })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to extract tasks');
    }
    return res.json();
  },

  // File Upload
  async uploadFiles(fileList) {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }
    return res.json();
  },

  // Streaming Chat
  async streamChat({ message, conversationHistory, files, model, systemInstruction, onChunk, onDone, onError }) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          message,
          conversationHistory,
          files,
          model,
          systemInstruction
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'chunk' && onChunk) {
              onChunk(data.text);
            } else if (data.type === 'done' && onDone) {
              onDone(data);
            } else if (data.type === 'error' && onError) {
              onError(new Error(data.error));
            }
          } catch (e) {
            console.warn('Error parsing SSE data chunk:', e);
          }
        }
      }
    } catch (err) {
      if (onError) onError(err);
      else console.error(err);
    }
  }
};
