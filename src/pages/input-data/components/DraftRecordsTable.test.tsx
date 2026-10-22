import { createRef } from 'react';
import { DraftRecordsReview } from './DraftRecordsReview';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftRecordsTable, type DraftRecordsTableProps } from './DraftRecordsTable';
import { activityTypes } from '../../../constants/activityTypes';
import * as identity from '../domain/importIdentity';
import type { EditableParsedActivity } from '../inputData.types';

function row(overrides: Partial<EditableParsedActivity> = {}): EditableParsedActivity {
  return {
    rowId: 'row-1', documentId: 'doc', documentFileName: 'source.xlsx', selected: true, dateEstimated: false,
    activityType: { value: 'ELECTRICITY', confidence: 'high' },
    recordDate: { value: '2026-03-01', confidence: 'high' },
    quantity: { value: 980, confidence: 'high' }, unit: { value: 'kWh', confidence: 'high' },
    jurisdictionCountry: { value: 'Canada', confidence: 'high' }, jurisdictionRegion: { value: 'Alberta', confidence: 'high' },
    facilityName: { value: 'Calgary HQ', confidence: 'high' }, sourceReference: { value: 'ELEC-001', confidence: 'high' },
    notes: { value: 'Original notes', confidence: 'high' }, ...overrides,
  };
}

function props(rows = [row()]): DraftRecordsTableProps {
  return {
    parsedActivities: rows, getFieldValidationMessage: vi.fn(() => undefined),
    getRowStatusLabel: vi.fn(() => 'Calculated'), getRowIssueText: vi.fn(() => '-'),
    getRowIssueTitle: vi.fn(() => 'Issue detail'), isParsedActivityImportable: vi.fn(() => true),
    isParsedActivityAlreadyImported: vi.fn(() => false), getRowReportTreatment: vi.fn(() => 'Included in GHG Total'),
    toggleParsedActivitySelected: vi.fn(), updateParsedActivityField: vi.fn(), removeParsedActivity: vi.fn(),
    getPreviewActivityTypeLabel: value => value ?? '', getUnsupportedActivityTypeDisplayLabel: () => 'Custom (Unsupported)',
    getImportValidationIssueDetail: issue => issue.message, getFieldValidationDisplayMessage: (_field, message) => message ?? '',
    getConfidenceStyle: () => ({ background: '#f6fff7' }), getPreviewDatePeriod: () => '2026-03-01 to 2026-03-31',
    getRecordDateSuggestion: vi.fn(() => '2026-07-20'),
  };
}

it('preserves all 14 columns, colgroup, horizontal hint, status, issues and treatment', () => {
  const p = props();
  const { container } = render(<DraftRecordsTable {...p} />);
  expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
    'Select', 'Status', 'Activity Type', 'Record Date', 'Quantity', 'Unit', 'Country', 'Province',
    'Site / Facility', 'Source Reference', 'Issue', 'Report Treatment', 'Notes', 'Actions',
  ]);
  expect(container.querySelectorAll('colgroup col')).toHaveLength(14);
  expect(screen.getByText('Scroll horizontally to view all columns →')).toBeInTheDocument();
  expect(screen.getByText('Calculated')).toHaveAttribute('title', 'Calculated');
  expect(screen.getByText('-')).toHaveAttribute('title', 'Issue detail');
  expect(screen.getByText('Included in GHG Total')).toBeInTheDocument();
  expect(p.getRowStatusLabel).toHaveBeenCalledWith(0, p.parsedActivities[0]);
  expect(p.getRowReportTreatment).toHaveBeenCalledWith(0, p.parsedActivities[0]);
});

it('uses the stable identity helper and retains row DOM when rows are reordered', () => {
  const key = vi.spyOn(identity, 'getParsedActivityRowKey');
  const first = row();
  const second = row({ rowId: 'row-2', sourceReference: { value: 'ELEC-002', confidence: 'high' } });
  const p = props([first, second]);
  const { rerender } = render(<DraftRecordsTable {...p} />);
  const firstInput = screen.getByDisplayValue('ELEC-001');
  expect(key).toHaveBeenCalledWith(first, 0);
  expect(key).toHaveBeenCalledWith(second, 1);
  rerender(<DraftRecordsTable {...p} parsedActivities={[second, first]} />);
  expect(screen.getByDisplayValue('ELEC-001')).toBe(firstInput);
  expect(within(firstInput.closest('tr')!).getByLabelText('Select preview row 2')).toBeChecked();
});

it('preserves controlled importable selection and delegates index + checked', async () => {
  const p = props();
  const { rerender } = render(<DraftRecordsTable {...p} />);
  const checkbox = screen.getByLabelText('Select preview row 1');
  expect(checkbox).toBeEnabled();
  expect(checkbox).toBeChecked();
  expect(checkbox.closest('tr')).toHaveStyle({ background: '#f0fdf4' });
  await userEvent.click(checkbox);
  expect(p.toggleParsedActivitySelected).toHaveBeenLastCalledWith(0, false);
  rerender(<DraftRecordsTable {...p} parsedActivities={[row({ selected: false })]} />);
  expect(checkbox).not.toBeChecked();
  await userEvent.click(checkbox);
  expect(p.toggleParsedActivitySelected).toHaveBeenLastCalledWith(0, true);
});

it.each([false, true])('disables non-importable selection with the correct title (already imported=%s)', async (alreadyImported) => {
  const p = { ...props(), isParsedActivityImportable: () => false, isParsedActivityAlreadyImported: () => alreadyImported };
  render(<DraftRecordsTable {...p} />);
  const checkbox = screen.getByLabelText('Select preview row 1');
  expect(checkbox).toBeDisabled();
  expect(checkbox).not.toBeChecked();
  expect(checkbox).toHaveAttribute('title', alreadyImported ? 'This source row has already been imported.' : 'Fix validation issues before selecting this row.');
  await userEvent.click(checkbox);
  expect(p.toggleParsedActivitySelected).not.toHaveBeenCalled();
});

it('keeps every field editable and delegates unchanged string values and row index', () => {
  const p = props();
  render(<DraftRecordsTable {...p} />);
  const changes = [
    ['activityType', screen.getByRole('combobox'), 'WATER'],
    ['recordDate', screen.getByDisplayValue('2026-03-01'), '2026-04-01'],
    ['quantity', screen.getByRole('spinbutton'), '100'],
    ['unit', screen.getByDisplayValue('kWh'), 'm3'],
    ['jurisdictionCountry', screen.getByPlaceholderText('Canada'), 'US'],
    ['jurisdictionRegion', screen.getByPlaceholderText('Province'), 'British Columbia'],
    ['facilityName', screen.getByPlaceholderText('Optional site or facility'), 'Vancouver Fleet'],
    ['sourceReference', screen.getByPlaceholderText('source.xlsx'), 'fuel_card_feb.csv'],
    ['notes', screen.getByPlaceholderText('Optional notes'), 'Revised notes'],
  ] as const;
  for (const [field, input, value] of changes) {
    fireEvent.change(input, { target: { value } });
    expect(p.updateParsedActivityField).toHaveBeenLastCalledWith(0, field, value);
  }
  expect(screen.getByRole('spinbutton')).toHaveAttribute('min', '0');
  expect(screen.getByDisplayValue('2026-03-01')).toHaveAttribute('type', 'text');
  expect(screen.getByDisplayValue('2026-03-01')).toHaveAttribute('placeholder', 'YYYY-MM-DD');
  expect(screen.getByDisplayValue('kWh')).toHaveAttribute('type', 'text');
  expect(screen.getByPlaceholderText('Province')).toHaveAttribute('type', 'text');
});

it('preserves activity option ordering, unsupported option, title and field validation', () => {
  const p = { ...props([row({ activityType: { value: 'CUSTOM', confidence: 'low' } })]), getFieldValidationMessage: (_index: number, field: string) => field === 'activityType' ? 'Unsupported activity' : undefined };
  render(<DraftRecordsTable {...p} />);
  expect(screen.getByRole('combobox')).toHaveValue('CUSTOM');
  expect(screen.getByRole('combobox')).toHaveAttribute('title', 'Unsupported activity type: CUSTOM');
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['-- Select --', 'Custom (Unsupported)', ...activityTypes]);
  expect(screen.getByText('Unsupported activity')).toHaveAttribute('title', 'Unsupported activity');
});

it('preserves validation field/row attributes, errors, estimated date warning and suggestion callback', async () => {
  const item = row({ dateEstimated: true, periodEndDate: '2026-03-31' });
  const p = { ...props([item]), getFieldValidationMessage: (_index: number, field: string) => `Error in ${field}` };
  const { container } = render(<DraftRecordsTable {...p} />);
  for (const field of ['activityType', 'recordDate', 'quantity', 'unit', 'jurisdictionRegion']) {
    const input = container.querySelector(`[data-validation-field="${field}"][data-validation-row="0"]`)!;
    expect(input).toBeInTheDocument();
    expect(screen.getByText(`Error in ${field}`)).toBeInTheDocument();
    (input as HTMLElement).focus();
    expect(input).toHaveFocus();
  }
  expect(screen.getByText('2026-03-01 to 2026-03-31')).toBeInTheDocument();
  expect(screen.getByText('Date estimated: 2026-03-01')).toBeInTheDocument();
  expect(screen.getByText('Suggested: 2026-07-20')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Use Suggestion' }));
  expect(p.getRecordDateSuggestion).toHaveBeenCalledWith(item);
  expect(p.updateParsedActivityField).toHaveBeenCalledWith(0, 'recordDate', '2026-07-20');
});

it.each(['Included in GHG Total', 'Tracked Metric', 'Excluded'])('renders the provided treatment %s and issue details', (treatment) => {
  render(<DraftRecordsTable {...props()} getRowIssueText={() => 'Needs attention'} getRowReportTreatment={() => treatment} />);
  expect(screen.getByText(treatment)).toBeInTheDocument();
  expect(screen.getByText('Needs attention')).toHaveAttribute('title', 'Issue detail');
});

it('delegates Delete with the current row index', async () => {
  const p = props([row(), row({ rowId: 'row-2' })]);
  render(<DraftRecordsTable {...p} />);
  await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
  expect(p.removeParsedActivity).toHaveBeenCalledWith(1);
});

it('composes the empty state and conditionally displays bulk helper, validation, detected items and table', () => {
  const tableProps = props([]);
  const validationSummaryRef = createRef<HTMLDivElement>();
  const p = {
    headerProps: {
      extractedRowCount: 0, readyImportableCount: 0, trackedImportableCount: 0,
      rowsRequiringReviewCount: 0, alreadyImportedParsedActivitiesCount: 0, detectedSourceItemCount: 0,
      selectedImportableActivitiesCount: 0, previewSourceSummary: 'Source workbook', canImportData: true,
      canConfirmImport: false, confirmingId: null, generatingMetrics: false, confirmDisabledReason: undefined,
      importSelectionSummary: '', selectAllParsedActivities: vi.fn(), clearAllParsedActivities: vi.fn(),
      addParsedActivity: vi.fn(), onConfirmImport: vi.fn(),
    },
    bulkProvinceProps: {
      missingProvinceCount: 1, bulkProvince: '', canSetProvinceOnDraftRows: true, isProcessing: false,
      canSetBulkProvince: false, setProvinceDisabledReason: 'Select a province to apply.',
      onBulkProvinceChange: vi.fn(), applyBulkProvinceToMissingRows: vi.fn(),
    },
    validationProps: {
      validationSummaryRef,
      importValidationIssues: [{ rowIndex: 0, field: 'jurisdictionRegion' as const, message: 'Missing province' }],
      getImportValidationIssueLabel: () => 'Missing Province', getImportValidationIssueDetail: () => 'Province required',
    },
    detectedSourceItemsProps: {
      detectedSourceItems: [{ documentId: 'doc', documentFileName: 'bill.pdf', type: 'UTILITY_FEE' }],
      getDetectedSourceItemLabel: () => 'Utility fee', formatDocumentMetadataValue: () => '-',
      formatDetectedSourceCost: () => '-', formatDetectedSourceDetails: () => '-',
    },
    tableProps, hasImportValidationErrors: true,
  };
  const { rerender, container } = render(<DraftRecordsReview {...p} />);
  expect(screen.getByText('No extracted activities.')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Missing province helper')).not.toBeInTheDocument();
  expect(screen.queryByText('Utility fee')).not.toBeInTheDocument();
  rerender(<DraftRecordsReview {...p} tableProps={props()} />);
  expect(screen.queryByText('No extracted activities.')).not.toBeInTheDocument();
  expect(screen.getByText('Missing province helper')).toBeInTheDocument();
  expect(screen.getByText('Utility fee')).toBeInTheDocument();
  expect(validationSummaryRef.current).toBe(screen.getByRole('alert'));
  // These are the same ref and DOM selector used by UploadPage's scroll/focus helper.
  validationSummaryRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  const field = container.querySelector<HTMLElement>('[data-validation-field="jurisdictionRegion"][data-validation-row="0"]')!;
  field.focus();
  expect(field).toHaveFocus();
  rerender(<DraftRecordsReview {...p} tableProps={props()} hasImportValidationErrors={false} bulkProvinceProps={{ ...p.bulkProvinceProps, missingProvinceCount: 0 }} />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText('Missing province helper')).not.toBeInTheDocument();
});
