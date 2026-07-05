
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { trackEvent } from '../services/ga4.service';

const demoVideoUrl = import.meta.env.VITE_DEMO_VIDEO_URL || 'https://www.youtube.com/embed/rninS2Y0FBo';
const demoVideoEmbedUrl = getYouTubeEmbedUrl(demoVideoUrl);

function getYouTubeEmbedUrl(urlOrId: string) {
  const value = String(urlOrId ?? '').trim();

  if (!value) return '';
  if (value.includes('/embed/')) return value;

  const watchMatch = value.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?rel=0&modestbranding=1`;
  }

  const shortMatch = value.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?rel=0&modestbranding=1`;
  }

  return `https://www.youtube.com/embed/${value}?rel=0&modestbranding=1`;
}

export default function CarbonLiteLandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const reportSteps = [
    {
      title: 'Prepare your data',
      text: 'Use the Data Collection Guide and templates to understand what information SMEs should collect before reporting.',
    },
    {
      title: 'Upload documents or spreadsheets',
      text: 'Import utility bills, invoices, operational PDFs, CSV files, or Excel activity data.',
    },
    {
      title: 'Review activity records',
      text: 'Check quantities, units, dates, source references, and records requiring review before calculation.',
    },
    {
      title: 'Match conversion factors',
      text: 'Use jurisdiction-aware factor matching with source, year, confidence level, and verification status.',
    },
    {
      title: 'Generate insights and reports',
      text: 'View emissions summaries, hotspots, calculation issues, and traceable reports.',
    },
  ];
  const audienceCards = [
    {
      title: 'Canadian SMEs',
      text: 'Understand what emissions-related data to collect, organize messy operational records, and see where the largest emissions come from.',
    },
    {
      title: 'Sustainability consultants',
      text: 'Review client data faster, explain factor choices, identify data gaps, and produce clearer reporting outputs.',
    },
    {
      title: 'Industrial operations teams',
      text: 'Organize fuel, electricity, water, and operational records before emissions calculations and review.',
    },
    {
      title: 'ESG and reporting teams',
      text: 'Create source-backed summaries from the documents and spreadsheets your team already uses.',
    },
  ];
  const positioningCards = [
    {
      title: 'Data readiness for SMEs',
      text: 'Help teams understand what data to collect, how to organize it, and which records are ready for emissions calculation.',
    },
    {
      title: 'Jurisdiction-aware factors',
      text: 'Match activity data with factors based on country, province, year, source, and confidence level. Electricity factors should be province-specific.',
    },
    {
      title: 'Traceable reporting',
      text: 'Connect each emissions result back to its source data, conversion factor, calculation formula, and review status.',
    },
    {
      title: 'Emissions hotspot analysis',
      text: 'Identify the highest-emitting categories so SMEs and consultants can focus attention where it matters most.',
    },
  ];
  const documentExamples = [
    'Utility bills',
    'Fuel invoices',
    'Natural gas bills',
    'Electricity bills',
    'CSV/Excel activity data',
    'Water bills',
    'Travel, hotel, and shipping records',
    'Operational PDFs',
  ];
  const valuePoints = [
    'Jurisdiction-aware factor selection',
    'Traceable emissions reporting',
    'Records requiring review',
    'Data readiness for SME and consultant workflows',
  ];
  const demoBullets = [
    'Upload invoices, utility bills, spreadsheets',
    'Extract structured activity data',
    'Review records requiring attention',
    'Match jurisdiction-aware conversion factors',
    'Generate traceable reports and hotspot summaries',
  ];
  const pricingPlans = [
    {
      name: 'Free pilot',
      price: 'Pilot access',
      text: 'Test data upload, record review, metrics summary, hotspot analysis, and traceability workflows.',
    },
    {
      name: 'Report-ready workflows',
      price: 'Validating',
      text: 'Advanced exports, polished reports, and consultant-ready outputs are being validated with pilot users.',
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_35%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-bold text-white shadow-lg shadow-emerald-200">
              CL
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">CarbonLite AI</div>
              <div className="text-xs text-slate-500">
                Canadian SME emissions workflow
              </div>
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 lg:flex">
            <a href="#workflow" className="transition hover:text-emerald-700">Workflow</a>
            <a href="#audiences" className="transition hover:text-emerald-700">Who it is for</a>
            <a href="#factor-trust" className="transition hover:text-emerald-700">Factor Trust</a>
            <a href="#hotspots" className="transition hover:text-emerald-700">Hotspots</a>
            <button
              type="button"
              onClick={() => navigate('/pilot')}
              className="bg-transparent p-0 text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Pilot Program
            </button>
          </nav>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/pilot')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Request Pilot
            </button>
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/upload' : '/login')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(20,184,166,0.16),transparent_28%)]" />
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-2 lg:items-center lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Designed for Canadian SMEs and sustainability consultants
              </div>
              <h1 className="mt-6 max-w-3xl text-[2.2rem] font-black leading-[1.1] tracking-tight text-slate-950 md:text-[2.8rem] lg:text-[3.25rem]">
                CarbonLite helps Canadian SMEs turn messy operational records into traceable emissions insights.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                For SMEs, consultants, and sustainability teams, CarbonLite helps organize utility bills, invoices, spreadsheets, and activity data into structured emissions records, jurisdiction-aware factor matching, hotspot analysis, and report-ready outputs.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 md:text-base">
                Understand what data is ready, what needs review, which factors were used, and where to focus first.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/pilot')}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Request pilot access
                </button>
                <a
                  href="#demo-video"
                  onClick={() =>
                    trackEvent('DEMO_VIDEO_VIEWED', {
                      video_name: 'CarbonLite AI demo',
                      source: 'hero',
                    })
                  }
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
                >
                  View product demo
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/upload', { state: { loadSampleWorkspace: true } })}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
                >
                  See Sample Workflow
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/upload' : '/login')}
                  className="rounded-xl border border-transparent bg-transparent px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:text-emerald-700"
                >
                  {isAuthenticated ? 'Dashboard' : 'Login'}
                </button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
                {[
                  ['82%', 'data readiness'],
                  ['2 records', 'need review'],
                  ['Traceable', 'report status'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-md shadow-slate-200/60 backdrop-blur">
                    <div className="text-xl font-black text-slate-950">{value}</div>
                    <div className="mt-1 text-sm text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 via-teal-100/60 to-slate-100 blur-2xl" />
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/50">
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-sm font-bold">CarbonLite Readiness Preview</div>
                      <div className="mt-1 text-xs text-slate-400">Data quality · Factor match · Hotspots</div>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      Traceable
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2.5">
                    {[
                      ['Data readiness', '82%', '4 of 6 records calculated'],
                      ['Top hotspot', 'Natural Gas', '45% of calculated emissions'],
                      ['Factor match', 'Alberta / 2025', 'System default · review required'],
                      ['Records requiring review', '2', 'Invalid unit · missing factor'],
                    ].map(([label, value, detail]) => (
                      <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-300">{label}</span>
                          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">{value}</span>
                        </div>
                        <div className="mt-2 text-slate-200">{detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Why CarbonLite</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">
                Data readiness, factor trust, and traceable reporting.
              </h2>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {positioningCards.map((card) => (
                <article key={card.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-950">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="demo-video" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Product demo</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">See CarbonLite in Action</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Watch a practical workflow from messy source records to reviewable emissions outputs.
              </p>

              <div className="mt-6 grid gap-2.5">
                {demoBullets.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                      ✓
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-3 shadow-2xl shadow-slate-200/70">
              <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-slate-950">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src={demoVideoEmbedUrl}
                  title="CarbonLite AI demo video"
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">How it works</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Prepare → Upload → Review → Match → Report</h2>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
              {reportSteps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-base font-black text-emerald-700">
                    {index + 1}
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="audiences" className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Pilot users</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Built for Canadian SMEs and sustainability consultants</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              CarbonLite is for Canadian-market teams who already work with invoices, utility data, spreadsheets, and operational records, but need a clearer path to data readiness and traceable emissions reporting.
            </p>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {audienceCards.map((audience) => (
              <div key={audience.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
                <h3 className="text-lg font-bold text-slate-950">{audience.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{audience.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="documents" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Supported inputs</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Upload the documents your workflow already uses.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Pilot users can test common source documents and help shape coverage for practical SME and consultant reporting workflows. Some records may be tracked-only or require review if a factor, unit, province, or source reference is missing.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-slate-950">Document examples</h3>
                <div className="mt-4 grid gap-2.5">
                  {documentExamples.map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="text-lg font-bold text-slate-950">What pilot teams can validate</h3>
                <div className="mt-4 grid gap-2.5">
                  {valuePoints.map((item) => (
                    <div key={item} className="rounded-xl border border-emerald-100 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-emerald-900">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="hotspots" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Emissions hotspots</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Know where to focus first</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                CarbonLite highlights top emissions categories and records requiring review, helping SMEs and consultants prioritize the highest-impact areas.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Top hotspot', 'Natural Gas'],
                ['Calculated records', '4 of 6 records'],
                ['Requires review', '2 records'],
                ['Tracked metric', 'Water usage'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/50">
                  <div className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</div>
                  <div className="mt-3 text-xl font-black text-slate-950">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="factor-trust" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Factor trust</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Emission factors should be explainable</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                CarbonLite tracks factor source, year, jurisdiction, confidence level, and verification status so users can understand which factor was used and why.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Source authority',
                'Source document',
                'Factor year',
                'Jurisdiction',
                'Confidence level',
                'Verification status',
                'Matching explanation',
              ].map((item) => (
                <div key={item} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-sm font-bold text-emerald-900">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-md shadow-amber-100/50">
            <p className="text-sm font-bold uppercase tracking-wider text-amber-700">Future readiness</p>
            <h2 className="mt-2 text-2xl font-black md:text-3xl tracking-tight text-slate-950">Carbon Credit Readiness</h2>
            <p className="mt-3 max-w-4xl leading-7 text-slate-700">
              CarbonLite may help organize emissions data for future reduction analysis or professional carbon credit readiness discussions.
            </p>
            <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-amber-900">
              CarbonLite does not determine carbon credit eligibility, certify reductions, or replace professional advice.
            </p>
          </div>
        </section>

        <section id="pilot-program" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Pilot Access</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Start with pilot access</h2>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={plan.featured ? 'rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-lg shadow-emerald-100/70' : 'rounded-3xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50'}
              >
                <div className="text-lg font-bold text-slate-950">{plan.name}</div>
                <div className="mt-3 text-2xl font-black md:text-3xl text-slate-950">{plan.price}</div>
                <p className="mt-4 leading-7 text-slate-600">{plan.text}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/pilot')}
            className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-700"
          >
            Request pilot access
          </button>
          </div>
        </section>

        <section id="start" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 to-emerald-950 p-6 text-white shadow-xl shadow-slate-300/60 md:flex md:items-center md:justify-between md:p-8">
              <div>
                <h2 className="text-2xl font-black md:text-3xl">Join the CarbonLite pilot</h2>
                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  We are currently validating CarbonLite with Canadian SMEs, sustainability consultants, and environmental professionals. Help shape data readiness, factor matching, hotspot analysis, and traceable reporting workflows.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pilot')}
                className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 md:mt-0"
              >
                Request Pilot Access
              </button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} KACH CANADA LTD.</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Company">
            <Link
              to="/about"
              className="font-semibold text-slate-700 transition hover:text-emerald-700"
            >
              About CarbonLite
            </Link>
            <Link
              to="/privacy"
              className="font-semibold text-slate-700 transition hover:text-emerald-700"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="font-semibold text-slate-700 transition hover:text-emerald-700"
            >
              Terms of Use
            </Link>
            <a
              href="mailto:carbonliteai@gmail.com"
              className="font-semibold text-slate-700 transition hover:text-emerald-700"
            >
              Contact Us
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
