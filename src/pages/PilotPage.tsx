import { Link, useNavigate } from 'react-router-dom';

const requestPilotHref = 'mailto:carbonliteai@gmail.com?subject=CarbonLite Pilot Request';
const bookDemoHref = 'mailto:carbonliteai@gmail.com?subject=CarbonLite Demo Request';

const audience = [
  'SMEs preparing emissions reports',
  'Environmental consultants',
  'Operations/admin teams handling invoices and utility data',
];

const testAreas = [
  'Upload invoices, utility bills, and spreadsheets',
  'Review extracted activity data',
  'Generate emissions metrics',
  'Export report-ready summaries',
];

const feedbackAreas = [
  'feedback on usability',
  'reporting workflow needs',
  'sample document types',
  'pain points in current manual process',
];

function PilotList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PilotPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#f0fdf4_100%)] text-slate-900">
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm font-bold text-white shadow-lg shadow-emerald-200">
              CL
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">CarbonLite AI</span>
              <span className="block text-xs text-slate-500">Pilot Program</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
            >
              Home
            </button>
            <a
              href={requestPilotHref}
              className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              Request Pilot
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_82%_20%,rgba(20,184,166,0.14),transparent_28%)]" />
          <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Recruiting 5-10 pilot users
              </div>
              <h1 className="mt-7 text-5xl font-black tracking-tight text-slate-950 md:text-6xl">
                Join the CarbonLite Pilot Program
              </h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
                We are inviting a small group of SMEs, consultants, and operations teams to test CarbonLite and provide feedback.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href={requestPilotHref}
                  className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Request Pilot
                </a>
                <a
                  href={bookDemoHref}
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  Book Demo
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-16 lg:grid-cols-3">
            <PilotList title="Who It Is For" items={audience} />
            <PilotList title="What You Can Test" items={testAreas} />
            <PilotList title="What We Are Looking For" items={feedbackAreas} />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 to-emerald-950 p-8 text-white shadow-2xl shadow-slate-300/60 md:flex md:items-center md:justify-between md:p-10">
            <div>
              <h2 className="text-3xl font-black">Help shape a practical emissions workflow.</h2>
              <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                Bring sample documents, test the upload-to-report flow, and tell us where CarbonLite should fit into your current reporting process.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3 md:mt-0">
              <a
                href={requestPilotHref}
                className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
              >
                Request Pilot
              </a>
              <a
                href={bookDemoHref}
                className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                Book Demo
              </a>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} KACH CANADA LTD.</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Company">
            <Link to="/about" className="font-semibold text-slate-700 hover:text-emerald-700">
              About CarbonLite
            </Link>
            <Link to="/privacy" className="font-semibold text-slate-700 hover:text-emerald-700">
              Privacy Policy
            </Link>
            <Link to="/terms" className="font-semibold text-slate-700 hover:text-emerald-700">
              Terms of Use
            </Link>
            <a href="mailto:carbonliteai@gmail.com" className="font-semibold text-slate-700 hover:text-emerald-700">
              Contact Us
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
