import { StorageService } from '../services/storageService.js';
import { GeminiService } from '../services/geminiService.js';

export const TaskController = {
  getTasks(req, res) {
    const tasks = StorageService.getTasks();
    res.json({ tasks });
  },

  createTask(req, res) {
    const { title, priority = 'medium', tag = 'General' } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const tasks = StorageService.getTasks();
    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.round(Math.random() * 1000),
      title: title.trim(),
      priority: ['high', 'medium', 'low'].includes((priority || '').toLowerCase()) ? priority.toLowerCase() : 'medium',
      tag: (tag || 'General').trim(),
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    StorageService.saveTasks(tasks);
    res.status(201).json({ task: newTask });
  },

  createBulkTasks(req, res) {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    const tasks = StorageService.getTasks();
    const createdTasks = [];

    for (const item of items) {
      if (item.title && item.title.trim()) {
        const newTask = {
          id: 'task-' + Date.now() + '-' + Math.round(Math.random() * 10000),
          title: item.title.trim(),
          priority: ['high', 'medium', 'low'].includes((item.priority || '').toLowerCase()) ? item.priority.toLowerCase() : 'medium',
          tag: item.tag || 'AI Suggested',
          completed: false,
          createdAt: new Date().toISOString()
        };
        createdTasks.push(newTask);
        tasks.unshift(newTask);
      }
    }

    StorageService.saveTasks(tasks);
    res.status(201).json({ tasks: createdTasks, allTasks: tasks });
  },

  updateTask(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const tasks = StorageService.getTasks();
    const index = tasks.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    tasks[index] = { ...tasks[index], ...updates };
    StorageService.saveTasks(tasks);
    res.json({ task: tasks[index] });
  },

  deleteTask(req, res) {
    const { id } = req.params;
    let tasks = StorageService.getTasks();
    const initialLen = tasks.length;
    tasks = tasks.filter(t => t.id !== id);

    if (tasks.length === initialLen) {
      return res.status(404).json({ error: 'Task not found' });
    }

    StorageService.saveTasks(tasks);
    res.json({ success: true, message: 'Task deleted' });
  },

  clearCompleted(req, res) {
    let tasks = StorageService.getTasks();
    tasks = tasks.filter(t => !t.completed);
    StorageService.saveTasks(tasks);
    res.json({ success: true, tasks });
  },

  async extractTasks(req, res) {
    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ error: 'Gemini API key is required.' });
    }

    const { contextText } = req.body;
    if (!contextText || !contextText.trim()) {
      return res.status(400).json({ error: 'Context text is required' });
    }

    try {
      const { tasks, usage } = await GeminiService.extractTasks({ apiKey, contextText });

      // Record token usage
      const stats = StorageService.getTokenStats();
      const total = usage.totalTokenCount || 0;
      stats.dailyRequests += 1;
      stats.dailyTokens += total;
      stats.sessionTokens += total;
      StorageService.saveTokenStats(stats);

      res.json({ tasks, usage });
    } catch (err) {
      console.error('Task extraction error:', err);
      res.status(500).json({ error: 'Failed to extract tasks: ' + err.message });
    }
  }
};
