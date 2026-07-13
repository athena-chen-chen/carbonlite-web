import type { CSSProperties } from 'react';

type MethodologyDisclaimerSectionProps = {
  methodology: string[];
};

export function MethodologyDisclaimerSection({
  methodology,
}: MethodologyDisclaimerSectionProps) {
  return (
    <div style={methodologyGridStyle}>
      {methodology.map((paragraph) => (
        <p key={paragraph} style={methodologyParagraphStyle}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

const methodologyGridStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
};

const methodologyParagraphStyle: CSSProperties = {
  margin: 0,
  lineHeight: 1.7,
  color: '#475569',
};
