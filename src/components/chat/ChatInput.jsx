import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, X, Loader2 } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export function ChatInput() {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const { 
    stagedFiles, 
    addStagedFiles, 
    removeStagedFile, 
    clearStagedFiles, 
    sendMessage, 
    isGenerating, 
    isUploading 
  } = useChat();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isGenerating || (!text.trim() && stagedFiles.length === 0)) return;
    sendMessage(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addStagedFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addStagedFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const estTokens = Math.ceil(text.length / 4);

  return (
    <div className="input-console-wrapper" onDrop={handleDrop} onDragOver={handleDragOver}>
      {/* Staged Attachments Dock */}
      {stagedFiles.length > 0 && (
        <div className="staged-dock">
          <div className="staged-chips">
            {stagedFiles.map((f, i) => (
              <div key={i} className="staged-chip">
                {f.isImage ? (
                  <img 
                    src={f.url} 
                    alt="preview" 
                    style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover' }} 
                  />
                ) : (
                  <span>📄</span>
                )}
                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.originalName}
                </span>
                <button 
                  className="staged-chip-remove" 
                  onClick={() => removeStagedFile(i)}
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={clearStagedFiles}
            style={{ background: 'none', border: 'none', color: 'var(--accent-rose)', fontSize: '0.72rem', cursor: 'pointer' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Input Box */}
      <div className="input-box">
        <label className="btn-icon" style={{ cursor: 'pointer' }} title="Attach Images or Code Files">
          <Paperclip size={16} />
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            multiple 
            accept="image/*,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.txt,.md,.cpp,.c,.h,.java,.go,.rs,.sql,.sh,.yaml,.yml,.xml,.csv"
            style={{ display: 'none' }} 
          />
        </label>

        <textarea
          ref={textareaRef}
          className="input-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Aura to explain code, analyze text, or generate tasks... (Enter to send)"
          rows={1}
        />

        <button 
          className="btn-send" 
          onClick={handleSubmit} 
          disabled={isGenerating || (!text.trim() && stagedFiles.length === 0)}
          title="Send"
        >
          {isGenerating ? <Loader2 size={16} className="spin" /> : <ArrowUp size={16} />}
        </button>
      </div>

      <div className="input-footer">
        <span>Supported: Code (JS/PY/TS/C++), Text/MD, Images (PNG/JPG/WEBP)</span>
        <span>{text.length} chars {text.length > 0 && `(~${estTokens} tokens)`}</span>
      </div>
    </div>
  );
}
