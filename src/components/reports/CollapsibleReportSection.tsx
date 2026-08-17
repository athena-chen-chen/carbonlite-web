import type { CSSProperties, ReactNode } from 'react';

type CollapsibleReportSectionProps = {
  id: string;
  title: string;
  summary?: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CollapsibleReportSection({
  id,
  title,
  summary,
  expanded,
  onToggle,
  children,
}: CollapsibleReportSectionProps) {
  const contentId = `${id}-content`;

  return (
    <section style={sectionStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>{title}</h2>
          {summary ? <div style={summaryStyle}>{summary}</div> : null}
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
          onClick={onToggle}
          style={toggleButtonStyle}
        >
          <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
          <span>{expanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>

      {expanded ? (
        <div id={contentId} style={contentStyle}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

const sectionStyle: CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: '#fff',
  border: '1px solid #eee',
  marginBottom: 20,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const summaryStyle: CSSProperties = {
  marginTop: 4,
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.4,
};

const toggleButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 10px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#334155',
  fontWeight: 800,
  cursor: 'pointer',
};

const contentStyle: CSSProperties = {
  marginTop: 14,
};
