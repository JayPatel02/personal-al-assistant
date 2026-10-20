import React from 'react';
import { Code, Bug, CheckSquare, Image } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export function EmptyState({ onSelectPrompt }) {
  const cards = [
    {
      icon: <Code size={18} />,
      title: 'Analyze Code',
      desc: 'Step-by-step logic breakdown, syntax explanations, and architectural reviews.',
      prompt: 'Please analyze this code: explain how it works step-by-step, catch potential edge cases, and suggest improvements:\n\n```javascript\n// Paste your code snippet here\n```'
    },
    {
      icon: <Bug size={18} />,
      title: 'Find Bugs & Fix',
      desc: 'Detect subtle logic flaws, performance bottlenecks, and security vulnerabilities.',
      prompt: 'Review this code for bugs, logic errors, and memory leaks. Provide corrected snippets:\n\n```python\n# Paste code here\n```'
    },
    {
      icon: <CheckSquare size={18} />,
      title: 'Extract To-Do List',
      desc: 'Turn any technical discussion, design doc, or bug list into prioritized tasks.',
      prompt: 'Based on this requirement, create a structured, prioritized step-by-step To-Do checklist with deadlines.'
    },
    {
      icon: <Image size={18} />,
      title: 'Multimodal Vision',
      desc: 'Attach screenshots, UI mockups, or source files for direct visual inspection.',
      prompt: 'Here is an attached screenshot/document. Please explain what is happening and highlight key findings.'
    }
  ];

  return (
    <div className="empty-state">
      <div className="empty-state-badge">Personal Assistant & Code Intelligence</div>
      <h1>How can I assist you today?</h1>
      <p>
        Paste code snippets, ask text explanations, upload screenshots, or generate structured to-do tasks.
      </p>

      <div className="empty-cards-grid">
        {cards.map((c, i) => (
          <div 
            key={i} 
            className="empty-card" 
            onClick={() => onSelectPrompt(c.prompt)}
          >
            <h4>
              {c.icon}
              <span>{c.title}</span>
            </h4>
            <p>{c.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
