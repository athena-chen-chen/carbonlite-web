import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { getDocuments, uploadDocument } from '../services/documents';
import {
  confirmDocumentImport,
  extractDocument,
  type ParsedActivity,
} from '../services/documentExtraction';
import { useNavigate } from 'react-router-dom';

type DocumentItem = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType?: string | null;
  fileSize?: number | null;
  type: string;
  status: string;
  createdAt: string;
};

type EditableConfidenceField<T> = {
  value: T | null;
  confidence: 'high' | 'medium' | 'low';
};

type EditableParsedActivity = {
  selected: boolean;
  activityType: EditableConfidenceField<string>;
  recordDate: EditableConfidenceField<string>;
  quantity: EditableConfidenceField<number>;
  unit: EditableConfidenceField<string>;
  sourceReference: EditableConfidenceField<string>;
  notes: EditableConfidenceField<string>;
};

export function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('OTHER');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [parsedActivities, setParsedActivities] = useState<EditableParsedActivity[]>([]);
  const [latestDocumentId, setLatestDocumentId] = useState<string | null>(null);

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function loadDocuments() {
    setLoading(true);
    setError(null);

    try {
      const data = await getDocuments();
      setDocuments(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, []);

  function handleChooseFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setSuccessMessage(null);
    setError(null);
  }

  function handleUseSampleCSV() {
    const blob = new Blob(
      [
        `activityType,recordDate,quantity,unit
DIESEL,2026-03-01,120,liters
ELECTRICITY,2026-03-02,450,kWh
NATURAL_GAS,2026-03-03,300,m3`,
      ],
      { type: 'text/csv' },
    );

    const file = new File([blob], 'carbonlite-sample.csv', {
      type: 'text/csv',
    });

    setSelectedFile(file);
    setDocumentType('SPREADSHEET');
    setError(null);
    setSuccessMessage('Sample CSV loaded. Click Upload & Extract.');
  }

  async function handleUploadAndExtract() {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage('Uploading document...');

    try {
      await uploadDocument({
        file: selectedFile,
        type: documentType,
      });

      setSelectedFile(null);

      const input = document.getElementById(
        'document-upload-input',
      ) as HTMLInputElement | null;

      if (input) {
        input.value = '';
      }

      const data = await getDocuments();
      setDocuments(data.items ?? []);

      const latest = data.items?.[0];

      if (!latest) {
        throw new Error('Upload completed, but no uploaded document was found.');
      }

      setLatestDocumentId(latest.id);
      setSuccessMessage('Upload completed. Extracting data now...');

      await handleExtract(latest.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload or extract failed');
      setSuccessMessage(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract(documentId: string) {
    setExtractingId(documentId);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await extractDocument(documentId);

      setPreviewDocumentId(documentId);
      setParsedActivities(
        (result.parsedActivities ?? []).map((item: ParsedActivity | any) => ({
          selected: true,
          ...item,
        })),
      );

      if (result.possibleMissingRows) {
        setError(result.warning ?? 'Possible missing rows detected.');
        setSuccessMessage(null);
      } else {
        setSuccessMessage(
          'Extraction completed. Review the preview below, then click Confirm Import.',
        );
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extract failed');
    } finally {
      setExtractingId(null);
    }
  }

  async function handleConfirmImport(documentId: string) {
    if (!parsedActivities.length || previewDocumentId !== documentId) {
      setError('No extracted activities to confirm.');
      return;
    }

    setConfirmingId(documentId);
    setError(null);
    setSuccessMessage(null);

    try {
      const normalizedActivities = parsedActivities
        .filter((item) => item.selected)
        .map((item) => ({
          activityType: item.activityType.value,
          recordDate: item.recordDate.value,
          quantity: item.quantity.value,
          unit: item.unit.value,
          sourceReference: item.sourceReference.value,
          notes: item.notes.value,
        }));

      if (!normalizedActivities.length) {
        setError('Please select at least one activity to import.');
        setConfirmingId(null);
        return;
      }

      const result = await confirmDocumentImport(documentId, normalizedActivities);

      setSuccessMessage(
        `Imported ${result.count} activity record(s). Redirecting to Metrics Summary...`,
      );

      setPreviewDocumentId(null);
      setParsedActivities([]);

      setTimeout(() => {
        navigate('/metrics-summary');
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirm import failed');
    } finally {
      setConfirmingId(null);
    }
  }

  function getConfidenceStyle(confidence: string): React.CSSProperties {
    if (confidence === 'low') {
      return {
        background: '#fff1f1',
        border: '1px solid #f5c2c7',
      };
    }

    if (confidence === 'medium') {
      return {
        background: '#fff8e6',
        border: '1px solid #f3d28b',
      };
    }

    return {
      background: '#f6fff7',
      border: '1px solid #b7e4c7',
    };
  }

  function updateParsedActivityField(
    index: number,
    field: keyof EditableParsedActivity,
    value: string,
  ) {
    setParsedActivities((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === 'selected') return item;

        const currentField = item[field] as EditableConfidenceField<any>;

        return {
          ...item,
          [field]: {
            ...currentField,
            value: field === 'quantity' ? Number(value) : value,
            confidence: 'medium',
          },
        };
      }),
    );
  }

  function removeParsedActivity(index: number) {
    setParsedActivities((prev) => prev.filter((_, i) => i !== index));
  }

  function addParsedActivity() {
    setParsedActivities((prev) => [
      ...prev,
      {
        selected: true,
        activityType: { value: 'DIESEL', confidence: 'medium' },
        recordDate: {
          value: new Date().toISOString().slice(0, 10),
          confidence: 'medium',
        },
        quantity: { value: 0, confidence: 'low' },
        unit: { value: 'liters', confidence: 'medium' },
        sourceReference: { value: '', confidence: 'low' },
        notes: { value: 'Added manually', confidence: 'medium' },
      },
    ]);
  }

  function toggleParsedActivitySelected(index: number, checked: boolean) {
    setParsedActivities((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              selected: checked,
            }
          : item,
      ),
    );
  }

  function selectAllParsedActivities() {
    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: true,
      })),
    );
  }

  function clearAllParsedActivities() {
    setParsedActivities((prev) =>
      prev.map((item) => ({
        ...item,
        selected: false,
      })),
    );
  }

  const isProcessing = uploading || extractingId !== null;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Upload & Extract Carbon Data</h1>

      <p style={{ color: '#666', marginBottom: 16 }}>
        Upload invoices, fuel receipts, utility bills, or CSV files. CarbonLite AI will extract activity data and prepare it for review.
      </p>

      <div style={stepBarStyle}>
        Upload → Extract → Review → Import → Metrics
      </div>

      <div style={uploadCardStyle}>
        <h2 style={{ marginTop: 0 }}>Upload your document</h2>
        <p style={{ color: '#666' }}>
          Choose a document or use a sample file to test the workflow.
        </p>

        <div style={{ display: 'grid', gap: 16, maxWidth: 700 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8 }}
            >
              <option value="UTILITY_BILL">UTILITY_BILL</option>
              <option value="FUEL_INVOICE">FUEL_INVOICE</option>
              <option value="SPREADSHEET">SPREADSHEET</option>
              <option value="PDF">PDF</option>
              <option value="IMAGE">IMAGE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <input
            ref={fileInputRef}
            id="document-upload-input"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
            style={{ display: 'none' }}
          />

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={handleChooseFile} style={secondaryButtonStyle}>
              Choose File
            </button>

            <button type="button" onClick={handleUseSampleCSV} style={secondaryButtonStyle}>
              Use Sample CSV
            </button>

            <button
              type="button"
              onClick={handleUploadAndExtract}
              disabled={isProcessing}
              style={primaryButtonStyle(isProcessing)}
            >
              {isProcessing ? 'Processing...' : 'Upload & Extract'}
            </button>
          </div>

          <span style={{ color: '#555' }}>
            {selectedFile ? selectedFile.name : 'No file chosen'}
          </span>

          {selectedFile ? (
            <div style={fileInfoStyle}>
              <div>
                <strong>Name:</strong> {selectedFile.name}
              </div>
              <div>
                <strong>Type:</strong> {selectedFile.type || 'Unknown'}
              </div>
              <div>
                <strong>Size:</strong> {selectedFile.size} bytes
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}
      {successMessage ? <div style={successStyle}>{successMessage}</div> : null}

      <div style={sectionCardStyle}>
        <div style={{ padding: 16, borderBottom: '1px solid #eee' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Uploaded Documents</h2>
        </div>

        {loading ? (
          <div style={{ padding: 16 }}>Loading documents...</div>
        ) : documents.length === 0 ? (
          <div style={{ padding: 16 }}>No documents uploaded yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Size</th>
                <th style={thStyle}>Created At</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  style={doc.id === latestDocumentId ? { background: '#f0f7ff' } : undefined}
                >
                  <td style={tdStyle}>{doc.fileName}</td>
                  <td style={tdStyle}>{doc.type}</td>
                  <td style={tdStyle}>{doc.status}</td>
                  <td style={tdStyle}>{doc.fileSize ?? '-'}</td>
                  <td style={tdStyle}>{doc.createdAt}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>

                      <button
                        type="button"
                        onClick={() => handleExtract(doc.id)}
                        disabled={extractingId === doc.id}
                        style={secondaryButtonStyle}
                      >
                        {extractingId === doc.id ? 'Extracting...' : 'Extract'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmImport(doc.id)}
                        disabled={
                          confirmingId === doc.id ||
                          previewDocumentId !== doc.id ||
                          parsedActivities.length === 0
                        }
                        style={confirmButtonStyle(
                          previewDocumentId === doc.id && parsedActivities.length > 0,
                        )}
                      >
                        {confirmingId === doc.id ? 'Importing...' : 'Confirm Import'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {previewDocumentId ? (
        <div style={{ ...sectionCardStyle, marginTop: 24 }}>
          <div style={previewHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Extract Preview</h2>
              <p style={{ marginTop: 8, color: '#666' }}>
                Review extracted activity records before importing them into CarbonLite AI.
              </p>
              <p style={{ marginTop: 8, color: '#047857', fontWeight: 600 }}>
                Extracted rows: {parsedActivities.length}
              </p>
              <p style={{ marginTop: 8, color: '#999' }}>
                Document ID: {previewDocumentId}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={selectAllParsedActivities} style={secondaryButtonStyle}>
                Select All
              </button>

              <button type="button" onClick={clearAllParsedActivities} style={secondaryButtonStyle}>
                Clear All
              </button>

              <button type="button" onClick={addParsedActivity} style={secondaryButtonStyle}>
                Add Row
              </button>
            </div>
          </div>

          {parsedActivities.length === 0 ? (
            <div style={{ padding: 16 }}>No extracted activities.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={thStyle}>Select</th>
                  <th style={thStyle}>Activity Type</th>
                  <th style={thStyle}>Record Date</th>
                  <th style={thStyle}>Quantity</th>
                  <th style={thStyle}>Unit</th>
                  <th style={thStyle}>Source Reference</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parsedActivities.map((item, index) => (
                  <tr key={`parsed-${index}`}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          toggleParsedActivitySelected(index, e.target.checked)
                        }
                      />
                    </td>

                    <td style={tdStyle}>
                      <select
                        value={item.activityType.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'activityType', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.activityType.confidence),
                        }}
                      >
                        <option value="">-- Select --</option>
                        <option value="ELECTRICITY">ELECTRICITY</option>
                        <option value="NATURAL_GAS">NATURAL_GAS</option>
                        <option value="DIESEL">DIESEL</option>
                        <option value="GASOLINE">GASOLINE</option>
                        <option value="STEAM">STEAM</option>
                        <option value="WATER">WATER</option>
                        <option value="WASTE">WASTE</option>
                        <option value="BUSINESS_TRAVEL">BUSINESS_TRAVEL</option>
                        <option value="FREIGHT">FREIGHT</option>
                        <option value="CUSTOM">CUSTOM</option>
                      </select>
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.recordDate.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'recordDate', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.recordDate.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="number"
                        value={item.quantity.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'quantity', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.quantity.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.unit.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'unit', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.unit.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.sourceReference.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'sourceReference', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.sourceReference.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={item.notes.value ?? ''}
                        onChange={(e) =>
                          updateParsedActivityField(index, 'notes', e.target.value)
                        }
                        style={{
                          width: '100%',
                          padding: 8,
                          borderRadius: 6,
                          ...getConfidenceStyle(item.notes.confidence),
                        }}
                      />
                    </td>

                    <td style={tdStyle}>
                      <button
                        type="button"
                        onClick={() => removeParsedActivity(index)}
                        style={deleteButtonStyle}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}

const stepBarStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 12,
  borderRadius: 12,
  background: '#ecfdf5',
  border: '1px solid #a7f3d0',
  color: '#047857',
  fontWeight: 600,
};

const uploadCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 16,
  padding: 20,
  marginBottom: 24,
  background: '#fff',
  boxShadow: '0 6px 20px rgba(0,0,0,0.04)',
};

const sectionCardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 12,
  background: '#fff',
  overflow: 'hidden',
};

const fileInfoStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 10,
  background: '#f7f7f7',
  border: '1px solid #eee',
};

const successStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  border: '1px solid #b8dfc1',
  background: '#f3fff5',
  color: '#1d6b2d',
};

const errorStyle: React.CSSProperties = {
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  border: '1px solid #f1b5b5',
  background: '#fff4f4',
  color: '#9b1c1c',
};

const previewHeaderStyle: React.CSSProperties = {
  padding: 16,
  borderBottom: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexWrap: 'wrap',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  borderBottom: '1px solid #ddd',
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
  verticalAlign: 'top',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #111',
  background: '#fff',
  cursor: 'pointer',
};

function primaryButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid #047857',
    background: disabled ? '#9ca3af' : '#047857',
    color: '#fff',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function confirmButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #111',
    background: enabled ? '#111' : '#ddd',
    color: enabled ? '#fff' : '#666',
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

const deleteButtonStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #d33',
  background: '#fff',
  color: '#d33',
  cursor: 'pointer',
};