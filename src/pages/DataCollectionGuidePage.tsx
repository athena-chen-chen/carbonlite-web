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
    title: 'Travel, Hotel, Shipping',
    documents: 'Travel exports, hotel invoices, shipping or freight invoices',
    required: ['Activity type', 'Quantity', 'Unit', 'Date'],
    optional: ['Route', 'Vendor', 'Facility or department', 'Cost'],
    units: 'nights, km, ton-km when supported',
    status: 'Calculable when matching factors exist',
    note: 'These records are useful for consultant review even when factors are not yet configured.',
  },
];

const checklist = [
  {
    label: 'Activity type is selected',
    why: 'CarbonLite needs to know whether the record is diesel, electricity, natural gas, water, hotel, or another activity.',
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
          A practical checklist for Canadian SMEs and sustainability consultants preparing utility bills,
          invoices, spreadsheets, and operational records for traceable emissions reporting.
        </p>
        <div style={actionRowStyle}>
          <button type="button" onClick={downloadTemplate} style={primaryButtonStyle}>
            Download SME Data Template
          </button>
          <Link to="/input-data" style={secondaryLinkStyle}>Go to Input Data</Link>
          <Link to="/metrics-summary" style={secondaryLinkStyle}>View Data Readiness</Link>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>What Data Should I Collect?</h2>
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
        <h2 style={sectionTitleStyle}>How to Organize Spreadsheet Data</h2>
        <p style={bodyTextStyle}>
          Use one row per activity record. These columns work well with CarbonLite’s upload and review workflow.
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
        <h2 style={sectionTitleStyle}>Data Quality Checklist</h2>
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

      <section style={calloutStyle}>
        <h2 style={sectionTitleStyle}>How this connects to Calculation Review and Reports</h2>
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
  borderRadius: 16,
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
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
  color: '#334155',
  fontSize: 16,
  lineHeight: 1.6,
};

const actionRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 18,
};

const primaryButtonStyle: React.CSSProperties = {
  border: '1px solid #059669',
  background: '#059669',
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
  borderRadius: 16,
  background: '#fff',
  border: '1px solid #e2e8f0',
  marginBottom: 24,
};

const calloutStyle: React.CSSProperties = {
  ...sectionStyle,
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px',
  fontSize: 22,
};

const bodyTextStyle: React.CSSProperties = {
  color: '#334155',
  lineHeight: 1.6,
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
  background: '#f8fafc',
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
  color: '#0f766e',
  background: '#ecfeff',
  border: '1px solid #a5f3fc',
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
