import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Hero } from "@/components/marketing/Hero";
import { ModesSideBySide } from "@/components/marketing/ModesSideBySide";
import { TrustStrip } from "@/components/marketing/TrustStrip";

export const metadata: Metadata = {
  title: "Margot — Your CFO already knows the answer.",
  description:
    "Margot is a fractional CFO for creative and dev agencies. She lives inside your books, speaks three audiences, and answers at 2am when the proposal is due.",
  openGraph: {
    title: "Margot — Your CFO already knows the answer.",
    description:
      "Fractional CFO for creative and dev agencies. Internal, Proposal, and Board modes. No retainer.",
    images: [{ url: "/og?title=Margot" }],
  },
};

export default function HomePage() {
  return (
    <MarketingLayout>
      <Hero />

      {/* Modes showcase */}
      <section className="border-t border-stone-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-3">
              Three modes
            </p>
            <h2
              className="text-3xl font-light text-stone-900 leading-snug"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              The same financial reality. Three audiences. One Margot.
            </h2>
            <p className="mt-3 text-stone-500 text-sm leading-relaxed">
              Internal mode is for your team. Proposal mode is for winning
              clients. Board mode is for the investors who expect a CFO. Each
              one uses the same data; each one speaks a different truth.
            </p>
          </div>
          <ModesSideBySide />
          <div className="mt-8">
            <Link
              href="/modes"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              See Modes in depth →
            </Link>
          </div>
        </div>
      </section>

      {/* Product screenshot showcase */}
      <section className="border-t border-stone-200 py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-10">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-3">
              Inside the product
            </p>
            <h2
              className="text-3xl font-light text-stone-900 leading-snug"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              Everything your agency needs to know. One screen.
            </h2>
            <p className="mt-3 text-stone-500 text-sm leading-relaxed">
              Revenue, margin, forward estimates, and a CFO who explains the
              delta — all from your live books.
            </p>
          </div>

          {/* Primary screenshot */}
          <div className="rounded-xl overflow-hidden border border-stone-200 shadow-xl mb-6">
            <Image
              src="/screenshots/dashboard-kpi.png"
              alt="Margot dashboard showing $495K April revenue, 39% gross margin, and forward estimates for Yolo, Inc."
              width={2880}
              height={1800}
              className="w-full"
              unoptimized
              priority
            />
          </div>

          {/* Secondary 3-up row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-white">
              <div className="overflow-hidden">
                <Image
                  src="/screenshots/cfo-chat.png"
                  alt="Margot CFO chat answering a question about April vs March 2026 revenue"
                  width={2880}
                  height={1800}
                  className="w-full object-cover object-top"
                  style={{ maxHeight: "220px" }}
                  unoptimized
                />
              </div>
              <div className="px-4 py-3 border-t border-stone-100">
                <p className="text-sm font-medium text-stone-800">Ask Margot</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Plain-English answers, cited to the period
                </p>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-white">
              <div className="overflow-hidden">
                <Image
                  src="/screenshots/reports.png"
                  alt="Narrative report generation — Monthly Summary, Quarterly Review, and custom queries"
                  width={2880}
                  height={1800}
                  className="w-full object-cover object-top"
                  style={{ maxHeight: "220px" }}
                  unoptimized
                />
              </div>
              <div className="px-4 py-3 border-t border-stone-100">
                <p className="text-sm font-medium text-stone-800">
                  Narrative Reports
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Board-ready summaries in one click
                </p>
              </div>
            </div>

            <div className="rounded-lg overflow-hidden border border-stone-200 shadow-sm bg-white">
              <div className="overflow-hidden">
                <Image
                  src="/screenshots/people.png"
                  alt="Team and utilization view showing headcount, types, and effective rates"
                  width={2880}
                  height={1800}
                  className="w-full object-cover object-top"
                  style={{ maxHeight: "220px" }}
                  unoptimized
                />
              </div>
              <div className="px-4 py-3 border-t border-stone-100">
                <p className="text-sm font-medium text-stone-800">
                  Team &amp; Utilization
                </p>
                <p className="text-xs text-stone-400 mt-0.5">
                  Payroll costs mapped to projects
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/product"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Explore all features →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust layer */}
      <section className="border-t border-stone-200 py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-12">
            <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-3">
              The trust layer
            </p>
            <h2
              className="text-3xl font-light text-stone-900 leading-snug"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              Every number has a source. Every action has a record.
            </h2>
            <p className="mt-3 text-stone-500 text-sm leading-relaxed">
              The cite-the-period-and-basis discipline is not optional copy — it
              is structural. Margot cannot produce a figure without anchoring it
              to a time range and an accounting basis.
            </p>
          </div>
          <TrustStrip />
          <div className="mt-8">
            <Link
              href="/security"
              className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Security overview →
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-stone-200 py-24 text-center">
        <div className="max-w-xl mx-auto px-6">
          <h2
            className="text-4xl font-light text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Your books are already telling the story.
          </h2>
          <p className="text-stone-500 mb-8">
            Margot reads them. Start at $49/month — no retainer, no contracts,
            no setup fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="mkt-accent-bg inline-flex items-center justify-center px-6 py-3 rounded font-medium text-sm"
            >
              Start with Margot — $49/mo
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-3 rounded text-sm text-stone-600 border border-stone-300 hover:border-stone-400 hover:text-stone-900 transition-colors"
            >
              View all plans
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
