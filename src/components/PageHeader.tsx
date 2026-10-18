import type { Ref } from 'react';
import { USER_WORKFLOW } from '../constants/userWorkflow';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  badge?: string;
};

export function PageHeader({ title, subtitle, headingRef, badge }: PageHeaderProps) {
  const stepIndex = USER_WORKFLOW.findIndex((step) => step.title === title);
  const step = USER_WORKFLOW[stepIndex];

  return (
    <div style={{ marginBottom: 24 }}>
      <h1 ref={headingRef} tabIndex={headingRef ? -1 : undefined} style={{ margin: '0 0 8px', color: '#0f172a', fontSize: 32, lineHeight: 1.2 }}>
        {title}
      </h1>
      <p style={{ margin: 0, maxWidth: 760, color: '#475569', fontSize: 16, lineHeight: 1.5 }}>
        {subtitle ?? step?.subtitle}
      </p>
      {step ? (
        <p aria-current="step" style={{ margin: '8px 0 0', color: '#475569', fontSize: 13 }}>
          Step {stepIndex + 1} of {USER_WORKFLOW.length} · {step.action}
        </p>
      ) : null}
      {badge ? <span style={{ display: 'inline-block', marginTop: 8, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569', fontSize: 12 }}>{badge}</span> : null}
    </div>
  );
}
