

// export default function DashboardPage() {
//   return (
    
  
//       <section className="card">
//         <div className="card-body">
//           <div className="card-row">
//             <div className="page-title">Emissions Overview</div>
//             <div className="page-hint">Last 12 months</div>
//           </div>

//           <div className="stat-card">
//             <div className="stat-value">42,310 tCO₂e</div>
//             <div className="stat-label">Total Scope 1 + 2</div>
//           </div>
//         </div>
//       </section>
 
//   );
// }

// src/pages/Dashboard.tsx

export default function DashboardPage() {
  return (
    <>
      {/* Top row: high-level KPIs */}
      <section className="grid gap-4 lg:gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Total emissions card */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div>
                <div className="page-title">Total Emissions</div>
                <div className="page-hint">Last 12 months (tCO₂e)</div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-md bg-emerald-600 text-white font-medium">
                Scope 1 + 2
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-semibold text-[rgb(var(--text))] leading-none">
                42,310
              </div>
              <div className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 rounded px-2 py-1">
                ↓ 3.2% vs LY
              </div>
            </div>

            <div className="text-[11px] text-[rgb(var(--muted))] leading-snug">
              Company-wide operational footprint (Scopes 1 & 2).
            </div>
          </div>
        </div>

        {/* Scope 1 / Scope 2 split */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div className="page-title">Source Breakdown</div>
              <div className="page-hint">tCO₂e</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <div className="text-xs text-[rgb(var(--muted))] uppercase tracking-wide">
                  Scope 1
                </div>
                <div className="text-xl font-semibold text-[rgb(var(--text))] leading-none">
                  31,880
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))]">
                  Fuel combustion, boilers, onsite heat
                </div>
              </div>

              <div className="flex flex-col">
                <div className="text-xs text-[rgb(var(--muted))] uppercase tracking-wide">
                  Scope 2
                </div>
                <div className="text-xl font-semibold text-[rgb(var(--text))] leading-none">
                  10,430
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))]">
                  Purchased electricity
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[rgb(var(--muted))] pt-2">
              Scope 3 tracking not enabled.
              <button className="ml-1 text-emerald-600 hover:underline text-[11px]">
                Enable →
              </button>
            </div>
          </div>
        </div>

        {/* Reduction target progress */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div className="page-title">Target Progress</div>
              <div className="page-hint">vs 2022 baseline</div>
            </div>

            <div className="flex items-end gap-3">
              <div className="text-3xl font-semibold text-[rgb(var(--text))] leading-none">
                18%
              </div>
              <div className="text-xs text-[rgb(var(--muted))] leading-none pb-[2px]">
                toward 2030 goal (35%)
              </div>
            </div>

            {/* lil progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 mt-3 overflow-hidden">
              <div
                className="h-full bg-emerald-600"
                style={{ width: "18%" }}
              />
            </div>

            <div className="text-[11px] text-[rgb(var(--muted))] pt-2">
              You are tracking ahead of schedule.
            </div>
          </div>
        </div>
      </section>

      {/* Middle row: compliance + upcoming tasks */}
      <section className="grid gap-4 lg:gap-6 md:grid-cols-2">
        {/* Compliance / deadlines */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div className="page-title">Compliance & Filings</div>
              <div className="page-hint">Next 90 days</div>
            </div>

            <ul className="text-sm space-y-3">
              <li className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-medium text-[rgb(var(--text))]">
                    Canada GHG Report
                  </span>
                  <span className="text-[11px] text-[rgb(var(--muted))] leading-snug">
                    Federal mandatory emissions disclosure
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-white bg-emerald-600 rounded px-2 py-[2px]">
                    Due Nov 30
                  </div>
                  <div className="text-[10px] text-[rgb(var(--muted))]">
                    Status: Draft
                  </div>
                </div>
              </li>

              <li className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-medium text-[rgb(var(--text))]">
                    AB Carbon Levy Record
                  </span>
                  <span className="text-[11px] text-[rgb(var(--muted))] leading-snug">
                    Onsite combustion report for Alberta facilities
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-white bg-yellow-500 rounded px-2 py-[2px]">
                    Action needed
                  </div>
                  <div className="text-[10px] text-[rgb(var(--muted))]">
                    Missing meter data
                  </div>
                </div>
              </li>

              <li className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-medium text-[rgb(var(--text))]">
                    EU Energy Use
                  </span>
                  <span className="text-[11px] text-[rgb(var(--muted))] leading-snug">
                    Electricity & heat disclosure for EU ops
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-white bg-gray-500 rounded px-2 py-[2px]">
                    FYI
                  </div>
                  <div className="text-[10px] text-[rgb(var(--muted))]">
                    Monitoring only
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* "Next action" card */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div className="page-title">Next Required Action</div>
              <div className="page-hint">Assigned to you</div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-[rgb(var(--text))]">
                  Upload September diesel usage
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))] leading-snug">
                  Facility: Calgary Plant • Scope 1 • 12,400 L missing
                </div>
              </div>

              <div className="text-[10px] text-[rgb(var(--muted))]">
                Last update: 2 days ago
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700"
                >
                  Add fuel data
                </button>
                <button
                  className="text-xs font-medium border border-[rgb(var(--border))]
                             text-[rgb(var(--text))] rounded-lg px-3 py-2
                             hover:bg-[rgb(var(--card))]/60"
                >
                  Assign someone else
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom row: recent activity / audit log */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div className="page-title">Recent Activity</div>
            <div className="page-hint">Last 7 changes</div>
          </div>

          <ul className="divide-y divide-[rgb(var(--border))] text-sm">
            <li className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-[rgb(var(--text))]">
                  Electricity usage updated
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                  Edmonton Office • September 2025 • +18,224 kWh
                </div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))] whitespace-nowrap">
                14 min ago
              </div>
            </li>

            <li className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-[rgb(var(--text))]">
                  New factor added
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                  Diesel combustion factor (AB grid adjustment)
                </div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))] whitespace-nowrap">
                1 hr ago
              </div>
            </li>

            <li className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-[rgb(var(--text))]">
                  Report exported
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                  Scope 1 Summary • Q3 2025 • CSV
                </div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))] whitespace-nowrap">
                1 day ago
              </div>
            </li>

            <li className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium text-[rgb(var(--text))]">
                  User access changed
                </div>
                <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                  Kyrin added to Admin role
                </div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))] whitespace-nowrap">
                2 days ago
              </div>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
