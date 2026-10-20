import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTokenQuota } from '../../hooks/useTokenQuota';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

export function TokenModal() {
  const { isTokenModalOpen, setIsTokenModalOpen, setTokenStats } = useApp();
  const { tokenStats, windowSeconds, dailyClock } = useTokenQuota();

  const handleResetSession = async () => {
    try {
      const data = await api.resetSessionTokens();
      if (data?.stats) {
        setTokenStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to reset session:', err);
    }
  };

  const daily = tokenStats?.daily || {};
  const rolling = tokenStats?.rollingMinute || {};
  const session = tokenStats?.session || {};
  const history = tokenStats?.history || [];

  return (
    <Modal
      isOpen={isTokenModalOpen}
      onClose={() => setIsTokenModalOpen(false)}
      title="Token & Quota Dashboard"
      isLarge
      footer={
        <button 
          className="btn-minimal" 
          onClick={() => setIsTokenModalOpen(false)}
        >
          Close
        </button>
      }
    >
      {/* 4 Minimalist Metric Cards */}
      <div className="metrics-grid">
        {/* Card 1: 1-Minute Rate Reset */}
        <div className="metric-card">
          <div className="metric-card-label">Rolling 60s Window</div>
          <div className="metric-card-value">{windowSeconds}s</div>
          <div className="metric-card-desc">
            RPM: {rolling.rpmUsed || 0}/{rolling.rpmLimit || 15} requests in current minute
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-subtle)', borderRadius: '999px', marginTop: '6px' }}>
            <div 
              style={{ 
                width: `${Math.max(0, Math.min(100, (windowSeconds / 60) * 100))}%`, 
                height: '100%', 
                background: 'var(--accent-emerald)',
                transition: 'width 1s linear'
              }} 
            />
          </div>
        </div>

        {/* Card 2: Daily Midnight Reset */}
        <div className="metric-card">
          <div className="metric-card-label">Daily Quota Renewal (00:00 UTC)</div>
          <div className="metric-card-value">{dailyClock.clock || '--:--:--'}</div>
          <div className="metric-card-desc">
            Time until daily 1,500 requests reset
          </div>
          <div style={{ width: '100%', height: '4px', background: 'var(--bg-subtle)', borderRadius: '999px', marginTop: '6px' }}>
            <div 
              style={{ 
                width: '60%', 
                height: '100%', 
                background: 'var(--accent-blue)' 
              }} 
            />
          </div>
        </div>

        {/* Card 3: Today's Consumption */}
        <div className="metric-card">
          <div className="metric-card-label">Tokens Used Today</div>
          <div className="metric-card-value">{(daily.totalTokens || 0).toLocaleString()}</div>
          <div className="metric-card-desc">
            Prompt: {(daily.promptTokens || 0).toLocaleString()} • Completion: {(daily.candidatesTokens || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {daily.requests || 0} of {daily.requestsLimit || 1500} requests used
          </div>
        </div>

        {/* Card 4: Session Tokens */}
        <div className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="metric-card-label">Current Session</div>
            <button 
              className="btn-icon" 
              onClick={handleResetSession}
              style={{ width: '24px', height: '24px' }}
              title="Reset session counter"
            >
              <RotateCcw size={12} />
            </button>
          </div>
          <div className="metric-card-value">{(session.totalTokens || 0).toLocaleString()}</div>
          <div className="metric-card-desc">
            {session.requests || 0} requests in this tab session
          </div>
        </div>
      </div>

      {/* Quota Rules Explanation */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '14px',
        fontSize: '0.78rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <strong style={{ color: 'var(--text-main)' }}>Gemini Free Tier Rate Limits</strong>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
          • <strong>15 RPM (Requests Per Minute)</strong>: Rolling 60-second window tracked above.<br />
          • <strong>1,000,000 TPM (Tokens Per Minute)</strong>: Ideal for processing large codebases & images.<br />
          • <strong>1,500 RPD (Requests Per Day)</strong>: Renews every day at 00:00 UTC (13:30 IST / 16:00 PST).
        </p>
      </div>

      {/* Recent Requests Table */}
      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Recent Request History</div>
        <div style={{
          overflowX: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                <th style={{ padding: '6px 10px' }}>Time</th>
                <th style={{ padding: '6px 10px' }}>Model</th>
                <th style={{ padding: '6px 10px' }}>Prompt</th>
                <th style={{ padding: '6px 10px' }}>Output</th>
                <th style={{ padding: '6px 10px' }}>Total</th>
                <th style={{ padding: '6px 10px' }}>Latency</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    No requests recorded yet
                  </td>
                </tr>
              ) : (
                [...history].reverse().slice(0, 10).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>
                      {item.model}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>
                      {(item.promptTokens || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)' }}>
                      {(item.candidatesTokens || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-main)' }}>
                      {(item.totalTokens || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '6px 10px', color: 'var(--text-dim)' }}>
                      {item.durationMs ? `${(item.durationMs / 1000).toFixed(2)}s` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
