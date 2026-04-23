export default function AdvisorLandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            CarbonLite – AI-Powered Carbon Data Extraction for SMEs
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            A practical solution to automate data collection from operational documents and enable structured carbon reporting workflows.
          </p>
        </div>

        {/* Problem */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Problem</h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc pl-5">
            <li>Manual extraction of data from invoices, receipts, and spreadsheets</li>
            <li>Time-consuming and error-prone workflows</li>
            <li>Lack of structured data for carbon reporting</li>
            <li>High barrier for SMEs to adopt ESG processes</li>
          </ul>
        </section>

        {/* Solution */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Solution</h2>
          <p className="mt-4 text-slate-600">
            CarbonLite introduces an AI-assisted workflow to convert unstructured documents into structured activity data.
          </p>

          <div className="mt-6 grid gap-4">
            {[
              "Upload documents (CSV, invoices, utility bills)",
              "AI extracts activity data (type, quantity, unit, date)",
              "User reviews and validates extracted results",
              "Confirmed data is imported into structured database",
              "Metrics are calculated for reporting",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        {/* Innovation */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Innovation</h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc pl-5">
            <li>AI-based document understanding tailored for carbon workflows</li>
            <li>Structured extraction beyond traditional OCR</li>
            <li>Validation mechanisms (row count, missing detection)</li>
            <li>Simple UX for non-technical users</li>
          </ul>
        </section>

        {/* Status */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Current Status</h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc pl-5">
            <li>Working MVP completed</li>
            <li>End-to-end workflow implemented</li>
            <li>AI extraction integrated</li>
            <li>Preview, validation, and import features functional</li>
          </ul>
        </section>

        {/* Impact */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Expected Impact</h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc pl-5">
            <li>Reduce manual data processing time by 50–70%</li>
            <li>Improve data accuracy and consistency</li>
            <li>Enable SMEs to adopt carbon tracking workflows</li>
          </ul>
        </section>

        {/* Funding */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-slate-900">Use of Funding</h2>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc pl-5">
            <li>Improve AI extraction accuracy</li>
            <li>Enhance validation and error handling</li>
            <li>Conduct pilot testing with early users</li>
            <li>Prepare system for commercialization</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="mt-16 border-t border-slate-200 pt-10">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                CarbonLite – Ready for pilot validation
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Seeking funding to validate the solution with real SME workflows and improve system robustness.
              </p>
            </div>
            <button className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
              Contact / Demo
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
