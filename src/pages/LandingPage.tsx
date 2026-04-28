export default function CarbonLiteLandingPage() {
  const features = [
    {
      title: 'AI document extraction',
      text: 'Extract activity data from invoices, utility bills, fuel receipts, and CSV files without manual re-entry.',
    },
    {
      title: 'Human review workflow',
      text: 'Review, edit, add, or remove extracted rows before importing them into the system.',
    },
    {
      title: 'Confidence indicators',
      text: 'Highlight uncertain fields so users can quickly identify values that need attention.',
    },
    {
      title: 'Carbon-ready data',
      text: 'Convert messy operational documents into structured activity records for emissions tracking.',
    },
  ];

  const workflow = ['Upload', 'Extract', 'Review', 'Import', 'Metrics'];

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
              <div className="text-xs text-slate-500">AI carbon data extraction</div>
            </div>
          </div>

          <nav className="hidden gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#problem" className="transition hover:text-emerald-700">Problem</a>
            <a href="#solution" className="transition hover:text-emerald-700">Solution</a>
            <a href="#demo" className="transition hover:text-emerald-700">Demo</a>
            <a href="#contact" className="transition hover:text-emerald-700">Contact</a>
           
          </nav>

   <a
  href="mailto:carbonliteai@gmail.com?subject=CarbonLite AI Demo Request"
  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700"
>
  Request Demo
</a>
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
                Turn messy documents into carbon-ready data.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
                CarbonLite AI uses AI to extract, validate, and structure emissions-related activity data from invoices, utility bills, fuel receipts, and spreadsheets.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="/upload"
                  className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-emerald-200 transition hover:-translate-y-0.5"
                >
                  Try Live Demo
                </a>
                <a
                  href="#contact"
                  className="rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                >
                  Join Pilot List
                </a>
                
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-4">
                {[
                  ['80–90%', 'less manual effort'],
                  ['5 steps', 'demo workflow'],
                  ['MVP', 'ready to validate'],
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
                      <div className="text-sm font-bold">Extract Preview</div>
                      <div className="mt-1 text-xs text-slate-400">Source rows: 3 · Extracted rows: 3</div>
                    </div>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">
                      Ready
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ['DIESEL', '120', 'liters', 'high'],
                      ['ELECTRICITY', '450', 'kWh', 'high'],
                      ['NATURAL_GAS', '300', 'm3', 'medium'],
                    ].map(([type, qty, unit, confidence]) => (
                      <div key={type} className="grid grid-cols-4 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm">
                        <span className="font-bold text-white">{type}</span>
                        <span className="text-slate-200">{qty}</span>
                        <span className="text-slate-200">{unit}</span>
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

        <section id="problem" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Problem</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Carbon data collection is still manual.</h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Carbon data is often buried inside invoices, utility bills, receipts, and spreadsheets. SMEs and consultants still spend hours copying values into Excel before they can calculate or report emissions.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {['Manual data entry', 'Inconsistent formats', 'Hard to scale reporting'].map((item) => (
                <div key={item} className="rounded-3xl border border-slate-200 bg-slate-50 p-7 shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:shadow-slate-200/70">
                  <div className="text-xl font-bold">{item}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    A repetitive workflow that increases cost, delays reporting, and creates room for errors.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Solution</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">How CarbonLite AI helps</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-100">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-black text-emerald-700">
                  ✓
                </div>
                <h3 className="font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="demo" className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Demo workflow</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">From upload to carbon metrics in five steps.</h2>
            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10">
                  <div className="text-sm font-bold text-emerald-300">Step {index + 1}</div>
                  <div className="mt-3 text-2xl font-black">{step}</div>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-300">
              The current MVP demonstrates the full flow from document upload to AI extraction, user validation, import, and carbon-related metrics summary.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">Users</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Who it is for</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              'ESG and carbon consultants',
              'Logistics and transportation SMEs',
              'Operations and accounting teams',
            ].map((item) => (
              <div key={item} className="rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50">
                <div className="text-lg font-bold">{item}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Teams that need faster, cleaner activity data from operational documents.
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-950 to-emerald-950 p-8 text-white shadow-2xl shadow-slate-300/60 md:flex md:items-center md:justify-between md:p-10">
              <div>
                <h2 className="text-3xl font-black">Ready for pilot validation</h2>
                <p className="mt-4 max-w-2xl leading-8 text-slate-300">
                  CarbonLite AI is currently in MVP stage and seeking pilot users, advisors, and partners to validate real-world workflows.
                </p>
              </div>
              <div className="flex gap-4">
<a
  href="mailto:carbonliteai@gmail.com?subject=CarbonLite AI Pilot Demo Request"
  className="mt-7 inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:-translate-y-0.5 hover:bg-emerald-400 md:mt-0"
>
  Request Pilot Demo
</a>
</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
