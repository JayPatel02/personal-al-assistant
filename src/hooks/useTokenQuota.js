import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export function useTokenQuota() {
  const { tokenStats, refreshTokenStats } = useApp();
  const [windowSeconds, setWindowSeconds] = useState(60);
  const [dailyClock, setDailyClock] = useState({ hours: 0, minutes: 0, seconds: 0, formatted: '--' });

  // Sync window seconds when backend stats change
  useEffect(() => {
    if (tokenStats?.rollingMinute?.windowResetSeconds) {
      setWindowSeconds(tokenStats.rollingMinute.windowResetSeconds);
    }
  }, [tokenStats]);

  // Live timer tick every 1000ms
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Minute window countdown
      setWindowSeconds(prev => {
        if (tokenStats?.rollingMinute?.rpmUsed > 0) {
          if (prev > 1) return prev - 1;
          refreshTokenStats();
          return 60;
        }
        return 60;
      });

      // 2. Daily midnight UTC countdown
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

      setDailyClock({
        hours,
        minutes,
        seconds,
        formatted: `${hours}h ${minutes}m ${seconds}s`,
        clock: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tokenStats, refreshTokenStats]);

  return {
    tokenStats,
    windowSeconds,
    dailyClock,
    refreshTokenStats
  };
}
