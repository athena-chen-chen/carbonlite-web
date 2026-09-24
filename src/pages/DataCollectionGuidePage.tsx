import { Link } from 'react-router-dom';

const dataCategories = [
  {
    title: 'Electricity',
    documents: 'Utility bill, meter statement, energy spreadsheet',
    required: ['Usage amount', 'Unit, usually kWh', 'Billing period or date', 'Province or facility location'],
    optional: ['Cost', 'Vendor', 'Account number', 'Facility'],
    units: 'kWh',
    status: 'Calculable when a province-specific factor exists',
    note: 'Electricity records should include the province or facility location. CarbonLite will not use another province’s electricity factor as a fallback.',
  },
  {
    title: 'Natural Gas',
    documents: 'Natural gas bill, utility statement, meter export',
    required: ['Usage amount', 'Unit, commonly m3', 'Billing period or date'],
    optional: ['Facility', 'Vendor', 'Cost', 'Account number'],
    units: 'm3, GJ when a matching factor exists',
    status: 'Calculable when a matching factor exists',
    note: 'For the MVP, Canada-level factors may be used for fuel and gas records when province-specific factors are not required or available.',
  },
  {
    title: 'Fuel',
    documents: 'Diesel invoices, gasoline receipts, fleet fuel card exports',
    required: ['Fuel type', 'Quantity', 'Unit, usually liters', 'Transaction date'],
    optional: ['Vehicle or asset', 'Facility', 'Vendor', 'Cost'],
    units: 'liters, L',
    status: 'Calculable when a matching factor exists',
    note: 'Use the original purchased quantity and unit. CarbonLite will not auto-convert unsupported units such as bottles or tonnes without an explicit factor.',
  },
  {
    title: 'Water',
    documents: 'Water bill, municipal utility statement, meter export',
    required: ['Usage amount', 'Unit, usually m3', 'Billing period or date'],
    optional: ['Facility', 'Vendor', 'Cost'],
    units: 'm3',
    status: 'Tracked metric by default',
    note: 'Water usage can be tracked for operational insight. Emissions are not calculated by default unless a reviewed water emissions factor is enabled.',
  },
  {
    title: 'Waste',
    documents: 'Waste invoices, hauler reports, landfill or recycling summaries',
    required: ['Waste type', 'Quantity', 'Unit', 'Date or period'],
    optional: ['Disposal method', 'Vendor', 'Facility', 'Cost'],
    units: 'kg, tonnes, m3 when supported',
    status: 'Tracked or calculable when a matching factor exists',
    note: 'Waste records often need extra context such as disposal method before emissions can be calculated reliably.',
  },
  {
    title: 'Travel, Accommodation, Shipping',
    documents: 'Travel exports, hotel invoices, shipping or freight invoices',
    required: ['Activity type', 'Quantity', 'Unit', 'Date'],
    optional: ['Route', 'Vendor', 'Facility or department', 'Cost'],
    units: 'nights, km, ton-km when supported',
    status: 'Calculable when matching factors exist',
    note: 'Current pilot Scope 3 coverage focuses on selected business travel and transportation-related records. These records are useful for consultant review even when factors are not yet configured.',
  },
];

const checklist = [
  {
    label: 'Activity type is selected',
    why: 'CarbonLite needs to know whether the record is diesel, electricity, natural gas, water, business travel accommodation, or another activity.',
  },
  {
    label: 'Quantity is present',
    why: 'Emissions calculations multiply quantity by a conversion factor.',
  },
  {
    label: 'Unit is present and supported',
    why: 'CarbonLite will not silently combine incompatible units or guess conversions.',
  },
  {
    label: 'Date or billing period is present',
    why: 'Dates help select the correct factor year and report period.',
  },
  {
    label: 'Matching conversion factor exists',
    why: 'Records without a matching factor are saved for review, but excluded from emissions totals.',
  },
  {
    label: 'Province is provided when required',
    why: 'Province is required for electricity because electricity emission factors vary by province.',
  },
  {
    label: 'Source document is attached or referenced',
    why: 'Source references help trace each emissions result back to the original document.',
  },
  {
    label: 'Vendor, facility, cost, and notes are provided when available',
    why: 'These fields improve review, hotspot interpretation, and future financial analysis.',
  },
];

const reviewIssues = [
  {
    label: 'Missing Province',
    description: 'Electricity records need a province or jurisdiction before a province-specific factor can be matched.',
  },
  {
    label: 'Missing Site',
    description: 'Site or facility is optional, but it helps group records in reports and review packages.',
  },
  {
    label: 'Missing Factor',
    description: 'The record is retained for review when no compatible conversion factor is available.',
  },
  {
    label: 'Unit Mismatch',
    description: 'The activity unit does not match the available factor unit. CarbonLite does not silently combine incompatible units.',
  },
  {
    label: 'Missing Required Field',
    description: 'A quantity, unit, date, or activity type may need review before import.',
  },
  {
    label: 'Tracked Only',
    description: 'The record can be tracked as operational data without being included in the current emissions total.',
  },
];

const workflowSteps = [
  'Collect',
  'Upload / Import',
  'Review',
  'Match Factors',
  'Calculation Review',
  'Export Review Package',
];

const templateRows = [
  ['Electricity', '1000', 'kWh', '2026-01-01', 'Canada', 'British Columbia', 'Vancouver Office', 'Electricity bill', 'BC electricity example'],
  ['Electricity', '1000', 'kWh', '2026-01-01', 'Canada', 'Alberta', 'Calgary Office', 'Electricity bill', 'Alberta electricity example'],
  ['Diesel', '100', 'liters', '2026-01-01', 'Canada', 'British Columbia', 'Vancouver Office', 'Fuel receipt', 'Fuel can use Canada-level fallback if needed'],
  ['Water', '20', 'm3', '2026-01-01', 'Canada', 'British Columbia', 'Vancouver Office', 'Water bill', 'Tracked metric only'],
];

const templateColumns = [
  'Activity Type',
  'Quantity',
  'Unit',
  'Date',
  'Country',
  'Province',
  'Facility',
  'Source Reference',
  'Notes',
];

export default function DataCollectionGuidePage() {
  function downloadTemplate() {
    const rows = [templateColumns, ...templateRows];
    const csv = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'carbonlite-sme-data-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={pageStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>SME Data Readiness</p>
        <h1 style={titleStyle}>Data Collection Guide</h1>
        <p style={subtitleStyle}>
          Use this guide to gather the source documents and activity data needed for a clean CarbonLite review.
          Start with the records your organization already has, including utility bills, fuel records,
          invoices, spreadsheets, travel data, and other operational information.
        </p>
        <p style={introSupportStyle}>
          You do not need perfect data before you begin. Records with missing information can be flagged for review.
        </p>
        <div style={actionRowStyle}>
          <button type="button" onClick={downloadTemplate} style={primaryButtonStyle}>
            Download SME Data Template
          </button>
          <Link to="/input-data" style={secondaryLinkStyle}>Go to Input Data</Link>
          <Link to="/metrics-summary" style={secondaryLinkStyle}>View Calculation Review</Link>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>What Source Data Should I Collect?</h2>
        <p style={bodyTextStyle}>
          Look for the physical activity quantity, not just the amount paid. Useful quantities include kWh,
          GJ, m3, L, km, nights, and tonnes when supported by the factor library.
        </p>
        <div style={categoryGridStyle}>
          {dataCategories.map((category) => (
            <article key={category.title} style={categoryCardStyle}>
              <div style={categoryHeaderStyle}>
                <h3 style={cardTitleStyle}>{category.title}</h3>
                <span style={statusPillStyle}>{category.status}</span>
              </div>
              <p style={smallTextStyle}><strong>Documents:</strong> {category.documents}</p>
              <div style={listBlockStyle}>
                <strong>Required fields</strong>
                <ul style={listStyle}>
                  {category.required.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div style={listBlockStyle}>
                <strong>Optional useful fields</strong>
                <ul style={listStyle}>
                  {category.optional.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <p style={smallTextStyle}><strong>Example units:</strong> {category.units}</p>
              <p style={noteStyle}>{category.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Using Existing Spreadsheets</h2>
        <p style={bodyTextStyle}>
          You do not need to rebuild your records before starting. CarbonLite is designed to work with existing
          CSV or spreadsheet data and help identify fields that require review. Use one row per activity record.
        </p>
        <p style={unitNoteStyle}>
          CarbonLite currently supports selected pilot units. Additional unit conversion support will be expanded in future versions.
        </p>
        <div style={columnsGridStyle}>
          {templateColumns.map((column) => (
            <span key={column} style={columnPillStyle}>{column}</span>
          ))}
        </div>
        <div style={exampleGridStyle}>
          <ExampleRow activityType="Diesel" quantity="100" unit="liters" province="Alberta" />
          <ExampleRow activityType="Electricity" quantity="1000" unit="kWh" province="British Columbia" />
          <ExampleRow activityType="Water" quantity="20" unit="m3" province="Alberta" note="Tracked metric" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Uploading Documents</h2>
        <p style={bodyTextStyle}>
          CarbonLite extracts supported activity information and presents it for review before it becomes an
          Activity Record. Utility bills, fuel invoices, travel records, PDFs, and spreadsheets should still be
          checked in Input Review before import.
        </p>
        <div style={workflowStyle} aria-label="CarbonLite data review workflow">
          {workflowSteps.map((step, index) => (
            <div key={step} style={workflowStepStyle}>
              <span style={workflowNumberStyle}>{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>What CarbonLite Looks For</h2>
        <div style={checklistGridStyle}>
          {checklist.map((item) => (
            <div key={item.label} style={checkItemStyle}>
              <span style={checkIconStyle}>✓</span>
              <div>
                <strong>{item.label}</strong>
                <p style={smallTextStyle}>{item.why}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Common Review Issues</h2>
        <p style={bodyTextStyle}>
          These do not always mean the source document is unusable. They indicate information that should be
          reviewed before final calculations or export.
        </p>
        <div style={issueGridStyle}>
          {reviewIssues.map((issue) => (
            <article key={issue.label} style={issueItemStyle}>
              <span style={issueBadgeStyle}>{issue.label}</span>
              <p style={smallTextStyle}>{issue.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={calloutStyle}>
        <h2 style={sectionTitleStyle}>Ready to Add Data?</h2>
        <p style={bodyTextStyle}>
          Calculation Review shows calculated emissions, records requiring review, tracked metrics, and data readiness.
          Reports turn reviewed calculations into a polished output for sharing.
        </p>
        <div style={actionRowStyle}>
          <Link to="/activity-records" style={primaryLinkStyle}>Review Activity Records</Link>
          <Link to="/conversion-factors" style={secondaryLinkStyle}>Review Conversion Factors</Link>
        </div>
      </section>
    </div>
  );
}

function ExampleRow({
  activityType,
  quantity,
  unit,
  province,
  note,
}: {
  activityType: string;
  quantity: string;
  unit: string;
  province: string;
  note?: string;
}) {
  return (
    <div style={exampleRowStyle}>
      <strong>{activityType}</strong>
      <span>{quantity} {unit}</span>
      <span>2026-06-30</span>
      <span>{province}, Canada</span>
      {note ? <span style={mutedTextStyle}>{note}</span> : null}
    </div>
  );
}

function escapeCSV(value: unknown) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const pageStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 24px 48px',
  color: '#0f172a',
};

const heroStyle: React.CSSProperties = {
  padding: 28,
  borderRadius: 12,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  marginBottom: 24,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#047857',
  fontSize: 13,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0',
  fontSize: 34,
  lineHeight: 1.1,
};

const subtitleStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: 0,
  color: '#475569',
  fontSize: 16,
  lineHeight: 1.6,
};

const introSupportStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: '10px 0 0',
  color: '#64748b',
  fontSize: 15,
  lineHeight: 1.6,
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 18,
};

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid #047857',
  background: '#047857',
  color: '#fff',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};

const primaryLinkStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  textDecoration: 'none',
};

const secondaryLinkStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 800,
  textDecoration: 'none',
};

const sectionStyle: React.CSSProperties = {
  padding: 22,
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #e2e8f0',
  marginBottom: 24,
};

const calloutStyle: React.CSSProperties = {
  ...sectionStyle,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 22,
};

const bodyTextStyle: React.CSSProperties = {
  color: '#475569',
  lineHeight: 1.6,
};

const unitNoteStyle: React.CSSProperties = {
  ...bodyTextStyle,
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  fontSize: 14,
};

const categoryGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 14,
};

const categoryCardStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#fff',
};

const categoryHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  marginBottom: 10,
};

const cardTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
};

const statusPillStyle: React.CSSProperties = {
  width: 'fit-content',
  padding: '4px 8px',
  borderRadius: 999,
  background: '#ecfdf5',
  color: '#047857',
  border: '1px solid #bbf7d0',
  fontSize: 12,
  fontWeight: 800,
};

const smallTextStyle: React.CSSProperties = {
  color: '#475569',
  fontSize: 14,
  lineHeight: 1.5,
};

const listBlockStyle: React.CSSProperties = {
  marginTop: 10,
};

const listStyle: React.CSSProperties = {
  margin: '6px 0 0',
  paddingLeft: 20,
  color: '#475569',
  lineHeight: 1.5,
};

const noteStyle: React.CSSProperties = {
  color: '#475569',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 10,
  fontSize: 13,
  lineHeight: 1.45,
};

const columnsGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  margin: '14px 0',
};

const columnPillStyle: React.CSSProperties = {
  padding: '6px 9px',
  borderRadius: 999,
  background: '#f1f5f9',
  color: '#334155',
  fontSize: 13,
  fontWeight: 700,
};

const exampleGridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 10,
};

const exampleRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 10,
  padding: 12,
  borderRadius: 10,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
};

const mutedTextStyle: React.CSSProperties = {
  color: '#64748b',
};

const checklistGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: 12,
};

const checkItemStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '28px 1fr',
  gap: 10,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const checkIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 999,
  background: '#dcfce7',
  color: '#047857',
  fontWeight: 900,
};

const workflowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 10,
  marginTop: 16,
};

const workflowStepStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#0f172a',
  fontWeight: 700,
};

const workflowNumberStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: 999,
  background: '#ecfdf5',
  color: '#047857',
  fontSize: 12,
  fontWeight: 900,
  flexShrink: 0,
};

const issueGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12,
  marginTop: 14,
};

const issueItemStyle: React.CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: 12,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const issueBadgeStyle: React.CSSProperties = {
  width: 'fit-content',
  padding: '4px 8px',
  borderRadius: 999,
  background: '#fff',
  border: '1px solid #e2e8f0',
  color: '#334155',
  fontSize: 12,
  fontWeight: 800,
};
