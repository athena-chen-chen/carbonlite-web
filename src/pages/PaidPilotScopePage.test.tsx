import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaidPilotScopePage, {
  PAID_PILOT_CONSENT_PARAGRAPH,
  PAID_PILOT_PDF_FILENAME,
  PAID_PILOT_SCOPE_SECTIONS,
} from './PaidPilotScopePage';

const pdfMock = vi.hoisted(() => ({
  addPage: vi.fn(),
  line: vi.fn(),
  rect: vi.fn(),
  save: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  setFont: vi.fn(),
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  text: vi.fn(),
}));

vi.mock('jspdf', () => ({
  default: vi.fn(function JsPDFMock() {
    return {
      ...pdfMock,
      internal: {
        pageSize: {
          getWidth: () => 612,
          getHeight: () => 792,
        },
      },
    };
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PaidPilotScopePage />
    </MemoryRouter>,
  );
}

describe('PaidPilotScopePage', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    Object.values(pdfMock).forEach((mock) => mock.mockClear());
  });

  it('renders the paid pilot scope content and conservative limitations', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'CarbonLite Paid Pilot Scope' })).toBeInTheDocument();
    expect(
      screen.getByText('A limited emissions data readiness and reporting workflow pilot for SMEs and sustainability consultants.'),
    ).toBeInTheDocument();

    PAID_PILOT_SCOPE_SECTIONS.forEach((section) => {
      expect(screen.getByRole('heading', { name: section.title })).toBeInTheDocument();
    });

    expect(screen.getByText(/not a certified GHG emissions report/i)).toBeInTheDocument();
    expect(screen.getByText(/does not constitute audit assurance/i)).toBeInTheDocument();
    expect(screen.queryByText(/audit-ready|compliance-ready|regulatory approved|guaranteed/i)).not.toBeInTheDocument();
  });

  it('requires paid pilot acknowledgement before contact or PDF download actions', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Paid Pilot Acknowledgement' })).toBeInTheDocument();
    expect(screen.getByText(PAID_PILOT_CONSENT_PARAGRAPH)).toBeInTheDocument();
    expect(screen.getAllByText(/workflow evaluation and emissions data readiness review only/i)).toHaveLength(2);
    expect(screen.getAllByText(/not certified emissions reports/i)).toHaveLength(2);
    expect(screen.getByText(/reviewed by qualified sustainability professionals before formal use/i)).toBeInTheDocument();

    const downloadButton = screen.getByRole('button', { name: /download paid pilot scope pdf/i });
    const contactButton = screen.getByRole('button', { name: /contact carbonlite about paid pilot/i });

    expect(downloadButton).toBeDisabled();
    expect(contactButton).toBeDisabled();

    await userEvent.click(screen.getByRole('checkbox', { name: /i understand that this paid pilot/i }));

    expect(downloadButton).toBeEnabled();
    expect(contactButton).toBeEnabled();
  });

  it('uses the configured support email for the contact CTA', () => {
    vi.stubEnv('VITE_SUPPORT_EMAIL', 'pilot@carbonliteapp.ca');

    renderPage();

    expect(screen.getAllByRole('link', { name: /contact carbonlite/i })[0]).toHaveAttribute(
      'href',
      'mailto:pilot@carbonliteapp.ca?subject=CarbonLite%20Paid%20Pilot%20Inquiry',
    );
  });

  it('falls back to the CarbonLite support email', () => {
    renderPage();

    expect(screen.getAllByRole('link', { name: /contact carbonlite/i })[0]).toHaveAttribute(
      'href',
      'mailto:hello@carbonliteapp.ca?subject=CarbonLite%20Paid%20Pilot%20Inquiry',
    );
  });

  it('downloads a PDF with the paid pilot scope sections', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('checkbox', { name: /i understand that this paid pilot/i }));
    await userEvent.click(screen.getByRole('button', { name: /download paid pilot scope pdf/i }));

    expect(pdfMock.save).toHaveBeenCalledWith(PAID_PILOT_PDF_FILENAME);
    expect(pdfMock.text).toHaveBeenCalledWith('CarbonLite Paid Pilot Scope', expect.any(Number), expect.any(Number));
    expect(pdfMock.text).toHaveBeenCalledWith('What the Paid Pilot Includes', expect.any(Number), expect.any(Number));
    expect(pdfMock.text).toHaveBeenCalledWith('Important Limitations', expect.any(Number), expect.any(Number));
    expect(pdfMock.text).toHaveBeenCalledWith('Paid Pilot Acknowledgement', expect.any(Number), expect.any(Number));
    expect(pdfMock.splitTextToSize).toHaveBeenCalledWith(
      expect.stringContaining('not a certified GHG emissions report'),
      expect.any(Number),
    );
  });
});
