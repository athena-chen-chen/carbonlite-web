import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const effectiveDate = 'June 9, 2026';
const defaultTitle = 'CarbonLite AI | Carbon Reporting for SMEs';
const defaultDescription =
  'Turn invoices, utility bills, and spreadsheets into structured emissions reporting. CarbonLite AI helps SMEs and environmental consultants simplify carbon reporting workflows.';

const sections = [
  {
    title: 'Acceptance of Terms',
    content: (
      <p>
        By accessing or using CarbonLite AI, you agree to these Terms of Use. If you
        do not agree with these terms, do not use the service. If you use CarbonLite
        on behalf of an organization, you confirm that you are authorized to accept
        these terms for that organization.
      </p>
    ),
  },
  {
    title: 'Description of Service',
    content: (
      <>
        <p>CarbonLite AI provides software tools for:</p>
        <ul>
          <li>Uploading invoices, utility bills, spreadsheets, and operational documents.</li>
          <li>Extracting and organizing activity data.</li>
          <li>Calculating estimated emissions using applicable conversion factors.</li>
          <li>Generating metrics, summaries, and reporting workflow outputs.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Pilot Stage Notice',
    content: (
      <p>
        CarbonLite AI is currently being validated through pilot users and
        environmental professionals. Features, workflows, availability, and service
        providers may change without notice as the product develops.
      </p>
    ),
  },
  {
    title: 'User Responsibilities',
    content: (
      <>
        <p>You are responsible for:</p>
        <ul>
          <li>The documents, data, and other content you upload or enter.</li>
          <li>Having the necessary rights and permissions to use that content.</li>
          <li>Reviewing extracted data, conversion factors, calculations, and generated results.</li>
          <li>Correcting errors and maintaining accurate source records.</li>
          <li>Keeping your account credentials secure and promptly reporting suspected unauthorized use.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'No Professional Advice',
    content: (
      <p>
        CarbonLite AI is a software tool. Generated reports, calculations, metrics,
        suggestions, and other outputs are provided for informational and workflow
        support purposes only. They are not legal, accounting, engineering,
        environmental, regulatory, or other professional advice. You remain
        responsible for validating applicable regulatory and reporting requirements
        and obtaining professional advice where appropriate.
      </p>
    ),
  },
  {
    title: 'Intellectual Property',
    content: (
      <p>
        CarbonLite AI software, branding, logos, interface designs, and CarbonLite
        content are owned by or licensed to KACH CANADA LTD. These terms do not
        transfer ownership of that intellectual property. You retain responsibility
        for and any rights you hold in content you upload to the service.
      </p>
    ),
  },
  {
    title: 'Acceptable Use',
    content: (
      <>
        <p>You may not:</p>
        <ul>
          <li>Attempt unauthorized access to accounts, systems, data, or networks.</li>
          <li>Upload malware, malicious files, or content intended to disrupt the service.</li>
          <li>Abuse, overload, probe, reverse engineer, or interfere with platform operation.</li>
          <li>Use the service unlawfully or in a way that infringes another person's rights.</li>
          <li>Misrepresent generated results as independently verified or officially approved.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Service Availability',
    content: (
      <p>
        The platform is provided on an "as available" basis. During the pilot stage,
        CarbonLite does not provide uptime, availability, response-time, or
        uninterrupted-service guarantees. Maintenance, testing, provider outages, or
        product changes may temporarily affect access.
      </p>
    ),
  },
  {
    title: 'Limitation of Liability',
    content: (
      <p>
        To the maximum extent permitted by applicable law, KACH CANADA LTD. and
        CarbonLite AI will not be liable for indirect, incidental, special,
        consequential, or punitive damages; lost profits or business opportunities;
        business interruption; loss of data; or reporting errors arising from
        user-provided data, unreviewed extraction results, conversion factors, or use
        of the service. Nothing in these terms excludes liability that cannot lawfully
        be excluded or limited.
      </p>
    ),
  },
  {
    title: 'Data and Backups',
    content: (
      <p>
        You should retain copies of original source documents, activity data, and
        exported reports. CarbonLite AI does not guarantee permanent storage,
        recovery, or backup of uploaded files or generated content, particularly
        during pilot validation.
      </p>
    ),
  },
  {
    title: 'Account Termination',
    content: (
      <p>
        CarbonLite may suspend or terminate access when an account is used in
        violation of these terms, creates security or operational risk, or is
        otherwise misused. You may stop using the service at any time.
      </p>
    ),
  },
  {
    title: 'Changes to These Terms',
    content: (
      <p>
        We may update these terms periodically as CarbonLite develops. The updated
        version will be posted on this page with a revised effective date. Continued
        use after an update means you accept the revised terms.
      </p>
    ),
  },
  {
    title: 'Governing Law',
    content: (
      <p>
        These terms are governed by the laws of the Province of Alberta and the
        applicable federal laws of Canada, without regard to conflict-of-law
        principles.
      </p>
    ),
  },
  {
    title: 'Contact Information',
    content: (
      <address className="not-italic">
        <strong>Shuang Chen</strong>
        <br />
        KACH CANADA LTD.
        <br />
        Email:{' '}
        <a
          href="mailto:carbonliteai@gmail.com"
          className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4"
        >
          carbonliteai@gmail.com
        </a>
      </address>
    ),
  },
];

export default function TermsOfUsePage() {
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

    document.title = 'Terms of Use | CarbonLite AI';
    description.content = 'Terms of Use for CarbonLite AI carbon reporting software.';
    canonical.href = 'https://carbonliteapp.ca/terms';

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
              <span className="block font-bold">CarbonLite AI</span>
              <span className="block text-xs text-slate-500">Terms of Use</span>
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

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="border-b border-slate-200 pb-9">
          <p className="text-sm font-bold uppercase text-emerald-700">
            CarbonLite AI
          </p>
          <h1 className="mt-3 text-4xl font-black text-slate-950 sm:text-5xl">
            Terms of Use
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Effective date: {effectiveDate}
          </p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            These terms explain the conditions for using CarbonLite AI during its
            pilot validation stage.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.title} aria-labelledby={toSectionId(section.title)}>
              <h2
                id={toSectionId(section.title)}
                className="text-2xl font-bold text-slate-950"
              >
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-slate-600 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-2">
                {section.content}
              </div>
            </section>
          ))}
        </div>
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

function toSectionId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
