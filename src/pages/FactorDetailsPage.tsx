import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FactorHistoryResponse,
  FactorVersion,
  FactorVersionsResponse,
  FactorVersionUsage,
  getFactorHistory,
  getFactorVersion,
  getFactorVersions,
  getFactorVersionUsage,
} from '../services/factorVersions';

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  VERIFIED: 'Verified',
  OFFICIAL: 'Official',
  DEPRECATED: 'Deprecated',
  ARCHIVED: 'Archived',
};

const pageStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 24px 48px',
};

const stickyHeaderStyle: React.CSSProperties = {
  position: 'sticky',
  top: 73,
  zIndex: 5,
  background: '#fafafa',
  borderBottom: '1px solid #e5e7eb',
  padding: '14px 0 16px',
  marginBottom: 18,
};

const headerInnerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 16,
  flexWrap: 'wrap',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 16,
};

const fullWidthCardStyle: React.CSSProperties = {
  gridColumn: '1 / -1',
};

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 18,
  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 14px',
  fontSize: 16,
  color: '#0f172a',
};

const labelStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0,
};

const valueStyle: React.CSSProperties = {
  marginTop: 4,
  color: '#0f172a',
  fontWeight: 650,
  overflowWrap: 'anywhere',
};

const mutedStyle: React.CSSProperties = {
  color: '#64748b',
  fontSize: 13,
};

const buttonStyle: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  borderRadius: 8,
  padding: '9px 12px',
  fontWeight: 750,
  cursor: 'pointer',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#047857',
  borderColor: '#047857',
  color: '#fff',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 760,
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f8fafc',
  fontSize: 12,
  color: '#475569',
};

const tdStyle: React.CSSProperties = {
  padding: '11px 12px',
  borderBottom: '1px solid #eef2f7',
  fontSize: 14,
  verticalAlign: 'top',
};

function formatStatus(value?: string | null) {
  return statusLabels[value ?? ''] ?? value ?? 'Unknown';
}

function statusBadgeStyle(status?: string | null): React.CSSProperties {
  const normalized = status ?? '';
  const colorMap: Record<string, { bg: string; fg: string; border: string }> = {
    OFFICIAL: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
    VERIFIED: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
    DRAFT: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
    DEPRECATED: { bg: '#f1f5f9', fg: '#475569', border: '#cbd5e1' },
    ARCHIVED: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
  };
  const colors = colorMap[normalized] ?? colorMap.DEPRECATED;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '4px 9px',
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    color: colors.fg,
    fontSize: 12,
    fontWeight: 800,
  };
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function titleCase(value?: string | null) {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function productionReady(version: FactorVersion) {
  return Boolean(
    version.verified &&
      ['VERIFIED', 'OFFICIAL'].includes(version.status) &&
      version.source?.isOfficial &&
      version.source?.isActive,
  );
}

export function FactorDetailsPage() {
  const { factorVersionId } = useParams();
  const [version, setVersion] = useState<FactorVersion | null>(null);
  const [versions, setVersions] = useState<FactorVersionsResponse | null>(null);
  const [history, setHistory] = useState<FactorHistoryResponse | null>(null);
  const [usage, setUsage] = useState<FactorVersionUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    void loadFactorDetails();
  }, [factorVersionId]);

  async function loadFactorDetails() {
    if (!factorVersionId) return;

    setLoading(true);
    setError('');

    try {
      const loadedVersion = await getFactorVersion(factorVersionId);
      setVersion(loadedVersion);
      const [loadedVersions, loadedHistory, loadedUsage] = await Promise.all([
        getFactorVersions(loadedVersion.factorId, true),
        getFactorHistory(loadedVersion.factorId),
        getFactorVersionUsage(loadedVersion.id),
      ]);
      setVersions(loadedVersions);
      setHistory(loadedHistory);
      setUsage(loadedUsage);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load factor details. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    setCopyMessage(`${label} copied.`);
    window.setTimeout(() => setCopyMessage(''), 2500);
  }

  const citation = useMemo(() => {
    if (!version) return '';
    if (version.citationText) return version.citationText;
    const source = version.source;
    if (!source) return 'Source not specified';
    return [
      source.sourceShortName || source.sourceAuthority,
      source.sourceYear,
      source.sourceDocument,
      version.sourcePage ? `page ${version.sourcePage}` : null,
      version.sourceTable ? version.sourceTable : null,
    ]
      .filter(Boolean)
      .join(' - ');
  }, [version]);

  if (loading) {
    return <section style={pageStyle}>Loading factor details...</section>;
  }

  if (error || !version) {
    return (
      <section style={pageStyle}>
        <div style={errorStyle}>{error || 'Factor details were not found.'}</div>
        <Link to="/factor-sources" style={buttonStyle}>
          Back to Factor Sources
        </Link>
      </section>
    );
  }

  const source = version.source;
  const ready = productionReady(version);

  return (
    <section style={pageStyle}>
      <div style={stickyHeaderStyle}>
        <div style={headerInnerStyle}>
          <div>
            <div style={{ ...mutedStyle, marginBottom: 6 }}>Factor Details</div>
            <h1 style={{ margin: 0, color: '#0f172a' }}>
              {version.displayName || 'Emission Factor'}
            </h1>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={statusBadgeStyle(version.status)}>{formatStatus(version.status)}</span>
              {version.verified ? <span style={statusBadgeStyle('VERIFIED')}>Verified</span> : null}
              <span style={statusBadgeStyle(ready ? 'OFFICIAL' : 'DRAFT')}>
                {ready ? 'Production Ready' : 'Review Required'}
              </span>
              <span style={versionPillStyle}>{version.version}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {version.status === 'DRAFT' ? (
              <button type="button" style={primaryButtonStyle}>
                Edit Draft
              </button>
            ) : null}
            <button type="button" style={buttonStyle}>
              Create New Version
            </button>
            {source?.sourceUrl ? (
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={buttonStyle}
              >
                View Source
              </a>
            ) : null}
            <button
              type="button"
              style={buttonStyle}
              onClick={() => void copyText(version.id, 'Factor version ID')}
            >
              Copy Factor ID
            </button>
          </div>
        </div>
        {copyMessage ? <div style={successInlineStyle}>{copyMessage}</div> : null}
      </div>

      <div style={gridStyle}>
        <Card title="Basic Information">
          <InfoGrid>
            <Info label="Category" value={titleCase(version.source?.publisherType)} />
            <Info label="Activity Type" value={titleCase(version.displayName)} />
            <Info label="Fuel Type" value={titleCase(version.displayName)} />
            <Info label="Scope" value="Source-specific" />
            <Info label="Description" value={version.notes || 'No description provided.'} wide />
            <Info label="Jurisdiction" value={version.jurisdictionRegion || '-'} />
            <Info label="Country" value={version.jurisdictionCountry || '-'} />
            <Info label="Applicable Industry" value="Future field" />
          </InfoGrid>
        </Card>

        <Card title="Factor Information">
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Factor Value</div>
            <div style={factorValueStyle}>{formatNumber(version.factorValue)}</div>
          </div>
          <InfoGrid>
            <Info label="Input Unit" value={version.inputUnit} />
            <Info label="Output Unit" value={version.resultUnit} />
            <Info label="Factor Year" value={version.factorYear ?? '-'} />
            <Info label="Effective From" value={formatDate(version.effectiveFrom)} />
            <Info label="Effective To" value={formatDate(version.effectiveTo)} />
            <Info label="Calculation Notes" value={version.notes || 'No calculation notes provided.'} wide />
          </InfoGrid>
        </Card>

        <Card title="Source Information" style={fullWidthCardStyle}>
          <InfoGrid>
            <Info label="Source Authority" value={source?.sourceAuthority || 'Source not specified'} />
            <Info label="Source Document" value={source?.sourceDocument || '-'} />
            <Info label="Source Version" value={source?.sourceVersion || '-'} />
            <Info label="Source Year" value={source?.sourceYear ?? '-'} />
            <Info label="Publisher Type" value={titleCase(source?.publisherType)} />
            <Info label="Official Source" value={source?.isOfficial ? 'Yes' : 'No'} />
            <Info label="Publication Date" value={formatDate(source?.publishedDate)} />
            <Info label="Page" value={version.sourcePage || source?.page || '-'} />
            <Info label="Table" value={version.sourceTable || source?.tableReference || '-'} />
            <Info label="Section" value={version.sourceSection || '-'} />
            <Info label="Citation" value={citation} wide />
            <Info
              label="Source URL"
              value={
                source?.sourceUrl ? (
                  <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                    {source.sourceUrl}
                  </a>
                ) : (
                  '-'
                )
              }
              wide
            />
          </InfoGrid>
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {source?.sourceUrl ? (
              <a href={source.sourceUrl} target="_blank" rel="noreferrer" style={primaryButtonStyle}>
                Open PDF
              </a>
            ) : null}
            <button type="button" style={buttonStyle} onClick={() => void copyText(citation, 'Citation')}>
              Copy Citation
            </button>
            <Link to="/factor-sources" style={buttonStyle}>
              View Source Details
            </Link>
          </div>
        </Card>

        <Card title="Governance">
          <InfoGrid>
            <Info label="Status" value={<span style={statusBadgeStyle(version.status)}>{formatStatus(version.status)}</span>} />
            <Info label="Confidence Level" value={titleCase(version.confidenceLevel)} />
            <Info label="Verified" value={version.verified ? 'Yes' : 'No'} />
            <Info label="Reviewed By" value={version.reviewedBy || '-'} />
            <Info label="Reviewed At" value={formatDateTime(version.reviewedAt)} />
            <Info label="Approval Source" value={version.approvalSource || '-'} />
            <Info label="Production Ready" value={ready ? 'Yes' : 'No'} />
            <Info label="Review Notes" value={version.reviewNotes || 'No review notes provided.'} wide />
          </InfoGrid>
        </Card>

        <Card title="Usage">
          <div style={usageGridStyle}>
            <UsageMetric label="Reports using this factor" value={usage?.reportsUsingThisFactor ?? 0} />
            <UsageMetric label="Activity records" value={usage?.activityRecordsUsingThisFactor ?? 0} />
            <UsageMetric label="Calculations" value={usage?.calculations ?? 0} />
            <UsageMetric label="Organizations" value={usage?.organizations ?? 0} />
          </div>
          {(usage?.calculations ?? 0) === 0 ? (
            <p style={{ ...mutedStyle, marginBottom: 0 }}>This factor has not yet been used.</p>
          ) : null}
        </Card>

        <Card title="Version History" style={fullWidthCardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Version</th>
                  <th style={thStyle}>Factor Value</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Year</th>
                  <th style={thStyle}>Effective Dates</th>
                  <th style={thStyle}>Updated</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(versions?.items ?? []).map((item) => (
                  <tr
                    key={item.id}
                    style={item.id === version.id ? { background: '#f0fdf4' } : undefined}
                  >
                    <td style={tdStyle}>
                      <strong>{item.version}</strong>
                      {item.id === version.id ? <div style={mutedStyle}>Current view</div> : null}
                    </td>
                    <td style={tdStyle}>{formatNumber(item.factorValue)} {item.resultUnit}</td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(item.status)}>{formatStatus(item.status)}</span>
                    </td>
                    <td style={tdStyle}>{item.factorYear ?? '-'}</td>
                    <td style={tdStyle}>
                      {formatDate(item.effectiveFrom)} to {formatDate(item.effectiveTo)}
                    </td>
                    <td style={tdStyle}>{formatDateTime(item.updatedAt)}</td>
                    <td style={tdStyle}>
                      <Link to={`/factor-details/${item.id}`} style={buttonStyle}>
                        View Version
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Audit History" style={fullWidthCardStyle}>
          {(history?.items ?? []).length === 0 ? (
            <p style={mutedStyle}>No audit history recorded yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {(history?.items ?? []).map((item) => (
                <div key={item.id} style={timelineItemStyle}>
                  <div style={{ fontWeight: 800 }}>{formatDateTime(item.createdAt)}</div>
                  <div>{titleCase(item.action)}</div>
                  {item.reason ? <div style={mutedStyle}>{item.reason}</div> : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Related Factors" style={fullWidthCardStyle}>
          <p style={{ ...mutedStyle, marginTop: 0 }}>
            Related factors for the same activity category and jurisdiction will appear here as
            the governed library grows.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Diesel', 'Gasoline', 'Natural Gas', 'Electricity'].map((label) => (
              <span key={label} style={relatedPillStyle}>{label}</span>
            ))}
          </div>
        </Card>

        <Card title="Future Governance" style={fullWidthCardStyle}>
          <div style={futureGridStyle}>
            <span>Source Monitoring</span>
            <span>Update Notifications</span>
            <span>Approval Workflow</span>
            <span>Reviewer Comments</span>
            <span>AI Explanation</span>
          </div>
        </Card>
      </div>
    </section>
  );
}

function Card({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section style={{ ...cardStyle, ...style }}>
      <h2 style={sectionTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div style={infoGridStyle}>{children}</div>;
}

function Info({
  label,
  value,
  wide,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div style={wide ? { gridColumn: '1 / -1' } : undefined}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value || '-'}</div>
    </div>
  );
}

function UsageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div style={usageMetricStyle}>
      <div style={{ fontSize: 24, fontWeight: 850, color: '#0f172a' }}>{value}</div>
      <div style={mutedStyle}>{label}</div>
    </div>
  );
}

const infoGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
  gap: 14,
};

const factorValueStyle: React.CSSProperties = {
  fontSize: 34,
  lineHeight: 1.1,
  fontWeight: 900,
  color: '#047857',
};

const usageGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 10,
  marginBottom: 12,
};

const usageMetricStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  background: '#f8fafc',
};

const versionPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 999,
  padding: '4px 9px',
  border: '1px solid #dbeafe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12,
  fontWeight: 800,
};

const successInlineStyle: React.CSSProperties = {
  marginTop: 10,
  color: '#047857',
  fontWeight: 750,
};

const errorStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: '12px 14px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#991b1b',
  fontWeight: 750,
};

const timelineItemStyle: React.CSSProperties = {
  borderLeft: '3px solid #10b981',
  paddingLeft: 12,
  display: 'grid',
  gap: 3,
};

const relatedPillStyle: React.CSSProperties = {
  border: '1px solid #d1fae5',
  background: '#ecfdf5',
  color: '#047857',
  borderRadius: 999,
  padding: '6px 10px',
  fontWeight: 750,
};

const futureGridStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  color: '#64748b',
  fontSize: 13,
};
