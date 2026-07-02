import { Link, useParams } from 'react-router-dom';

type MethodologyContent = {
  title: string;
  subtitle: string;
  paragraphs: string[];
  facts: Array<[string, string]>;
};

const methodologyContent: Record<string, MethodologyContent> = {
  'water-emissions': {
    title: 'Water Emissions Methodology',
    subtitle: 'CarbonLite Pilot Methodology',
    paragraphs: [
      'Water usage is tracked in CarbonLite as an operational metric. For the current pilot version, water emissions are not calculated by default because water-related emissions vary significantly depending on municipal treatment, distribution systems, wastewater handling, location, and reporting methodology.',
      'CarbonLite may support optional estimated water emissions in the future when a reviewed water emissions factor is available.',
      'This methodology page is provided for pilot validation and product demonstration purposes. Organizations should use official or reviewed factors when preparing formal sustainability or regulatory reports.',
    ],
    facts: [
      ['Category', 'Water'],
      ['Default treatment', 'Tracked metric'],
      ['Emissions calculation', 'Not enabled by default'],
      ['Confidence level', 'Pilot Estimate'],
      ['Intended use', 'Pilot workflow validation only'],
      ['Regulatory use', 'Not intended for regulatory reporting'],
    ],
  },
  'default-factors': {
    title: 'CarbonLite Default Factors Methodology',
    subtitle: 'CarbonLite System Defaults',
    paragraphs: [
      'CarbonLite system default factors are included for pilot workflow validation and product demonstration. They are not intended to replace official government, jurisdiction-specific, or organization-approved emission factors for formal reporting.',
      'Users should review factor sources, jurisdiction, reporting year, confidence level, and verification status before using CarbonLite outputs for client-facing or regulatory reports.',
    ],
    facts: [
      ['Category', 'System default factors'],
      ['Default treatment', 'Pilot workflow validation'],
      ['Confidence level', 'Varies by factor'],
      ['Verification status', 'Internal Review Required unless otherwise stated'],
      ['Regulatory use', 'Not intended to replace reviewed official factors'],
    ],
  },
};

export default function MethodologyPage() {
  const { slug = 'default-factors' } = useParams();
  const content = methodologyContent[slug] ?? methodologyContent['default-factors'];

  return (
    <main style={pageStyle}>
      <Link to="/" style={backLinkStyle}>CarbonLite AI</Link>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>{content.subtitle}</p>
        <h1 style={titleStyle}>{content.title}</h1>
      </section>

      <section style={cardStyle}>
        {content.paragraphs.map((paragraph) => (
          <p key={paragraph} style={paragraphStyle}>{paragraph}</p>
        ))}
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Current Status</h2>
        <dl style={factsGridStyle}>
          {content.facts.map(([label, value]) => (
            <div key={label} style={factItemStyle}>
              <dt style={factLabelStyle}>{label}</dt>
              <dd style={factValueStyle}>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 900,
  margin: '0 auto',
  padding: '32px 24px 56px',
  color: '#0f172a',
};

const backLinkStyle: React.CSSProperties = {
  color: '#047857',
  fontWeight: 800,
  textDecoration: 'none',
};

const heroStyle: React.CSSProperties = {
  marginTop: 32,
  marginBottom: 24,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: '#047857',
  fontWeight: 800,
  letterSpacing: 0,
};

const titleStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 42,
  lineHeight: 1.1,
};

const cardStyle: React.CSSProperties = {
  border: '1px solid #dbeafe',
  borderRadius: 12,
  background: '#fff',
  padding: 24,
  marginBottom: 18,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)',
};

const paragraphStyle: React.CSSProperties = {
  margin: '0 0 14px',
  color: '#475569',
  lineHeight: 1.75,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: 20,
};

const factsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 12,
  margin: 0,
};

const factItemStyle: React.CSSProperties = {
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 14,
  background: '#f8fafc',
};

const factLabelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
};

const factValueStyle: React.CSSProperties = {
  margin: '6px 0 0',
  color: '#0f172a',
  fontWeight: 750,
};
