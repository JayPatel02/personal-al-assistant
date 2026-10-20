import React from 'react';
import { Sparkles, CheckCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTodos } from '../../context/TodoContext';
import { useChat } from '../../context/ChatContext';
import { TodoItem } from './TodoItem';
import { AddTodoForm } from './AddTodoForm';

export function TodoPanel() {
  const { isTodoOpen } = useApp();
  const { 
    filteredTasks, 
    filter, 
    setFilter, 
    pendingCount, 
    completedCount, 
    progressPercent, 
    clearCompleted,
    extractTasksFromContext,
    isExtracting 
  } = useTodos();

  const { messages } = useChat();

  const handleAutoExtract = async () => {
    if (messages.length === 0) {
      alert('Start a conversation or discuss some code first so Aura can extract tasks!');
      return;
    }
    const fullText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    try {
      await extractTasksFromContext(fullText);
    } catch (err) {
      alert('Extraction failed: ' + err.message);
    }
  };

  return (
    <aside className={`todo-sidebar ${isTodoOpen ? '' : 'collapsed'}`}>
      <div className="todo-header">
        <div className="todo-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="todo-header-title">Tasks</span>
            <span style={{ 
              fontSize: '0.72rem', 
              color: 'var(--text-muted)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              padding: '1px 6px',
              borderRadius: '999px'
            }}>
              {pendingCount} pending
            </span>
          </div>

          <button 
            className="btn-minimal" 
            style={{ fontSize: '0.72rem', padding: '3px 8px' }}
            onClick={handleAutoExtract}
            disabled={isExtracting}
            title="AI scans current chat discussion and auto-generates tasks"
          >
            <Sparkles size={12} style={{ color: 'var(--accent-emerald)' }} />
            <span>{isExtracting ? 'Scanning...' : 'Auto-Extract'}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            <span>Completion</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="todo-progress-track">
            <div className="todo-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Filters */}
        <div className="todo-filter-pills">
          <button 
            className={`todo-filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`todo-filter-pill ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`todo-filter-pill ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Done
          </button>
          <button 
            className={`todo-filter-pill ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            High
          </button>
        </div>
      </div>

      <AddTodoForm />

      <div className="todo-items-list">
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            No tasks in this view
          </div>
        ) : (
          filteredTasks.map(task => (
            <TodoItem key={task.id} task={task} />
          ))
        )}
      </div>

      <div className="todo-footer">
        <button 
          onClick={clearCompleted}
          style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.72rem' }}
        >
          Clear completed
        </button>
        <span>{completedCount} of {pendingCount + completedCount} completed</span>
      </div>
    </aside>
  );
}
