
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { trackEvent } from '../services/ga4.service';

const demoVideoUrl = import.meta.env.VITE_DEMO_VIDEO_URL || 'https://www.youtube.com/embed/7sXJJN1GMyE';
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
      title: 'Collect source data',
      text: 'Gather utility bills, fuel records, invoices, spreadsheets, and other operational data.',
    },
    {
      title: 'Upload documents or spreadsheets',
      text: 'Import PDFs, images, CSV files, or Excel data into one workspace.',
    },
    {
      title: 'Review activity records',
      text: 'Check extracted quantities, units, dates, province, site, and source references. Fix records that need attention.',
    },
    {
      title: 'Match traceable factors',
      text: 'Apply jurisdiction- and unit-aware emission factors with visible source and year information.',
    },
    {
      title: 'Export a review-ready package',
      text: 'Prepare emissions summaries, activity records, site breakdowns, factor sources, calculation traceability, and records requiring review.',
    },
  ];
  const audienceCards = [
    {
      title: 'Canadian SMEs',
      text: 'Organize energy, fuel, travel, and operational data without building a complex emissions-management system.',
    },
    {
      title: 'Sustainability consultants',
      text: 'Spend less time cleaning client spreadsheets and more time reviewing assumptions, factors, and results.',
    },
    {
      title: 'Multi-site operations',
      text: 'Organize activity data by facility or location and identify missing information before reporting.',
    },
    {
      title: 'Finance / operations / reporting teams',
      text: 'Create structured, source-backed records that can be reviewed internally or shared with external professionals.',
    },
  ];
  const positioningCards = [
    {
      title: 'Collect source data',
      text: 'Bring together utility bills, fuel records, invoices, PDFs, CSV files, and spreadsheets from different sites and teams.',
    },
    {
      title: 'Structure and review',
      text: 'Turn source documents into activity records and identify missing province, site, unit, quantity, or other required information.',
    },
    {
      title: 'Trace every calculation',
      text: 'Connect activity data to its source record, emission factor, jurisdiction, year, and calculation.',
    },
    {
      title: 'Prepare a review package',
      text: 'Export organized records, factor sources, site summaries, calculation traceability, and items that still need review.',
    },
  ];
  const documentExamples = [
    'Utility bills',
    'Fuel receipts',
    'Supplier invoices',
    'Excel spreadsheets',
    'CSV files',
    'Multi-site records',
  ];
  const valuePoints = [
    'Documents & spreadsheets',
    'Structured activity records',
    'Review issues',
    'Traceable calculations',
    'Review package',
  ];
  const demoBullets = [
    'Upload bills, invoices, PDFs, CSV files, and spreadsheets',
    'Extract structured activity records',
    'Review missing province, site, unit, and source details',
    'Match jurisdiction- and year-aware emission factors',
    'Export a review-ready package',
  ];
  const pricingPlans = [
    {
      name: 'Pilot Program',
      price: 'Pilot access',
      text: 'Test document and spreadsheet import, activity-data review, site organization, factor matching, calculation review, and review-package exports.',
    },
    {
      name: 'Source-data workflows',
      price: 'Validating',
      text: 'We are validating CarbonLite with Canadian SMEs and sustainability professionals using real-world source-data workflows.',
      featured: true,
    },
  ];
  const reviewPackageItems = [
    'Activity Records',
    'Site / Facility Breakdown',
    'Factor Source Summary',
    'Calculation Traceability',
    'Records Requiring Review',
    'Boundary Summary',
  ];
  const factorTransparencyItems = [
    'Source',
    'Year',
    'Jurisdiction',
    'Unit',
    'Matching explanation',
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
              <div className="text-base font-bold tracking-tight">CarbonLite</div>
              <div className="text-xs text-slate-500">
                Canadian SME emissions workflow
              </div>
            </div>
          </div>

          <nav className="hidden flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600 lg:flex">
            <a href="#workflow" className="transition hover:text-emerald-700">How It Works</a>
            <a href="#documents" className="transition hover:text-emerald-700">Source Data</a>
            <a href="#audiences" className="transition hover:text-emerald-700">Who It&apos;s For</a>
            <a href="#review-package" className="transition hover:text-emerald-700">Review Package</a>
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
                Built for Canadian SMEs and sustainability professionals
              </div>
              <h1 className="mt-6 max-w-3xl text-[2.2rem] font-black leading-[1.1] tracking-tight text-slate-950 md:text-[2.8rem] lg:text-[3.25rem]">
                Turn bills, invoices, and spreadsheets into review-ready emissions data.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                CarbonLite helps organize utility bills, fuel records, invoices, and spreadsheets into structured activity data. Review missing information, apply traceable emission factors, and prepare outputs that are easier to share with consultants, customers, and internal teams.
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 md:text-base">
                See what is ready, what needs attention, where each number came from, and how the final emissions result was calculated.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/pilot')}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Request Pilot Access
                </button>
                <a
                  href="#demo-video"
                  onClick={() =>
                    trackEvent('DEMO_VIDEO_VIEWED', {
                      video_name: 'CarbonLite demo',
                      source: 'hero',
                    })
                  }
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
                >
                  View Product Demo
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/upload', { state: { loadSampleWorkspace: true } })}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700"
                >
                  See Sample Workflow
                </button>
              </div>

              <div className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['18', 'activity records'],
                  ['4', 'need review'],
                  ['3', 'source files'],
                  ['Review-ready', 'workflow status'],
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
                      <div className="text-sm font-bold">CarbonLite Data Review</div>
                      <div className="mt-1 text-xs text-slate-400">Source files → Records → Review package</div>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      Review-ready
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2.5">
                    {[
                      ['Source files', '4 documents', 'ENMAX_March.pdf · Fuel_receipts.xlsx'],
                      ['Activity records', '18 extracted', 'Structured quantities, dates, units, and sites'],
                      ['Ready', '14 records', 'Ready for factor matching and calculation review'],
                      ['Needs review', '4 records', 'Missing province · unit mismatch · missing site'],
                      ['Traceability', 'Source → Factor', 'Record, jurisdiction, year, and calculation shown together'],
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
                Spend less time cleaning source data.
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                CarbonLite helps move emissions work out of scattered documents and spreadsheets and into a structured review workflow.
              </p>
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
                Watch a practical workflow from messy source records to review-ready emissions outputs.
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
                  title="CarbonLite demo video"
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
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Collect → Upload → Review → Match → Export</h2>
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
              CarbonLite is for Canadian-market teams who already work with invoices, utility data, spreadsheets, and operational records, but need a clearer path to source-data readiness and traceable review outputs.
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
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Source data</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">The hard part often starts before the calculation.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Activity data may be spread across utility portals, invoices, PDFs, spreadsheets, facilities, and different people. CarbonLite provides one workflow for organizing that information before emissions calculations are reviewed.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-slate-950">Common source data</h3>
                <div className="mt-4 grid gap-2.5">
                  {documentExamples.map((item) => (
                    <div key={item} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-950">From scattered files to reviewable records</h3>
                <ol className="mt-4 grid gap-2.5">
                  {valuePoints.map((item, index) => (
                    <li key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                        {index + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section id="factor-trust" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Factor transparency</p>
              <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Know which factor was used — and why.</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                CarbonLite keeps factor source, year, jurisdiction, unit, and matching information visible so reviewers can understand how an emissions result was produced.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {factorTransparencyItems.map((item) => (
                <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-bold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="review-package" className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-md shadow-slate-200/50 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Review-ready output</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl tracking-tight text-slate-950">Give reviewers something they can actually work with.</h2>
              <p className="mt-3 max-w-4xl leading-7 text-slate-600">
                CarbonLite organizes the records behind the emissions result, not just the final number.
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-500">
                CarbonLite supports data organization, emissions calculation, and review workflows. It does not replace formal regulatory reporting, third-party verification, or professional compliance advice.
              </p>
              <button
                type="button"
                onClick={() => navigate('/pilot')}
                className="mt-6 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                Request Pilot Access
              </button>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {reviewPackageItems.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pilot-program" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Pilot Access</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight md:text-3xl">Start with pilot access</h2>
            <p className="mt-3 text-base leading-7 text-slate-600">
              We are currently validating CarbonLite with Canadian SMEs and sustainability professionals using real-world source-data workflows.
            </p>
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
            Request Pilot Access
          </button>
          </div>
        </section>

        <section id="start" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 to-emerald-950 p-6 text-white shadow-xl shadow-slate-300/60 md:flex md:items-center md:justify-between md:p-8">
              <div>
                <h2 className="text-2xl font-black md:text-3xl">Join the CarbonLite pilot</h2>
                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  Help us validate a simpler way to turn bills, invoices, spreadsheets, and operational records into structured, review-ready emissions data.
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
