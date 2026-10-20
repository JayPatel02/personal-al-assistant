import fs from 'fs';
import { CONFIG } from '../config.js';

// Ensure data and upload directories exist
if (!fs.existsSync(CONFIG.DATA_DIR)) {
  fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
  fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
}

export const StorageService = {
  // Tasks
  getTasks() {
    try {
      if (fs.existsSync(CONFIG.TASKS_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG.TASKS_FILE, 'utf8'));
      }
    } catch (err) {
      console.error('Error reading tasks:', err);
    }
    // Default initial starter tasks
    const initialTasks = [
      {
        id: 'task-init-1',
        title: 'Review system design & multimodal code analysis',
        priority: 'high',
        tag: 'Architecture',
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'task-init-2',
        title: 'Verify Gemini 2.0 Flash token quota & reset schedule',
        priority: 'medium',
        tag: 'Tokens',
        completed: true,
        createdAt: new Date().toISOString()
      }
    ];
    this.saveTasks(initialTasks);
    return initialTasks;
  },

  saveTasks(tasks) {
    try {
      fs.writeFileSync(CONFIG.TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving tasks:', err);
      return false;
    }
  },

  // Token Statistics
  getTokenStats() {
    const today = new Date().toISOString().split('T')[0];
    try {
      if (fs.existsSync(CONFIG.TOKEN_STATS_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.TOKEN_STATS_FILE, 'utf8'));
        if (data.date === today) {
          return data;
        }
        // Daily reset if date changed
        return {
          date: today,
          dailyRequests: 0,
          dailyTokens: 0,
          dailyPromptTokens: 0,
          dailyCandidatesTokens: 0,
          sessionRequests: 0,
          sessionTokens: 0,
          recentRequests: [],
          history: data.history || []
        };
      }
    } catch (err) {
      console.error('Error reading token stats:', err);
    }
    return {
      date: today,
      dailyRequests: 0,
      dailyTokens: 0,
      dailyPromptTokens: 0,
      dailyCandidatesTokens: 0,
      sessionRequests: 0,
      sessionTokens: 0,
      recentRequests: [],
      history: []
    };
  },

  saveTokenStats(stats) {
    try {
      fs.writeFileSync(CONFIG.TOKEN_STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving token stats:', err);
      return false;
    }
  }
};
