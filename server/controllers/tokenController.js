import { CONFIG } from '../config.js';
import { StorageService } from '../services/storageService.js';

export const TokenController = {
  calculateStats() {
    const tokenStats = StorageService.getTokenStats();
    const now = Date.now();

    // Filter rolling 60-second window
    tokenStats.recentRequests = (tokenStats.recentRequests || []).filter(
      r => now - r.timestamp < 60000
    );

    const tpmUsed = tokenStats.recentRequests.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
    const rpmUsed = tokenStats.recentRequests.length;

    // Remaining seconds until oldest request in rolling window drops out
    let windowResetSeconds = 60;
    if (tokenStats.recentRequests.length > 0) {
      const oldestTimestamp = tokenStats.recentRequests[0].timestamp;
      const elapsed = Math.floor((now - oldestTimestamp) / 1000);
      windowResetSeconds = Math.max(1, 60 - elapsed);
    }

    // Daily reset countdown (Gemini daily quotas renew at 00:00 UTC)
    const nowUtc = new Date();
    const nextResetUtc = new Date(Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate() + 1,
      0, 0, 0
    ));
    const dailyResetMs = Math.max(0, nextResetUtc.getTime() - nowUtc.getTime());
    const dailyResetHours = Math.floor(dailyResetMs / (1000 * 60 * 60));
    const dailyResetMinutes = Math.floor((dailyResetMs % (1000 * 60 * 60)) / (1000 * 60));
    const dailyResetSeconds = Math.floor((dailyResetMs % (1000 * 60)) / 1000);

    return {
      date: tokenStats.date,
      daily: {
        requests: tokenStats.dailyRequests,
        requestsLimit: CONFIG.QUOTAS.RPD_LIMIT,
        requestsRemaining: Math.max(0, CONFIG.QUOTAS.RPD_LIMIT - tokenStats.dailyRequests),
        totalTokens: tokenStats.dailyTokens,
        promptTokens: tokenStats.dailyPromptTokens,
        candidatesTokens: tokenStats.dailyCandidatesTokens
      },
      rollingMinute: {
        rpmUsed,
        rpmLimit: CONFIG.QUOTAS.RPM_LIMIT,
        rpmRemaining: Math.max(0, CONFIG.QUOTAS.RPM_LIMIT - rpmUsed),
        tpmUsed,
        tpmLimit: CONFIG.QUOTAS.TPM_LIMIT,
        tpmRemaining: Math.max(0, CONFIG.QUOTAS.TPM_LIMIT - tpmUsed),
        windowResetSeconds
      },
      session: {
        requests: tokenStats.sessionRequests,
        totalTokens: tokenStats.sessionTokens
      },
      dailyReset: {
        hours: dailyResetHours,
        minutes: dailyResetMinutes,
        seconds: dailyResetSeconds,
        formatted: `${dailyResetHours}h ${dailyResetMinutes}m ${dailyResetSeconds}s`
      },
      history: (tokenStats.history || []).slice(-25)
    };
  },

  getTokens(req, res) {
    res.json(TokenController.calculateStats());
  },

  resetSession(req, res) {
    const stats = StorageService.getTokenStats();
    stats.sessionRequests = 0;
    stats.sessionTokens = 0;
    StorageService.saveTokenStats(stats);
    res.json({ success: true, stats: TokenController.calculateStats() });
  }
};
