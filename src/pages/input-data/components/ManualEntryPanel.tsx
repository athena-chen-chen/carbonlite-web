import type { Ref } from 'react';
import { ExcelInputTable, type ExcelInputTableSaveResult } from '../../../components/ExcelInputTable';
import { uploadCardStyle } from '../../UploadPage.styles';

type ManualEntryPanelProps = {
  containerRef: Ref<HTMLDivElement>;
  onSuccess: (result?: ExcelInputTableSaveResult) => void | Promise<void>;
};

export function ManualEntryPanel({
  containerRef,
  onSuccess,
}: ManualEntryPanelProps) {
  return (
    <div ref={containerRef} style={uploadCardStyle} tabIndex={-1}>
      <h2 style={{ marginTop: 0 }}>Manual Entry</h2>
      <p style={{ color: '#666' }}>
        Enter one activity record directly when no file is available.
      </p>
      <ExcelInputTable mode="manual" onSuccess={onSuccess} />
    </div>
  );
}
