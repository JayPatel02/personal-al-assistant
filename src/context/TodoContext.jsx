import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useApp } from './AppContext';

const TodoContext = createContext();

export function TodoProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isExtracting, setIsExtracting] = useState(false);
  const { refreshTokenStats } = useApp();

  const fetchTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      if (data?.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = async (title, priority = 'medium', tag = 'General') => {
    if (!title || !title.trim()) return;
    try {
      const data = await api.createTask({ title: title.trim(), priority, tag });
      if (data?.task) {
        setTasks(prev => [data.task, ...prev]);
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const addBulkTasks = async (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    try {
      const data = await api.createBulkTasks(items);
      if (data?.allTasks) {
        setTasks(data.allTasks);
      }
    } catch (err) {
      console.error('Failed to add bulk tasks:', err);
    }
  };

  const toggleTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newStatus = !task.completed;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: newStatus } : t));

    try {
      await api.updateTask(id, { completed: newStatus });
    } catch (err) {
      console.error('Failed to update task:', err);
      // Revert
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !newStatus } : t));
    }
  };

  const deleteTask = async (id) => {
    const original = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await api.deleteTask(id);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setTasks(original);
    }
  };

  const clearCompleted = async () => {
    try {
      const data = await api.clearCompletedTasks();
      if (data?.tasks) setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
    }
  };

  const extractTasksFromContext = async (contextText) => {
    if (!contextText || !contextText.trim()) return;
    setIsExtracting(true);
    try {
      const data = await api.extractTasks(contextText);
      if (data?.tasks && data.tasks.length > 0) {
        await addBulkTasks(data.tasks);
        refreshTokenStats();
        return data.tasks;
      }
    } catch (err) {
      console.error('Task extraction failed:', err);
      throw err;
    } finally {
      setIsExtracting(false);
    }
  };

  // Filtered task items
  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.completed;
    if (filter === 'completed') return t.completed;
    if (filter === 'high') return t.priority === 'high';
    return true;
  });

  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <TodoContext.Provider
      value={{
        tasks,
        filteredTasks,
        filter,
        setFilter,
        isExtracting,
        addTask,
        addBulkTasks,
        toggleTask,
        deleteTask,
        clearCompleted,
        extractTasksFromContext,
        pendingCount,
        completedCount,
        progressPercent
      }}
    >
      {children}
    </TodoContext.Provider>
  );
}

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) throw new Error('useTodos must be used within TodoProvider');
  return context;
}
