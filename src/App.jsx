import React from 'react';
import { Header } from './components/common/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ChatArea } from './components/chat/ChatArea';
import { TodoPanel } from './components/todo/TodoPanel';
import { TokenModal } from './components/token/TokenModal';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <div className="main-body">
        <Sidebar />
        <ChatArea />
        <TodoPanel />
      </div>

      <TokenModal />
      <SettingsModal />
    </div>
  );
}
