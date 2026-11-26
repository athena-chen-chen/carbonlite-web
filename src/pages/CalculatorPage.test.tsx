import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CalculatorPage from './CalculatorPage';
import App from '../app/app';
import * as analytics from '../services/analytics.service';
import * as ga from '../services/ga4.service';

function page() { return render(<MemoryRouter><CalculatorPage /></MemoryRouter>); }
function valid() {
  fireEvent.change(screen.getByLabelText('Province or territory'), { target: { value: 'AB' } });
  fireEvent.change(screen.getByLabelText(/Annual electricity/), { target: { value: '10000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Calculate my estimate' }));
}
afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });
describe('public calculator UX and privacy', () => {
  it('provides helpful empty state, all regions and only verified years', () => {
    page();
    expect(screen.getByText('Your starting point, in tonnes.')).toBeTruthy();
    expect(screen.queryByTestId('calculator-total')).toBeNull();
    expect(screen.getByRole('option', { name: 'Nunavut' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: '2024' })).toBeNull();
  });
  it('renders a result, dominant source, units and source labels', () => {
    page(); valid();
    expect(screen.getByTestId('calculator-total').textContent).toContain('4.38');
    expect(screen.getByText('Alberta · 2026 · annual estimate')).toBeTruthy();
    expect(screen.getByText('Largest contributor:')).toBeTruthy();
    expect(screen.getByText(/Table 5.3/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Québec GHG/ }).getAttribute('href')).toContain('#page=28');
  });
  it('changes year labels and factors without stale output', () => {
    page(); valid();
    fireEvent.change(screen.getByLabelText('Reporting year'), { target: { value: '2025' } });
    expect(screen.queryByTestId('calculator-total')).toBeNull();
    expect(screen.getByText(/Table 5.2/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Calculate my estimate' }));
    expect(screen.getByTestId('calculator-total').textContent).toContain('4.9');
    expect(screen.getByText('Alberta · 2025 · annual estimate')).toBeTruthy();
  });
  it('shows input errors and never produces a fabricated result', () => {
    page(); valid();
    fireEvent.change(screen.getByLabelText(/Annual gasoline/), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate my estimate' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText(/Annual gasoline/).getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByTestId('calculator-total')).toBeNull();
  });
  it('requires a positive source and offers a clean reset', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Calculate my estimate' }));
    expect(screen.getByRole('alert').textContent).toContain('positive');
    valid(); fireEvent.click(screen.getByRole('button', { name: 'Clear inputs' }));
    expect((screen.getByLabelText(/Annual electricity/) as HTMLInputElement).value).toBe('');
    expect(screen.queryByTestId('calculator-total')).toBeNull();
  });
  it('keeps calculations offline, does not submit analytics or persist inputs', () => {
    const fetch = vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network forbidden'));
    const posthog = vi.spyOn(analytics, 'track'); const google = vi.spyOn(ga, 'trackEvent');
    const store = vi.spyOn(Storage.prototype, 'setItem');
    page(); valid();
    expect(fetch).not.toHaveBeenCalled(); expect(posthog).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled(); expect(store).not.toHaveBeenCalled();
  });
  it('links to existing public destinations without leaking estimates', () => {
    page(); valid();
    expect(screen.getByRole('link', { name: 'Request a Paid Pilot' }).getAttribute('href')).toBe('/pilot');
    expect(screen.getByRole('link', { name: 'See How CarbonLite Works' }).getAttribute('href')).toBe('/#workflow');
  });
  it('mounts the real public route without login or a backend request', () => {
    const fetch = vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Network forbidden'));
    window.history.replaceState(null, '', '/calculator');
    render(<App />);
    expect(screen.getByRole('heading', { name: /clearer first look/ })).toBeTruthy();
    expect(screen.queryByLabelText(/password/i)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('supports keyboard operation and mobile-friendly field sizing', async () => {
    page();
    const field = screen.getByLabelText(/Annual electricity/);
    expect(field.className).toContain('w-full');
    expect(field.getAttribute('inputmode')).toBe('decimal');
    fireEvent.change(screen.getByLabelText('Province or territory'), { target: { value: 'QC' } });
    await userEvent.type(field, '1000');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByTestId('calculator-total').textContent).toContain('0.002');
  });
});
