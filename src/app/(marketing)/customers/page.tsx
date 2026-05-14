import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "Agencies using Margot for financial operations, board prep, and client proposals.",
  openGraph: { images: [{ url: "/og?title=Customers" }] },
};

// TODO: Replace with real case studies when available.
// Structure template is ready; content is pending.
const PLACEHOLDER_CASE_STUDIES: {
  name: string;
  type: string;
  revenue: string;
  quote: string;
  modes: string[];
}[] = [];

export default function CustomersPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 border-b border-stone-200">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            Customers
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Agencies that trust Margot with the real numbers.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Case studies in progress. The agencies below are using Margot for
            monthly reporting, board prep, and client proposals. We are writing
            up their stories now.
          </p>
        </div>
      </section>

      {/* Empty state */}
      {PLACEHOLDER_CASE_STUDIES.length === 0 && (
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="max-w-xl">
            <p className="text-stone-400 text-sm leading-relaxed mb-8">
              We launched in May 2026. Case studies take time to write well — we
              would rather ship them right than ship them fast. Check back in
              June.
            </p>
            <p className="text-stone-600 text-sm leading-relaxed mb-8">
              If you are using Margot and want to be featured — or if you are
              evaluating Margot and want to talk to a current user — reach out.
            </p>
            <a
              href="mailto:hello@margot.so"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              hello@margot.so →
            </a>
          </div>
        </section>
      )}

      {/* Case studies grid — renders when populated */}
      {PLACEHOLDER_CASE_STUDIES.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-8">
            {PLACEHOLDER_CASE_STUDIES.map((cs) => (
              <div
                key={cs.name}
                className="border border-stone-200 rounded-lg p-6 bg-white"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-stone-900">{cs.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {cs.type} · {cs.revenue}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {cs.modes.map((m) => (
                      <span
                        key={m}
                        className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
                <blockquote className="text-sm text-stone-600 italic leading-relaxed border-l-2 border-stone-200 pl-4">
                  &ldquo;{cs.quote}&rdquo;
                </blockquote>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="border-t border-stone-200 py-16 text-center bg-stone-50">
        <div className="max-w-md mx-auto px-6">
          <h2
            className="text-2xl font-light text-stone-900 mb-3"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Ready to start?
          </h2>
          <p className="text-stone-500 text-sm mb-6">
            Free tier. No credit card. Your first five narratives are on us.
          </p>
          <Link
            href="/login"
            className="mkt-accent-bg inline-flex items-center justify-center px-5 py-2.5 rounded text-sm font-medium"
          >
            Start with Margot
          </Link>
        </div>
      </section>
    </>
  );
}
