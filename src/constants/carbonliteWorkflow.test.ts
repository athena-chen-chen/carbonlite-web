import { describe, expect, it } from 'vitest';
import {
  CARBONLITE_WORKFLOW,
  CARBONLITE_WORKFLOW_STAGE_COUNT,
  formatWorkflowStageLabel,
  getWorkflowStage,
} from './carbonliteWorkflow';
import { buildReportingReadinessAssessment } from '../utils/reportingReadiness';

describe('CarbonLite canonical workflow', () => {
  it('defines the canonical six-stage workflow in order', () => {
    expect(CARBONLITE_WORKFLOW_STAGE_COUNT).toBe(6);
    expect(CARBONLITE_WORKFLOW.map((stage) => stage.title)).toEqual([
      'Define Reporting Boundary',
      'Collect & Upload Source Data',
      'Review & Resolve Data Issues',
      'Validate Factors & Calculations',
      'Review Results',
      'Generate & Review Report',
    ]);
    expect(CARBONLITE_WORKFLOW.map((stage) => stage.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('defines responsibility metadata for every stage', () => {
    CARBONLITE_WORKFLOW.forEach((stage) => {
      expect(stage.primaryRole).toBeTruthy();
      expect(stage.dataContributor).toBeTruthy();
      expect(stage.carbonLite).toBeTruthy();
      expect(stage.reviewer).toBeTruthy();
      expect(stage.primaryPages.length).toBeGreaterThan(0);
    });
  });

  it('maps key product pages to the agreed stages', () => {
    expect(getWorkflowStage('SOURCE_DATA').step).toBe(2);
    expect(getWorkflowStage('DATA_ISSUES').step).toBe(3);
    expect(getWorkflowStage('FACTORS_CALCULATIONS').step).toBe(4);
    expect(getWorkflowStage('REPORT').step).toBe(6);
    expect(formatWorkflowStageLabel(getWorkflowStage('SOURCE_DATA'))).toBe(
      'Stage 2 of 6: Collect & Upload Source Data',
    );
  });

  it('aligns reporting readiness items to canonical workflow stages', () => {
    const assessment = buildReportingReadinessAssessment({ calculationDetails: [] });
    const stageByItem = new Map(
      assessment.items.map((item) => [item.code, item.workflowStageLabel]),
    );

    expect(stageByItem.get('BOUNDARY_DEFINED')).toBe('Stage 1: Define Reporting Boundary');
    expect(stageByItem.get('SOURCE_ISSUES_RESOLVED')).toBe('Stage 3: Review & Resolve Data Issues');
    expect(stageByItem.get('FACTORS_REVIEWED')).toBe('Stage 4: Validate Factors & Calculations');
    expect(stageByItem.get('CALCULATIONS_COMPLETE')).toBe('Stage 4: Validate Factors & Calculations');
    expect(stageByItem.get('TRACEABILITY_COMPLETE')).toBe('Stage 5: Review Results');
    expect(stageByItem.get('REVIEWER_APPROVAL')).toBe('Stage 6: Generate & Review Report');
  });
});
