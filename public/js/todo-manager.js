/**
 * AURA AI - To-Do & Task Manager Module
 * Handles task creation, persistent storage via backend API,
 * priority tagging, completion tracking, and AI-powered auto-extraction.
 */

class TodoManager {
  constructor() {
    this.tasks = [];
    this.currentFilter = 'all';

    this.initElements();
    this.bindEvents();
    this.fetchTasks();
  }

  initElements() {
    this.tasksList = document.getElementById('tasksList');
    this.newTaskInput = document.getElementById('newTaskInput');
    this.newTaskPriority = document.getElementById('newTaskPriority');
    this.newTaskTag = document.getElementById('newTaskTag');
    this.addTaskBtn = document.getElementById('addTaskBtn');
    this.todoPendingCount = document.getElementById('todoPendingCount');
    this.tasksHeaderBadge = document.getElementById('tasksHeaderBadge');
    this.todoProgressPercent = document.getElementById('todoProgressPercent');
    this.todoProgressBar = document.getElementById('todoProgressBar');
    this.taskTotalText = document.getElementById('taskTotalText');
    this.clearCompletedTasksBtn = document.getElementById('clearCompletedTasksBtn');
    this.extractTasksFromChatBtn = document.getElementById('extractTasksFromChatBtn');
    this.filterTabs = document.querySelectorAll('.filter-tab');
  }

  bindEvents() {
    // Add task on button click
    if (this.addTaskBtn) {
      this.addTaskBtn.addEventListener('click', () => this.handleAddTask());
    }

    // Add task on Enter key inside input
    if (this.newTaskInput) {
      this.newTaskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleAddTask();
        }
      });
    }

    // Filter tabs
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentFilter = tab.dataset.filter;
        this.renderTasks();
      });
    });

    // Clear completed
    if (this.clearCompletedTasksBtn) {
      this.clearCompletedTasksBtn.addEventListener('click', () => this.clearCompleted());
    }

    // Auto extract tasks from chat
    if (this.extractTasksFromChatBtn) {
      this.extractTasksFromChatBtn.addEventListener('click', () => this.extractFromChat());
    }
  }

  async fetchTasks() {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        this.tasks = data.tasks || [];
        this.renderTasks();
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  }

  async handleAddTask() {
    const title = this.newTaskInput.value.trim();
    if (!title) return;

    const priority = this.newTaskPriority.value;
    const tag = this.newTaskTag.value;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority, tag })
      });

      if (res.ok) {
        const data = await res.json();
        this.tasks.unshift(data.task);
        this.newTaskInput.value = '';
        this.renderTasks();
      }
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  }

  async addBulkTasks(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    try {
      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (res.ok) {
        const data = await res.json();
        this.tasks = data.allTasks || this.tasks;
        this.renderTasks();
        this.showToast(`Added ${items.length} new tasks!`);
      }
    } catch (err) {
      console.error('Failed to add bulk tasks:', err);
    }
  }

  async toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return;

    const updatedStatus = !task.completed;
    task.completed = updatedStatus;
    this.renderTasks(); // Optimistic update

    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: updatedStatus })
      });
    } catch (err) {
      console.error('Failed to update task:', err);
      // Revert if error
      task.completed = !updatedStatus;
      this.renderTasks();
    }
  }

  async deleteTask(id) {
    const originalTasks = [...this.tasks];
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.renderTasks(); // Optimistic update

    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete task:', err);
      this.tasks = originalTasks;
      this.renderTasks();
    }
  }

  async clearCompleted() {
    try {
      const res = await fetch('/api/tasks/clear-completed', { method: 'POST' });
      if (res.ok) {
        this.tasks = this.tasks.filter(t => !t.completed);
        this.renderTasks();
      }
    } catch (err) {
      console.error('Failed to clear completed tasks:', err);
    }
  }

  async extractFromChat() {
    // Gather all messages text from chat history
    const chatManager = window.chatManager;
    if (!chatManager) return;

    const history = chatManager.getConversationContext();
    if (!history || history.length === 0) {
      alert('Start a conversation or discuss some code first so Aura can extract tasks!');
      return;
    }

    const fullChatText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
    const originalBtnText = this.extractTasksFromChatBtn.innerHTML;
    this.extractTasksFromChatBtn.innerHTML = `<span>⏳ Extracting...</span>`;
    this.extractTasksFromChatBtn.disabled = true;

    try {
      const headers = { 'Content-Type': 'application/json' };
      const apiKey = localStorage.getItem('aura_api_key');
      if (apiKey) headers['x-gemini-key'] = apiKey;

      const res = await fetch('/api/tasks/extract', {
        method: 'POST',
        headers,
        body: JSON.stringify({ contextText: fullChatText })
      });

      const data = await res.json();
      if (data.tasks && data.tasks.length > 0) {
        await this.addBulkTasks(data.tasks);
        if (window.tokenTracker && data.usage) {
          window.tokenTracker.fetchStats();
        }
      } else {
        alert('No explicit tasks could be extracted from the current conversation.');
      }
    } catch (err) {
      console.error('Task extraction failed:', err);
      alert('Failed to extract tasks: ' + err.message);
    } finally {
      this.extractTasksFromChatBtn.innerHTML = originalBtnText;
      this.extractTasksFromChatBtn.disabled = false;
    }
  }

  renderTasks() {
    const total = this.tasks.length;
    const completed = this.tasks.filter(t => t.completed).length;
    const pending = total - completed;

    // Badges & Counters
    if (this.todoPendingCount) this.todoPendingCount.textContent = pending;
    if (this.tasksHeaderBadge) this.tasksHeaderBadge.textContent = pending;
    if (this.taskTotalText) this.taskTotalText.textContent = `${total} tasks (${completed} done)`;

    // Progress bar
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    if (this.todoProgressPercent) this.todoProgressPercent.textContent = `${percent}%`;
    if (this.todoProgressBar) this.todoProgressBar.style.width = `${percent}%`;

    // Filter tasks
    let filtered = [...this.tasks];
    if (this.currentFilter === 'pending') {
      filtered = filtered.filter(t => !t.completed);
    } else if (this.currentFilter === 'completed') {
      filtered = filtered.filter(t => t.completed);
    } else if (this.currentFilter === 'high') {
      filtered = filtered.filter(t => t.priority === 'high');
    }

    if (!this.tasksList) return;

    if (filtered.length === 0) {
      this.tasksList.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 0.82rem;">
          <p>No tasks in this view</p>
        </div>
      `;
      return;
    }

    this.tasksList.innerHTML = filtered.map(task => {
      const priorityClass = `priority-${task.priority || 'medium'}`;
      return `
        <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="window.todoManager.toggleTask('${task.id}')">
          <div class="task-details">
            <span class="task-text">${this.escapeHtml(task.title)}</span>
            <div class="task-tags-row">
              <span class="priority-tag ${priorityClass}">${task.priority || 'medium'}</span>
              ${task.tag ? `<span class="category-tag">${this.escapeHtml(task.tag)}</span>` : ''}
            </div>
          </div>
          <button class="task-delete-btn" title="Delete Task" onclick="window.todoManager.deleteTask('${task.id}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    }).join('');
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  showToast(msg) {
    // Subtle notification badge
    const existing = document.getElementById('auraToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'auraToast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(16, 185, 129, 0.95);
      color: #fff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }
}

// Global instance
window.todoManager = new TodoManager();
