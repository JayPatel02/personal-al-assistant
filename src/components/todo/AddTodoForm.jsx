import React, { useState } from 'react';
import { useTodos } from '../../context/TodoContext';

export function AddTodoForm() {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tag, setTag] = useState('Code');

  const { addTask } = useTodos();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), priority, tag);
    setTitle('');
  };

  return (
    <form className="add-todo-inline" onSubmit={handleSubmit}>
      <input 
        type="text" 
        className="add-todo-input"
        placeholder="Add task... (Enter to add)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="add-todo-controls">
        <select 
          className="add-todo-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select 
          className="add-todo-select"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="Code">Code</option>
          <option value="Review">Review</option>
          <option value="Bug">Bug</option>
          <option value="Personal">Personal</option>
          <option value="Docs">Docs</option>
        </select>

        <button 
          type="submit" 
          className="btn-minimal"
          style={{ padding: '3px 10px', fontSize: '0.72rem', marginLeft: 'auto' }}
        >
          Add
        </button>
      </div>
    </form>
  );
}
