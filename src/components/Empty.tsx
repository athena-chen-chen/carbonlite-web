import React from 'react';

export default function Empty({ title = 'No data', hint }: { title?: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="text-xl">🗂️</div>
      <div className="font-medium">{title}</div>
      {hint && <div className="text-sm">{hint}</div>}
    </div>
  );
}
