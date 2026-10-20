import React from 'react';
import { Trash2, Check } from 'lucide-react';
import { useTodos } from '../../context/TodoContext';

export function TodoItem({ task }) {
  const { toggleTask, deleteTask } = useTodos();

  return (
    <div className={`todo-card ${task.completed ? 'completed' : ''}`}>
      <div 
        className="todo-check"
        onClick={() => toggleTask(task.id)}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          background: task.completed ? 'var(--accent-emerald)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        }}
      >
        {task.completed && <Check size={11} color="#ffffff" strokeWidth={3} />}
      </div>

      <div className="todo-content" onClick={() => toggleTask(task.id)} style={{ cursor: 'pointer' }}>
        <span className="todo-title">{task.title}</span>
        <div className="todo-meta">
          <span className={`todo-priority-dot ${task.priority || 'medium'}`} title={`Priority: ${task.priority}`} />
          {task.tag && <span className="todo-tag">{task.tag}</span>}
        </div>
      </div>

      <button 
        className="todo-delete-btn" 
        onClick={() => deleteTask(task.id)}
        title="Delete task"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
