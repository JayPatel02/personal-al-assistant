# 🤖 Aura — Minimalist Personal Assistant & Code Intelligence

A **React.js** personal assistant bot built with a **minimalist, focused design system** and **modular professional code structure**. Powered by Google's Gemini models for deep code analysis, text explanations, task planning, live token & quota countdowns, and multimodal vision.

---

## 📐 Professional Architecture

```
d:/Personal Assistant Bot/
├── index.html                     # Vite entry HTML
├── vite.config.js                 # Vite configuration with React & API proxy
├── package.json                   # ESM dependencies & concurrent dev scripts
│
├── server/                        # Modular Node/Express Backend
│   ├── config.js                  # Global configuration, quotas & env paths
│   ├── index.js                   # Server entry point (Port 5000)
│   ├── routes/
│   │   └── index.js               # Clean Express router
│   ├── controllers/
│   │   ├── chatController.js      # SSE streaming & multimodal upload controller
│   │   ├── taskController.js      # Task CRUD & AI auto-extraction controller
│   │   └── tokenController.js     # Rolling 60s & daily UTC quota controller
│   └── services/
│       ├── geminiService.js       # Gemini API SDK integration & prompt engineering
│       └── storageService.js      # Thread-safe persistent JSON storage
│
├── src/                           # Modern React 19 Frontend
│   ├── main.jsx                   # React root mount with Context Providers
│   ├── App.jsx                    # Top-level shell & layout coordination
│   ├── context/
│   │   ├── AppContext.jsx         # Global state (settings, modals, token stats)
│   │   ├── ChatContext.jsx        # Messages state, streaming, & file attachments
│   │   └── TodoContext.jsx        # To-Do CRUD, filters, & AI task extraction
│   ├── hooks/
│   │   └── useTokenQuota.js       # Live 1-minute window & daily midnight UTC countdown hook
│   ├── services/
│   │   └── api.js                 # Typed fetch client with SSE reader & error boundaries
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx         # Minimalist header with live Token HUD pill
│   │   │   └── Modal.jsx          # Accessible dialog with ESC & backdrop clicks
│   │   ├── chat/
│   │   │   ├── ChatArea.jsx       # Chat container with auto-scroll
│   │   │   ├── ChatInput.jsx      # Auto-expanding input with drag-and-drop dock
│   │   │   ├── MessageItem.jsx    # User & assistant bubbles with token metrics
│   │   │   ├── CodeBlock.jsx      # Highlight.js code block with 1-click copy
│   │   │   └── EmptyState.jsx     # Minimalist starter suggestion cards
│   │   ├── todo/
│   │   │   ├── TodoPanel.jsx      # Collapsible task board sidebar
│   │   │   ├── TodoItem.jsx       # Task card with priority dot & check toggle
│   │   │   └── AddTodoForm.jsx    # Inline quick-add form
│   │   ├── token/
│   │   │   └── TokenModal.jsx     # Detailed quota metrics & request history modal
│   │   └── settings/
│   │       └── SettingsModal.jsx  # API key, model picker, & persona editor
│   └── styles/
│       └── index.css              # Minimalist dark design system & tokens
│
├── data/
│   ├── tasks.json                 # Persistent task store
│   └── token_stats.json           # Persistent token consumption records
└── uploads/                       # Multimodal staging storage
```

---

## 🎨 Minimalist Design Philosophy

- **Quiet & Focused**: Dark slate/zinc background (`#090a0f`), subtle borders (`rgba(255,255,255,0.08)`), and high typographic contrast.
- **Micro-Interactions**: Smooth checkboxes, subtle live pulse indicators, and clean code blocks with copy animations.
- **Unobtrusive HUD**: A live pill in the header displays tokens consumed, RPM rate, rolling 1-minute reset countdown, and daily UTC renewal time without distracting from your work.

---

## 🚀 Running the Application

### 1. Start Development Server
```bash
npm run dev
```
This runs both the Express API and Vite React server concurrently with HMR.

### 2. Configure Your API Key
1. Open the app in your browser (`http://localhost:3000` or `http://localhost:3001`).
2. Click the **Settings (⚙️)** icon in the top right.
3. Paste your free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). It is saved locally.

### 3. Production Build
```bash
npm run build
npm start
```
