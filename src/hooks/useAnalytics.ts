import { useCallback } from 'react';
import {
  identify,
  reset,
  track,
} from '../services/analytics.service';

export function useAnalytics() {
  return {
    track: useCallback(track, []),
    identify: useCallback(identify, []),
    reset: useCallback(reset, []),
  };
}
