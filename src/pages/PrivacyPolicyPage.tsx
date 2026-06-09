import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const effectiveDate = 'June 9, 2026';
const defaultTitle = 'CarbonLite AI | Carbon Reporting for SMEs';
const defaultDescription =
  'Turn invoices, utility bills, and spreadsheets into structured emissions reporting. CarbonLite AI helps SMEs and environmental consultants simplify carbon reporting workflows.';

const sections = [
  {
    title: 'Introduction',
    content: (
      <>
        <p>
          CarbonLite AI is a Canadian software service operated by KACH CANADA LTD.
          It helps small and medium-sized businesses, environmental consultants, and
          operations teams organize activity data for carbon reporting workflows.
        </p>
        <p>
          CarbonLite AI is currently in pilot validation. We aim to follow applicable
          Canadian privacy principles, including collecting only the information
          reasonably needed to provide, secure, evaluate, and improve the service.
        </p>
      </>
    ),
  },
  {
    title: 'Information We Collect',
    content: (
      <>
        <p>Depending on how you use CarbonLite, we may collect:</p>
        <ul>
          <li>Account details such as your name, email address, organization, and user role.</li>
          <li>Uploaded documents, including invoices, utility bills, spreadsheets, images, and PDFs.</li>
          <li>Extracted or manually entered activity data, conversion factors, report settings, and generated summaries.</li>
          <li>Feedback, support requests, and optional contact information you submit.</li>
          <li>Technical data such as browser type, page visited, IP address, error details, and product usage events.</li>
        </ul>
      </>
    ),
  },
  {
    title: 'How We Use Information',
    content: (
      <p>
        We use information to operate the upload, extraction, review, calculation, and
        reporting workflow; authenticate users; maintain organization separation;
        diagnose errors; respond to feedback; understand pilot usage; improve the
        product; and protect the service from misuse.
      </p>
    ),
  },
  {
    title: 'Uploaded Documents and Activity Data',
    content: (
      <>
        <p>
          Uploaded files and extracted data are used to provide the carbon reporting
          workflow and are not sold.
        </p>
        <p>
          Documents may be processed to identify relevant activity records such as
          fuel, electricity, water, waste, travel, or other operational data. Users
          should review extracted information before relying on it. Please avoid
          uploading information that is not needed for the reporting workflow.
        </p>
      </>
    ),
  },
  {
    title: 'Analytics and Error Tracking',
    content: (
      <p>
        We may use Sentry for error monitoring and PostHog or Google Analytics when
        configured to understand page visits and meaningful workflow completion.
        Analytics are intended to use limited technical and usage information, such as
        page names, event names, organization identifiers, and record counts. We do not
        intentionally send document contents, OCR text, invoice contents, passwords,
        or authentication tokens to these analytics tools.
      </p>
    ),
  },
  {
    title: 'Feedback Submissions',
    content: (
      <p>
        When you submit feedback, we may collect the feedback type, your description,
        optional email address, current page, browser information, organization, and
        submission time. We use this information to investigate issues and improve the
        pilot experience.
      </p>
    ),
  },
  {
    title: 'Cookies and Similar Technologies',
    content: (
      <p>
        CarbonLite may use browser storage, cookies, or similar technologies to keep
        you signed in, remember limited application state, support security, and enable
        configured analytics. You can control cookies through your browser, although
        blocking required storage may prevent parts of the application from working.
      </p>
    ),
  },
  {
    title: 'How Information May Be Shared',
    content: (
      <>
        <p>We do not sell personal information or uploaded reporting data.</p>
        <p>
          Information may be processed by service providers that help operate
          CarbonLite, including Vercel for frontend hosting, Render for backend hosting,
          managed PostgreSQL database hosting such as Neon, Sentry for error
          monitoring, and PostHog or Google Analytics when configured. We may also
          disclose information when reasonably required by law, to protect the service,
          or as part of a business transaction subject to appropriate safeguards.
        </p>
        <p>
          Some providers may process or store information outside Canada, where it may
          be subject to the laws of that jurisdiction.
        </p>
      </>
    ),
  },
  {
    title: 'Data Retention',
    content: (
      <p>
        We retain account, document, activity, feedback, analytics, and operational
        records for as long as reasonably needed to provide the pilot service,
        investigate issues, maintain security and traceability, and meet legal or
        business requirements. Retention practices may evolve as the product matures.
        You may contact us to request deletion, subject to technical, legal, backup,
        and legitimate operational limitations.
      </p>
    ),
  },
  {
    title: 'Data Security',
    content: (
      <p>
        We use reasonable technical and administrative measures appropriate for a
        pilot-stage service, including authenticated access and organization-based data
        separation. No internet service can guarantee complete security. CarbonLite is
        not currently presented as an enterprise-certified compliance platform, and
        users should not upload highly sensitive information that is unnecessary for
        the reporting workflow.
      </p>
    ),
  },
  {
    title: 'User Choices and Access or Correction Requests',
    content: (
      <p>
        You may contact us to ask about personal information associated with your
        account or to request access, correction, or deletion. We may need to verify
        your identity and organization before responding. You may also choose not to
        provide optional information, stop submitting documents, or discontinue use of
        the pilot service.
      </p>
    ),
  },
  {
    title: 'Contact Information',
    content: (
      <address className="not-italic">
        <strong>Athena Chen</strong>
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
  {
    title: 'Changes to This Policy',
    content: (
      <p>
        We may update this policy as CarbonLite develops, its service providers change,
        or its privacy practices mature. The latest version will be posted on this page
        with an updated effective date. Material changes may also be communicated
        through the application or by email when appropriate.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
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

    document.title = 'Privacy Policy | CarbonLite AI';
    description.content = 'Privacy Policy for CarbonLite AI';
    canonical.href = 'https://carbonliteapp.ca/privacy';

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
              <span className="block text-xs text-slate-500">Privacy Policy</span>
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
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Effective date: {effectiveDate}
          </p>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            This policy explains how CarbonLite AI handles information during its
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
