import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Encryption at rest and in transit, audit log on every AI action, sub-processor transparency, and data residency.",
  openGraph: { images: [{ url: "/og?title=Security" }] },
};

const SUB_PROCESSORS = [
  {
    name: "Anthropic",
    role: "AI inference — narrative generation and CFO agent turns",
    residency: "US",
    link: "https://anthropic.com",
  },
  {
    name: "Google Cloud Platform",
    role: "Infrastructure, database, and storage",
    residency: "US (configurable)",
    link: "https://cloud.google.com",
  },
  {
    name: "Stripe",
    role: "Payment processing and subscription management",
    residency: "US",
    link: "https://stripe.com",
  },
];

const SECURITY_ITEMS = [
  {
    category: "Data in transit",
    detail:
      "All traffic is encrypted with TLS 1.3. HSTS is enforced. Connections that do not meet the minimum cipher suite are rejected.",
  },
  {
    category: "Data at rest",
    detail:
      "Financial data, user records, and narratives are encrypted at rest using AES-256. Encryption keys are managed via a dedicated KMS and rotated annually.",
  },
  {
    category: "AI data handling",
    detail:
      "Financial data sent to Anthropic for inference is not used for model training. Anthropic's zero-retention policy applies to all API calls made through Margot. We do not send PII to inference providers unless it is contained in transaction descriptions you have imported.",
  },
  {
    category: "Access control",
    detail:
      "Role-based access within an org (Admin, Member). Seat limits enforced per plan. Sessions are JWT-based with 24-hour expiry. Admin actions are logged to the audit table.",
  },
  {
    category: "Agent access",
    detail:
      "Agent API calls require signed JWTs. Each AgentIdentity is scoped to specific capabilities. Revocation is immediate. Margot refuses Proposal- and Board-mode data to agents that lack those scopes.",
  },
  {
    category: "Audit log",
    detail:
      "Every narrative generation, CFO turn, agent call, and admin action is written to the AccessAudit table with the user identity, timestamp, action type, and affected resource. Admins can export the full log as CSV. The log is append-only — no record can be deleted through the application.",
  },
  {
    category: "Data retention",
    detail:
      "Financial data is retained for the life of your subscription plus 90 days after cancellation, during which you can export everything. After 90 days, financial data is deleted. Audit logs are retained for 7 years.",
  },
  {
    category: "Vulnerability disclosure",
    detail:
      "Found a security issue? Email security@margot.so. We acknowledge within 24 hours and commit to a fix or mitigation timeline within 72 hours for critical issues.",
  },
];

export default function SecurityPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 border-b border-stone-200">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            Security
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Your books are not training data.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Margot handles financial data that is confidential, regulated, and
            relied upon for real decisions. The security model reflects that.
          </p>
        </div>
      </section>

      {/* Security items */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <div className="divide-y divide-stone-100">
          {SECURITY_ITEMS.map((item) => (
            <div key={item.category} className="py-6 grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-semibold text-stone-800">
                  {item.category}
                </p>
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-stone-600 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sub-processors */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <h2
          className="text-2xl font-light text-stone-900 mb-2"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Sub-processors
        </h2>
        <p className="text-stone-500 text-sm mb-8">
          The following third-party providers receive or process data on our
          behalf. This list is current as of May 2026.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left">
                <th className="pb-3 font-semibold text-stone-700">Provider</th>
                <th className="pb-3 font-semibold text-stone-700">Role</th>
                <th className="pb-3 font-semibold text-stone-700">
                  Data residency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {SUB_PROCESSORS.map((sp) => (
                <tr key={sp.name}>
                  <td className="py-4">
                    <a
                      href={sp.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-stone-800 hover:underline"
                    >
                      {sp.name}
                    </a>
                  </td>
                  <td className="py-4 text-stone-600">{sp.role}</td>
                  <td className="py-4 text-stone-600">{sp.residency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Status + contact */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3
              className="text-lg font-light text-stone-900 mb-3"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              Platform status
            </h3>
            <p className="text-stone-600 text-sm mb-4">
              Live uptime, incident history, and maintenance windows.
            </p>
            <Link
              href="/status"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              View status page →
            </Link>
          </div>
          <div>
            <h3
              className="text-lg font-light text-stone-900 mb-3"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              Responsible disclosure
            </h3>
            <p className="text-stone-600 text-sm mb-4">
              Found a vulnerability? We want to hear about it before anyone else
              does.
            </p>
            <a
              href="mailto:security@margot.so"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              security@margot.so →
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
