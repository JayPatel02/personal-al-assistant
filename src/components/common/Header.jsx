import React from 'react';
import {
  Menu,
  CheckSquare,
  Settings,
  Cpu,
  Zap,
  Clock,
  Activity
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTodos } from '../../context/TodoContext';
import { useTokenQuota } from '../../hooks/useTokenQuota';

export function Header() {
  const {
    model,
    isSidebarOpen,
    setIsSidebarOpen,
    isTodoOpen,
    setIsTodoOpen,
    setIsSettingsOpen,
    setIsTokenModalOpen
  } = useApp();

  const { pendingCount } = useTodos();
  const { tokenStats, windowSeconds, dailyClock } = useTokenQuota();

  const totalDailyTokens = tokenStats?.daily?.totalTokens || 0;
  const rpm = tokenStats?.rollingMinute?.rpmUsed || 0;
  const rpmLimit = tokenStats?.rollingMinute?.rpmLimit || 15;

  return (
    <header className="header">
      {/* Left: Brand & Sidebar Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          className={`btn-icon ${isSidebarOpen ? 'active' : ''}`}
          onClick={() => setIsSidebarOpen(prev => !prev)}
          title="Toggle Navigation"
        >
          <Menu size={18} />
        </button>

        <div className="brand" onClick={() => setIsSettingsOpen(true)}>
          <span className="brand-title">Aura</span>
          <span className="brand-badge">{model.replace('gemini-', '')}</span>
        </div>
      </div>

      {/* Center: Minimalist Live Token & Quota HUD */}
      <div
        className="token-hud-pill"
        onClick={() => setIsTokenModalOpen(true)}
        title="View Token & Quota Dashboard"
      >
        <span className="pulse-dot"></span>

        <div className="hud-item">
          <Zap size={13} style={{ color: 'var(--accent-amber)' }} />
          <span>Tokens:</span>
          <strong>{totalDailyTokens.toLocaleString()}</strong>
        </div>

        <div className="hud-divider"></div>

        <div className="hud-item">
          <Activity size={13} />
          <span>RPM:</span>
          <strong>{rpm}/{rpmLimit}</strong>
        </div>

        <div className="hud-divider"></div>

        <div className="hud-item">
          <Clock size={13} style={{ color: 'var(--accent-emerald)' }} />
          <span>1-Min:</span>
          <strong style={{ color: 'var(--accent-emerald)' }}>{windowSeconds}s</strong>
        </div>

        <div className="hud-divider"></div>

        <div className="hud-item">
          <span>Daily:</span>
          <strong>{dailyClock.hours}h {dailyClock.minutes}m</strong>
        </div>
      </div>

      {/* Right Actions: Tasks toggle & Settings */}
      <div className="header-actions">
        <button
          className={`btn-minimal ${isTodoOpen ? 'active' : ''}`}
          onClick={() => setIsTodoOpen(prev => !prev)}
          title="Toggle Tasks Panel"
        >
          <CheckSquare size={15} />
          <span>Tasks</span>
          {pendingCount > 0 && (
            <span style={{
              background: 'var(--bg-subtle)',
              fontSize: '0.7rem',
              padding: '1px 5px',
              borderRadius: '999px',
              border: '1px solid var(--border)'
            }}>
              {pendingCount}
            </span>
          )}
        </button>

        <button
          className="btn-icon"
          onClick={() => setIsSettingsOpen(true)}
          title="Settings & API Key"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
