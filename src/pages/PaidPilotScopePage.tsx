import jsPDF from 'jspdf';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupportEmail } from '../config/api';

export const PAID_PILOT_PDF_FILENAME = 'CarbonLite_Paid_Pilot_Scope_v0.1.pdf';
export const PAID_PILOT_CONSENT_VERSION = 'paid-pilot-consent-v0.1';
export const PAID_PILOT_CONSENT_PARAGRAPH =
  'This paid pilot is for workflow evaluation and emissions data readiness review only. CarbonLite outputs are not certified emissions reports and should be reviewed by qualified sustainability professionals before formal use.';
export const PAID_PILOT_CONSENT_EXPANDED =
  'CarbonLite does not provide regulatory compliance advice, third-party verification, audit assurance, or carbon credit eligibility determination. Emission factors, assumptions, source documents, and calculations should be reviewed before being used for formal reporting or external decision-making.';

type PaidPilotSection = {
  title: string;
  intro?: string;
  items: string[];
};

export const PAID_PILOT_SCOPE_SECTIONS: PaidPilotSection[] = [
  {
    title: 'Overview',
    items: [
      'CarbonLite helps SMEs and sustainability consultants organize emissions activity data, review factor matching, and generate traceable pilot reports.',
      'The paid pilot is designed to validate workflow fit, data readiness, and reporting clarity using a limited and clearly scoped dataset.',
    ],
  },
  {
    title: 'What the Paid Pilot Includes',
    items: [
      'Workspace setup for one organization or one controlled sample workspace.',
      'Guided import of a limited activity dataset from spreadsheet, CSV, JSON, or supported document review flows.',
      'Activity record review, factor matching, calculation traceability, and data quality review.',
      'Pilot PDF and CSV report exports for review and feedback conversations.',
      'One structured feedback session to review workflow fit, report clarity, and pilot limitations.',
    ],
  },
  {
    title: 'What Is Not Included',
    items: [
      'Third-party verification, audit assurance, or certification.',
      'Formal regulatory submission preparation.',
      'GHG Protocol assurance or legal compliance sign-off.',
      'Enterprise SSO, billing, custom procurement workflows, or production data migration.',
      'Unlimited datasets, unlimited report cycles, or unrestricted custom factor review.',
    ],
  },
  {
    title: 'Supported Pilot Data',
    items: [
      'Electricity for supported Canadian pilot jurisdictions: AB, BC, and ON.',
      'Natural Gas, Gasoline, and Diesel as Scope 1 pilot activity types.',
      'Air Travel, Hotel, Ground Transport, and Shipping as supported Scope 3 pilot activity types where factors are available.',
      'Water as a tracked operational metric only, excluded from GHG totals.',
      'Rows with missing province, missing factor, unsupported activity, invalid quantity, or unit mismatch are flagged for review and excluded from calculated emissions totals.',
    ],
  },
  {
    title: 'Pilot Deliverables',
    items: [
      'Configured pilot workspace.',
      'Reviewed activity record set with ready, tracked-only, and review-required classifications.',
      'Calculation Review page showing totals, scope breakdowns, data quality notes, and calculation trail.',
      'Pilot PDF report and pilot CSV export for stakeholder review.',
      'Summary of observed workflow gaps, unsupported data needs, and recommended next steps.',
    ],
  },
  {
    title: 'Client Responsibilities',
    items: [
      'Provide sample activity data and source files that can be used for pilot review.',
      'Confirm organization, reporting period, facilities, and activity context.',
      'Review flagged rows, source evidence, and factor assumptions.',
      'Provide feedback on usability, workflow fit, and report wording.',
      'Avoid using pilot outputs as formal regulatory, audited, or certified reports.',
    ],
  },
  {
    title: 'Typical Timeline',
    items: [
      'Day 1: Workspace setup and dataset intake.',
      'Days 2-3: Import review, activity record cleanup, and factor matching review.',
      'Days 4-5: Report generation, feedback session, and next-step summary.',
      'Timeline may vary based on data quality, source file complexity, and reviewer availability.',
    ],
  },
  {
    title: 'Pilot Fee',
    items: [
      'Suggested paid pilot range: CAD $500-$1,500 depending on dataset complexity, review needs, and number of feedback sessions.',
      'Final scope and fee should be confirmed before any paid pilot begins.',
    ],
  },
  {
    title: 'Important Limitations',
    items: [
      'CarbonLite pilot outputs are for workflow validation and structured feedback only.',
      'The pilot report is not a certified GHG emissions report and does not constitute audit assurance, verification, legal advice, or regulatory approval.',
      'Factor sources, assumptions, and review status should be checked by a qualified reviewer before using outputs in client-facing or formal reporting contexts.',
      'CarbonLite does not guarantee completeness for unsupported jurisdictions, unsupported activity types, or source files that are outside the current pilot scope.',
    ],
  },
  {
    title: 'Next Step',
    items: [
      'Contact the CarbonLite team to confirm pilot fit, dataset scope, expected timeline, and access requirements.',
    ],
  },
];

function buildPaidPilotMailtoHref(email: string) {
  return `mailto:${email}?subject=${encodeURIComponent('CarbonLite Paid Pilot Inquiry')}`;
}

function drawWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadPaidPilotScopePdf(supportEmail = getSupportEmail()) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const generatedDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  let y = margin;

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 150, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CarbonLite Paid Pilot Scope', margin, 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  y = drawWrappedText(
    doc,
    'A limited emissions data readiness and reporting workflow pilot for SMEs and sustainability consultants.',
    margin,
    88,
    contentWidth,
    14,
  );
  doc.text(`Generated: ${generatedDate}`, margin, 126);
  doc.text(`Contact: ${supportEmail}`, margin + 210, 126);

  y = 184;
  doc.setTextColor(15, 23, 42);

  PAID_PILOT_SCOPE_SECTIONS.forEach((section) => {
    ensureSpace(76);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(section.title, margin, y);
    y += 20;

    if (section.intro) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      y = drawWrappedText(doc, section.intro, margin, y, contentWidth, 13) + 6;
    }

    section.items.forEach((item) => {
      ensureSpace(42);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('-', margin, y);
      y = drawWrappedText(doc, item, margin + 14, y, contentWidth - 14, 13) + 6;
    });

    y += 8;
  });

  ensureSpace(96);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Paid Pilot Acknowledgement', margin, y);
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = drawWrappedText(doc, PAID_PILOT_CONSENT_PARAGRAPH, margin, y, contentWidth, 13) + 6;
  y = drawWrappedText(doc, PAID_PILOT_CONSENT_EXPANDED, margin, y, contentWidth, 13) + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Acknowledgement version: ${PAID_PILOT_CONSENT_VERSION}`, margin, y);

  ensureSpace(50);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Contact CarbonLite', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(supportEmail, margin + 105, y);

  doc.save(PAID_PILOT_PDF_FILENAME);
}

export default function PaidPilotScopePage() {
  const supportEmail = getSupportEmail();
  const contactHref = useMemo(() => buildPaidPilotMailtoHref(supportEmail), [supportEmail]);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    document.title = 'CarbonLite Paid Pilot Scope';
  }, []);

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={headerInnerStyle}>
          <Link to="/" style={brandLinkStyle} aria-label="Go to CarbonLite home">
            <span style={logoStyle}>CL</span>
            <span>
              <span style={brandTextStyle}>CarbonLite</span>
              <span style={brandSubtextStyle}>Paid Pilot Scope</span>
            </span>
          </Link>
          <div style={headerActionsStyle}>
            <Link to="/pilot" style={secondaryLinkStyle}>Pilot Program</Link>
            <a href={contactHref} style={primaryLinkStyle}>Contact CarbonLite</a>
          </div>
        </div>
      </header>

      <main style={mainStyle}>
        <section style={heroStyle}>
          <div style={eyebrowStyle}>Pilot feedback version v0.1</div>
          <h1 style={titleStyle}>CarbonLite Paid Pilot Scope</h1>
          <p style={subtitleStyle}>
            A limited emissions data readiness and reporting workflow pilot for SMEs and sustainability consultants.
          </p>
          <div style={heroActionsStyle}>
            <a href={contactHref} style={primaryLinkStyle}>Contact CarbonLite</a>
            <button
              type="button"
              onClick={() => downloadPaidPilotScopePdf(supportEmail)}
              style={downloadButtonStyle(!consentAccepted)}
              disabled={!consentAccepted}
              title={!consentAccepted ? 'Confirm the paid pilot acknowledgement before downloading.' : undefined}
            >
              Download Paid Pilot Scope PDF
            </button>
          </div>
        </section>

        <section style={contentGridStyle} aria-label="Paid pilot scope details">
          {PAID_PILOT_SCOPE_SECTIONS.map((section) => (
            <article key={section.title} style={sectionCardStyle}>
              <h2 style={sectionTitleStyle}>{section.title}</h2>
              {section.intro ? <p style={sectionIntroStyle}>{section.intro}</p> : null}
              <ul style={listStyle}>
                {section.items.map((item) => (
                  <li key={item} style={listItemStyle}>
                    <span style={bulletStyle} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section style={consentCardStyle} aria-labelledby="paid-pilot-acknowledgement-title">
          <div>
            <h2 id="paid-pilot-acknowledgement-title" style={sectionTitleStyle}>Paid Pilot Acknowledgement</h2>
            <p style={consentTextStyle}>{PAID_PILOT_CONSENT_PARAGRAPH}</p>
            <p style={consentTextStyle}>{PAID_PILOT_CONSENT_EXPANDED}</p>
          </div>
          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(event) => setConsentAccepted(event.target.checked)}
              style={checkboxStyle}
            />
            <span>
              I understand that this paid pilot is for workflow evaluation and emissions data readiness review only,
              and that CarbonLite outputs are not certified emissions reports.
            </span>
          </label>
          <p style={consentVersionStyle}>Acknowledgement version: {PAID_PILOT_CONSENT_VERSION}</p>
        </section>

        <section style={ctaStyle}>
          <div>
            <h2 style={ctaTitleStyle}>Interested in a paid pilot?</h2>
            <p style={ctaTextStyle}>
              Contact us to confirm scope, dataset fit, and next steps for a limited pilot review.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (consentAccepted) {
                window.location.href = contactHref;
              }
            }}
            disabled={!consentAccepted}
            style={contactButtonStyle(!consentAccepted)}
          >
            Contact CarbonLite About Paid Pilot
          </button>
        </section>
      </main>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f8fafc',
  color: '#0f172a',
};

const headerStyle: React.CSSProperties = {
  borderBottom: '1px solid #e2e8f0',
  background: 'rgba(255, 255, 255, 0.94)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};

const headerInnerStyle: React.CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: '16px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
};

const brandLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  color: '#0f172a',
  textDecoration: 'none',
};

const logoStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  background: '#047857',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 900,
};

const brandTextStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 900,
  fontSize: 17,
};

const brandSubtextStyle: React.CSSProperties = {
  display: 'block',
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
};

const headerActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
};

const mainStyle: React.CSSProperties = {
  maxWidth: 1160,
  margin: '0 auto',
  padding: '40px 24px 56px',
};

const heroStyle: React.CSSProperties = {
  border: '1px solid #dbeafe',
  background: '#ffffff',
  borderRadius: 18,
  padding: '36px 36px 34px',
  boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
};

const eyebrowStyle: React.CSSProperties = {
  color: '#047857',
  fontWeight: 900,
  fontSize: 13,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const titleStyle: React.CSSProperties = {
  margin: '12px 0 0',
  fontSize: 42,
  lineHeight: 1.08,
  letterSpacing: 0,
};

const subtitleStyle: React.CSSProperties = {
  maxWidth: 780,
  margin: '18px 0 0',
  color: '#475569',
  fontSize: 18,
  lineHeight: 1.65,
};

const heroActionsStyle: React.CSSProperties = {
  marginTop: 26,
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const primaryLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  background: '#047857',
  color: '#fff',
  padding: '11px 16px',
  fontWeight: 900,
  textDecoration: 'none',
  border: '1px solid #047857',
  cursor: 'pointer',
};

const secondaryLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  background: '#fff',
  color: '#334155',
  padding: '11px 16px',
  fontWeight: 800,
  textDecoration: 'none',
  border: '1px solid #cbd5e1',
};

function downloadButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    ...secondaryLinkStyle,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };
}

const contentGridStyle: React.CSSProperties = {
  marginTop: 28,
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: 18,
};

const sectionCardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  padding: 22,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
  lineHeight: 1.3,
};

const sectionIntroStyle: React.CSSProperties = {
  margin: '10px 0 0',
  color: '#475569',
  lineHeight: 1.55,
};

const listStyle: React.CSSProperties = {
  listStyle: 'none',
  margin: '14px 0 0',
  padding: 0,
  display: 'grid',
  gap: 10,
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  color: '#334155',
  lineHeight: 1.55,
};

const bulletStyle: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 999,
  background: '#10b981',
  marginTop: 9,
  flexShrink: 0,
};

const ctaStyle: React.CSSProperties = {
  marginTop: 28,
  borderRadius: 16,
  background: '#0f172a',
  color: '#fff',
  padding: '24px 26px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const consentCardStyle: React.CSSProperties = {
  marginTop: 28,
  background: '#fff',
  border: '1px solid #bfdbfe',
  borderRadius: 16,
  padding: 24,
  display: 'grid',
  gap: 16,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const consentTextStyle: React.CSSProperties = {
  margin: '10px 0 0',
  color: '#334155',
  lineHeight: 1.65,
};

const checkboxLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
  padding: 14,
  borderRadius: 12,
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#1e3a8a',
  fontWeight: 800,
  lineHeight: 1.5,
};

const checkboxStyle: React.CSSProperties = {
  marginTop: 3,
  width: 18,
  height: 18,
  flexShrink: 0,
};

const consentVersionStyle: React.CSSProperties = {
  margin: 0,
  color: '#64748b',
  fontSize: 13,
  fontWeight: 700,
};

function contactButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    ...primaryLinkStyle,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
  };
}

const ctaTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 22,
};

const ctaTextStyle: React.CSSProperties = {
  margin: '8px 0 0',
  color: '#cbd5e1',
  lineHeight: 1.55,
};
