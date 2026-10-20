import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';
import { TodoProvider } from './context/TodoContext';
import { ChatProvider } from './context/ChatContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <TodoProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </TodoProvider>
    </AppProvider>
  </React.StrictMode>
);
