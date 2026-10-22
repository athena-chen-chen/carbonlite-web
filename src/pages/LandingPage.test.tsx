import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthProvider';
import { trackEvent } from '../services/ga4.service';
import CarbonLiteLandingPage from './LandingPage';

vi.mock('../services/ga4.service', () => ({ trackEvent: vi.fn() }));

function LocationProbe() {
  return <output aria-label="Current route">{useLocation().pathname}</output>;
}
function renderLanding(authenticated = false) {
  if (authenticated) {
    localStorage.setItem('accessToken', 'valid-token');
    localStorage.setItem('currentUser', JSON.stringify({ email: 'user@example.com', organization: { name: 'KACH CANADA LTD.' } }));
  }
  return render(
    <MemoryRouter>
      <AuthProvider><CarbonLiteLandingPage /><LocationProbe /></AuthProvider>
    </MemoryRouter>,
  );
}
const actions = ['Set Boundary', 'Add Data', 'Resolve Issues', 'Calculation Results', 'Generate Report'];

it('offers Sign In and Request Pilot Access to public visitors', () => {
  renderLanding();
  const header = within(screen.getByRole('banner'));
  expect(header.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  expect(header.getByRole('button', { name: 'Request Pilot Access' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Dashboard|Open CarbonLite/ })).not.toBeInTheDocument();
});

it('makes Open CarbonLite the authenticated entry action', () => {
  renderLanding(true);
  const header = within(screen.getByRole('banner'));
  expect(header.getAllByRole('button')).toHaveLength(1);
  expect(header.getByRole('button', { name: 'Open CarbonLite' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Dashboard|Sign In|Logout/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Workspace: KACH CANADA LTD.')).not.toBeInTheDocument();
});

it.each([false, true])('limits hero actions and copy when authenticated=%s', (authenticated) => {
  renderLanding(authenticated);
  const hero = screen.getByRole('region', { name: /Turn bills, invoices, and spreadsheets/ });
  expect(within(hero).getAllByRole('button')).toHaveLength(1);
  expect(within(hero).getAllByRole('link')).toHaveLength(1);
  expect(within(hero).getByRole('button', { name: authenticated ? 'Open CarbonLite' : 'Request Pilot Access' })).toBeInTheDocument();
  expect(within(hero).getByRole('link', { name: 'Watch Demo' })).toHaveAttribute('href', '#demo-video');
  expect(within(hero).getByText('Organize source data, resolve missing information, apply traceable emission factors, and prepare a review-ready emissions package.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'See Sample Workflow' })).not.toBeInTheDocument();
});

it('uses the same five action labels for the workflow and demo', () => {
  renderLanding();
  const workflow = within(screen.getByRole('list', { name: 'Five steps to a review-ready report' }));
  expect(workflow.getAllByRole('listitem')).toHaveLength(5);
  expect(workflow.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(actions);
  expect(within(screen.getByRole('list', { name: 'Demo workflow' })).getAllByRole('listitem').map((item) => item.textContent?.replace('✓', ''))).toEqual(actions);
  expect(screen.queryByText(/canonical workflow|Review Results|Validate Calculations/)).not.toBeInTheDocument();
});

it('removes sample stats and prioritizes three outcomes and two audiences', () => {
  renderLanding();
  expect(screen.queryByText(/18 extracted|4 documents|14 records|workflow status/)).not.toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Why CarbonLite' })).getAllByRole('article')).toHaveLength(3);
  const audience = within(screen.getByRole('region', { name: 'Who It’s For' }));
  expect(audience.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Canadian SMEs', 'Sustainability consultants']);
  expect(audience.getByText(/finance, operations, and reporting teams/)).toBeInTheDocument();
});

it('consolidates trust, outputs and pilot limitations without middle pilot sections', () => {
  renderLanding();
  const trust = within(screen.getByRole('region', { name: 'Review-ready Output' }));
  for (const item of ['Source record', 'Emission factor', 'Jurisdiction & year', 'Calculation traceability', 'Executive Summary', 'Technical Emissions Report', 'CSV export']) {
    expect(trust.getByText(item)).toBeInTheDocument();
  }
  expect(trust.getByText('Pilot results require professional review before formal use.')).toBeInTheDocument();
  expect(screen.queryByText('Start with pilot access')).not.toBeInTheDocument();
  expect(screen.queryByText('Join the CarbonLite pilot')).not.toBeInTheDocument();
  // One header action, one hero action, one final action.
  expect(screen.getAllByRole('button', { name: 'Request Pilot Access' })).toHaveLength(3);
});

it('keeps navigation anchors attached to existing homepage content', () => {
  renderLanding();
  const nav = within(screen.getByRole('navigation', { name: 'Homepage' }));
  expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual(['How It Works', 'For SMEs', 'For Consultants', 'Demo']);
  for (const link of nav.getAllByRole('link')) {
    expect(document.querySelector(link.getAttribute('href')!)).not.toBeNull();
  }
});

it('preserves the demo video and hero analytics event', async () => {
  renderLanding();
  expect(screen.getByTitle('CarbonLite demo video')).toHaveAttribute('src', expect.stringContaining('youtube.com/embed/'));
  await userEvent.click(screen.getByRole('link', { name: 'Watch Demo' }));
  expect(trackEvent).toHaveBeenCalledWith('DEMO_VIDEO_VIEWED', { video_name: 'CarbonLite demo', source: 'hero' });
});

it.each([
  { authenticated: false, name: 'Sign In', route: '/login' },
  { authenticated: false, name: 'Request Pilot Access', route: '/pilot' },
  { authenticated: true, name: 'Open CarbonLite', route: '/upload' },
])('keeps $name routing to $route', async ({ authenticated, name, route }) => {
  renderLanding(authenticated);
  await userEvent.click(within(screen.getByRole('banner')).getByRole('button', { name }));
  expect(screen.getByLabelText('Current route')).toHaveTextContent(route);
});

it.each([false, true])('preserves hero and final destinations when authenticated=%s', async (authenticated) => {
  renderLanding(authenticated);
  const route = authenticated ? '/upload' : '/pilot';
  const name = authenticated ? 'Open CarbonLite' : 'Request Pilot Access';
  await userEvent.click(within(screen.getByRole('region', { name: /Turn bills, invoices/ })).getByRole('button', { name }));
  expect(screen.getByLabelText('Current route')).toHaveTextContent(route);
  await userEvent.click(within(screen.getByRole('region', { name: 'Try CarbonLite with your own source data' })).getByRole('button', { name }));
  expect(screen.getByLabelText('Current route')).toHaveTextContent(route);
});

it('preserves legal and contact links', () => {
  renderLanding();
  const footer = within(screen.getByRole('contentinfo'));
  for (const [name, href] of [['About CarbonLite', '/about'], ['Privacy Policy', '/privacy'], ['Terms of Use', '/terms'], ['Contact Us', 'mailto:carbonliteai@gmail.com']]) {
    expect(footer.getByRole('link', { name })).toHaveAttribute('href', href);
  }
});
