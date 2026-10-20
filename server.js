const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure required directories exist
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Tasks persistence file
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
if (!fs.existsSync(TASKS_FILE)) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify([
    {
      id: 'task-1',
      title: 'Explore Gemini Multimodal analysis on code & images',
      priority: 'high',
      tag: 'Learning',
      completed: false,
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    },
    {
      id: 'task-2',
      title: 'Review token usage and set up daily quota limits',
      priority: 'medium',
      tag: 'Settings',
      completed: true,
      dueDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    }
  ], null, 2));
}

// Token usage storage file
const TOKEN_STATS_FILE = path.join(DATA_DIR, 'token_stats.json');
function loadTokenStats() {
  const today = new Date().toISOString().split('T')[0];
  try {
    if (fs.existsSync(TOKEN_STATS_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_STATS_FILE, 'utf8'));
      if (data.date !== today) {
        // Daily reset
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
      return data;
    }
  } catch (err) {
    console.error('Error loading token stats:', err);
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
}

let tokenStats = loadTokenStats();

function saveTokenStats() {
  try {
    fs.writeFileSync(TOKEN_STATS_FILE, JSON.stringify(tokenStats, null, 2));
  } catch (err) {
    console.error('Error saving token stats:', err);
  }
}

// Multer storage setup for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB
});

// Helper to get active Gemini API key
function getGeminiApiKey(req) {
  const headerKey = req.headers['x-gemini-key'];
  if (headerKey && typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  return process.env.GEMINI_API_KEY || '';
}

// ---------------------------------------------------------------------
// CONFIG & STATUS ENDPOINTS
// ---------------------------------------------------------------------
app.get('/api/config', (req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  res.json({
    hasEnvKey,
    defaultModel: process.env.DEFAULT_MODEL || 'gemini-2.0-flash',
    supportedModels: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Fastest & Latest)', recommended: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (High Efficiency)' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Complex Reasoning)' }
    ]
  });
});

app.post('/api/config/save-key', (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || !apiKey.trim()) {
    return res.status(400).json({ error: 'API key is required' });
  }
  // Save or update .env
  try {
    const envPath = path.join(__dirname, '.env');
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
    res.json({ success: true, message: 'API Key saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write .env file: ' + err.message });
  }
});

// ---------------------------------------------------------------------
// TOKEN TRACKER ENDPOINTS & CALCULATIONS
// ---------------------------------------------------------------------
function calculateQuotaStats() {
  const now = Date.now();
  // Filter rolling 60-second window
  tokenStats.recentRequests = (tokenStats.recentRequests || []).filter(
    r => now - r.timestamp < 60000
  );

  const tpmUsed = tokenStats.recentRequests.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
  const rpmUsed = tokenStats.recentRequests.length;

  // Gemini Free tier limits:
  // 15 RPM, 1,000,000 TPM, 1,500 RPD
  const RPM_LIMIT = 15;
  const TPM_LIMIT = 1000000;
  const RPD_LIMIT = 1500;

  // Next 1-minute window reset countdown (seconds remaining until the oldest recent request drops out, or full 60s)
  let windowResetSeconds = 60;
  if (tokenStats.recentRequests.length > 0) {
    const oldestTimestamp = tokenStats.recentRequests[0].timestamp;
    const elapsed = Math.floor((now - oldestTimestamp) / 1000);
    windowResetSeconds = Math.max(1, 60 - elapsed);
  }

  // Daily reset calculation: Gemini resets daily quota at 00:00 UTC
  const nowUtc = new Date();
  const nextResetUtc = new Date(Date.UTC(
    nowUtc.getUTCFullYear(),
    nowUtc.getUTCMonth(),
    nowUtc.getUTCDate() + 1,
    0, 0, 0
  ));
  const dailyResetMs = nextResetUtc.getTime() - nowUtc.getTime();
  const dailyResetHours = Math.floor(dailyResetMs / (1000 * 60 * 60));
  const dailyResetMinutes = Math.floor((dailyResetMs % (1000 * 60 * 60)) / (1000 * 60));
  const dailyResetSeconds = Math.floor((dailyResetMs % (1000 * 60)) / 1000);

  return {
    date: tokenStats.date,
    daily: {
      requests: tokenStats.dailyRequests,
      requestsLimit: RPD_LIMIT,
      requestsRemaining: Math.max(0, RPD_LIMIT - tokenStats.dailyRequests),
      totalTokens: tokenStats.dailyTokens,
      promptTokens: tokenStats.dailyPromptTokens,
      candidatesTokens: tokenStats.dailyCandidatesTokens
    },
    rollingMinute: {
      rpmUsed,
      rpmLimit: RPM_LIMIT,
      rpmRemaining: Math.max(0, RPM_LIMIT - rpmUsed),
      tpmUsed,
      tpmLimit: TPM_LIMIT,
      tpmRemaining: Math.max(0, TPM_LIMIT - tpmUsed),
      windowResetSeconds
    },
    session: {
      requests: tokenStats.sessionRequests,
      totalTokens: tokenStats.sessionTokens
    },
    dailyReset: {
      hours: dailyResetHours,
      minutes: dailyResetMinutes,
      seconds: dailyResetSeconds,
      formatted: `${dailyResetHours}h ${dailyResetMinutes}m ${dailyResetSeconds}s`
    },
    history: (tokenStats.history || []).slice(-20)
  };
}

app.get('/api/tokens', (req, res) => {
  res.json(calculateQuotaStats());
});

app.post('/api/tokens/reset-session', (req, res) => {
  tokenStats.sessionRequests = 0;
  tokenStats.sessionTokens = 0;
  saveTokenStats();
  res.json({ success: true, stats: calculateQuotaStats() });
});

// ---------------------------------------------------------------------
// FILE UPLOAD ENDPOINT
// ---------------------------------------------------------------------
app.post('/api/upload', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      const isImage = file.mimetype.startsWith('image/');
      const ext = path.extname(file.originalname).toLowerCase();
      const isCodeOrText = [
        '.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css',
        '.json', '.csv', '.cpp', '.c', '.h', '.java', '.go', '.rs', '.sql',
        '.sh', '.yaml', '.yml', '.xml', '.log', '.env'
      ].includes(ext);

      let textPreview = null;
      if (isCodeOrText && file.size < 2 * 1024 * 1024) { // Under 2MB
        try {
          textPreview = fs.readFileSync(file.path, 'utf8');
        } catch (e) {
          console.warn('Could not read text preview:', e);
        }
      }

      return {
        id: path.basename(file.filename),
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        path: file.path,
        isImage,
        isCodeOrText,
        textPreview
      };
    });

    res.json({ files: uploadedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------
// CHAT & STREAMING ENDPOINT WITH TOKEN METRICS
// ---------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  const apiKey = getGeminiApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      error: 'Gemini API Key missing. Please provide it in Settings or set GEMINI_API_KEY in .env.'
    });
  }

  const {
    message,
    conversationHistory = [],
    files = [],
    model: requestedModel,
    systemInstruction
  } = req.body;

  const modelName = requestedModel || process.env.DEFAULT_MODEL || 'gemini-2.0-flash';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const systemPrompt = systemInstruction || 
      `You are "Aura", an ultra-intelligent, precise personal assistant specializing in:
1. Deep code analysis, debugging, architectural explanations, code generation, refactoring, and step-by-step walkthroughs.
2. In-depth text explanations, summaries, translations, and technical breakdowns.
3. Task management: Whenever a user's question, plan, or your own explanation involves actionable tasks or steps to follow, clearly formulate actionable tasks. You can also append a JSON block at the end with suggested tasks in format:
\`\`\`tasks-json
[{"title": "Task title", "priority": "high"|"medium"|"low", "tag": "Code"|"Bug"|"Personal"|"Review"}]
\`\`\`
when appropriate so the user can import them directly with 1 click.
4. Image and multimodal inspection: Inspect images, diagrams, error screenshots, mockups, or source files in detail.
Format all responses in beautiful, clean Markdown with syntax highlighting and clear headings.`;

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemPrompt
    });

    // Build multimodal contents
    const contents = [];

    // Prior history (last 10 turns to conserve tokens while preserving context)
    for (const item of conversationHistory.slice(-10)) {
      if (item.role === 'user') {
        const parts = [{ text: item.content }];
        if (item.attachedFiles && Array.isArray(item.attachedFiles)) {
          for (const f of item.attachedFiles) {
            if (f.isImage && fs.existsSync(f.path)) {
              const base64Data = fs.readFileSync(f.path).toString('base64');
              parts.push({
                inlineData: {
                  data: base64Data,
                  mimeType: f.mimetype
                }
              });
            } else if (f.isCodeOrText && f.textPreview) {
              parts.push({
                text: `\n[Attached File: ${f.originalName}]\n\`\`\`\n${f.textPreview.slice(0, 50000)}\n\`\`\`\n`
              });
            }
          }
        }
        contents.push({ role: 'user', parts });
      } else if (item.role === 'assistant' || item.role === 'model') {
        contents.push({ role: 'model', parts: [{ text: item.content }] });
      }
    }

    // Current user message parts
    const currentParts = [];
    if (message && message.trim()) {
      currentParts.push({ text: message });
    }

    // Attach files to current turn
    for (const f of files) {
      if (f.isImage && f.path && fs.existsSync(f.path)) {
        const base64Data = fs.readFileSync(f.path).toString('base64');
        currentParts.push({
          inlineData: {
            data: base64Data,
            mimeType: f.mimetype
          }
        });
      } else if (f.isCodeOrText) {
        let contentText = f.textPreview;
        if (!contentText && f.path && fs.existsSync(f.path)) {
          contentText = fs.readFileSync(f.path, 'utf8');
        }
        if (contentText) {
          currentParts.push({
            text: `\n[Uploaded File Content - ${f.originalName}]:\n\`\`\`${path.extname(f.originalName).replace('.', '')}\n${contentText}\n\`\`\`\n`
          });
        }
      }
    }

    if (currentParts.length === 0) {
      return res.status(400).json({ error: 'Message or uploaded file is required' });
    }

    contents.push({ role: 'user', parts: currentParts });

    // Set headers for Server-Sent Events (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const startTime = Date.now();
    let fullResponseText = '';

    const streamResult = await model.generateContentStream({ contents });

    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      fullResponseText += chunkText;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
    }

    // Wait for the final complete response to extract usageMetadata
    const finalResponse = await streamResult.response;
    const durationMs = Date.now() - startTime;
    const usageMetadata = finalResponse.usageMetadata || {};

    const promptTokens = usageMetadata.promptTokenCount || 0;
    const candidatesTokens = usageMetadata.candidatesTokenCount || 0;
    const totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

    // Update global token statistics
    const now = Date.now();
    tokenStats.dailyRequests += 1;
    tokenStats.sessionRequests += 1;
    tokenStats.dailyTokens += totalTokens;
    tokenStats.dailyPromptTokens += promptTokens;
    tokenStats.dailyCandidatesTokens += candidatesTokens;
    tokenStats.sessionTokens += totalTokens;

    tokenStats.recentRequests.push({
      timestamp: now,
      totalTokens,
      promptTokens,
      candidatesTokens
    });

    tokenStats.history = tokenStats.history || [];
    tokenStats.history.push({
      timestamp: new Date().toISOString(),
      promptTokens,
      candidatesTokens,
      totalTokens,
      model: modelName,
      durationMs
    });
    // Keep max 100 history items
    if (tokenStats.history.length > 100) tokenStats.history.shift();

    saveTokenStats();

    // Check if response contains actionable tasks-json
    let extractedTasks = [];
    const taskJsonMatch = fullResponseText.match(/```tasks-json\s*([\s\S]*?)\s*```/);
    if (taskJsonMatch && taskJsonMatch[1]) {
      try {
        extractedTasks = JSON.parse(taskJsonMatch[1]);
      } catch (e) {
        console.warn('Failed to parse tasks-json block', e);
      }
    }

    // Send final event with usage statistics and updated quota stats
    res.write(`data: ${JSON.stringify({
      type: 'done',
      fullText: fullResponseText,
      durationMs,
      usage: {
        promptTokens,
        candidatesTokens,
        totalTokens,
        model: modelName
      },
      extractedTasks,
      quotaStats: calculateQuotaStats()
    })}\n\n`);

    res.end();

  } catch (err) {
    console.error('Chat generation error:', err);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: err.message || 'An error occurred during response generation'
    })}\n\n`);
    res.end();
  }
});

// ---------------------------------------------------------------------
// TASK EXTRACTION AI ENDPOINT (Extract to-dos from any text / code snippet)
// ---------------------------------------------------------------------
app.post('/api/tasks/extract', async (req, res) => {
  const apiKey = getGeminiApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: 'Gemini API Key missing.' });
  }

  const { contextText } = req.body;
  if (!contextText || !contextText.trim()) {
    return res.status(400).json({ error: 'Context text is required' });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze the following context (chat discussion, code, or user request) and extract a list of 2-7 concrete, actionable To-Do tasks.
Return a valid JSON array of objects with the exact schema:
[
  {
    "title": "Clear actionable task title",
    "priority": "high" | "medium" | "low",
    "tag": "Code" | "Bug" | "Review" | "Personal" | "Docs",
    "dueDate": "YYYY-MM-DD" (optional or next 1-3 days)
  }
]

Context:
"""
${contextText.slice(0, 15000)}
"""`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    const tasks = JSON.parse(jsonText);

    // Record token usage
    const usage = response.usageMetadata || {};
    const total = usage.totalTokenCount || 0;
    tokenStats.dailyRequests += 1;
    tokenStats.dailyTokens += total;
    tokenStats.sessionTokens += total;
    saveTokenStats();

    res.json({ tasks, usage });
  } catch (err) {
    console.error('Task extraction error:', err);
    res.status(500).json({ error: 'Failed to extract tasks: ' + err.message });
  }
});

// ---------------------------------------------------------------------
// TO-DO CRUD ENDPOINTS
// ---------------------------------------------------------------------
function readTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading tasks:', err);
  }
  return [];
}

function writeTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (err) {
    console.error('Error writing tasks:', err);
  }
}

app.get('/api/tasks', (req, res) => {
  res.json({ tasks: readTasks() });
});

app.post('/api/tasks', (req, res) => {
  const { title, priority = 'medium', tag = 'General', dueDate } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const tasks = readTasks();
  const newTask = {
    id: 'task-' + Date.now() + '-' + Math.round(Math.random() * 1000),
    title: title.trim(),
    priority: ['high', 'medium', 'low'].includes(priority.toLowerCase()) ? priority.toLowerCase() : 'medium',
    tag: tag.trim() || 'General',
    completed: false,
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  writeTasks(tasks);
  res.status(201).json({ task: newTask });
});

app.post('/api/tasks/bulk', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  const tasks = readTasks();
  const createdTasks = [];

  for (const item of items) {
    if (item.title && item.title.trim()) {
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.round(Math.random() * 10000),
        title: item.title.trim(),
        priority: ['high', 'medium', 'low'].includes((item.priority || '').toLowerCase()) ? item.priority.toLowerCase() : 'medium',
        tag: item.tag || 'AI Suggested',
        completed: false,
        dueDate: item.dueDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };
      createdTasks.push(newTask);
      tasks.unshift(newTask);
    }
  }

  writeTasks(tasks);
  res.status(201).json({ tasks: createdTasks, allTasks: tasks });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const tasks = readTasks();
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks[index] = { ...tasks[index], ...updates };
  writeTasks(tasks);
  res.json({ task: tasks[index] });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  let tasks = readTasks();
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== id);

  if (tasks.length === initialLength) {
    return res.status(404).json({ error: 'Task not found' });
  }

  writeTasks(tasks);
  res.json({ success: true, message: 'Task deleted' });
});

app.post('/api/tasks/clear-completed', (req, res) => {
  let tasks = readTasks();
  tasks = tasks.filter(t => !t.completed);
  writeTasks(tasks);
  res.json({ success: true, tasks });
});

// Fallback to index.html for SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🤖 Personal Assistant Bot Server is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
