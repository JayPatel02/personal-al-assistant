/**
 * AURA AI - Main Application Controller
 * Handles settings modal, layout toggling, keybindings,
 * preset prompt routing, and server config synchronization.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const toggleTodoBtn = document.getElementById('toggleTodoBtn');
  const sidebarLeft = document.getElementById('sidebarLeft');
  const sidebarRight = document.getElementById('sidebarRight');
  const newChatBtn = document.getElementById('newChatBtn');

  // Settings elements
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
  const modelSelect = document.getElementById('modelSelect');
  const systemInstructionInput = document.getElementById('systemInstructionInput');
  const apiKeyStatusAlert = document.getElementById('apiKeyStatusAlert');
  const currentModelLabel = document.getElementById('currentModelLabel');

  // Load existing settings from localStorage
  const savedApiKey = localStorage.getItem('aura_api_key') || '';
  const savedModel = localStorage.getItem('aura_model') || 'gemini-2.0-flash';
  const savedInstruction = localStorage.getItem('aura_system_instruction') || '';

  if (apiKeyInput) apiKeyInput.value = savedApiKey;
  if (modelSelect) modelSelect.value = savedModel;
  if (systemInstructionInput) systemInstructionInput.value = savedInstruction;
  if (currentModelLabel) {
    const modelNames = {
      'gemini-2.0-flash': 'Gemini 2.0 Flash',
      'gemini-1.5-flash': 'Gemini 1.5 Flash',
      'gemini-1.5-pro': 'Gemini 1.5 Pro'
    };
    currentModelLabel.textContent = modelNames[savedModel] || savedModel;
  }

  // Check backend config
  try {
    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const config = await configRes.json();
      if (!savedApiKey && !config.hasEnvKey) {
        // Prompt user gently with settings modal if no key is configured anywhere
        setTimeout(() => {
          openSettings();
          showStatusAlert('Welcome to Aura! Please enter your Gemini API Key to get started.', 'error');
        }, 600);
      }
    }
  } catch (e) {
    console.warn('Could not verify server config:', e);
  }

  // Toggle Left Sidebar
  if (toggleSidebarBtn && sidebarLeft) {
    toggleSidebarBtn.addEventListener('click', () => {
      sidebarLeft.classList.toggle('collapsed');
    });
  }

  // Toggle Right To-Do Panel
  if (toggleTodoBtn && sidebarRight) {
    toggleTodoBtn.addEventListener('click', () => {
      sidebarRight.classList.toggle('collapsed');
    });
  }

  // New Chat
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      if (window.chatManager) {
        window.chatManager.clearChat();
      }
    });
  }

  // Quick Action Chips in Sidebar
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt && window.chatManager) {
        window.chatManager.sendPresetPrompt(prompt);
      }
    });
  });

  // Hero Cards in Welcome Screen
  document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      if (action === 'code') {
        window.chatManager.sendPresetPrompt('Here is my code snippet. Please analyze it, explain how it works step-by-step, and point out potential bugs:\n\n```javascript\n// Paste your code here\n```');
      } else if (action === 'todo') {
        window.chatManager.sendPresetPrompt('Help me create a detailed, prioritized project roadmap and actionable checklist for building a new feature.');
      } else if (action === 'token') {
        if (window.tokenTracker) window.tokenTracker.openModal();
      } else if (action === 'upload') {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.click();
      }
    });
  });

  // Settings Modal Handlers
  function openSettings() {
    if (settingsModal) {
      settingsModal.style.display = 'flex';
      apiKeyInput.focus();
    }
  }

  function closeSettings() {
    if (settingsModal) {
      settingsModal.style.display = 'none';
      if (apiKeyStatusAlert) apiKeyStatusAlert.style.display = 'none';
    }
  }

  if (openSettingsBtn) openSettingsBtn.addEventListener('click', openSettings);
  if (closeSettingsModalBtn) closeSettingsModalBtn.addEventListener('click', closeSettings);
  if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', closeSettings);

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettings();
    });
  }

  // Toggle API Key Visibility
  if (toggleApiKeyVisibility && apiKeyInput) {
    toggleApiKeyVisibility.addEventListener('click', () => {
      if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        toggleApiKeyVisibility.textContent = '🔒';
      } else {
        apiKeyInput.type = 'password';
        toggleApiKeyVisibility.textContent = '👁️';
      }
    });
  }

  // Save Settings
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      const model = modelSelect.value;
      const instruction = systemInstructionInput.value.trim();

      localStorage.setItem('aura_api_key', key);
      localStorage.setItem('aura_model', model);
      localStorage.setItem('aura_system_instruction', instruction);

      if (currentModelLabel) {
        currentModelLabel.textContent = modelSelect.options[modelSelect.selectedIndex].text.split('(')[0].trim();
      }

      // Also persist to .env on server if key provided
      if (key) {
        try {
          await fetch('/api/config/save-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
          });
        } catch (err) {
          console.warn('Could not persist key to server .env:', err);
        }
      }

      showStatusAlert('Settings saved successfully! You are ready to chat.', 'success');
      setTimeout(() => closeSettings(), 800);
    });
  }

  function showStatusAlert(msg, type = 'success') {
    if (!apiKeyStatusAlert) return;
    apiKeyStatusAlert.className = `status-alert ${type}`;
    apiKeyStatusAlert.textContent = msg;
    apiKeyStatusAlert.style.display = 'block';
  }

  // Global ESC shortcut to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSettings();
      if (window.tokenTracker) window.tokenTracker.closeModal();
    }
  });
});
