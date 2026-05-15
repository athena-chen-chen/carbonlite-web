
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { getOrganizationName } from '../services/auth';

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
      title: 'Upload',
      text: 'Upload invoices, utility bills, fuel receipts, or spreadsheets.',
    },
    {
      title: 'Review',
      text: 'Check extracted rows, fix uncertain values, and confirm clean activity data.',
    },
    {
      title: 'Generate',
      text: 'Turn verified activity data into metrics and client-ready emissions reports.',
    },
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
            <a href="#pricing" className="transition hover:text-emerald-700">Pricing</a>
            <a href="#start" className="transition hover:text-emerald-700">Start</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/upload' : '/login')}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
            >
              {isAuthenticated ? 'Dashboard' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/upload')}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Open App
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
                Built for SMEs, consultants, and operations teams
              </div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-tight text-slate-950 md:text-6xl lg:text-7xl">
                Generate emissions reports in minutes.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                Upload invoices, utility bills, or spreadsheets. CarbonLite extracts activity data, helps you review it, and prepares client-ready emissions reports.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/upload')}
                  className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Upload Data
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/metrics-summary')}
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  See Sample Report
                </button>
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
                  ['Pro', '$19 per report'],
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
                      <div className="mt-1 text-xs text-slate-400">Activity rows: 3 · Report status: ready</div>
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

        <section id="workflow" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">How it works</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">From source documents to emissions reports.</h2>
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
                <h2 className="text-3xl font-black">Start your first report today</h2>
                <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                  Bring one document, review the extracted activity data, and see how quickly CarbonLite can prepare emissions reporting outputs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/upload')}
                className="mt-7 inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 md:mt-0"
              >
                Upload Your Data
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
