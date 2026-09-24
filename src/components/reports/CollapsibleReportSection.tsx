import type { ReactNode } from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';

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
  return (
    <CollapsibleSection
      id={id}
      title={title}
      summary={summary}
      expanded={expanded}
      onToggle={onToggle}
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: 12,
        background: '#FFFFFF',
        boxShadow: 'none',
      }}
    >
      {children}
    </CollapsibleSection>
  );
}
