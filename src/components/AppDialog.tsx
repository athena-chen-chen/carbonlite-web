import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { getAppEnv } from '../config/api';
import { getUserFriendlyErrorMessage } from '../utils/userFriendlyErrors';

type DialogVariant = 'default' | 'danger';

type ErrorDialogOptions = {
  title?: string;
  message: string;
  technicalDetails?: string;
};

type ConfirmDialogOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
};

type DialogState =
  | ({
      kind: 'error';
    } & Required<Pick<ErrorDialogOptions, 'title' | 'message'>> &
      Pick<ErrorDialogOptions, 'technicalDetails'>)
  | ({
      kind: 'confirm';
      resolve: (confirmed: boolean) => void;
    } & Required<Pick<ConfirmDialogOptions, 'title' | 'message' | 'confirmLabel' | 'cancelLabel' | 'variant'>>);

type AppDialogContextValue = {
  showError: (options: ErrorDialogOptions | string) => void;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const closeDialog = useCallback((confirmed = false) => {
    setDialog((current) => {
      if (current?.kind === 'confirm') {
        current.resolve(confirmed);
      }
      return null;
    });
  }, []);

  const showError = useCallback((options: ErrorDialogOptions | string) => {
    const normalized =
      typeof options === 'string'
        ? { title: 'Something went wrong', message: getUserFriendlyErrorMessage(options) }
        : {
            title: options.title || 'Something went wrong',
            message: getUserFriendlyErrorMessage(options.message),
            technicalDetails:
              getAppEnv() === 'local' ? options.technicalDetails : undefined,
          };

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setDialog({
      kind: 'error',
      ...normalized,
    });
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: 'confirm',
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel || 'OK',
        cancelLabel: options.cancelLabel || 'Cancel',
        variant: options.variant || 'default',
        resolve,
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) {
      previousFocusRef.current?.focus?.();
      return;
    }

    const focusable = getFocusableElements(dialogRef.current);
    (focusable[0] || dialogRef.current)?.focus();
  }, [dialog]);

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(false);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(dialogRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <AppDialogContext.Provider value={{ showError, confirm }}>
      {children}
      {dialog ? (
        <div
          style={overlayStyle}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog(false);
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            tabIndex={-1}
            style={dialogStyle}
            onKeyDown={handleDialogKeyDown}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} style={titleStyle}>
              {dialog.title}
            </h2>
            <p id={bodyId} style={messageStyle}>
              {dialog.message}
            </p>
            {dialog.kind === 'error' && dialog.technicalDetails ? (
              <details style={detailsStyle}>
                <summary style={summaryStyle}>Technical details</summary>
                <pre style={technicalDetailsStyle}>{dialog.technicalDetails}</pre>
              </details>
            ) : null}
            <div style={actionRowStyle}>
              {dialog.kind === 'confirm' ? (
                <button type="button" style={secondaryButtonStyle} onClick={() => closeDialog(false)}>
                  {dialog.cancelLabel}
                </button>
              ) : null}
              <button
                type="button"
                style={
                  dialog.kind === 'confirm' && dialog.variant === 'danger'
                    ? dangerButtonStyle
                    : primaryButtonStyle
                }
                onClick={() => closeDialog(dialog.kind === 'confirm')}
              >
                {dialog.kind === 'confirm' ? dialog.confirmLabel : 'Close'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within <AppDialogProvider>');
  }
  return context;
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'));
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  background: 'rgba(15, 23, 42, 0.42)',
};

const dialogStyle: CSSProperties = {
  width: 'min(520px, 100%)',
  maxHeight: 'calc(100vh - 40px)',
  overflow: 'auto',
  borderRadius: 12,
  border: '1px solid #dbe4ea',
  background: '#ffffff',
  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.25)',
  padding: 24,
  outline: 'none',
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: '#0f172a',
  fontSize: 20,
  lineHeight: 1.25,
};

const messageStyle: CSSProperties = {
  margin: '12px 0 0',
  color: '#334155',
  lineHeight: 1.6,
};

const detailsStyle: CSSProperties = {
  marginTop: 16,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  padding: '10px 12px',
};

const summaryStyle: CSSProperties = {
  cursor: 'pointer',
  color: '#475569',
  fontWeight: 700,
};

const technicalDetailsStyle: CSSProperties = {
  margin: '10px 0 0',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#475569',
  fontSize: 12,
  lineHeight: 1.5,
};

const actionRowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 22,
};

const primaryButtonStyle: CSSProperties = {
  border: 0,
  borderRadius: 8,
  background: '#0f766e',
  color: '#ffffff',
  fontWeight: 700,
  padding: '10px 16px',
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: '#b91c1c',
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  background: '#ffffff',
  color: '#334155',
  fontWeight: 700,
  padding: '10px 16px',
  cursor: 'pointer',
};
