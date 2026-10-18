import { render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';
import { USER_WORKFLOW } from '../constants/userWorkflow';
import { CARBONLITE_WORKFLOW, formatWorkflowStageLabel } from '../constants/carbonliteWorkflow';

describe('interactive workflow presentation', () => {
  it.each(USER_WORKFLOW.map((step, index) => ({ ...step, index })))('shows a concise accessible header for $title', ({ title, action, subtitle, index }) => {
    render(<PageHeader title={title} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(subtitle)).toBeInTheDocument();
    expect(screen.getByText(`Step ${index + 1} of 5 · ${action}`)).toHaveAttribute('aria-current', 'step');
    expect(subtitle.split(' ').length).toBeLessThanOrEqual(20);
  });

  it('keeps the six canonical audit/report stages independent of the five user actions', () => {
    expect(CARBONLITE_WORKFLOW.map(formatWorkflowStageLabel)).toEqual([
      'Stage 1 of 6: Define Reporting Boundary',
      'Stage 2 of 6: Collect & Upload Source Data',
      'Stage 3 of 6: Review & Resolve Data Issues',
      'Stage 4 of 6: Validate Factors & Calculations',
      'Stage 5 of 6: Review Results',
      'Stage 6 of 6: Generate & Review Report',
    ]);
    expect(USER_WORKFLOW).toHaveLength(5);
  });
});
