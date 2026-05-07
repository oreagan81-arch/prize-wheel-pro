import { useBoardSpinner } from '@/hooks/useBoardSpinner';

/**
 * Invisible 128x128 hit-area in the bottom-right corner.
 * Teacher taps it to stop the board spin manually.
 */
export const SecretStopButton = () => {
  const { stopNow } = useBoardSpinner();

  return (
    <button
      type="button"
      aria-label="Secret stop"
      onClick={stopNow}
      className="fixed bottom-0 right-0 w-32 h-32 opacity-0 z-[100] cursor-default"
    />
  );
};
