import type { Metadata } from "next";
import Link from "next/link";
import { TrustStrip } from "@/components/marketing/TrustStrip";

export const metadata: Metadata = {
  title: "Product",
  description:
    "The ledger is the substrate. Margot is the product. Every number cites a period and a basis.",
  openGraph: { images: [{ url: "/og?title=Product" }] },
};

const SECTIONS = [
  {
    id: "ledger",
    label: "The Ledger",
    headline: "A books-of-record that earns the title.",
    body: [
      "Every transaction is stored with its period, basis (cash or accrual), and the project or cost center it belongs to. There is no ambiguity in the data model — a number either has a source or it does not exist.",
      "QuickBooks import, bank feed, and manual CSV are all supported. Imports are idempotent — running them twice does not create duplicates. The ledger is the moat; Margot is what makes it useful.",
    ],
  },
  {
    id: "persona",
    label: "The Persona",
    headline: "Twelve years inside professional services. On call always.",
    body: [
      "Margot Hale is a fractional CFO for creative and dev agencies. Her voice is plain English, numbers first. She will not invent figures. She will not extrapolate beyond what the data supports. She will tell you when the data does not support your question.",
      "She is not a chatbot. She is not a report generator. She is the CFO your agency could not afford — speaking in three registers depending on who is in the room.",
    ],
    quote: {
      text: "Q1 gross margin came in at 38% — that's six points below your trailing-twelve-month average and the proximate cause is contractor spend on the Acme rebuild.",
      attribution: "Margot, Internal mode",
    },
  },
  {
    id: "narratives",
    label: "The Narratives",
    headline: "Financial prose with receipts.",
    body: [
      "Margot generates monthly summaries, quarterly reviews, year-over-year analyses, margin deep-dives, and project profitability reports — all anchored to the data in your ledger.",
      "Every narrative cites the period it covers and the accounting basis. That citation trail is what makes a Margot narrative suitable for a board deck, a client proposal, or an investor data room — not just internal Slack.",
    ],
  },
  {
    id: "imports",
    label: "The Imports",
    headline: "Connect your books. Margot does the rest.",
    body: [
      "QuickBooks Online sync, bank feed connection, and manual CSV import. Imports are structured — Margot knows the difference between a revenue line and a cost of goods item, and she maps your chart of accounts to her internal model.",
      "Transactions are not metered. They are cheap and metering them punishes you for growing.",
    ],
  },
  {
    id: "trust",
    label: "The Trust Layer",
    headline: "Every action logged. Every figure sourced.",
    body: [
      "The audit log records every narrative generation, CFO turn, and agent call — with the timestamp, the user, and the data snapshot used. You can export it.",
      "This is not a compliance checkbox. It is what makes Margot safe to put in front of a client, a board, or another AI agent.",
    ],
  },
];

export default function ProductPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 border-b border-stone-200">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            Product
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            The ledger is the substrate.
            <br />
            Margot is the product.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Most accounting tools stop at data entry. Margot picks up where the
            books end — interpreting, summarizing, and communicating your
            financial reality to whoever needs to hear it.
          </p>
        </div>
      </section>

      {/* Sticky nav + long-scroll sections */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex gap-16 py-16">
          {/* Sidebar nav */}
          <nav className="hidden lg:block w-44 flex-shrink-0">
            <ul className="sticky top-20 space-y-2 text-sm">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-stone-400 hover:text-stone-900 transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          <div className="flex-1 space-y-24">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id}>
                <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-3">
                  {s.label}
                </p>
                <h2
                  className="text-3xl font-light text-stone-900 mb-6"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  {s.headline}
                </h2>
                <div className="space-y-4">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-stone-600 leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
                {"quote" in s && s.quote && (
                  <blockquote className="mt-8 border-l-2 border-stone-300 pl-5 italic text-stone-600 leading-relaxed">
                    &ldquo;{s.quote.text}&rdquo;
                    <footer className="mt-2 text-xs text-stone-400 not-italic">
                      — {s.quote.attribution}
                    </footer>
                  </blockquote>
                )}
                {s.id === "trust" && (
                  <div className="mt-8">
                    <TrustStrip />
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="border-t border-stone-200 py-16 text-center bg-stone-50">
        <div className="max-w-md mx-auto px-6">
          <h2
            className="text-2xl font-light text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Ready to meet Margot?
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="mkt-accent-bg inline-flex items-center justify-center px-5 py-2.5 rounded text-sm font-medium"
            >
              Start free
            </Link>
            <Link
              href="/modes"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded text-sm text-stone-600 border border-stone-300 hover:border-stone-400 transition-colors"
            >
              See the three modes →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
