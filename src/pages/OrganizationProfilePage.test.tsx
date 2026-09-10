import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrganizationProfilePage } from './OrganizationProfilePage';
import {
  isValidPrimaryContactEmail,
  loadOrganizationProfile,
  saveOrganizationProfile,
} from '../services/organizationProfile';

function setAdminUser() {
  localStorage.setItem(
    'currentUser',
    JSON.stringify({
      email: 'admin@example.com',
      role: 'ADMIN',
      organizationId: 'admin-workspace',
      organizationName: 'Admin Workspace',
    }),
  );
}

async function fillRequiredProfileFields() {
  await userEvent.clear(screen.getByLabelText(/Organization \/ Workspace/i));
  await userEvent.type(screen.getByLabelText(/Organization \/ Workspace/i), 'Kach Canada');
  await userEvent.selectOptions(screen.getByRole('combobox', { name: /Industry/i }), 'Technology');
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: /Province \/ Territory/i }),
    'Alberta',
  );
}

describe('OrganizationProfilePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lets admins save workspace boundary profile values', async () => {
    setAdminUser();

    render(<OrganizationProfilePage />);

    expect(screen.getByRole('heading', { name: 'Organization & Boundary' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Industry/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Technology' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
    expect(screen.getByText(
      'This workspace is configured for Canadian emissions reporting. Country is currently fixed to Canada.',
    )).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Country/i })).toHaveValue('Canada');
    expect(screen.getByRole('textbox', { name: /Country/i })).toBeDisabled();
    expect(screen.queryByRole('combobox', { name: /Country/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'United States' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Other country' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Province \/ Territory/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alberta' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'British Columbia' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ontario' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Quebec' })).toBeInTheDocument();

    await fillRequiredProfileFields();
    await userEvent.clear(screen.getByLabelText(/Geographic Boundary/i));
    await userEvent.type(
      screen.getByLabelText(/Geographic Boundary/i),
      'Canadian warehouse and fleet operations',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(screen.getByText('Organization profile saved.')).toBeInTheDocument();
    expect(loadOrganizationProfile().organizationName).toBe('Kach Canada');
    expect(loadOrganizationProfile().industry).toBe('Technology');
    expect(loadOrganizationProfile().country).toBe('Canada');
    expect(loadOrganizationProfile().provinceOrState).toBe('Alberta');
    expect(loadOrganizationProfile().geographicBoundary).toBe(
      'Canadian warehouse and fleet operations',
    );
  });

  it('allows Primary Contact Email to remain blank when saving', async () => {
    setAdminUser();
    render(<OrganizationProfilePage />);

    await fillRequiredProfileFields();
    expect(screen.getByLabelText(/Primary Contact Email/i)).toHaveValue('');
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(screen.getByText('Organization profile saved.')).toBeInTheDocument();
    expect(loadOrganizationProfile().primaryContactEmail).toBe('');
  });

  it('saves a valid Primary Contact Email and trims surrounding spaces', async () => {
    setAdminUser();
    render(<OrganizationProfilePage />);

    await fillRequiredProfileFields();
    await userEvent.type(screen.getByLabelText(/Primary Contact Email/i), ' Athena+Pilot@Example.ca ');
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(screen.getByText('Organization profile saved.')).toBeInTheDocument();
    expect(loadOrganizationProfile().primaryContactEmail).toBe('athena+pilot@example.ca');
  });

  it('loads and saves Organization & Boundary values through the backend when signed in', async () => {
    setAdminUser();
    localStorage.setItem('accessToken', 'workspace-token');
    const fetchMock = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        const body = JSON.parse(String(options.body));

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          organizationName: 'Backend Workspace',
          industry: 'Technology',
          country: 'Canada',
          provinceOrState: 'Ontario',
          city: 'Toronto',
          primaryContactEmail: 'saved@example.ca',
          reportingPeriodStart: '2026-01-01',
          reportingPeriodEnd: '2026-12-31',
          geographicBoundary: 'Saved backend boundary',
          includedFacilitiesOrLocations: 'Saved facilities',
          includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot activity types',
          scope3CoverageNote: 'Saved Scope 3 note.',
          exclusionsAndLimitations: 'Saved limitations.',
          boundaryNotes: 'Saved boundary notes.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<OrganizationProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Backend Workspace')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/Geographic Boundary/i)).toHaveValue('Saved backend boundary');

    await userEvent.clear(screen.getByLabelText(/City/i));
    await userEvent.type(screen.getByLabelText(/City/i), 'Ottawa');
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/organization-profile'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer workspace-token',
          }),
        }),
      );
    });
    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === 'PATCH');
    expect(JSON.parse(String(patchCall?.[1]?.body))).toMatchObject({
      organizationName: 'Backend Workspace',
      city: 'Ottawa',
      primaryContactEmail: 'saved@example.ca',
    });
    expect(screen.getByText('Organization profile saved.')).toBeInTheDocument();
  });

  it('does not show success or mask a failed backend save with localStorage', async () => {
    setAdminUser();
    localStorage.setItem('accessToken', 'workspace-token');
    const fetchMock = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(
        JSON.stringify({
          organizationName: 'Backend Workspace',
          industry: 'Technology',
          country: 'Canada',
          provinceOrState: 'Ontario',
          city: 'Toronto',
          reportingPeriodStart: '2026-01-01',
          reportingPeriodEnd: '2026-12-31',
          geographicBoundary: 'Saved backend boundary',
          includedFacilitiesOrLocations: 'Saved facilities',
          includedScopes: 'Scope 1, Scope 2, and selected Scope 3 pilot activity types',
          scope3CoverageNote: 'Saved Scope 3 note.',
          exclusionsAndLimitations: 'Saved limitations.',
          boundaryNotes: 'Saved boundary notes.',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<OrganizationProfilePage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Backend Workspace')).toBeInTheDocument();
    });

    await userEvent.clear(screen.getByLabelText(/City/i));
    await userEvent.type(screen.getByLabelText(/City/i), 'Ottawa');
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(await screen.findByText('Organization profile could not be saved. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('Organization profile saved.')).not.toBeInTheDocument();
    expect(loadOrganizationProfile().city).toBe('Toronto');
  });

  it.each([
    ['athena'],
    ['athena@'],
    ['@example.com'],
    ['athena@example'],
    ['athena example.com'],
    ['[athena@example.com](mailto:athena@example.com)'],
    ['mailto:athena@example.com'],
  ])('rejects invalid Primary Contact Email value %s before saving', async (email) => {
    setAdminUser();
    render(<OrganizationProfilePage />);

    await fillRequiredProfileFields();
    fireEvent.change(screen.getByLabelText(/Primary Contact Email/i), {
      target: { value: email },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(screen.queryByText('Organization profile saved.')).not.toBeInTheDocument();
    expect(loadOrganizationProfile().primaryContactEmail).toBe('');
  });

  it('preserves custom industry text through the Other industry field', async () => {
    setAdminUser();
    localStorage.setItem(
      'carbonlite:organization-profile:admin-workspace',
      JSON.stringify({
        ...loadOrganizationProfile(),
        organizationName: 'Admin Workspace',
        industry: 'Clean tech services',
        country: 'CA',
        provinceOrState: 'Alberta',
      }),
    );

    render(<OrganizationProfilePage />);

    expect(screen.getByRole('combobox', { name: /Industry/i })).toHaveValue('Other');
    expect(screen.getByLabelText('Other industry')).toHaveValue('Clean tech services');
    expect(screen.getByRole('textbox', { name: /Country/i })).toHaveValue('Canada');

    await userEvent.clear(screen.getByLabelText('Other industry'));
    await userEvent.type(screen.getByLabelText('Other industry'), 'Climate advisory');
    await userEvent.click(screen.getByRole('button', { name: 'Save Organization Profile' }));

    expect(loadOrganizationProfile().industry).toBe('Other');
    expect(loadOrganizationProfile().otherIndustry).toBe('Climate advisory');
    expect(loadOrganizationProfile().country).toBe('Canada');
  });

  it('shows pilot reviewers boundary information as a read-only view without save controls', () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        role: 'REVIEWER',
        accountType: 'PILOT_REVIEWER',
        organizationId: 'sample-workspace',
        organizationName: 'CarbonLite Sample Workspace',
      }),
    );

    render(<OrganizationProfilePage />);

    expect(screen.getByText('CarbonLite Sample Workspace')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
    expect(screen.getByText('Alberta')).toBeInTheDocument();
    expect(screen.getByText('2026-01-01 to 2026-12-31')).toBeInTheDocument();
    expect(screen.getByText(/Pilot reviewer accounts can view boundary information/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save Organization Profile' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Industry/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Province \/ Territory/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Primary Contact Email/i)).not.toBeInTheDocument();
  });

  it('does not show a red unavailable error for pilot reviewers when sample defaults are visible', async () => {
    localStorage.setItem(
      'currentUser',
      JSON.stringify({
        email: 'reviewer@example.com',
        role: 'VIEWER',
        accountType: 'PILOT_REVIEWER',
        organizationId: 'sample-workspace',
        organizationName: 'CarbonLite Sample Workspace',
      }),
    );
    localStorage.setItem('accessToken', 'reviewer-token');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(JSON.stringify({ message: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    render(<OrganizationProfilePage />);

    expect(screen.getByText('CarbonLite Sample Workspace')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByText('The requested information is no longer available.'),
      ).not.toBeInTheDocument();
    });
  });

  it('prevents pilot reviewer profile updates in the client service', () => {
    const reviewer = {
      email: 'reviewer@example.com',
      role: 'REVIEWER' as const,
      accountType: 'PILOT_REVIEWER',
      organizationId: 'sample-workspace',
      organizationName: 'CarbonLite Sample Workspace',
    };

    expect(() => saveOrganizationProfile(loadOrganizationProfile(reviewer), reviewer)).toThrow(
      'You do not have permission to perform this action.',
    );
  });

  it('rejects reporting periods where the end date is not after the start date', () => {
    setAdminUser();
    const profile = {
      ...loadOrganizationProfile(),
      organizationName: 'Admin Workspace',
      industry: 'Technology',
      provinceOrState: 'Alberta',
      reportingPeriodStart: '2026-01-01',
      reportingPeriodEnd: '2026-01-01',
    };

    expect(() => saveOrganizationProfile(profile)).toThrow(
      'Reporting Period End must be after Reporting Period Start.',
    );
  });

  it('validates Primary Contact Email in the client service', () => {
    expect(isValidPrimaryContactEmail('')).toBe(true);
    expect(isValidPrimaryContactEmail('first.last@example.ca')).toBe(true);
    expect(isValidPrimaryContactEmail('name+pilot@example.com')).toBe(true);
    expect(isValidPrimaryContactEmail('athena')).toBe(false);
    expect(isValidPrimaryContactEmail('athena@')).toBe(false);
    expect(isValidPrimaryContactEmail('@example.com')).toBe(false);
    expect(isValidPrimaryContactEmail('athena@example')).toBe(false);
    expect(isValidPrimaryContactEmail('athena example.com')).toBe(false);
    expect(isValidPrimaryContactEmail('[athena@example.com](mailto:athena@example.com)')).toBe(false);
    expect(isValidPrimaryContactEmail('mailto:athena@example.com')).toBe(false);
  });
});
