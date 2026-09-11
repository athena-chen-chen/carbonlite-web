import { useEffect, useState } from 'react';

export function useSlowLoading(isLoading: boolean, delayMs = 3000) {
  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsSlowLoading(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsSlowLoading(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, isLoading]);

  return isSlowLoading;
}
