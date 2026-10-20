/**
 * AURA AI - Token & Quota Tracker Module
 * Handles live token counts, rolling 1-minute window reset countdowns,
 * daily quota resets (00:00 UTC), and the detailed Token Dashboard modal.
 */

class TokenTracker {
  constructor() {
    this.stats = {
      daily: { requests: 0, requestsLimit: 1500, totalTokens: 0, promptTokens: 0, candidatesTokens: 0 },
      rollingMinute: { rpmUsed: 0, rpmLimit: 15, tpmUsed: 0, tpmLimit: 1000000, windowResetSeconds: 60 },
      session: { requests: 0, totalTokens: 0 },
      dailyReset: { hours: 0, minutes: 0, seconds: 0, formatted: '--' },
      history: []
    };

    this.timerInterval = null;
    this.localWindowSeconds = 60;

    this.initElements();
    this.bindEvents();
    this.fetchStats();
    this.startLiveTimers();
  }

  initElements() {
    // Header HUD elements
    this.hudTokenCount = document.getElementById('hudTokenCount');
    this.hudRpmCount = document.getElementById('hudRpmCount');
    this.hudWindowSeconds = document.getElementById('hudWindowSeconds');
    this.hudDailyTime = document.getElementById('hudDailyTime');
    this.tokenHud = document.getElementById('tokenHud');

    // Sidebar mini widget
    this.miniDailyReq = document.getElementById('miniDailyReq');
    this.miniDailyReqProgress = document.getElementById('miniDailyReqProgress');
    this.miniRpm = document.getElementById('miniRpm');
    this.miniRpmProgress = document.getElementById('miniRpmProgress');
    this.viewTokenDetailsBtn = document.getElementById('viewTokenDetailsBtn');

    // Modal elements
    this.tokenModal = document.getElementById('tokenModal');
    this.openTokenModalBtn = document.getElementById('openTokenModalBtn');
    this.closeTokenModalBtn = document.getElementById('closeTokenModalBtn');
    this.modalCloseFooterBtn = document.getElementById('modalCloseFooterBtn');

    this.modalWindowSeconds = document.getElementById('modalWindowSeconds');
    this.modalWindowSecondsBadge = document.getElementById('modalWindowSecondsBadge');
    this.modalWindowBar = document.getElementById('modalWindowBar');

    this.modalDailyResetTime = document.getElementById('modalDailyResetTime');
    this.modalDailyResetBar = document.getElementById('modalDailyResetBar');

    this.modalDailyTokens = document.getElementById('modalDailyTokens');
    this.modalPromptTokens = document.getElementById('modalPromptTokens');
    this.modalCandidatesTokens = document.getElementById('modalCandidatesTokens');
    this.modalDailyRequestsMeta = document.getElementById('modalDailyRequestsMeta');

    this.modalSessionTokens = document.getElementById('modalSessionTokens');
    this.modalSessionRequestsMeta = document.getElementById('modalSessionRequestsMeta');
    this.resetSessionTokensBtn = document.getElementById('resetSessionTokensBtn');

    this.tokenHistoryTableBody = document.getElementById('tokenHistoryTableBody');
  }

  bindEvents() {
    // Open modal
    if (this.tokenHud) {
      this.tokenHud.addEventListener('click', () => this.openModal());
    }
    if (this.openTokenModalBtn) {
      this.openTokenModalBtn.addEventListener('click', () => this.openModal());
    }
    if (this.viewTokenDetailsBtn) {
      this.viewTokenDetailsBtn.addEventListener('click', () => this.openModal());
    }

    // Close modal
    if (this.closeTokenModalBtn) {
      this.closeTokenModalBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.modalCloseFooterBtn) {
      this.modalCloseFooterBtn.addEventListener('click', () => this.closeModal());
    }
    if (this.tokenModal) {
      this.tokenModal.addEventListener('click', (e) => {
        if (e.target === this.tokenModal) this.closeModal();
      });
    }

    // Reset session
    if (this.resetSessionTokensBtn) {
      this.resetSessionTokensBtn.addEventListener('click', async () => {
        try {
          const res = await fetch('/api/tokens/reset-session', { method: 'POST' });
          const data = await res.json();
          if (data.stats) {
            this.updateStats(data.stats);
          }
        } catch (err) {
          console.error('Failed to reset session tokens:', err);
        }
      });
    }
  }

  async fetchStats() {
    try {
      const res = await fetch('/api/tokens');
      if (res.ok) {
        const data = await res.json();
        this.updateStats(data);
      }
    } catch (err) {
      console.warn('Could not fetch token stats:', err);
    }
  }

  updateStats(newStats) {
    if (!newStats) return;
    this.stats = newStats;
    this.localWindowSeconds = newStats.rollingMinute?.windowResetSeconds || 60;
    this.renderHUD();
    this.renderModal();
  }

  startLiveTimers() {
    // Every second, count down both the 1-minute window timer and daily reset clock
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      // 1. Rolling 1-minute window countdown
      if (this.stats.rollingMinute?.rpmUsed > 0) {
        if (this.localWindowSeconds > 1) {
          this.localWindowSeconds -= 1;
        } else {
          // Window refreshed, re-sync from backend
          this.localWindowSeconds = 60;
          this.fetchStats();
        }
      } else {
        this.localWindowSeconds = 60;
      }

      // 2. Daily reset countdown (00:00 UTC)
      const now = new Date();
      const nextUtcMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      ));
      const diffMs = Math.max(0, nextUtcMidnight.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      this.dailyTimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
      this.dailyClockFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Update text in DOM
      if (this.hudWindowSeconds) {
        this.hudWindowSeconds.textContent = `${this.localWindowSeconds}s`;
      }
      if (this.modalWindowSeconds) {
        this.modalWindowSeconds.innerHTML = `${this.localWindowSeconds}<span class="val-unit">s</span>`;
      }
      if (this.modalWindowSecondsBadge) {
        this.modalWindowSecondsBadge.textContent = `${this.localWindowSeconds}s remaining`;
      }
      if (this.modalWindowBar) {
        const pct = Math.max(0, Math.min(100, (this.localWindowSeconds / 60) * 100));
        this.modalWindowBar.style.width = `${pct}%`;
      }

      if (this.hudDailyTime) {
        this.hudDailyTime.textContent = `${hours}h ${minutes}m`;
      }
      if (this.modalDailyResetTime) {
        this.modalDailyResetTime.textContent = this.dailyClockFormatted;
      }
      if (this.modalDailyResetBar) {
        // Daily percentage elapsed (24h)
        const totalDayMs = 24 * 60 * 60 * 1000;
        const remainingPct = (diffMs / totalDayMs) * 100;
        this.modalDailyResetBar.style.width = `${remainingPct.toFixed(1)}%`;
      }

    }, 1000);
  }

  renderHUD() {
    // Total tokens count (Daily + Session)
    const totalDailyTokens = this.stats.daily?.totalTokens || 0;
    if (this.hudTokenCount) {
      this.hudTokenCount.textContent = totalDailyTokens.toLocaleString();
    }

    // RPM
    const rpm = this.stats.rollingMinute?.rpmUsed || 0;
    const rpmLimit = this.stats.rollingMinute?.rpmLimit || 15;
    if (this.hudRpmCount) {
      this.hudRpmCount.textContent = `${rpm}/${rpmLimit}`;
    }

    // Mini sidebar widget
    const dailyReq = this.stats.daily?.requests || 0;
    const dailyReqLimit = this.stats.daily?.requestsLimit || 1500;
    if (this.miniDailyReq) {
      this.miniDailyReq.textContent = `${dailyReq} / ${dailyReqLimit}`;
    }
    if (this.miniDailyReqProgress) {
      const pct = Math.min(100, (dailyReq / dailyReqLimit) * 100);
      this.miniDailyReqProgress.style.width = `${pct}%`;
    }

    if (this.miniRpm) {
      this.miniRpm.textContent = `${rpm} / ${rpmLimit}`;
    }
    if (this.miniRpmProgress) {
      const pct = Math.min(100, (rpm / rpmLimit) * 100);
      this.miniRpmProgress.style.width = `${pct}%`;
    }
  }

  renderModal() {
    if (!this.tokenModal || this.tokenModal.style.display === 'none') return;

    // Daily Tokens
    if (this.modalDailyTokens) {
      this.modalDailyTokens.textContent = (this.stats.daily?.totalTokens || 0).toLocaleString();
    }
    if (this.modalPromptTokens) {
      this.modalPromptTokens.textContent = (this.stats.daily?.promptTokens || 0).toLocaleString();
    }
    if (this.modalCandidatesTokens) {
      this.modalCandidatesTokens.textContent = (this.stats.daily?.candidatesTokens || 0).toLocaleString();
    }
    if (this.modalDailyRequestsMeta) {
      const reqs = this.stats.daily?.requests || 0;
      const limit = this.stats.daily?.requestsLimit || 1500;
      this.modalDailyRequestsMeta.textContent = `${reqs} / ${limit} requests used today`;
    }

    // Session Tokens
    if (this.modalSessionTokens) {
      this.modalSessionTokens.textContent = (this.stats.session?.totalTokens || 0).toLocaleString();
    }
    if (this.modalSessionRequestsMeta) {
      this.modalSessionRequestsMeta.textContent = `${this.stats.session?.requests || 0} requests this session`;
    }

    // History Table
    if (this.tokenHistoryTableBody) {
      const history = this.stats.history || [];
      if (history.length === 0) {
        this.tokenHistoryTableBody.innerHTML = `<tr><td colspan="6" class="text-muted text-center" style="padding: 16px;">No requests recorded yet</td></tr>`;
      } else {
        const rows = [...history].reverse().map(item => {
          const time = new Date(item.timestamp).toLocaleTimeString();
          return `
            <tr>
              <td>${time}</td>
              <td><span class="code-lang">${item.model || 'gemini'}</span></td>
              <td>${(item.promptTokens || 0).toLocaleString()}</td>
              <td>${(item.candidatesTokens || 0).toLocaleString()}</td>
              <td><strong>${(item.totalTokens || 0).toLocaleString()}</strong></td>
              <td>${item.durationMs ? (item.durationMs / 1000).toFixed(2) + 's' : '-'}</td>
            </tr>
          `;
        }).join('');
        this.tokenHistoryTableBody.innerHTML = rows;
      }
    }
  }

  openModal() {
    this.renderModal();
    if (this.tokenModal) {
      this.tokenModal.style.display = 'flex';
    }
  }

  closeModal() {
    if (this.tokenModal) {
      this.tokenModal.style.display = 'none';
    }
  }
}

// Global instance
window.tokenTracker = new TokenTracker();
