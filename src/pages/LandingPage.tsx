
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getOrganizationName } from '../services/auth';

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
  const { isAuthenticated, logout, user } = useAuth();
  const workspaceName = getOrganizationName(user);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }
  const reportSteps = [
    {
      title: 'Upload documents',
      text: 'Upload invoices, utility bills, spreadsheets, or operational PDFs.',
    },
    {
      title: 'Review extracted activity data',
      text: 'Check extracted rows, source references, quantities, units, and uncertain values before import.',
    },
    {
      title: 'Generate summaries and reports',
      text: 'Turn reviewed activity data into emissions summaries and report-ready outputs.',
    },
  ];
  const audienceCards = [
    {
      title: 'Environmental consultants',
      text: 'Prepare client activity data faster while keeping source evidence traceable.',
    },
    {
      title: 'SMEs preparing emissions reports',
      text: 'Move from scattered bills and spreadsheets to structured report inputs.',
    },
    {
      title: 'Industrial operations teams',
      text: 'Review fuel, electricity, water, and operational records before calculations.',
    },
    {
      title: 'ESG and reporting teams',
      text: 'Create report-ready summaries from documents your team already uses.',
    },
  ];
  const documentExamples = [
    'Fuel invoices',
    'Utility bills',
    'CSV/Excel activity data',
    'Operational PDFs',
  ];
  const valuePoints = [
    'Report-ready summaries',
    'Source document traceability',
    'Review-before-import workflow',
    'Designed for SME and consultant workflows',
  ];
  const demoBullets = [
    'Upload invoices, utility bills, spreadsheets',
    'AI extracts activity data',
    'Review before import',
    'Generate emissions summaries and reports',
  ];
  const pricingPlans = [
    {
      name: 'Free',
      price: 'Free',
      text: 'Input data, review extractions, and view emissions metrics.',
    },
    {
      name: 'Pro',
      price: '$19 / report',
      text: 'Download polished reports for client, team, or advisor workflows.',
      featured: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_35%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-bold text-white shadow-lg shadow-emerald-200">
              CL
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">CarbonLite AI</div>
              <div className="text-xs text-slate-500">
                {isAuthenticated ? `Workspace: ${workspaceName}` : 'Emissions report automation'}
              </div>
            </div>
          </div>

          <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#workflow" className="transition hover:text-emerald-700">Workflow</a>
            <a href="#audiences" className="transition hover:text-emerald-700">Who it is for</a>
            <a href="#documents" className="transition hover:text-emerald-700">Documents</a>
            <button
              type="button"
              onClick={() => navigate('/pilot')}
              className="bg-transparent p-0 text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Pilot Program
            </button>
            <a href="#start" className="transition hover:text-emerald-700">Price</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/pilot')}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Request Pilot
            </button>
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/upload' : '/login')}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-300"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_85%_15%,rgba(20,184,166,0.16),transparent_28%)]" />
          <div className="mx-auto grid max-w-7xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Currently onboarding a limited number of pilot users in Alberta
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                Turn emissions documents into reviewed, report-ready summaries.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                Upload invoices, utility bills, spreadsheets, or operational PDFs. CarbonLite AI extracts activity data, lets your team review the rows, then generates emissions summaries and reports.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">
                Built for pilot teams validating a practical workflow for source document traceability, review-before-import controls, and SME-friendly emissions reporting.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/pilot')}
                  className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Request Pilot Access
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/upload', { state: { loadSampleWorkspace: true } })}
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  See Sample Workflow
                </button>
                <a
                  href="#demo-video"
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 px-7 py-3.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-white"
                >
                  Watch Demo
                </a>
                <button
                  type="button"
                  onClick={() => navigate(isAuthenticated ? '/upload' : '/login')}
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  {isAuthenticated ? 'Dashboard' : 'Login'}
                </button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                {[
                  ['3 steps', 'upload to report'],
                  ['AI', 'data extraction'],
                  ['5-10', 'pilot users'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
                    <div className="text-2xl font-black text-slate-950">{value}</div>
                    <div className="mt-1 text-sm text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 via-teal-100/60 to-slate-100 blur-2xl" />
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/50">
                <div className="rounded-[1.5rem] bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <div className="text-sm font-bold">Report Preview</div>
                      <div className="mt-1 text-xs text-slate-400">Source traceability · Review before import</div>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      Ready
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ['Scope 1', 'Diesel', '120 liters', 'high'],
                      ['Scope 2', 'Electricity', '450 kWh', 'high'],
                      ['Scope 1', 'Natural gas', '300 m3', 'medium'],
                    ].map(([scope, source, qty, confidence]) => (
                      <div key={source} className="grid grid-cols-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm">
                        <span className="font-bold text-white">{scope}</span>
                        <span className="text-slate-200">{source}</span>
                        <span className="text-slate-200">{qty}</span>
                        <span className={confidence === 'high' ? 'justify-self-end rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300' : 'justify-self-end rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300'}>
                          {confidence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="demo-video" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Product demo</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">See CarbonLite in Action</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Watch a real workflow from upload to emissions reporting.
              </p>

              <div className="mt-7 grid gap-3">
                {demoBullets.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
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
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">From source documents to emissions summaries.</h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {reportSteps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
                    {index + 1}
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="audiences" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Pilot users</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Built for real emissions workflows</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              CarbonLite is designed for teams who already handle invoices, utility data, spreadsheets, and operational records, but need a clearer path to report-ready emissions outputs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {audienceCards.map((audience) => (
              <div key={audience.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50">
                <h3 className="text-lg font-bold text-slate-950">{audience.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{audience.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="documents" className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Supported inputs</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Upload the documents your workflow already uses.</h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Pilot users can test common source documents and help shape extraction coverage for practical SME and consultant reporting workflows.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
                <h3 className="text-lg font-bold text-slate-950">Document examples</h3>
                <div className="mt-5 grid gap-3">
                  {documentExamples.map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7">
                <h3 className="text-lg font-bold text-slate-950">What pilot teams can validate</h3>
                <div className="mt-5 grid gap-3">
                  {valuePoints.map((item) => (
                    <div key={item} className="rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-900">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Pricing</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Start free, pay when you need reports.</h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={plan.featured ? 'rounded-3xl border border-emerald-200 bg-emerald-50 p-8 shadow-xl shadow-emerald-100/70' : 'rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50'}
              >
                <div className="text-lg font-bold text-slate-950">{plan.name}</div>
                <div className="mt-4 text-4xl font-black text-slate-950">{plan.price}</div>
                <p className="mt-4 leading-7 text-slate-600">{plan.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="start" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 to-emerald-950 p-8 text-white shadow-2xl shadow-slate-300/60 md:flex md:items-center md:justify-between md:p-10">
              <div>
                <h2 className="text-3xl font-black">Join the CarbonLite pilot</h2>
                <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                  We are currently onboarding a small number of Alberta pilot users to test document extraction, review workflows, and report-ready summaries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/pilot')}
                className="mt-7 inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 md:mt-0"
              >
                Request Pilot Access
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
