import { useEffect, useState } from 'react';

/**
 * Counts down whole seconds from `seconds` while `active`, and calls `onExpire` once at zero.
 * Restarts whenever `startKey` changes (a new token means a new minute).
 */
export function useGlobalSessionCountdown(
  active: boolean,
  seconds: number,
  startKey: number,
  onExpire: () => void,
): number {
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    setSecondsLeft(seconds);
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [active, seconds, startKey, onExpire]);

  return secondsLeft;
}
