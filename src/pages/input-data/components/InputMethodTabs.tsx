import type { InputMethod } from '../inputData.types';
import { methodTabsStyle, methodTabStyle } from '../../UploadPage.styles';

type InputMethodTabsProps = {
  activeMethod: InputMethod;
  onChange: (method: InputMethod) => void;
};

export function InputMethodTabs({
  activeMethod,
  onChange,
}: InputMethodTabsProps) {
  return (
    <div style={methodTabsStyle} role="tablist" aria-label="Input data methods">
      {[
        {
          key: 'documents' as const,
          title: 'Upload documents',
          text: 'Upload utility bills, fuel invoices, hotel receipts, and other source documents.',
        },
        {
          key: 'spreadsheet' as const,
          title: 'Import spreadsheet',
          text: 'Import structured activity data from CSV or Excel using your existing spreadsheet or a CarbonLite template.',
        },
        {
          key: 'manual' as const,
          title: 'Manual entry',
          text: 'Enter one activity record directly when no file is available.',
        },
      ].map((method) => (
        <button
          key={method.key}
          type="button"
          role="tab"
          aria-selected={activeMethod === method.key}
          onClick={() => onChange(method.key)}
          style={methodTabStyle(activeMethod === method.key)}
        >
          <strong>{method.title}</strong>
          <span>{method.text}</span>
        </button>
      ))}
    </div>
  );
}
