import type { Ref } from 'react';
import type { ImportValidationIssue } from '../inputData.types';
import {
  validationSummaryStyle,
} from '../../UploadPage.styles';

export type ImportValidationSummaryProps = {
  validationSummaryRef: Ref<HTMLDivElement>;
  importValidationIssues: ImportValidationIssue[];
  getImportValidationIssueLabel: (issue: ImportValidationIssue) => string;
  getImportValidationIssueDetail: (issue: ImportValidationIssue) => string;
};

export function ImportValidationSummary({
  validationSummaryRef,
  importValidationIssues,
  getImportValidationIssueLabel,
  getImportValidationIssueDetail,
}: ImportValidationSummaryProps) {
  return (
    <div ref={validationSummaryRef} style={validationSummaryStyle} role="alert">
      <strong>⚠ Please correct the following issues:</strong>
      <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
        {importValidationIssues.map((issue) => (
          <li
            key={`${issue.rowIndex}-${issue.field}`}
            title={getImportValidationIssueDetail(issue)}
          >
            Row {issue.rowIndex + 1}: {getImportValidationIssueLabel(issue)}
          </li>
        ))}
      </ul>
    </div>
  );
}
