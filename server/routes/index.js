import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';
import { ChatController } from '../controllers/chatController.js';
import { TaskController } from '../controllers/taskController.js';
import { TokenController } from '../controllers/tokenController.js';

const router = express.Router();

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CONFIG.UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Config
router.get('/config', (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    hasEnvKey,
    defaultModel: CONFIG.DEFAULT_MODEL,
    supportedModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended — Latest & Fastest)' },
      { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro (Complex Reasoning & Architecture)' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
    ]
  });
});

router.post('/config/save-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required' });
  }
  try {
    const envPath = path.join(CONFIG.ROOT_DIR, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${apiKey.trim()}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${apiKey.trim()}`;
      }
    } else {
      envContent = `GEMINI_API_KEY=${apiKey.trim()}\nPORT=3000\n`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.GEMINI_API_KEY = apiKey.trim();
    CONFIG.GEMINI_API_KEY = apiKey.trim();
    res.json({ success: true, message: 'API Key saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write .env file: ' + err.message });
  }
});

// Chat & Multimodal
router.post('/upload', upload.array('files', 10), ChatController.uploadFiles);
router.post('/chat', ChatController.streamChat);

// Tasks
router.get('/tasks', TaskController.getTasks);
router.post('/tasks', TaskController.createTask);
router.post('/tasks/bulk', TaskController.createBulkTasks);
router.put('/tasks/:id', TaskController.updateTask);
router.delete('/tasks/:id', TaskController.deleteTask);
router.post('/tasks/clear-completed', TaskController.clearCompleted);
router.post('/tasks/extract', TaskController.extractTasks);

// Tokens
router.get('/tokens', TokenController.getTokens);
router.post('/tokens/reset-session', TokenController.resetSession);

export default router;
