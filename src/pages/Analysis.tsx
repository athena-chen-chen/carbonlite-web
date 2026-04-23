// import { useEffect, useMemo, useState } from 'react';

// /** Keep in sync with Emissions.tsx local schema */
// type EmissionRow = {
//   id: string;
//   date: string; // YYYY-MM-DD
//   scope: string; // Scope 1/2/3 or custom
//   category: string; // Energy/Fuel/Travel/Waste/...
//   activity: string; // Electricity (AB), Diesel, Flight...
//   amount: number;   // activity amount
//   unit: string;     // kWh / L / km / kg, etc.
//   factor: number;   // kgCO2e per unit
//   co2e: number;     // amount * factor (kg)
//   notes?: string;
// };

// const LS_KEY = 'emissions_v1';

// /* ----------------------------- helpers ----------------------------- */

// function loadRows(): EmissionRow[] {
//   try {
//     const raw = localStorage.getItem(LS_KEY);
//     return raw ? (JSON.parse(raw) as EmissionRow[]) : [];
//   } catch {
//     return [];
//   }
// }

// function fmt(n: number | string, digits = 2) {
//   const num = typeof n === 'string' ? Number(n) : n;
//   if (Number.isNaN(num)) return String(n);
//   return Intl.NumberFormat(undefined, {
//     maximumFractionDigits: digits,
//   }).format(num);
// }

// function sum(nums: number[]) {
//   return nums.reduce((a, b) => a + b, 0);
// }

// function yearOf(d: string) {
//   // expects YYYY-MM-DD
//   return d?.slice(0, 4);
// }

// /* ----------------------------- charts ------------------------------ */

// function Bars({
//   data,
//   labels,
//   height = 140,
//   barWidth = 24,
//   gap = 8,
//   padding = 16,
// }: {
//   data: number[];
//   labels?: string[];
//   height?: number;
//   barWidth?: number;
//   gap?: number;
//   padding?: number;
// }) {
//   const maxVal = Math.max(1, ...data);
//   const innerH = height - 24; // leave room for value labels
//   const scale = innerH / maxVal;
//   const width = padding * 2 + data.length * barWidth + (data.length - 1) * gap;

//   return (
//     <svg width={width} height={height} role="img" aria-label="bar chart">
//       {/* axis line */}
//       <line
//         x1={padding}
//         y1={innerH}
//         x2={width - padding}
//         y2={innerH}
//         stroke="#e5e7eb"
//       />
//       {data.map((v, i) => {
//         const h = Math.max(0, v * scale);
//         const x = padding + i * (barWidth + gap);
//         const y = innerH - h;
//         return (
//           <g key={i}>
//             <rect
//               x={x}
//               y={y}
//               width={barWidth}
//               height={h}
//               rx={4}
//               fill="#4f46e5"
//             />
//             {/* value label */}
//             <text
//               x={x + barWidth / 2}
//               y={y - 4}
//               textAnchor="middle"
//               fontSize="10"
//               fill="#374151"
//             >
//               {v > 0 ? fmt(v, 0) : ''}
//             </text>
//             {/* category label */}
//             {labels && (
//               <text
//                 x={x + barWidth / 2}
//                 y={height - 6}
//                 textAnchor="middle"
//                 fontSize="10"
//                 fill="#6b7280"
//               >
//                 {labels[i]}
//               </text>
//             )}
//           </g>
//         );
//       })}
//     </svg>
//   );
// }

// function HBars({
//   items,
//   height = 22,
//   gap = 8,
//   labelWidth = 160,
//   valueWidth = 80,
// }: {
//   items: { label: string; value: number }[];
//   height?: number;
//   gap?: number;
//   labelWidth?: number;
//   valueWidth?: number;
// }) {
//   const maxVal = Math.max(1, ...items.map((i) => i.value));
//   return (
//     <div style={{ display: 'grid', gap }}>
//       {items.map((it) => {
//         const pct = (it.value / maxVal) * 100;
//         return (
//           <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
//             <div style={{ width: labelWidth, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//               {it.label}
//             </div>
//             <div style={{ flex: 1, background: '#eef2ff', height, borderRadius: 8, overflow: 'hidden' }}>
//               <div
//                 style={{
//                   width: `${pct}%`,
//                   height: '100%',
//                   background: '#6366f1',
//                 }}
//                 aria-label={`${it.label}: ${fmt(it.value)} kg`}
//               />
//             </div>
//             <div style={{ width: valueWidth, textAlign: 'right' }}>{fmt(it.value)}</div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// /* ----------------------------- page -------------------------------- */

// export default function Analysis() {
//   const [rows, setRows] = useState<EmissionRow[]>([]);
//   const [year, setYear] = useState<string>('');

//   useEffect(() => {
//     const r = loadRows();
//     setRows(r);
//     // default to current year if present in data
//     const years = Array.from(new Set(r.map((x) => yearOf(x.date)).filter(Boolean))).sort();
//     if (years.length) setYear(years[years.length - 1]!);
//   }, []);

//   const years = useMemo(
//     () => Array.from(new Set(rows.map((x) => yearOf(x.date)).filter(Boolean))).sort(),
//     [rows]
//   );

//   const filtered = useMemo(
//     () => (year ? rows.filter((r) => yearOf(r.date) === year) : rows),
//     [rows, year]
//   );

//   const total = useMemo(() => sum(filtered.map((r) => r.co2e || 0)), [filtered]);

//   const monthly = useMemo(() => {
//     const arr = new Array(12).fill(0) as number[];
//     for (const r of filtered) {
//       const m = new Date(r.date).getMonth();
//       if (!Number.isNaN(m)) arr[m] += r.co2e || 0;
//     }
//     return arr;
//   }, [filtered]);

//   const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

//   const byScope = useMemo(() => {
//     const map = new Map<string, number>();
//     for (const r of filtered) {
//       const key = (r.scope || 'Other').trim();
//       map.set(key, (map.get(key) || 0) + (r.co2e || 0));
//     }
//     const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
//     items.sort((a, b) => b.value - a.value);
//     return items;
//   }, [filtered]);

//   const byCategory = useMemo(() => {
//     const map = new Map<string, number>();
//     for (const r of filtered) {
//       const key = (r.category || 'Uncategorized').trim();
//       map.set(key, (map.get(key) || 0) + (r.co2e || 0));
//     }
//     const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
//     items.sort((a, b) => b.value - a.value);
//     return items;
//   }, [filtered]);

//   const topActivities = useMemo(() => {
//     const map = new Map<string, number>();
//     for (const r of filtered) {
//       const key = (r.activity || '—').trim();
//       map.set(key, (map.get(key) || 0) + (r.co2e || 0));
//     }
//     const items = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
//     items.sort((a, b) => b.value - a.value);
//     return items.slice(0, 5);
//   }, [filtered]);

//   const monthlyAvg = useMemo(() => {
//     const usedMonths = monthly.filter((v) => v > 0).length || 12;
//     return total / usedMonths;
//   }, [monthly, total]);

//   return (
//     <>
//       <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
//         <h2 style={{ margin: 0 }}>Analysis</h2>
//         <div style={{ marginLeft: 'auto' }}>
//           <label>
//             Year:{' '}
//             <select value={year} onChange={(e) => setYear(e.target.value)}>
//               <option value="">All</option>
//               {years.map((y) => (
//                 <option key={y} value={y!}>
//                   {y}
//                 </option>
//               ))}
//             </select>
//           </label>
//         </div>
//       </div>

//       {/* KPIs */}
//       <div className="grid" style={{ marginBottom: 12 }}>
//         <div className="card">
//           <div>Total CO₂e {year ? `(${year})` : '(All)'}</div>
//           <div className="mono" style={{ fontSize: 28 }}>{fmt(total)}</div>
//           <small>kg CO₂e</small>
//         </div>
//         <div className="card">
//           <div>Monthly Avg</div>
//           <div className="mono" style={{ fontSize: 28 }}>{fmt(monthlyAvg)}</div>
//           <small>kg CO₂e / active month</small>
//         </div>
//         <div className="card">
//           <div>Records</div>
//           <div className="mono" style={{ fontSize: 28 }}>{filtered.length}</div>
//           <small>entries counted</small>
//         </div>
//       </div>

//       {/* Monthly chart */}
//       <div className="card" style={{ marginBottom: 12 }}>
//         <h3 style={{ marginTop: 0 }}>Monthly CO₂e</h3>
//         {filtered.length === 0 ? (
//           <p style={{ color: '#666' }}>No data. Add records in <strong>Emissions</strong>.</p>
//         ) : (
//           <Bars data={monthly} labels={monthLabels} />
//         )}
//       </div>

//       <div className="grid">
//         {/* Scope breakdown */}
//         <div className="card">
//           <h3 style={{ marginTop: 0 }}>By Scope</h3>
//           {byScope.length === 0 ? (
//             <p style={{ color: '#666' }}>No data.</p>
//           ) : (
//             <HBars items={byScope} />
//           )}
//         </div>

//         {/* Category breakdown */}
//         <div className="card">
//           <h3 style={{ marginTop: 0 }}>By Category</h3>
//           {byCategory.length === 0 ? (
//             <p style={{ color: '#666' }}>No data.</p>
//           ) : (
//             <HBars items={byCategory} />
//           )}
//         </div>

//         {/* Top Activities */}
//         <div className="card">
//           <h3 style={{ marginTop: 0 }}>Top Activities</h3>
//           {topActivities.length === 0 ? (
//             <p style={{ color: '#666' }}>No data.</p>
//           ) : (
//             <ul style={{ margin: 0, paddingLeft: 18 }}>
//               {topActivities.map((a) => (
//                 <li key={a.label}>
//                   <strong>{a.label}</strong> — {fmt(a.value)} kg
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }

// src/pages/Analysis.tsx

export default function Analysis() {
  return (
    <>
      {/* Row 1: Trend summary + sparkline */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div>
              <div className="page-title">Emissions Trend</div>
              <div className="page-hint">Last 6 months (tCO₂e)</div>
            </div>

            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-semibold text-[rgb(var(--text))] leading-none">
                7,080
              </div>
              <div className="text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/30 rounded px-2 py-[2px]">
                ↓ 4.5%
              </div>
            </div>
          </div>

          {/* mini sparkline / area chart (static SVG for now) */}
          <div className="w-full h-24 mt-4 flex items-end">
            <svg
              viewBox="0 0 200 60"
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* fill area */}
              <path
                d="
                  M0,50
                  L20,40
                  L40,42
                  L60,35
                  L80,28
                  L100,30
                  L120,24
                  L140,22
                  L160,18
                  L180,20
                  L200,16
                  L200,60
                  L0,60
                  Z
                "
                className="fill-emerald-200/50 dark:fill-emerald-900/40"
              />
              {/* line */}
              <polyline
                points="
                  0,50
                  20,40
                  40,42
                  60,35
                  80,28
                  100,30
                  120,24
                  140,22
                  160,18
                  180,20
                  200,16
                "
                className="stroke-emerald-600 dark:stroke-emerald-400"
                fill="none"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* little axis-ish labels */}
          <div className="flex justify-between text-[10px] text-[rgb(var(--muted))] mt-2">
            <div>Apr</div>
            <div>May</div>
            <div>Jun</div>
            <div>Jul</div>
            <div>Aug</div>
            <div>Sep</div>
          </div>

          {/* commentary */}
          <div className="text-[11px] text-[rgb(var(--muted))] leading-snug mt-4">
            Emissions are trending downward primarily due to decreased natural gas
            combustion in Calgary Plant and partial electrification of Edmonton Office
            HVAC. Electricity-related emissions (Scope 2) stayed mostly flat.
          </div>
        </div>
      </section>

      {/* Row 2: Split into 2 columns */}
      <section className="grid gap-4 lg:gap-6 md:grid-cols-2">
        {/* Top facilities / sources */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div>
                <div className="page-title">Top Emission Sources</div>
                <div className="page-hint">Current month (tCO₂e)</div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))]">
                Highest impact
              </div>
            </div>

            <ul className="divide-y divide-[rgb(var(--border))] text-sm">
              <li className="py-3 flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-medium text-[rgb(var(--text))]">
                    Calgary Plant – Diesel Generators
                  </div>
                  <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                    Scope 1 • Backup / standby power
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[rgb(var(--text))] leading-none">
                    2,310
                  </div>
                  <div className="text-[10px] text-red-600 font-medium">
                    +7.9%
                  </div>
                </div>
              </li>

              <li className="py-3 flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-medium text-[rgb(var(--text))]">
                    Edmonton Office – Electricity
                  </div>
                  <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                    Scope 2 • Grid intensity ↑ this month
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[rgb(var(--text))] leading-none">
                    1,440
                  </div>
                  <div className="text-[10px] text-[rgb(var(--muted))] font-medium">
                    +0.3%
                  </div>
                </div>
              </li>

              <li className="py-3 flex justify-between items-start">
                <div className="min-w-0">
                  <div className="font-medium text-[rgb(var(--text))]">
                    Vancouver Warehouse – Natural Gas Heat
                  </div>
                  <div className="text-[11px] text-[rgb(var(--muted))] leading-snug truncate">
                    Scope 1 • Process heat
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[rgb(var(--text))] leading-none">
                    1,070
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium">
                    −5.4%
                  </div>
                </div>
              </li>
            </ul>

            <div className="pt-3 text-[10px] text-[rgb(var(--muted))] leading-snug">
              High-intensity sources are mostly combustion. Biggest spike is diesel
              generator runtime at Calgary Plant after the UPS incident.
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="card">
          <div className="card-body">
            <div className="card-row">
              <div>
                <div className="page-title">By Category</div>
                <div className="page-hint">Share of total (this month)</div>
              </div>
              <div className="text-[10px] text-[rgb(var(--muted))]">
                Scope 1 vs 2
              </div>
            </div>

            {/* horizontal bar chart style */}
            <div className="space-y-4 mt-4 text-sm">
              {/* Scope 1 */}
              <div>
                <div className="flex justify-between text-[11px] text-[rgb(var(--muted))]">
                  <span>Scope 1 (direct fuel)</span>
                  <span className="font-medium text-[rgb(var(--text))]">
                    68%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>

              {/* Scope 2 */}
              <div>
                <div className="flex justify-between text-[11px] text-[rgb(var(--muted))]">
                  <span>Scope 2 (electricity)</span>
                  <span className="font-medium text-[rgb(var(--text))]">
                    32%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 dark:bg-emerald-500"
                    style={{ width: "32%" }}
                  />
                </div>
              </div>
            </div>

            <div className="text-[11px] text-[rgb(var(--muted))] leading-snug mt-4">
              Facility-level combustion (Scope 1) is still your main driver. Scope 2
              electricity is flatter but tied directly to Alberta grid carbon
              intensity.
            </div>
          </div>
        </div>
      </section>

      {/* Row 3: narrative / insight */}
      <section className="card">
        <div className="card-body">
          <div className="card-row">
            <div>
              <div className="page-title">This Month’s Insight</div>
              <div className="page-hint">Automated note — internal only</div>
            </div>
          </div>

          <div className="text-sm text-[rgb(var(--text))] leading-relaxed space-y-3">
            <p>
              Site diesel usage in Calgary Plant increased 7.9% month-over-month after
              backup generators were engaged twice during power instability. This is
              now your single largest driver of Scope 1 emissions.
            </p>

            <p>
              Edmonton Office electricity stayed nearly flat in kWh, but total
              reported tCO₂e in Scope 2 rose 0.3%. This is caused by an increase in
              the published Alberta grid emission factor for September, not by higher
              consumption.
            </p>

            <p>
              Vancouver Warehouse natural gas is trending down as weather transitions
              into shoulder season; this is producing a 5.4% reduction and offsetting
              part of the Calgary spike.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[10px] leading-none">
            <span className="px-2 py-1 rounded-md bg-emerald-600 text-white font-medium">
              Suggestion: audit generator runtime
            </span>
            <span className="px-2 py-1 rounded-md border border-[rgb(var(--border))] text-[rgb(var(--text))]">
              Low effort
            </span>
            <span className="px-2 py-1 rounded-md border border-[rgb(var(--border))] text-[rgb(var(--text))]">
              High impact
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

