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
          title: 'Upload Documents',
          text: 'Upload utility bills, fuel invoices, water bills, travel documents, hotel invoices, or operational PDFs.',
        },
        {
          key: 'spreadsheet' as const,
          title: 'Import Spreadsheet',
          text: 'Import CSV or Excel activity data from a CarbonLite template or your existing spreadsheet.',
        },
        {
          key: 'manual' as const,
          title: 'Manual Entry',
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
