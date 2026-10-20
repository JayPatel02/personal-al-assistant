import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useApp } from './AppContext';
import { useTodos } from './TodoContext';

const ChatContext = createContext();

export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { model, systemInstruction, setTokenStats } = useApp();
  const { addBulkTasks } = useTodos();

  const addStagedFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    try {
      const data = await api.uploadFiles(fileList);
      if (data?.files) {
        setStagedFiles(prev => [...prev, ...data.files]);
      }
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeStagedFile = (index) => {
    setStagedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearStagedFiles = () => {
    setStagedFiles([]);
  };

  const clearChat = () => {
    setMessages([]);
    setStagedFiles([]);
  };

  const sendMessage = useCallback(async (text) => {
    const trimmed = (text || '').trim();
    const filesToSend = [...stagedFiles];

    if (!trimmed && filesToSend.length === 0) return;
    if (isGenerating) return;

    // 1. Add user message
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: trimmed,
      attachedFiles: filesToSend,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setStagedFiles([]);
    setIsGenerating(true);

    // 2. Prepare streaming assistant placeholder
    const assistantMsgId = 'msg-' + (Date.now() + 1);
    const initialAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, initialAssistantMsg]);

    // Format conversation history for Gemini API
    const history = messages.slice(-10).map(m => ({
      role: m.role,
      content: m.content,
      attachedFiles: m.attachedFiles
    }));

    await api.streamChat({
      message: trimmed,
      conversationHistory: history,
      files: filesToSend,
      model,
      systemInstruction,
      onChunk: (chunk) => {
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMsgId) {
            return { ...m, content: m.content + chunk };
          }
          return m;
        }));
      },
      onDone: (data) => {
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMsgId) {
            return {
              ...m,
              content: data.fullText || m.content,
              isStreaming: false,
              usage: data.usage,
              extractedTasks: data.extractedTasks,
              durationMs: data.durationMs
            };
          }
          return m;
        }));

        if (data.quotaStats) {
          setTokenStats(data.quotaStats);
        }

        setIsGenerating(false);
      },
      onError: (err) => {
        setMessages(prev => prev.map(m => {
          if (m.id === assistantMsgId) {
            return {
              ...m,
              content: m.content ? `${m.content}\n\n*Error: ${err.message}*` : `**Error:** ${err.message}. Please verify your Gemini API key in Settings.`,
              isStreaming: false,
              isError: true
            };
          }
          return m;
        }));
        setIsGenerating(false);
      }
    });
  }, [stagedFiles, isGenerating, messages, model, systemInstruction, setTokenStats]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        stagedFiles,
        isGenerating,
        isUploading,
        addStagedFiles,
        removeStagedFile,
        clearStagedFiles,
        sendMessage,
        clearChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
