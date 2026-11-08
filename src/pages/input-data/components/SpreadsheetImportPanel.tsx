import { ExcelInputTable, type ExcelInputTableSaveResult } from '../../../components/ExcelInputTable';
import { uploadCardStyle, templateActionRowStyle, secondaryButtonStyle } from '../../UploadPage.styles';

type SpreadsheetImportPanelProps = {
  onDownloadCsvTemplate: () => void;
  onDownloadExcelTemplate: () => void;
  onSuccess: (result?: ExcelInputTableSaveResult) => void | Promise<void>;
  onSourceChange: () => void;
};

export function SpreadsheetImportPanel({
  onDownloadCsvTemplate,
  onDownloadExcelTemplate,
  onSuccess,
  onSourceChange,
}: SpreadsheetImportPanelProps) {
  return (
    <div style={uploadCardStyle}>
      <h2 style={{ marginTop: 0 }}>Import spreadsheet</h2>
      <p style={{ color: '#666' }}>
        Import structured activity data from CSV or Excel using your existing spreadsheet or a CarbonLite template.
      </p>
      <div style={templateActionRowStyle}>
        <button type="button" onClick={onDownloadCsvTemplate} style={secondaryButtonStyle}>
          Download CSV template
        </button>
        <button type="button" onClick={onDownloadExcelTemplate} style={secondaryButtonStyle}>
          Download Excel template
        </button>
      </div>
      <ExcelInputTable
        mode="spreadsheet"
        onSuccess={onSuccess}
        onSourceChange={onSourceChange}
      />
    </div>
  );
}
