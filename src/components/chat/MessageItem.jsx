import React, { useMemo } from 'react';
import { marked } from 'marked';
import { Bot, User, Zap, Copy, CheckSquare, PlusCircle, Loader2 } from 'lucide-react';
import { CodeBlock } from './CodeBlock';
import { useTodos } from '../../context/TodoContext';

export function MessageItem({ message }) {
  const { addBulkTasks, extractTasksFromContext } = useTodos();

  const isUser = message.role === 'user';

  // Process markdown and split out code blocks
  const { parsedContent, codeBlocks, extractedTasks } = useMemo(() => {
    let text = message.content || '';
    let tasks = message.extractedTasks || [];

    // Parse ```tasks-json if present
    const taskJsonMatch = text.match(/```tasks-json\s*([\s\S]*?)\s*```/);
    if (taskJsonMatch && taskJsonMatch[1]) {
      try {
        tasks = JSON.parse(taskJsonMatch[1]);
        text = text.replace(/```tasks-json[\s\S]*?```/g, '');
      } catch (e) {
        console.warn('Could not parse embedded task JSON', e);
      }
    }

    // Custom code blocks extraction
    const blocks = [];
    const placeholderText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const idx = blocks.length;
      blocks.push({ language: lang.trim(), code: code.trim() });
      return `<!--CODE_BLOCK_${idx}-->`;
    });

    const html = marked.parse(placeholderText, { breaks: true, gfm: true });
    return { parsedContent: html, codeBlocks: blocks, extractedTasks: tasks };
  }, [message.content, message.extractedTasks]);

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content || '');
    alert('Copied response to clipboard');
  };

  const handleExtractTasks = async () => {
    try {
      await extractTasksFromContext(message.content);
    } catch (err) {
      alert('Error extracting tasks: ' + err.message);
    }
  };

  return (
    <div className={`msg-row ${isUser ? 'user' : 'assistant'}`}>
      <div className="msg-avatar">
        {isUser ? <User size={15} /> : <Bot size={15} />}
      </div>

      <div className="msg-body-wrapper">
        <div className="msg-bubble">
          {/* Attached Media */}
          {message.attachedFiles && message.attachedFiles.length > 0 && (
            <div className="msg-attachments-grid">
              {message.attachedFiles.map((f, i) => (
                f.isImage ? (
                  <img 
                    key={i} 
                    src={f.url} 
                    alt={f.originalName} 
                    className="msg-attachment-thumb" 
                    onClick={() => window.open(f.url, '_blank')}
                  />
                ) : (
                  <div key={i} className="msg-attachment-card">
                    <span>📄</span>
                    <span>{f.originalName}</span>
                  </div>
                )
              ))}
            </div>
          )}

          {/* User Plaintext or Assistant Markdown */}
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
          ) : message.isStreaming && !message.content ? (
            <div className="analyzing-box">
              <div className="analyzing-icon-wrapper">
                <Loader2 size={16} className="spin" />
              </div>
              <div className="analyzing-text">
                <span>Analyzing code & context</span>
                <span className="typing-dots">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              </div>
            </div>
          ) : (
            <div>
              {/* Replace placeholders with React CodeBlock components */}
              {parsedContent.split(/<!--CODE_BLOCK_(\d+)-->/).map((part, idx) => {
                if (idx % 2 === 1) {
                  const blockIdx = parseInt(part, 10);
                  const block = codeBlocks[blockIdx];
                  if (!block) return null;
                  return <CodeBlock key={idx} language={block.language} code={block.code} />;
                }
                return (
                  <div 
                    key={idx} 
                    dangerouslySetInnerHTML={{ __html: part }} 
                    style={{ display: 'inline' }}
                  />
                );
              })}
              {message.isStreaming && <span className="streaming-cursor" />}

              {/* Extracted Tasks Pill Box */}
              {extractedTasks && extractedTasks.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-emerald)', fontWeight: 500 }}>
                      ⚡ {extractedTasks.length} suggested actionable tasks
                    </span>
                    <button 
                      className="btn-minimal"
                      style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                      onClick={() => addBulkTasks(extractedTasks)}
                    >
                      <PlusCircle size={12} />
                      <span>Add All to To-Do</span>
                    </button>
                  </div>
                  <ul style={{ margin: '6px 0 0 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {extractedTasks.map((t, i) => (
                      <li key={i}>
                        <strong style={{ color: 'var(--text-main)' }}>[{t.priority || 'medium'}]</strong> {t.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Meta & Actions for Assistant */}
        {!isUser && !message.isStreaming && (
          <div className="msg-meta-bar">
            {message.usage ? (
              <div className="token-metric-pill" title="Tokens consumed by this request">
                <Zap size={12} style={{ color: 'var(--accent-amber)' }} />
                <span>{(message.usage.totalTokens || 0).toLocaleString()} tokens</span>
                <span style={{ color: 'var(--text-dim)' }}>
                  (In: {message.usage.promptTokens || 0} / Out: {message.usage.candidatesTokens || 0})
                </span>
                {message.durationMs && (
                  <span>• {(message.durationMs / 1000).toFixed(2)}s</span>
                )}
              </div>
            ) : (
              <div></div>
            )}

            <div className="msg-actions">
              <button 
                className="msg-action-btn btn-extract-tasks" 
                onClick={handleExtractTasks}
                title="Extract actionable tasks into To-Do board"
              >
                <CheckSquare size={12} />
                <span>Extract Tasks</span>
              </button>
              <button 
                className="msg-action-btn" 
                onClick={handleCopyText}
                title="Copy text"
              >
                <Copy size={12} />
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
