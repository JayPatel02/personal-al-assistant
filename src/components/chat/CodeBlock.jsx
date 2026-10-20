import React, { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import { Copy, Check } from 'lucide-react';

export function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-wrapper">
      <div className="code-header">
        <span>{language || 'code'}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={12} style={{ color: 'var(--accent-emerald)' }} />
              <span style={{ color: 'var(--accent-emerald)' }}>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre>
        <code ref={codeRef} className={`language-${language || 'plaintext'}`}>
          {code}
        </code>
      </pre>
    </div>
  );
}
