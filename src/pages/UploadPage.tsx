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
  const [showGoToSummary, setShowGoToSummary] = useState(false);
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

  async function handleUpload() {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await uploadDocument({
        file: selectedFile,
        type: documentType,
      });

      setSuccessMessage('Upload completed.');
      setSelectedFile(null);

      const input = document.getElementById(
        'document-upload-input',
      ) as HTMLInputElement | null;

      if (input) {
        input.value = '';
      }

      await loadDocuments();
      setShowGoToSummary(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract(documentId: string) {
    setShowGoToSummary(false);
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
  setSuccessMessage('Extract completed.');
  setError(null);
}
      setSuccessMessage('Extract completed.');
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
setSuccessMessage(`Imported ${result.count} activity record(s).`);
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

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Upload Documents</h1>
      <p style={{ color: '#666' }}>
        Upload utility bills, fuel invoices, spreadsheets, PDFs, or images.
      </p>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          background: '#fff',
        }}
      >
        <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', padding: 8 }}
            >
              <option value="UTILITY_BILL">UTILITY_BILL</option>
              <option value="FUEL_INVOICE">FUEL_INVOICE</option>
              <option value="SPREADSHEET">SPREADSHEET</option>
              <option value="PDF">PDF</option>
              <option value="IMAGE">IMAGE</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>
              Choose File
            </label>

            <input
              ref={fileInputRef}
              id="document-upload-input"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
              style={{ display: 'none' }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={handleChooseFile}
                style={secondaryButtonStyle}
              >
                Choose File
              </button>

              <span style={{ color: '#555' }}>
                {selectedFile ? selectedFile.name : 'No file chosen'}
              </span>
            </div>
          </div>

          {selectedFile ? (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: '#f7f7f7',
                border: '1px solid #eee',
              }}
            >
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

          <div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: '1px solid #111',
                background: '#111',
                color: '#fff',
                cursor: uploading ? 'not-allowed' : 'pointer',
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #f1b5b5',
            background: '#fff4f4',
            color: '#9b1c1c',
          }}
        >
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #b8dfc1',
            background: '#f3fff5',
            color: '#1d6b2d',
          }}
        >
          {successMessage}
        </div>
      ) : null}
{showGoToSummary ? (
  <div
    style={{
      marginBottom: 16,
      padding: 12,
      borderRadius: 8,
      border: '1px solid #d9d9d9',
      background: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}
  >
    <span style={{ color: '#333' }}>
      Import completed. You can now recalculate metrics.
    </span>

    <button
      type="button"
      onClick={() => navigate('/metrics-summary')}
      style={{
        padding: '10px 16px',
        borderRadius: 8,
        border: '1px solid #111',
        background: '#111',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      Go to Metrics Summary
    </button>
  </div>
) : null}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          background: '#fff',
          overflow: 'hidden',
        }}
      >
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
                <tr key={doc.id}>
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
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #111',
                          background:
                            previewDocumentId === doc.id &&
                            parsedActivities.length > 0
                              ? '#111'
                              : '#ddd',
                          color:
                            previewDocumentId === doc.id &&
                            parsedActivities.length > 0
                              ? '#fff'
                              : '#666',
                          cursor:
                            previewDocumentId === doc.id &&
                            parsedActivities.length > 0
                              ? 'pointer'
                              : 'not-allowed',
                        }}
                      >
                        {confirmingId === doc.id
                          ? 'Importing...'
                          : 'Confirm Import'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
{parsedActivities.length > 0 && error && error.includes('Possible missing rows') ? (
  <div
    style={{
      margin: 16,
      padding: 12,
      borderRadius: 8,
      border: '1px solid #f3d28b',
      background: '#fff8e6',
      color: '#8a5a00',
    }}
  >
    {error}
  </div>
) : null}
      {previewDocumentId ? (
        <div
          style={{
            marginTop: 24,
            border: '1px solid #ddd',
            borderRadius: 12,
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Extract Preview</h2>
              <p style={{ marginTop: 8, color: '#666' }}>
                Review highlighted fields before confirming import.
              </p>
              <p style={{ marginTop: 8, color: '#666' }}>
                Document ID: {previewDocumentId}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={selectAllParsedActivities}
                style={secondaryButtonStyle}
              >
                Select All
              </button>

              <button
                type="button"
                onClick={clearAllParsedActivities}
                style={secondaryButtonStyle}
              >
                Clear All
              </button>

              <button
                type="button"
                onClick={addParsedActivity}
                style={secondaryButtonStyle}
              >
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
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          border: '1px solid #d33',
                          background: '#fff',
                          color: '#d33',
                          cursor: 'pointer',
                        }}
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