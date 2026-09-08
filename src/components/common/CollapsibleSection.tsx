import { useId, useState, type CSSProperties, type ReactNode } from 'react';

type CollapsibleSectionProps = {
  title: string;
  summary?: string;
  defaultExpanded?: boolean;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  id?: string;
  testId?: string;
  expanded?: boolean;
  onToggle?: () => void;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  titleId?: string;
  toggleAriaLabelTitle?: string;
};

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded = false,
  children,
  className,
  headerRight,
  id,
  testId,
  expanded,
  onToggle,
  style,
  contentStyle,
  titleId,
  toggleAriaLabelTitle,
}: CollapsibleSectionProps) {
  const generatedId = useId();
  const sectionId = id ?? `collapsible-section-${generatedId}`;
  const contentId = `${sectionId}-content`;
  const headingId = titleId ?? `${sectionId}-title`;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const ariaLabelTarget = toggleAriaLabelTitle ?? title;

  function handleToggle() {
    if (onToggle) {
      onToggle();
      return;
    }

    setInternalExpanded((current) => !current);
  }

  return (
    <section
      className={className}
      data-testid={testId}
      style={{ ...sectionStyle, ...style }}
      aria-labelledby={headingId}
    >
      <div style={headerStyle}>
        <div style={titleBlockStyle}>
          <h2 id={headingId} style={titleStyle}>
            {title}
          </h2>
          {summary ? <p style={summaryStyle}>{summary}</p> : null}
        </div>
        <div style={headerActionsStyle}>
          {headerRight}
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={contentId}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${ariaLabelTarget}`}
            onClick={handleToggle}
            style={toggleButtonStyle}
          >
            <span aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
            <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div id={contentId} style={{ ...contentBaseStyle, ...contentStyle }}>
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
  border: '1px solid #e2e8f0',
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

const titleBlockStyle: CSSProperties = {
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: '#0f172a',
};

const summaryStyle: CSSProperties = {
  margin: '4px 0 0',
  color: '#64748b',
  fontSize: 13,
  lineHeight: 1.4,
};

const headerActionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
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

const contentBaseStyle: CSSProperties = {
  marginTop: 14,
};
