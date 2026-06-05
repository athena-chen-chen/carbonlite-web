import { useState } from 'react';
import type { CSSProperties } from 'react';

export function SentryTestErrorButton() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (!import.meta.env.DEV) return null;
  if (shouldCrash) {
    throw new Error('CarbonLite frontend Sentry test error');
  }

  return (
    <button type="button" onClick={() => setShouldCrash(true)} style={buttonStyle}>
      Test frontend error
    </button>
  );
}

const buttonStyle: CSSProperties = {
  position: 'fixed',
  left: 24,
  bottom: 24,
  zIndex: 40,
  border: '1px solid #cbd5e1',
  borderRadius: 999,
  background: '#fff',
  color: '#334155',
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 800,
  boxShadow: '0 12px 26px rgba(15, 23, 42, 0.12)',
  cursor: 'pointer',
};
