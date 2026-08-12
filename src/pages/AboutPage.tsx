import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const defaultTitle = 'CarbonLite | Emissions Data Readiness for SMEs';
const defaultDescription =
  'Turn invoices, utility bills, and spreadsheets into structured emissions data readiness and reporting workflows. CarbonLite helps SMEs and environmental consultants improve factor matching and calculation traceability.';

const workflowSteps = [
  'Upload invoices, utility bills, spreadsheets, and operational documents.',
  'Extract structured activity data from source files.',
  'Review and validate records before they are imported.',
  'Apply jurisdiction-aware factor selection with source, year, confidence level, and verification status.',
  'Generate traceable emissions summaries, data quality notes, and reporting outputs.',
];

const audiences = [
  'Sustainability consultants',
  'Canadian SMEs',
  'Operations teams',
  'Facilities and logistics teams',
  'Organizations preparing internal emissions summaries',
];

const approachItems = [
  {
    title: 'Practical automation',
    text: 'Reduce repetitive data entry while preserving the steps environmental teams need to review.',
  },
  {
    title: 'Review before import',
    text: 'Keep people in control of extracted quantities, units, dates, and source references.',
  },
  {
    title: 'Factor traceability',
    text: 'Make factor source, source year, jurisdiction, confidence level, and verification status visible.',
  },
  {
    title: 'Transparent methodology',
    text: 'Show how activity data and conversion factors contribute to estimated emissions.',
  },
  {
    title: 'SME-friendly design',
    text: 'Help Canadian SMEs improve data readiness and understand emissions hotspots without overclaiming compliance.',
  },
];

export default function AboutPage() {
  useEffect(() => {
    const existingDescription = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    const description = existingDescription ?? document.createElement('meta');
    const existingCanonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    const canonical = existingCanonical ?? document.createElement('link');

    if (!existingDescription) {
      description.name = 'description';
      document.head.append(description);
    }

    if (!existingCanonical) {
      canonical.rel = 'canonical';
      document.head.append(canonical);
    }

    document.title = 'About CarbonLite | Emissions Data Readiness for SMEs';
    description.content =
      'Learn about CarbonLite, a Canadian-built emissions data readiness and reporting workflow tool for SMEs and environmental consultants.';
    canonical.href = 'https://carbonliteapp.ca/about';

    return () => {
      document.title = defaultTitle;
      if (existingDescription) {
        description.content = defaultDescription;
      } else {
        description.remove();
      }

      if (existingCanonical) {
        canonical.href = 'https://carbonliteapp.ca/';
      } else {
        canonical.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_28%,#f0fdf4_100%)] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">
              CL
            </span>
            <span>
              <span className="block font-bold">CarbonLite</span>
              <span className="block text-xs text-slate-500">About CarbonLite</span>
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700"
          >
            Home
          </Link>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
            <p className="text-sm font-bold uppercase text-emerald-700">
              Canadian-built carbon reporting workflow
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black text-slate-950 sm:text-5xl">
              About CarbonLite
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              A lightweight carbon reporting workflow tool built to help Canadian
              SMEs and sustainability consultants reduce manual reporting work.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">What it does</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                From source documents to reviewed reporting data
              </h2>
              <p className="mt-5 leading-8 text-slate-600">
                CarbonLite brings the common steps of an emissions reporting workflow
                into one practical application for data readiness, factor review,
                traceable calculations, and emissions hotspot visibility.
              </p>
            </div>
            <ol className="space-y-3">
              {workflowSteps.map((step, index) => (
                <li
                  key={step}
                  className="flex gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm leading-6 text-slate-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Why it exists</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">
                Less repetitive entry, more transparent review
              </h2>
              <p className="mt-5 leading-8 text-slate-600">
                Many SMEs still prepare emissions reports manually from PDFs,
                spreadsheets, invoices, and utility bills. CarbonLite is designed to
                reduce repetitive data entry while making source records, conversion
                factors, calculation steps, and records requiring review easier to
                explain.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Who it is for</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {audiences.map((audience) => (
                  <div
                    key={audience}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {audience}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase text-emerald-700">For Canadian SMEs</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Prepare better emissions data</h2>
              <p className="mt-4 leading-7 text-slate-600">
                CarbonLite helps Canadian SMEs prepare emissions-related data for
                reporting, internal decision-making, and consultant review. The
                platform focuses on data readiness, jurisdiction-aware factor
                selection, traceable calculations, and emissions hotspot visibility.
              </p>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-bold uppercase text-emerald-700">For sustainability consultants</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">Review client data with clearer evidence</h2>
              <p className="mt-4 leading-7 text-slate-600">
                CarbonLite supports consultants working with SME clients by reducing
                manual data organization, making factor choices easier to explain,
                and surfacing data gaps before reports are finalized.
              </p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-sm font-bold uppercase text-emerald-700">Our approach</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950">
            Workflow support with people kept in the loop
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {approachItems.map((item) => (
              <article
                key={item.title}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="font-bold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-emerald-200 bg-emerald-50">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Current stage</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                Pilot-stage validation
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                CarbonLite is currently in pilot-stage validation with feedback
                from environmental reporting professionals. The focus is learning
                where the workflow saves time, where review controls need improvement,
                and which document types matter most.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold uppercase text-emerald-700">Built in Canada</p>
              <h2 className="mt-3 text-2xl font-bold text-slate-950">
                Developed by KACH CANADA LTD.
              </h2>
              <p className="mt-4 leading-7 text-slate-700">
                CarbonLite is developed in Canada for practical SME and consultant
                reporting workflows.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="rounded-lg border border-slate-200 bg-slate-950 p-7 text-white sm:p-9">
            <h2 className="text-2xl font-bold">Pilot feedback and collaboration</h2>
            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              For pilot feedback, workflow questions, or collaboration, contact the
              CarbonLite team.
            </p>
            <a
              href="mailto:carbonliteai@gmail.com"
              className="mt-6 inline-flex rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-400"
            >
              carbonliteai@gmail.com
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
