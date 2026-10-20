import fs from 'fs';
import path from 'path';
import { GeminiService } from '../services/geminiService.js';
import { StorageService } from '../services/storageService.js';
import { TokenController } from './tokenController.js';
import { CONFIG } from '../config.js';

export const ChatController = {
  uploadFiles(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedFiles = req.files.map(file => {
        const isImage = file.mimetype.startsWith('image/');
        const ext = path.extname(file.originalname).toLowerCase();
        const isCodeOrText = [
          '.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.py', '.html', '.css',
          '.json', '.csv', '.cpp', '.c', '.h', '.java', '.go', '.rs', '.sql',
          '.sh', '.yaml', '.yml', '.xml', '.log'
        ].includes(ext);

        let textPreview = null;
        if (isCodeOrText && file.size < 2 * 1024 * 1024) {
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
      console.error('Upload controller error:', err);
      res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
  },

  async streamChat(req, res) {
    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(401).json({
        error: 'Gemini API Key missing. Please provide it in Settings or set GEMINI_API_KEY in .env.'
      });
    }

    const {
      message,
      conversationHistory = [],
      files = [],
      model = CONFIG.DEFAULT_MODEL,
      systemInstruction
    } = req.body;

    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const startTime = Date.now();
      let fullResponseText = '';

      const streamResult = await GeminiService.streamChat({
        apiKey,
        message,
        conversationHistory,
        files,
        modelName: model,
        systemInstruction
      });

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        fullResponseText += text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
      }

      const finalResponse = await streamResult.response;
      const durationMs = Date.now() - startTime;
      const usageMetadata = finalResponse.usageMetadata || {};

      const promptTokens = usageMetadata.promptTokenCount || 0;
      const candidatesTokens = usageMetadata.candidatesTokenCount || 0;
      const totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);

      // Record token statistics
      const stats = StorageService.getTokenStats();
      const now = Date.now();
      stats.dailyRequests += 1;
      stats.sessionRequests += 1;
      stats.dailyTokens += totalTokens;
      stats.dailyPromptTokens += promptTokens;
      stats.dailyCandidatesTokens += candidatesTokens;
      stats.sessionTokens += totalTokens;

      stats.recentRequests = stats.recentRequests || [];
      stats.recentRequests.push({
        timestamp: now,
        totalTokens,
        promptTokens,
        candidatesTokens
      });

      stats.history = stats.history || [];
      stats.history.push({
        timestamp: new Date().toISOString(),
        promptTokens,
        candidatesTokens,
        totalTokens,
        model,
        durationMs
      });
      if (stats.history.length > 100) stats.history.shift();

      StorageService.saveTokenStats(stats);

      // Extract tasks if model included ```tasks-json
      let extractedTasks = [];
      const match = fullResponseText.match(/```tasks-json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        try {
          extractedTasks = JSON.parse(match[1]);
        } catch (e) {
          console.warn('Could not parse tasks-json block', e);
        }
      }

      res.write(`data: ${JSON.stringify({
        type: 'done',
        fullText: fullResponseText,
        durationMs,
        usage: {
          promptTokens,
          candidatesTokens,
          totalTokens,
          model
        },
        extractedTasks,
        quotaStats: TokenController.calculateStats()
      })}\n\n`);

      res.end();
    } catch (err) {
      console.error('Chat controller error:', err);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: err.message || 'Error generating AI response.'
      })}\n\n`);
      res.end();
    }
  }
};
