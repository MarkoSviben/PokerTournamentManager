import { useState, useEffect, useRef } from 'react';

interface TimerState {
  levelTimeRemaining: number;
  totalElapsed: number;
  isRunning: boolean;
}

export function useTimer(
  levelStartedAt: string | null,
  elapsedSecondsBefore: number,
  currentLevelDurationMinutes: number,
  status: string,
  levelElapsedOnPause: number = 0
): TimerState {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === 'running') {
      intervalRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status]);

  const isRunning = status === 'running';
  const levelDurationSecs = currentLevelDurationMinutes * 60;

  let elapsedInCurrentLevel = 0;
  if (isRunning && levelStartedAt) {
    elapsedInCurrentLevel = Math.floor((now - new Date(levelStartedAt).getTime()) / 1000);
  } else if (status === 'paused') {
    elapsedInCurrentLevel = levelElapsedOnPause;
  }

  const totalElapsed = elapsedSecondsBefore + elapsedInCurrentLevel;
  const levelTimeRemaining = Math.max(0, levelDurationSecs - elapsedInCurrentLevel);

  return { levelTimeRemaining, totalElapsed, isRunning };
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
