import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listEmissions, type Emission, type Paged as PagedEmissions } from '../services/emissions';
import { listFactors, type Factor, type Paged as PagedFactors } from '../services/factors';

// Normalize API result (array or { items,total,page,pageSize }) → always array + meta
function normalize<T>(data: PagedEmissions<T> | PagedFactors<T> | T[] | undefined) {
  const items: T[] = Array.isArray(data) ? data : data?.items ?? [];
  const total = Array.isArray(data) ? items.length : (data?.total ?? items.length);
  const page = Array.isArray(data) ? 1 : (data?.page ?? 1);
  const pageSize = Array.isArray(data) ? items.length : (data?.pageSize ?? 20);
  return { items, total, page, pageSize };
}

const toISODate = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

export default function Index() {
  // Recent emissions (latest 5)
  const emissionsQ = useQuery({
    queryKey: ['home', 'emissions', { page: 1, pageSize: 5, sortBy: 'date', sortOrder: 'desc' }],
    queryFn: () => listEmissions({ page: 1, pageSize: 5, sortBy: 'date', sortOrder: 'desc' }),
    keepPreviousData: true,
  });

  // Factors (we just need the total count; fetch 1 item to keep it light)
  const factorsQ = useQuery({
    queryKey: ['home', 'factors', { page: 1, pageSize: 1 }],
    queryFn: () => listFactors({ page: 1, pageSize: 1, sortBy: 'updatedAt', sortOrder: 'desc' }),
    keepPreviousData: true,
  });

  const {
    items: recentEmissions,
    total: emissionsTotal,
  } = useMemo(() => normalize<Emission>(emissionsQ.data as any), [emissionsQ.data]);

  const {
    total: factorsTotal,
  } = useMemo(() => normalize<Factor>(factorsQ.data as any), [factorsQ.data]);

  return (
    <div className="section">
      <header className="header">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to CarbonLite</h1>
          <p className="text-sm text-gray-500">
            Your one-stop dashboard for emissions tracking, analysis, and reporting.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/emissions" className="btn btn-primary">Add Emission</Link>
          <Link to="/factors" className="btn btn-outline">Add Factor</Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-gray-500">Emission Records</div>
          <div className="text-2xl font-semibold mt-1">
            {emissionsQ.isLoading ? '—' : emissionsTotal}
          </div>
          <div className="mt-2">
            <Link to="/emissions" className="btn btn-ghost">View all</Link>
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Emission Factors</div>
          <div className="text-2xl font-semibold mt-1">
            {factorsQ.isLoading ? '—' : factorsTotal}
          </div>
          <div className="mt-2">
            <Link to="/factors" className="btn btn-ghost">Manage</Link>
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Analysis</div>
          <div className="mt-1 text-sm">
            Explore summaries by month, category, and scope.
          </div>
          <div className="mt-2">
            <Link to="/analysis" className="btn btn-ghost">Open Analysis</Link>
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-gray-500">Reports</div>
          <div className="mt-1 text-sm">
            Generate and export reports (coming soon).
          </div>
          <div className="mt-2">
            <Link to="/reports" className="btn btn-ghost">Open Reports</Link>
          </div>
        </div>
      </div>

      {/* Recent Emissions */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Emissions</h2>
          <Link to="/emissions" className="btn btn-outline">See all</Link>
        </div>

        {emissionsQ.isLoading ? (
          <div className="text-sm text-gray-500 mt-4">Loading recent emissions…</div>
        ) : emissionsQ.error ? (
          <div className="text-sm text-red-600 mt-4">Failed to load recent emissions.</div>
        ) : recentEmissions.length === 0 ? (
          <div className="text-sm text-gray-500 mt-4">No emissions yet. Create your first record.</div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Date</th>
                  <th className="th">Scope</th>
                  <th className="th">Category</th>
                  <th className="th">Activity</th>
                  <th className="th">Amount</th>
                  <th className="th">Unit</th>
                  <th className="th">CO₂e</th>
                </tr>
              </thead>
              <tbody>
                {recentEmissions.map((r) => (
                  <tr key={r.id} className="row">
                    <td className="td">{toISODate(r.date)}</td>
                    <td className="td">
                      <span className="badge badge-emerald">{r.scope}</span>
                    </td>
                    <td className="td">{r.category}</td>
                    <td className="td">{r.activity}</td>
                    <td className="td">{r.amount}</td>
                    <td className="td">{r.unit}</td>
                    <td className="td">{r.co2e}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-muted">
          <h3 className="font-medium">Data Entry</h3>
          <p className="text-sm text-gray-500 mt-1">Capture new data points.</p>
          <div className="flex gap-2 mt-3">
            <Link to="/emissions" className="btn btn-outline">New Emission</Link>
            <Link to="/factors" className="btn btn-outline">New Factor</Link>
          </div>
        </div>
        <div className="card-muted">
          <h3 className="font-medium">Insights</h3>
          <p className="text-sm text-gray-500 mt-1">Trends and breakdowns.</p>
          <div className="flex gap-2 mt-3">
            <Link to="/analysis" className="btn btn-outline">Open Analysis</Link>
          </div>
        </div>
        <div className="card-muted">
          <h3 className="font-medium">Settings</h3>
          <p className="text-sm text-gray-500 mt-1">API base URL, etc.</p>
          <div className="flex gap-2 mt-3">
            <Link to="/admin" className="btn btn-outline">Admin</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
