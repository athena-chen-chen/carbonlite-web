import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftReviewHeader, type DraftReviewHeaderProps } from './DraftReviewHeader';
import { BulkProvinceHelper, type BulkProvinceHelperProps } from './BulkProvinceHelper';
import { ImportValidationSummary } from './ImportValidationSummary';
import { DetectedSourceItemsPanel, type DetectedSourceItemsPanelProps } from './DetectedSourceItemsPanel';
import { ELECTRICITY_FACTOR_PROVINCE_OPTIONS } from '../../../utils/province';

function headerProps(): DraftReviewHeaderProps {
  return {
    extractedRowCount: 9, readyImportableCount: 2, trackedImportableCount: 1,
    rowsRequiringReviewCount: 6, alreadyImportedParsedActivitiesCount: 0,
    detectedSourceItemCount: 4, selectedImportableActivitiesCount: 3,
    previewSourceSummary: 'File: workbook.xlsx', canImportData: true, canConfirmImport: true,
    confirmingId: null, generatingMetrics: false, confirmDisabledReason: undefined,
    importSelectionSummary: '3 rows selected for import.',
    selectAllParsedActivities: vi.fn(), clearAllParsedActivities: vi.fn(),
    addParsedActivity: vi.fn(), onConfirmImport: vi.fn(),
  };
}

it('preserves Draft Review heading, helper, all counts, source summary and selection help', () => {
  render(<DraftReviewHeader {...headerProps()} />);
  expect(screen.getByRole('heading', { name: 'Draft Records Review' })).toBeInTheDocument();
  expect(screen.getByText('Review extracted activity records before saving them as Data Records.')).toBeInTheDocument();
  expect(screen.getByText('Extracted rows: 9')).toBeInTheDocument();
  expect(screen.getByText('Calculated: 2 · Tracked metrics: 1 · Requires review: 6 · Already imported: 0 · Detected source items: 4 · Selected for import: 3')).toBeInTheDocument();
  expect(screen.getByText('File: workbook.xlsx')).toBeInTheDocument();
  expect(screen.getByText('3 rows selected for import.')).toBeInTheDocument();
});

it('delegates all header actions and hides selection help without rows', async () => {
  const p = headerProps();
  const { rerender } = render(<DraftReviewHeader {...p} />);
  for (const [label, callback] of [
    ['Select All', p.selectAllParsedActivities], ['Clear All', p.clearAllParsedActivities],
    ['Add Row', p.addParsedActivity], ['Confirm Import', p.onConfirmImport],
  ] as const) {
    await userEvent.click(screen.getByRole('button', { name: label }));
    expect(callback).toHaveBeenCalledOnce();
  }
  rerender(<DraftReviewHeader {...p} extractedRowCount={0} />);
  expect(screen.queryByText(p.importSelectionSummary)).not.toBeInTheDocument();
});

it.each([
  { canImportData: false, canConfirmImport: true },
  { canImportData: true, canConfirmImport: false },
])('respects provided confirm eligibility and permissions: %j', async (state) => {
  const p = { ...headerProps(), ...state, confirmDisabledReason: 'Cannot import yet.' };
  render(<DraftReviewHeader {...p} />);
  const button = screen.getByRole('button', { name: 'Confirm Import' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-disabled', 'true');
  expect(button).toHaveAttribute('title', 'Cannot import yet.');
  await userEvent.click(button);
  expect(p.onConfirmImport).not.toHaveBeenCalled();
  for (const label of ['Select All', 'Clear All', 'Add Row']) {
    expect(screen.getByRole('button', { name: label }).hasAttribute('disabled')).toBe(!p.canImportData);
  }
});

it.each([
  [true, 'document', 'Generating metrics...'],
  [true, null, 'Generating metrics...'],
  [false, 'document', 'Importing...'],
  [false, null, 'Confirm Import'],
] as const)('preserves label priority for generating=%s confirming=%s', (generatingMetrics, confirmingId, label) => {
  render(<DraftReviewHeader {...headerProps()} generatingMetrics={generatingMetrics} confirmingId={confirmingId} />);
  expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-disabled', 'false');
});

function provinceProps(): BulkProvinceHelperProps {
  return {
    missingProvinceCount: 1, bulkProvince: 'Alberta', canSetProvinceOnDraftRows: true,
    isProcessing: false, canSetBulkProvince: true, setProvinceDisabledReason: undefined,
    onBulkProvinceChange: vi.fn(), applyBulkProvinceToMissingRows: vi.fn(),
  };
}

it.each([1, 2])('preserves missing province helper copy for %s rows', (count) => {
  render(<BulkProvinceHelper {...provinceProps()} missingProvinceCount={count} />);
  expect(screen.getByText('Missing province helper')).toBeInTheDocument();
  expect(screen.getByText(`Select a province to apply to ${count} electricity row${count === 1 ? '' : 's'} that require province-specific matching.`)).toBeInTheDocument();
});

it('uses the controlled province and existing options and delegates changes and apply', async () => {
  const p = provinceProps();
  render(<BulkProvinceHelper {...p} />);
  const select = screen.getByRole('combobox', { name: 'Province' });
  expect(select).toHaveValue('Alberta');
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Select province', ...ELECTRICITY_FACTOR_PROVINCE_OPTIONS]);
  fireEvent.change(select, { target: { value: 'British Columbia' } });
  expect(p.onBulkProvinceChange).toHaveBeenCalledWith('British Columbia');
  expect(select).toHaveValue('Alberta');
  await userEvent.click(screen.getByRole('button', { name: 'Set Province' }));
  expect(p.applyBulkProvinceToMissingRows).toHaveBeenCalledOnce();
});

it.each([
  { canSetProvinceOnDraftRows: false, isProcessing: false },
  { canSetProvinceOnDraftRows: true, isProcessing: true },
])('preserves permission and processing disablement: %j', async (state) => {
  const p = { ...provinceProps(), ...state, canSetBulkProvince: false, setProvinceDisabledReason: 'Province changes are blocked.' };
  render(<BulkProvinceHelper {...p} />);
  expect(screen.getByRole('combobox')).toBeDisabled();
  const apply = screen.getByRole('button', { name: 'Set Province' });
  expect(apply).toBeDisabled();
  expect(apply).toHaveAttribute('title', p.setProvinceDisabledReason);
  await userEvent.click(apply);
  expect(p.applyBulkProvinceToMissingRows).not.toHaveBeenCalled();
});

it('attaches the validation ref to the alert and preserves row numbers, labels and detail titles', () => {
  const ref = createRef<HTMLDivElement>();
  const issue = { rowIndex: 2, field: 'unit' as const, message: 'Unit missing' };
  const label = vi.fn(() => 'Unit Mismatch');
  const detail = vi.fn(() => 'Detailed validation explanation');
  render(<ImportValidationSummary validationSummaryRef={ref} importValidationIssues={[issue]} getImportValidationIssueLabel={label} getImportValidationIssueDetail={detail} />);
  expect(ref.current).toBe(screen.getByRole('alert'));
  expect(screen.getByText('⚠ Please correct the following issues:')).toBeInTheDocument();
  expect(screen.getByText('Row 3: Unit Mismatch')).toHaveAttribute('title', 'Detailed validation explanation');
  expect(label).toHaveBeenCalledWith(issue);
  expect(detail).toHaveBeenCalledWith(issue);
});

it('only displays detected source items, with source metadata, details, reasons and no import actions', () => {
  const p: DetectedSourceItemsPanelProps = {
    detectedSourceItems: [], getDetectedSourceItemLabel: () => 'Waste services',
    formatDocumentMetadataValue: value => String(value ?? '-'),
    formatDetectedSourceCost: () => '$25.00', formatDetectedSourceDetails: () => 'Pickup: $25.00',
  };
  const { rerender } = render(<DetectedSourceItemsPanel {...p} />);
  expect(screen.queryByLabelText('Detected source items not used in emissions calculation')).not.toBeInTheDocument();
  const item = { documentId: 'doc', documentFileName: 'fallback.pdf', type: 'WASTE_SERVICES', serviceDays: 30, sourceCostCad: 25 };
  rerender(<DetectedSourceItemsPanel {...p} detectedSourceItems={[{ ...item, sourceFileName: 'bill.pdf', reasonDetail: 'No waste quantity' }]} />);
  expect(screen.getByLabelText('Detected source items not used in emissions calculation')).toBeInTheDocument();
  for (const text of ['Detected Source Items Not Used in Emissions Calculation', 'Waste services', 'Not imported', 'Source: bill.pdf', 'Service Days: 30', 'Source Cost: $25.00', 'Details: Pickup: $25.00', 'Reason: No waste quantity', 'Provide waste mass and disposal/treatment information to calculate emissions.']) {
    expect(screen.getByText(text)).toBeInTheDocument();
  }
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  rerender(<DetectedSourceItemsPanel {...p} detectedSourceItems={[item]} />);
  expect(screen.getByText('Source: fallback.pdf')).toBeInTheDocument();
  expect(screen.getByText('Reason: No supported waste quantity was provided.')).toBeInTheDocument();
});
