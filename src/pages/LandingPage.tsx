
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { trackEvent } from '../services/ga4.service';
import { USER_WORKFLOW } from '../constants/userWorkflow';

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

const workflowDescriptions = [
  'Choose the reporting period and locations.',
  'Upload bills and spreadsheets or enter data manually.',
  'Fix missing or invalid information.',
  'Review emissions, factors, and items needing attention.',
  'Export an Executive, Technical, or CSV package.',
];
const outcomes = [
  { title: 'Organize messy source data', text: 'Bills, invoices, and spreadsheets become structured activity records.' },
  { title: 'Catch issues before reporting', text: 'See missing units, jurisdictions, sites, and other data gaps.' },
  { title: 'Keep every result traceable', text: 'See the source, factor, and calculation behind each emissions result.' },
];
const audiences = [
  { id: 'for-smes', title: 'Canadian SMEs', text: 'Organize utility, fuel, travel, and operational data without building a complex emissions-management system.' },
  { id: 'for-consultants', title: 'Sustainability consultants', text: 'Spend less time cleaning client source data and more time reviewing assumptions, factors, and results.' },
];
const primaryButtonClass = 'rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700';
const secondaryButtonClass = 'rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-700 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700';

export default function CarbonLiteLandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  function openProduct() {
    navigate(isAuthenticated ? '/upload' : '/login');
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_35%,#f8fafc_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-sm font-bold text-white">CL</div>
            <span className="text-base font-bold tracking-tight">CarbonLite</span>
          </div>
          <nav aria-label="Homepage" className="order-3 flex w-full flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-slate-600 lg:gap-x-5 lg:order-none lg:w-auto">
            <a href="#workflow" className="hover:text-emerald-800">How It Works</a>
            <a href="#for-smes" className="hover:text-emerald-800">For SMEs</a>
            <a href="#for-consultants" className="hover:text-emerald-800">For Consultants</a>
            <a href="#demo-video" className="hover:text-emerald-800">Demo</a>
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            {isAuthenticated ? (
              <button type="button" onClick={openProduct} className={primaryButtonClass}>Open CarbonLite</button>
            ) : (
              <>
                <button type="button" onClick={openProduct} className={secondaryButtonClass}>Sign In</button>
                <button type="button" onClick={() => navigate('/pilot')} className={primaryButtonClass}>Request Pilot Access</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section aria-labelledby="hero-title" className="border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-5 py-14 lg:py-16">
            <p className="text-sm font-semibold text-emerald-800">For Canadian SMEs and sustainability consultants</p>
            <h1 id="hero-title" className="mt-5 max-w-4xl text-[2.2rem] font-black leading-[1.1] tracking-tight text-slate-950 md:text-[2.8rem] lg:text-[3.25rem]">
              Turn bills, invoices, and spreadsheets into review-ready emissions data.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Organize source data, resolve missing information, apply traceable emission factors, and prepare a review-ready emissions package.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => isAuthenticated ? openProduct() : navigate('/pilot')} className={primaryButtonClass}>
                {isAuthenticated ? 'Open CarbonLite' : 'Request Pilot Access'}
              </button>
              <a href="#demo-video" onClick={() => trackEvent('DEMO_VIDEO_VIEWED', { video_name: 'CarbonLite demo', source: 'hero' })} className={secondaryButtonClass}>Watch Demo</a>
            </div>
          </div>
        </section>

        <section aria-labelledby="why-title" className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 id="why-title" className="text-2xl font-black tracking-tight md:text-3xl">Why CarbonLite</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-3">
              {outcomes.map((outcome) => (
                <article key={outcome.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-bold">{outcome.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{outcome.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" aria-labelledby="workflow-title" className="scroll-mt-56 lg:scroll-mt-40 border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 id="workflow-title" className="text-2xl font-black tracking-tight md:text-3xl">How It Works</h2>
            <ol aria-label="Five steps to a review-ready report" className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {USER_WORKFLOW.map((step, index) => (
                <li key={step.action} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 font-bold text-emerald-800">{index + 1}</span>
                  <h3 className="text-lg font-bold">{step.action}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{workflowDescriptions[index]}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="demo-video" aria-labelledby="demo-title" className="scroll-mt-56 lg:scroll-mt-40 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 id="demo-title" className="text-2xl font-black tracking-tight md:text-3xl">Product Demo</h2>
              <ul aria-label="Demo workflow" className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
                {USER_WORKFLOW.map((step) => (
                  <li key={step.action} className="flex items-center gap-3">
                    <span aria-hidden="true" className="text-emerald-800">✓</span>{step.action}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-950">
                <iframe className="absolute inset-0 h-full w-full" src={demoVideoEmbedUrl} title="CarbonLite demo video" loading="lazy" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
              </div>
            </div>
          </div>
        </section>

        <section id="audiences" aria-labelledby="audiences-title" className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 id="audiences-title" className="text-2xl font-black tracking-tight md:text-3xl">Who It’s For</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {audiences.map((audience) => (
                <article id={audience.id} key={audience.id} className="scroll-mt-56 lg:scroll-mt-40 rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-bold">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{audience.text}</p>
                </article>
              ))}
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">For finance, operations, and reporting teams, including those working across multiple sites.</p>
          </div>
        </section>

        <section id="review-package" aria-labelledby="trust-title" className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <h2 id="trust-title" className="text-2xl font-black tracking-tight md:text-3xl">Review-ready Output</h2>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold">Trace each result</h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {['Source record', 'Emission factor', 'Jurisdiction & year', 'Calculation traceability'].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold">Share the review package</h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {['Executive Summary', 'Technical Emissions Report', 'CSV export'].map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-slate-600">Pilot results require professional review before formal use.</p>
          </div>
        </section>

        <section id="start" aria-labelledby="start-title" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-5 py-12">
            <div className="rounded-3xl bg-slate-950 p-6 text-white md:p-8">
              <h2 id="start-title" className="text-2xl font-black md:text-3xl">Try CarbonLite with your own source data</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">Start with the bills, invoices, and spreadsheets you already have.</p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button type="button" onClick={() => isAuthenticated ? openProduct() : navigate('/pilot')} className={primaryButtonClass}>
                  {isAuthenticated ? 'Open CarbonLite' : 'Request Pilot Access'}
                </button>
                {isAuthenticated ? <button type="button" onClick={() => navigate('/pilot')} className="text-sm font-semibold text-slate-200 underline underline-offset-4 hover:text-white">Request Pilot Access</button> : null}
              </div>
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
