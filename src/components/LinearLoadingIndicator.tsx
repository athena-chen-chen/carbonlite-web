import type { CSSProperties } from 'react';

type LinearLoadingIndicatorProps = {
  label: string;
};

export function LinearLoadingIndicator({ label }: LinearLoadingIndicatorProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={trackStyle}
    >
      <style>{`
        @keyframes carbonlite-linear-loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(320%); }
        }
      `}</style>
      <span style={barStyle} />
    </div>
  );
}

const trackStyle: CSSProperties = {
  position: 'relative',
  height: 3,
  width: '100%',
  overflow: 'hidden',
  borderRadius: 999,
  background: '#dbeafe',
};

const barStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '32%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(37, 99, 235, 0), #2563eb, rgba(37, 99, 235, 0))',
  animation: 'carbonlite-linear-loading 1.15s ease-in-out infinite',
};
