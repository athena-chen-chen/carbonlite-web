import { ELECTRICITY_FACTOR_PROVINCE_OPTIONS } from '../../../utils/province';
import {
  bulkProvincePanelStyle,
  bulkProvinceHelpTextStyle,
  bulkProvinceControlStyle,
  bulkProvinceLabelStyle,
  bulkProvinceSelectStyle,
  primaryButtonStyle,
} from '../../UploadPage.styles';

export type BulkProvinceHelperProps = {
  missingProvinceCount: number;
  bulkProvince: string;
  canSetProvinceOnDraftRows: boolean;
  isProcessing: boolean;
  canSetBulkProvince: boolean;
  setProvinceDisabledReason: string | undefined;
  onBulkProvinceChange: (value: string) => void;
  applyBulkProvinceToMissingRows: () => void;
};

export function BulkProvinceHelper({
  missingProvinceCount,
  bulkProvince,
  canSetProvinceOnDraftRows,
  isProcessing,
  canSetBulkProvince,
  setProvinceDisabledReason,
  onBulkProvinceChange,
  applyBulkProvinceToMissingRows,
}: BulkProvinceHelperProps) {
  return (
    <div style={bulkProvincePanelStyle}>
      <div>
        <strong>Missing province helper</strong>
        <p style={bulkProvinceHelpTextStyle}>
          Select a province to apply to {missingProvinceCount} electricity row
          {missingProvinceCount === 1 ? '' : 's'} that require province-specific matching.
        </p>
      </div>
      <label style={bulkProvinceControlStyle}>
        <span style={bulkProvinceLabelStyle}>Province</span>
        <select
          value={bulkProvince}
          onChange={(event) => onBulkProvinceChange(event.target.value)}
          disabled={!canSetProvinceOnDraftRows || isProcessing}
          style={bulkProvinceSelectStyle}
        >
          <option value="">Select province</option>
          {ELECTRICITY_FACTOR_PROVINCE_OPTIONS.map((province) => (
            <option key={province} value={province}>
              {province}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={applyBulkProvinceToMissingRows}
        disabled={!canSetBulkProvince}
        title={setProvinceDisabledReason}
        style={primaryButtonStyle(!canSetBulkProvince)}
      >
        Set Province
      </button>
    </div>
  );
}
