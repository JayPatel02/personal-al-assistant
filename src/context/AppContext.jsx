import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [apiKey, setApiKeyState] = useState(() => localStorage.getItem('aura_api_key') || '');
  const [model, setModelState] = useState(() => {
    const saved = localStorage.getItem('aura_model');
    if (!saved || saved.includes('2.0') || saved.includes('1.5')) {
      localStorage.setItem('aura_model', 'gemini-3.8-flash');
      return 'gemini-3.8-flash';
    }
    return saved;
  });
  const [systemInstruction, setSystemInstructionState] = useState(
    () => localStorage.getItem('aura_system_instruction') || ''
  );

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTodoOpen, setIsTodoOpen] = useState(true);

  const [tokenStats, setTokenStats] = useState({
    daily: { requests: 0, requestsLimit: 1500, totalTokens: 0, promptTokens: 0, candidatesTokens: 0 },
    rollingMinute: { rpmUsed: 0, rpmLimit: 15, tpmUsed: 0, tpmLimit: 1000000, windowResetSeconds: 60 },
    session: { requests: 0, totalTokens: 0 },
    dailyReset: { hours: 0, minutes: 0, seconds: 0, formatted: '--' },
    history: []
  });

  const setApiKey = (key) => {
    setApiKeyState(key);
    localStorage.setItem('aura_api_key', key);
  };

  const setModel = (m) => {
    setModelState(m);
    localStorage.setItem('aura_model', m);
  };

  const setSystemInstruction = (inst) => {
    setSystemInstructionState(inst);
    localStorage.setItem('aura_system_instruction', inst);
  };

  const refreshTokenStats = useCallback(async () => {
    try {
      const data = await api.getTokens();
      if (data) setTokenStats(data);
    } catch (err) {
      console.warn('Could not refresh token stats:', err);
    }
  }, []);

  useEffect(() => {
    // Initial load
    refreshTokenStats();
    api.getConfig().then(cfg => {
      if (!apiKey && !cfg.hasEnvKey) {
        setIsSettingsOpen(true);
      }
    }).catch(console.warn);
  }, [apiKey, refreshTokenStats]);

  return (
    <AppContext.Provider
      value={{
        apiKey,
        setApiKey,
        model,
        setModel,
        systemInstruction,
        setSystemInstruction,
        isSettingsOpen,
        setIsSettingsOpen,
        isTokenModalOpen,
        setIsTokenModalOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        isTodoOpen,
        setIsTodoOpen,
        tokenStats,
        setTokenStats,
        refreshTokenStats
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
