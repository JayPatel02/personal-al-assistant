import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

export function SettingsModal() {
  const { 
    isSettingsOpen, 
    setIsSettingsOpen, 
    apiKey, 
    setApiKey, 
    model, 
    setModel, 
    systemInstruction, 
    setSystemInstruction 
  } = useApp();

  const [inputKey, setInputKey] = useState(apiKey);
  const [selectedModel, setSelectedModel] = useState(model);
  const [customInstruction, setCustomInstruction] = useState(systemInstruction);
  const [showKey, setShowKey] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    setInputKey(apiKey);
    setSelectedModel(model);
    setCustomInstruction(systemInstruction);
  }, [apiKey, model, systemInstruction, isSettingsOpen]);

  const handleSave = async () => {
    setApiKey(inputKey.trim());
    setModel(selectedModel);
    setSystemInstruction(customInstruction.trim());

    if (inputKey.trim()) {
      try {
        await api.saveApiKey(inputKey.trim());
      } catch (err) {
        console.warn('Could not persist key to server .env:', err);
      }
    }

    setStatusMsg('Settings saved successfully');
    setTimeout(() => {
      setStatusMsg('');
      setIsSettingsOpen(false);
    }, 800);
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
      title="Settings"
      footer={
        <>
          <button 
            className="btn-minimal" 
            onClick={() => setIsSettingsOpen(false)}
          >
            Cancel
          </button>
          <button 
            className="btn-minimal btn-primary" 
            onClick={handleSave}
          >
            Save Settings
          </button>
        </>
      }
    >
      {/* API Key */}
      <div className="form-field">
        <label className="form-label">Gemini API Key</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type={showKey ? 'text' : 'password'}
            className="form-input"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="AIzaSy..."
          />
          <button 
            type="button" 
            className="btn-icon" 
            onClick={() => setShowKey(prev => !prev)}
            title={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <span className="form-hint">
          Get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>. Saved locally on your machine.
        </span>
      </div>

      {/* Model Selection */}
      <div className="form-field">
        <label className="form-label">AI Model</label>
        <select 
          className="form-select"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          <option value="gemini-3.8-flash">Gemini 3.8 Flash (Recommended — Latest & Fastest)</option>
          <option value="gemini-3.8-pro">Gemini 3.8 Pro (Complex Reasoning & Long Context)</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
        </select>
      </div>

      {/* System Prompt */}
      <div className="form-field">
        <label className="form-label">System Instructions & Persona</label>
        <textarea 
          className="form-textarea"
          rows={3}
          value={customInstruction}
          onChange={(e) => setCustomInstruction(e.target.value)}
          placeholder="Customize Aura's behavior (e.g. Always provide runnable code, concise answers)..."
        />
      </div>

      {statusMsg && (
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--accent-emerald)',
          background: 'rgba(16, 185, 129, 0.1)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(16, 185, 129, 0.25)'
        }}>
          {statusMsg}
        </div>
      )}
    </Modal>
  );
}
