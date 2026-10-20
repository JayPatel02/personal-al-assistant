import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config.js';

export const GeminiService = {
  createClient(apiKey) {
    const key = apiKey || CONFIG.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY or configure in Settings.');
    }
    return new GoogleGenerativeAI(key);
  },

  buildMultimodalContents(message, conversationHistory = [], files = []) {
    const contents = [];

    // Prior history (trimmed to last 10 turns to balance context with token usage)
    for (const item of conversationHistory.slice(-10)) {
      if (item.role === 'user') {
        const parts = [{ text: item.content }];
        if (item.attachedFiles && Array.isArray(item.attachedFiles)) {
          for (const f of item.attachedFiles) {
            if (f.isImage && f.path && fs.existsSync(f.path)) {
              parts.push({
                inlineData: {
                  data: fs.readFileSync(f.path).toString('base64'),
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

    // Current message
    const currentParts = [];
    if (message && message.trim()) {
      currentParts.push({ text: message });
    }

    // Process attached files for current turn
    for (const f of files) {
      if (f.isImage && f.path && fs.existsSync(f.path)) {
        currentParts.push({
          inlineData: {
            data: fs.readFileSync(f.path).toString('base64'),
            mimeType: f.mimetype
          }
        });
      } else if (f.isCodeOrText) {
        let contentText = f.textPreview;
        if (!contentText && f.path && fs.existsSync(f.path)) {
          contentText = fs.readFileSync(f.path, 'utf8');
        }
        if (contentText) {
          const ext = path.extname(f.originalName || '').replace('.', '');
          currentParts.push({
            text: `\n[File Attached: ${f.originalName}]:\n\`\`\`${ext}\n${contentText}\n\`\`\`\n`
          });
        }
      }
    }

    if (currentParts.length === 0) {
      throw new Error('Message or at least one file attachment is required.');
    }

    contents.push({ role: 'user', parts: currentParts });
    return contents;
  },

  async streamChat({ apiKey, message, conversationHistory, files, modelName, systemInstruction }) {
    const genAI = this.createClient(apiKey);
    const selectedModel = modelName || CONFIG.DEFAULT_MODEL;

    const defaultSystemPrompt = `You are "Aura", a minimalist, highly intelligent personal coding assistant and task planner.
Your core strengths:
1. Deep code analysis, debugging, architectural explanations, code generation, refactoring, and step-by-step walkthroughs.
2. In-depth text explanations, summaries, and technical breakdowns.
3. Task management: When the user asks for a plan, or your own technical solution has actionable steps, provide a concise explanation and append a structured JSON block at the very end in this format:
\`\`\`tasks-json
[{"title": "Specific task title", "priority": "high"|"medium"|"low", "tag": "Code"|"Bug"|"Review"|"Personal"|"Docs"}]
\`\`\`
4. Multimodal inspection: Inspect attached images, architecture diagrams, error screenshots, and code files with extreme precision.
Format all responses in clean, modern Markdown with syntax-highlighted code blocks and concise headings.`;

    const model = genAI.getGenerativeModel({
      model: selectedModel,
      systemInstruction: systemInstruction || defaultSystemPrompt
    });

    const contents = this.buildMultimodalContents(message, conversationHistory, files);
    return await model.generateContentStream({ contents });
  },

  async extractTasks({ apiKey, contextText }) {
    const genAI = this.createClient(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-3.8-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `Analyze this context and extract 2-6 actionable, concrete To-Do tasks.
Return a valid JSON array matching this exact schema:
[
  {
    "title": "Clear actionable title",
    "priority": "high" | "medium" | "low",
    "tag": "Code" | "Bug" | "Review" | "Personal" | "Docs"
  }
]

Context:
"""
${contextText.slice(0, 15000)}
"""`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tasks = JSON.parse(response.text());
    return {
      tasks,
      usage: response.usageMetadata || {}
    };
  }
};
