import { useEffect, useRef } from 'react';
import { useBoardStore } from '@/store/boardStore';

const FLASH_INTERVAL_MS = 50;
const AUTO_STOP_MS = 12000;

/**
 * Watches boardSpinMode. While 'spinning', rapidly flashes random tile highlights.
 * Auto-stops after 12s. Exposes a manual stop function via the returned ref.
 */
export const useBoardSpinner = () => {
  const boardSpinMode = useBoardStore((s) => s.boardSpinMode);
  const setHighlightedTileId = useBoardStore((s) => s.setHighlightedTileId);
  const stopBoardSpin = useBoardStore((s) => s.stopBoardSpin);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentHighlightRef = useRef<number>(1);

  const clearAll = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (boardSpinMode !== 'spinning') {
      clearAll();
      return;
    }

    intervalRef.current = setInterval(() => {
      const next = Math.floor(Math.random() * 100) + 1;
      currentHighlightRef.current = next;
      setHighlightedTileId(next);
    }, FLASH_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      clearAll();
      stopBoardSpin(currentHighlightRef.current);
    }, AUTO_STOP_MS);

    return clearAll;
  }, [boardSpinMode, setHighlightedTileId, stopBoardSpin]);

  const stopNow = () => {
    clearAll();
    stopBoardSpin(currentHighlightRef.current);
  };

  return { stopNow, currentHighlightRef };
};
