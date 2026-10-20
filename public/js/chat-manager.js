/**
 * AURA AI - Chat & Multimodal Workbench Manager
 * Handles real-time SSE streaming, syntax highlighted code blocks,
 * multimodal drag-and-drop file/image staging, per-message token metrics,
 * and 1-click task imports into the To-Do board.
 */

class ChatManager {
  constructor() {
    this.conversationHistory = [];
    this.stagedFiles = [];
    this.isGenerating = false;

    this.initElements();
    this.configureMarked();
    this.bindEvents();
  }

  initElements() {
    this.messagesContainer = document.getElementById('messagesContainer');
    this.welcomeHero = document.getElementById('welcomeHero');
    this.chatForm = document.getElementById('chatForm');
    this.messageInput = document.getElementById('messageInput');
    this.fileInput = document.getElementById('fileInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.tokenEstimate = document.getElementById('tokenEstimate');

    // Staging dock
    this.attachedDock = document.getElementById('attachedDock');
    this.dockItems = document.getElementById('dockItems');
    this.dockCount = document.getElementById('dockCount');
    this.clearAllFilesBtn = document.getElementById('clearAllFilesBtn');

    // Drag dropzone
    this.dragDropzone = document.getElementById('dragDropzone');
    this.chatMain = document.querySelector('.chat-main');
  }

  configureMarked() {
    // Custom renderer for code blocks to add header and copy button
    const renderer = new marked.Renderer();
    renderer.code = function(code, language) {
      const validLang = language || 'plaintext';
      const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const encodedForCopy = encodeURIComponent(code);

      return `
        <div class="code-wrapper">
          <div class="code-header">
            <span class="code-lang">${validLang}</span>
            <button class="code-copy-btn" data-code="${encodedForCopy}" onclick="window.chatManager.copyCodeBlock(this)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code class="language-${validLang}">${escapedCode}</code></pre>
        </div>
      `;
    };

    marked.setOptions({
      renderer: renderer,
      breaks: true,
      gfm: true
    });
  }

  bindEvents() {
    // Submit message
    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSendMessage();
      });
    }

    // Textarea auto-resize and Enter key handling
    if (this.messageInput) {
      this.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      this.messageInput.addEventListener('input', () => {
        this.autoResizeTextarea();
        this.updateCharTokenEstimate();
      });
    }

    // File input change
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.uploadAndStageFiles(e.target.files);
          this.fileInput.value = '';
        }
      });
    }

    // Clear staged files
    if (this.clearAllFilesBtn) {
      this.clearAllFilesBtn.addEventListener('click', () => {
        this.stagedFiles = [];
        this.renderStagedDock();
      });
    }

    // Drag and Drop over workbench
    if (this.chatMain && this.dragDropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.chatMain.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dragDropzone.classList.add('active');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dragDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (eventName === 'drop') {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
              this.uploadAndStageFiles(files);
            }
          }
          this.dragDropzone.classList.remove('active');
        }, false);
      });
    }
  }

  autoResizeTextarea() {
    this.messageInput.style.height = 'auto';
    this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 180) + 'px';
  }

  updateCharTokenEstimate() {
    const text = this.messageInput.value;
    const charCount = text.length;
    // Rule of thumb: ~4 characters per token
    const estTokens = Math.ceil(charCount / 4);
    if (this.tokenEstimate) {
      this.tokenEstimate.textContent = `${charCount} chars (~${estTokens} tokens)`;
    }
  }

  async uploadAndStageFiles(fileList) {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    // Show temporary loading indicator in dock
    this.attachedDock.style.display = 'block';
    this.dockItems.innerHTML = `<span style="font-size: 0.8rem; color: var(--accent-cyan);">Uploading ${fileList.length} file(s)...</span>`;

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          this.stagedFiles.push(...data.files);
          this.renderStagedDock();
        }
      } else {
        alert('File upload failed. Ensure file size is under 25MB.');
        this.renderStagedDock();
      }
    } catch (err) {
      console.error('File upload error:', err);
      alert('Upload error: ' + err.message);
      this.renderStagedDock();
    }
  }

  renderStagedDock() {
    if (this.stagedFiles.length === 0) {
      this.attachedDock.style.display = 'none';
      return;
    }

    this.attachedDock.style.display = 'block';
    this.dockCount.textContent = this.stagedFiles.length;

    this.dockItems.innerHTML = this.stagedFiles.map((file, idx) => {
      let previewHtml = '';
      if (file.isImage) {
        previewHtml = `<img src="${file.url}" class="dock-thumb" alt="thumbnail">`;
      } else {
        previewHtml = `<span>📄</span>`;
      }

      return `
        <div class="dock-chip">
          ${previewHtml}
          <span class="dock-chip-name" title="${file.originalName}">${file.originalName}</span>
          <button class="dock-remove-btn" onclick="window.chatManager.removeStagedFile(${idx})">×</button>
        </div>
      `;
    }).join('');
  }

  removeStagedFile(index) {
    this.stagedFiles.splice(index, 1);
    this.renderStagedDock();
  }

  async handleSendMessage() {
    if (this.isGenerating) return;

    const messageText = this.messageInput.value.trim();
    const filesToSend = [...this.stagedFiles];

    if (!messageText && filesToSend.length === 0) return;

    // Hide welcome hero
    if (this.welcomeHero) {
      this.welcomeHero.style.display = 'none';
    }

    // Clear input & staged dock
    this.messageInput.value = '';
    this.messageInput.style.height = 'auto';
    this.stagedFiles = [];
    this.renderStagedDock();
    this.updateCharTokenEstimate();

    // Render user message in UI
    this.appendUserMessage(messageText, filesToSend);

    // Save to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: messageText || (filesToSend.length > 0 ? `[Attached ${filesToSend.length} files]` : ''),
      attachedFiles: filesToSend
    });

    // Start assistant streaming response
    await this.streamAssistantResponse(messageText, filesToSend);
  }

  appendUserMessage(text, files) {
    const row = document.createElement('div');
    row.className = 'message-row user';

    let filesHtml = '';
    if (files && files.length > 0) {
      filesHtml = `<div class="msg-attachments">` + files.map(f => {
        if (f.isImage) {
          return `<img src="${f.url}" class="msg-attachment-img" alt="${f.originalName}" onclick="window.open('${f.url}', '_blank')">`;
        } else {
          return `<div class="msg-attachment-file"><span>📄</span><span>${f.originalName}</span></div>`;
        }
      }).join('') + `</div>`;
    }

    row.innerHTML = `
      <div class="msg-avatar">YOU</div>
      <div class="msg-content-wrapper">
        <div class="msg-bubble">
          ${filesHtml}
          ${text ? `<div style="white-space: pre-wrap;">${this.escapeHtml(text)}</div>` : ''}
        </div>
      </div>
    `;

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();
  }

  async streamAssistantResponse(message, files) {
    this.isGenerating = true;
    this.sendBtn.disabled = true;

    // Create assistant message row with typing indicator
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const msgId = 'msg-' + Date.now();
    row.innerHTML = `
      <div class="msg-avatar">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div class="msg-content-wrapper">
        <div class="msg-bubble" id="${msgId}">
          <div class="typing-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="msg-meta-bar" id="${msgId}-meta" style="display: none;"></div>
      </div>
    `;

    this.messagesContainer.appendChild(row);
    this.scrollToBottom();

    const bubble = document.getElementById(msgId);
    const metaBar = document.getElementById(`${msgId}-meta`);

    let accumulatedText = '';
    let hasReceivedFirstChunk = false;

    try {
      const apiKey = localStorage.getItem('aura_api_key');
      const selectedModel = localStorage.getItem('aura_model') || 'gemini-2.0-flash';
      const customInstruction = localStorage.getItem('aura_system_instruction') || '';

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['x-gemini-key'] = apiKey;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory.slice(-8),
          files,
          model: selectedModel,
          systemInstruction: customInstruction
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep last incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'chunk') {
              if (!hasReceivedFirstChunk) {
                bubble.innerHTML = '';
                hasReceivedFirstChunk = true;
              }
              accumulatedText += data.text;
              this.renderStreamingContent(bubble, accumulatedText);
              this.scrollToBottom();
            } else if (data.type === 'done') {
              accumulatedText = data.fullText || accumulatedText;
              this.renderFinalContent(bubble, accumulatedText, data);
              this.renderMessageMeta(metaBar, data, msgId, accumulatedText);

              // Update token tracker
              if (window.tokenTracker && data.quotaStats) {
                window.tokenTracker.updateStats(data.quotaStats);
              }

              // Save to conversation history
              this.conversationHistory.push({
                role: 'assistant',
                content: accumulatedText
              });
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            console.warn('Error parsing SSE event:', e);
          }
        }
      }

    } catch (err) {
      console.error('Chat stream error:', err);
      bubble.innerHTML = `
        <div style="color: var(--accent-rose); padding: 8px 0;">
          <strong>Error:</strong> ${this.escapeHtml(err.message)}
          <br><small style="color: var(--text-muted);">Please check your Gemini API key in Settings (⚙️).</small>
        </div>
      `;
    } finally {
      this.isGenerating = false;
      this.sendBtn.disabled = false;
      this.scrollToBottom();
    }
  }

  renderStreamingContent(bubble, markdownText) {
    // Strip tasks-json block from live preview to keep text clean
    const cleanText = markdownText.replace(/```tasks-json[\s\S]*?```/g, '');
    bubble.innerHTML = marked.parse(cleanText);

    // Highlight code blocks
    bubble.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  renderFinalContent(bubble, fullMarkdown, data) {
    let cleanText = fullMarkdown;
    let taskJsonHtml = '';

    // If there were extracted tasks embedded in markdown
    if (data.extractedTasks && data.extractedTasks.length > 0) {
      cleanText = fullMarkdown.replace(/```tasks-json[\s\S]*?```/g, '');
      const taskCount = data.extractedTasks.length;
      taskJsonHtml = `
        <div style="margin-top: 14px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; color: var(--accent-emerald); font-size: 0.85rem;">
              ⚡ Aura suggested ${taskCount} actionable task${taskCount > 1 ? 's' : ''}
            </span>
            <button class="btn btn-xs btn-primary" onclick='window.todoManager.addBulkTasks(${JSON.stringify(data.extractedTasks)})'>
              + Add All to To-Do List
            </button>
          </div>
          <ul style="margin: 4px 0 0 16px; font-size: 0.8rem; color: var(--text-secondary);">
            ${data.extractedTasks.map(t => `<li><strong>[${t.priority || 'medium'}]</strong> ${this.escapeHtml(t.title)}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    bubble.innerHTML = marked.parse(cleanText) + taskJsonHtml;

    // Apply code highlight
    bubble.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);
    });
  }

  renderMessageMeta(metaBar, data, msgId, fullText) {
    if (!metaBar) return;
    metaBar.style.display = 'flex';

    const usage = data.usage || {};
    const total = usage.totalTokens || 0;
    const prompt = usage.promptTokens || 0;
    const candidates = usage.candidatesTokens || 0;
    const sec = data.durationMs ? (data.durationMs / 1000).toFixed(2) + 's' : '';

    metaBar.innerHTML = `
      <div class="token-pill-badge" title="Tokens consumed by this request">
        <span>⚡ ${total.toLocaleString()} tokens</span>
        <span style="color: var(--text-muted); font-size: 0.68rem;">(In: ${prompt} / Out: ${candidates})</span>
        ${sec ? `<span style="color: var(--text-muted);">• ${sec}</span>` : ''}
      </div>

      <div class="msg-action-btns">
        <button class="msg-btn msg-btn-todo" title="Extract tasks from this message into To-Do list" onclick="window.chatManager.extractTasksFromMessage('${msgId}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span>Extract Tasks</span>
        </button>
        <button class="msg-btn" title="Copy response text" onclick="window.chatManager.copyResponseText('${msgId}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy</span>
        </button>
      </div>
    `;

    // Store raw text for copying
    metaBar.dataset.rawText = fullText;
  }

  async extractTasksFromMessage(msgId) {
    const metaBar = document.getElementById(`${msgId}-meta`);
    const rawText = metaBar?.dataset.rawText;
    if (!rawText) return;

    try {
      const headers = { 'Content-Type': 'application/json' };
      const apiKey = localStorage.getItem('aura_api_key');
      if (apiKey) headers['x-gemini-key'] = apiKey;

      const res = await fetch('/api/tasks/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ contextText: rawText })
      });

      const data = await res.json();
      if (data.tasks && data.tasks.length > 0) {
        await window.todoManager.addBulkTasks(data.tasks);
      } else {
        alert('No explicit tasks found in this response.');
      }
    } catch (err) {
      alert('Error extracting tasks: ' + err.message);
    }
  }

  copyResponseText(msgId) {
    const metaBar = document.getElementById(`${msgId}-meta`);
    const rawText = metaBar?.dataset.rawText;
    if (rawText) {
      navigator.clipboard.writeText(rawText);
      alert('Copied message to clipboard!');
    }
  }

  copyCodeBlock(btn) {
    const code = decodeURIComponent(btn.dataset.code || '');
    navigator.clipboard.writeText(code).then(() => {
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span>✓ Copied</span>`;
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    });
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  getConversationContext() {
    return this.conversationHistory;
  }

  clearChat() {
    this.conversationHistory = [];
    this.messagesContainer.innerHTML = '';
    if (this.welcomeHero) {
      this.welcomeHero.style.display = 'flex';
      this.messagesContainer.appendChild(this.welcomeHero);
    }
  }

  sendPresetPrompt(promptText) {
    this.messageInput.value = promptText;
    this.autoResizeTextarea();
    this.messageInput.focus();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Global instance
window.chatManager = new ChatManager();
