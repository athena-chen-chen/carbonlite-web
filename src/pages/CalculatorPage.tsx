import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EMPTY_INPUTS, LABELS, LIMITS, UNITS, calculate, type Calculation, type Inputs } from '../calculator/calculate';
import { FACTOR_VERIFIED_ON, FACTOR_VERSION, REGIONS, SOURCE_KEYS, SOURCES, YEARS } from '../calculator/factors';

const number = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 3 });
function tonnes(value: number) { return value > 0 && value < 0.001 ? '<0.001' : number.format(value); }
const fieldClass = 'mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100';

export default function CalculatorPage() {
  const [input, setInput] = useState<Inputs>({ ...EMPTY_INPUTS });
  const [result, setResult] = useState<Calculation | null>(null);
  function update(key: keyof Inputs, value: string) {
    setInput(previous => ({ ...previous, [key]: value }));
    setResult(null); // Never show a stale estimate for edited inputs.
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setResult(calculate(input));
  }
  const errors = result && !result.ok ? result.errors : {};
  const estimate = result?.ok ? result.estimate : null;
  const regionName = REGIONS.find(([code]) => code === input.region)?.[1];
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-3 font-bold tracking-tight"><span aria-hidden="true" className="rounded-xl bg-emerald-800 px-3 py-2 text-white">CL</span>CarbonLite</Link>
          <nav aria-label="Calculator navigation" className="flex flex-wrap gap-5 text-sm font-semibold"><Link to="/#workflow" className="hover:text-emerald-800">How it works</Link><Link to="/pilot" className="text-emerald-800">Pilot program →</Link></nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Free · Canadian small businesses</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-5xl">A clearer first look at your carbon footprint.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">Turn annual energy and fuel use into a simplified emissions estimate. No account, uploads or email required.</p>
        <p className="mt-3 text-sm font-medium text-emerald-800">Calculated in your browser. Your inputs are not submitted to our server or analytics.</p>
        <div className="mt-9 grid min-w-0 gap-7 lg:grid-cols-2 lg:items-start">
          <section aria-labelledby="inputs-heading" className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 id="inputs-heading" className="text-xl font-bold">1. Enter your annual use</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use totals for one reporting year and location. Leave unused sources blank or enter zero. Do not enter the same fuel twice.</p>
            <form onSubmit={submit} noValidate className="mt-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label htmlFor="calc-region" className="text-sm font-semibold">Province or territory</label>
                  <select id="calc-region" value={input.region} onChange={event => update('region', event.target.value)} className={fieldClass} aria-invalid={Boolean(errors.region)} aria-describedby={errors.region ? 'region-error' : undefined}>
                    <option value="">Choose a location</option>{REGIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>{errors.region && <p id="region-error" className="mt-2 text-sm text-red-700">{errors.region}</p>}
                </div>
                <div><label htmlFor="calc-year" className="text-sm font-semibold">Reporting year</label>
                  <select id="calc-year" value={input.year} onChange={event => update('year', event.target.value)} className={fieldClass}>{[...YEARS].reverse().map(year => <option key={year}>{year}</option>)}</select>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Only verified factor-table years are available.</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                {SOURCE_KEYS.map(key => <div key={key}>
                  <label htmlFor={`calc-${key}`} className="flex items-baseline justify-between gap-3 text-sm font-semibold"><span>Annual {LABELS[key].toLowerCase()} consumption</span><span className="font-normal text-slate-500">{UNITS[key]}</span></label>
                  <input id={`calc-${key}`} type="text" inputMode="decimal" autoComplete="off" maxLength={24} placeholder="0" value={input[key]} onChange={event => update(key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={`${key}-help${errors[key] ? ` ${key}-error` : ''}`} className={fieldClass} />
                  <p id={`${key}-help`} className="mt-1 text-xs leading-5 text-slate-500">{key === 'electricity' ? 'Grid electricity purchased, excluding self-generated electricity.' : key === 'naturalGas' ? 'Marketable natural gas for commercial building heating; not GJ.' : key === 'gasoline' ? 'Light-duty gasoline vehicle, Tier 3; fossil fuel basis.' : 'Light-duty diesel vehicle, advanced control; fossil fuel basis.'} Maximum {number.format(LIMITS[key])} {UNITS[key]}.</p>
                  {errors[key] && <p id={`${key}-error`} className="mt-2 text-sm text-red-700">{errors[key]}</p>}
                </div>)}
              </div>
              {result && !result.ok && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{errors.form || 'Please correct the highlighted amounts. No estimate was calculated.'}</div>}
              <button type="submit" className="mt-7 w-full rounded-xl bg-emerald-800 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">Calculate my estimate</button>
              <button type="button" onClick={() => { setInput({ ...EMPTY_INPUTS }); setResult(null); }} className="mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Clear inputs</button>
            </form>
          </section>
          <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
            <section aria-label="Your estimate" aria-live="polite" className="min-w-0 rounded-3xl bg-emerald-950 p-6 text-white shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200">2. Understand your estimate</p>
              {!estimate ? <div className="py-8"><h2 className="text-2xl font-bold">Your starting point, in tonnes.</h2><p className="mt-4 leading-7 text-emerald-100">Enter at least one positive amount, then calculate to see your total and the sources contributing most.</p><p className="mt-6 text-sm text-emerald-200">Electricity · Natural gas · Gasoline · Diesel</p></div> : <>
                <p className="mt-5 text-sm text-emerald-100">{regionName} · {estimate.year} · annual estimate</p>
                <h2 className="mt-3 text-5xl font-black tracking-tight" data-testid="calculator-total">{tonnes(estimate.total)} <span className="text-xl font-medium text-emerald-200">tCO₂e</span></h2>
                <p className="mt-4 text-sm leading-6 text-emerald-100">Simplified, location-based estimate covering only entered sources.</p>
                <ul className="mt-7 space-y-5">{estimate.rows.map(row => <li key={row.source}>
                  <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{LABELS[row.source]}</span><span className="font-semibold">{tonnes(row.tonnes)} tCO₂e · {row.percentage > 0 && row.percentage < 0.1 ? '<0.1' : row.percentage.toFixed(1)}%</span></div>
                  <div aria-hidden="true" className="mt-2 h-2 overflow-hidden rounded-full bg-emerald-800"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${row.percentage}%` }} /></div>
                </li>)}</ul>
                <p className="mt-7 border-t border-emerald-800 pt-5 text-sm"><strong>{estimate.largest.length > 1 ? 'Joint largest contributors: ' : 'Largest contributor: '}</strong>{estimate.largest.map(key => LABELS[key]).join(' and ')}.</p>
                <p className="mt-3 text-xs leading-5 text-emerald-200">Rounded for display. Percentages may not add to exactly 100%. This is not a complete Scope 1/2/3 inventory or a certified report.</p>
              </>}
            </section>
            {estimate && <section aria-labelledby="pilot-cta" className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-7"><h2 id="pilot-cta" className="text-xl font-bold leading-7">Turn your estimate into a traceable carbon emissions report.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Organize source data, review assumptions and build a report with CarbonLite.</p><div className="mt-5 flex flex-col gap-3"><Link to="/pilot" style={{ color: 'white' }} className="rounded-xl bg-emerald-800 px-5 py-3 text-center text-sm font-bold text-white hover:bg-emerald-900">Request a Paid Pilot</Link><Link to="/#workflow" className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-semibold hover:border-emerald-700">See How CarbonLite Works</Link></div><p className="mt-3 text-xs text-slate-500">Your estimate is not attached to either link.</p></section>}
          </div>
        </div>
        <section aria-labelledby="methodology-heading" className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 id="methodology-heading" className="text-xl font-bold">What’s behind the numbers?</h2>
          <div className="mt-5 grid gap-6 text-sm leading-6 text-slate-600 md:grid-cols-2">
            <div><h3 className="font-bold text-slate-900">Transparent public defaults</h3><p className="mt-2"><a className="underline decoration-emerald-600 underline-offset-4" style={{ textDecoration: 'underline' }} href={SOURCES.eccc} target="_blank" rel="noreferrer">ECCC Emission Factors and Reference Values, v4.0 (September 2026)</a>: electricity consumption intensity, Table {input.year === '2025' ? '5.2' : '5.3'}; marketable natural gas CO₂ and commercial/institutional CH₄/N₂O, Tables {input.year === '2025' ? '1.2 and 2.2' : '1.3 and 2.3'}.</p><p className="mt-2">Electricity uses the table applicable to the selected year, based on {input.year === '2025' ? '2022' : '2023'} inventory data—not a measured {input.year} grid intensity. PEI uses New Brunswick’s intensity, as specified by ECCC.</p></div>
            <div><h3 className="font-bold text-slate-900">Vehicle and warming assumptions</h3><p className="mt-2"><a className="underline decoration-emerald-600 underline-offset-4" style={{ textDecoration: 'underline' }} href={SOURCES.vehicles} target="_blank" rel="noreferrer">Québec GHG Quantification Guide, February 2025, Table 6, p.19</a> supplies Canadian light-duty vehicle defaults (NIR 1990–2022 source). These are fixed technology proxies for both years, not annual fleet averages. Gasoline: Tier 3; diesel: advanced control. Fuel blends, heavy vehicles and off-road use need a tailored assessment.</p><p className="mt-2">Gas components are converted using <a style={{ textDecoration: 'underline' }} href={SOURCES.gwp} target="_blank" rel="noreferrer" className="underline decoration-emerald-600 underline-offset-4">100-year IPCC AR5 GWP</a>: CO₂ 1, CH₄ 28, N₂O 265. Electricity is already CO₂e and is not converted again.</p></div>
            <div><h3 className="font-bold text-slate-900">Calculation and units</h3><p className="mt-2">Source tonnes = annual quantity × factor in grams CO₂e per unit ÷ 1,000,000. Totals use unrounded values. Natural gas volumes must be in m³ on your supplier’s standard-volume basis.</p>{estimate && <ul className="mt-2">{estimate.rows.map(row => <li key={row.source}>{LABELS[row.source]}: {number.format(row.factor)} g CO₂e/{UNITS[row.source]}</li>)}</ul>}</div>
            <div><h3 className="font-bold text-slate-900">Boundaries and privacy</h3><p className="mt-2">Excludes upstream fuel production, renewable/biofuel adjustments, travel not entered, purchased goods, waste, refrigerants and other sources. No offsets or renewable electricity claims are applied. Multi-location businesses should calculate locations separately. Inputs stay in page memory and clear on reload; no calculator API, storage or analytics submission is used.</p><p className="mt-2 text-xs">Factor bundle {FACTOR_VERSION} · checked {FACTOR_VERIFIED_ON}. Older and future reporting years are unavailable in this MVP.</p></div>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap gap-5 px-5 pb-8 text-sm text-slate-500"><span>CarbonLite · A practical first step.</span><Link to="/privacy" className="underline">Privacy</Link><Link to="/terms" className="underline">Terms</Link></footer>
    </div>
  );
}
