import React from 'react';
import { Plus, Search, Bug, CheckSquare, FileText, Beaker } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useChat } from '../../context/ChatContext';

export function Sidebar() {
  const { isSidebarOpen, tokenStats, setIsTokenModalOpen } = useApp();
  const { clearChat, sendMessage } = useChat();

  const quickPrompts = [
    {
      icon: <Search size={14} />,
      label: 'Explain Code Step-by-Step',
      prompt: 'Analyze this code: explain how it works step-by-step, explain any tricky logic, and suggest performance optimizations.'
    },
    {
      icon: <Bug size={14} />,
      label: 'Find Bugs & Vulnerabilities',
      prompt: 'Review this code for edge cases, security issues, and syntax errors. Provide fixed code.'
    },
    {
      icon: <CheckSquare size={14} />,
      label: 'Generate To-Do Tasks',
      prompt: 'Based on our discussion, create a structured, prioritized step-by-step To-Do checklist for me.'
    },
    {
      icon: <FileText size={14} />,
      label: 'Summarize Text & Docs',
      prompt: 'Summarize this document/text into concise key takeaways and action items.'
    },
    {
      icon: <Beaker size={14} />,
      label: 'Write Unit Tests',
      prompt: 'Write clean, comprehensive unit tests for this code covering standard and edge cases.'
    }
  ];

  const dailyReq = tokenStats?.daily?.requests || 0;
  const dailyReqLimit = tokenStats?.daily?.requestsLimit || 1500;
  const reqPct = Math.min(100, (dailyReq / dailyReqLimit) * 100);

  return (
    <aside className={`sidebar ${isSidebarOpen ? '' : 'collapsed'}`}>
      <button 
        className="btn-minimal btn-primary" 
        onClick={clearChat}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        <Plus size={15} />
        <span>New Chat</span>
      </button>

      <div>
        <div className="sidebar-title">Quick Prompts</div>
        <div className="quick-prompts-list">
          {quickPrompts.map((p, i) => (
            <button 
              key={i} 
              className="quick-prompt-btn" 
              onClick={() => sendMessage(p.prompt)}
            >
              {p.icon}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
        <div className="sidebar-title">Quota Overview</div>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '0.74rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Daily Requests</span>
            <span style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {dailyReq} / {dailyReqLimit}
            </span>
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${reqPct}%`, height: '100%', background: 'var(--accent-blue)' }} />
          </div>
          <button 
            onClick={() => setIsTokenModalOpen(true)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-dim)', 
              textAlign: 'left', 
              cursor: 'pointer', 
              padding: '2px 0 0 0',
              fontSize: '0.7rem'
            }}
          >
            View quota metrics →
          </button>
        </div>
      </div>
    </aside>
  );
}
