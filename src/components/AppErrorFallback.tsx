import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import { captureFrontendException } from '../sentry';

type AppErrorFallbackProps = {
  error?: Error | null;
  componentStack?: string;
  onRefresh?: () => void;
  showTechnicalDetails?: boolean;
};

type AppErrorBoundaryProps = {
  children: ReactNode;
  onRefresh?: () => void;
  showTechnicalDetails?: boolean;
};

type AppErrorBoundaryState = {
  error: Error | null;
  componentStack?: string;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ componentStack: errorInfo.componentStack ?? undefined });
    captureFrontendException(error, { componentStack: errorInfo.componentStack });

    if (import.meta.env.DEV) {
      console.error('CarbonLite frontend error boundary caught an error.', error, errorInfo);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <AppErrorFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
          onRefresh={this.props.onRefresh}
          showTechnicalDetails={this.props.showTechnicalDetails}
        />
      );
    }

    return this.props.children;
  }
}

export function AppErrorFallback({
  error,
  componentStack,
  onRefresh = () => window.location.reload(),
  showTechnicalDetails = import.meta.env.DEV,
}: AppErrorFallbackProps) {
  const shouldShowTechnicalDetails = Boolean(showTechnicalDetails && (error || componentStack));

  return (
    <div style={fallbackStyle}>
      <div style={cardStyle}>
        <h1 style={titleStyle}>Something went wrong.</h1>
        <p style={textStyle}>
          Something went wrong. Please refresh the page or contact{' '}
          <a href="mailto:hello@carbonliteapp.ca" style={linkStyle}>
            hello@carbonliteapp.ca
          </a>
          .
        </p>
        <button type="button" onClick={onRefresh} style={buttonStyle}>
          Refresh page
        </button>
        {shouldShowTechnicalDetails ? (
          <details style={detailsStyle}>
            <summary style={summaryStyle}>Technical details</summary>
            <pre style={preStyle}>
              {[error?.message, componentStack].filter(Boolean).join('\n\n')}
            </pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}

const fallbackStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8fafc',
  padding: 24,
};

const cardStyle: CSSProperties = {
  maxWidth: 460,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  background: '#fff',
  padding: 28,
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.12)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 26,
};

const textStyle: CSSProperties = {
  color: '#475569',
  lineHeight: 1.6,
};

const linkStyle: CSSProperties = {
  color: '#047857',
  fontWeight: 700,
};

const buttonStyle: CSSProperties = {
  border: '1px solid #047857',
  borderRadius: 8,
  background: '#047857',
  color: '#fff',
  padding: '10px 14px',
  fontWeight: 800,
  cursor: 'pointer',
};

const detailsStyle: CSSProperties = {
  marginTop: 20,
  borderTop: '1px solid #e2e8f0',
  paddingTop: 16,
};

const summaryStyle: CSSProperties = {
  color: '#334155',
  cursor: 'pointer',
  fontWeight: 700,
};

const preStyle: CSSProperties = {
  marginTop: 12,
  maxHeight: 240,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  borderRadius: 8,
  background: '#0f172a',
  color: '#e2e8f0',
  padding: 12,
  fontSize: 12,
  lineHeight: 1.5,
};
