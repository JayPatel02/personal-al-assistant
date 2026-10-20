import React, { useRef, useEffect } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { MessageItem } from './MessageItem';
import { EmptyState } from './EmptyState';
import { ChatInput } from './ChatInput';

export function ChatArea() {
  const { messages, sendMessage, isGenerating } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  return (
    <main className="chat-container">
      <div className="messages-scroll">
        {messages.length === 0 ? (
          <EmptyState onSelectPrompt={(prompt) => sendMessage(prompt)} />
        ) : (
          messages.map((m) => (
            <MessageItem key={m.id} message={m} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {isGenerating && (
        <div className="chat-analyzing-bar">
          <Loader2 size={13} className="spin" style={{ color: 'var(--accent-emerald)' }} />
          <span>Aura is analyzing and generating response...</span>
        </div>
      )}

      <ChatInput />
    </main>
  );
}
