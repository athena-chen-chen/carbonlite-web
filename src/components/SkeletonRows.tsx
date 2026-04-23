import React from 'react';

export default function SkeletonRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="td">
              <div className="skeleton h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
