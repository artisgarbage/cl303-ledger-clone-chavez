import type { Metadata } from "next";
import Link from "next/link";
import { ModesSideBySide } from "@/components/marketing/ModesSideBySide";

export const metadata: Metadata = {
  title: "Modes",
  description:
    "Internal, Proposal, and Board. The same financial data — three audiences, three registers. Modes are the upgrade engine.",
  openGraph: { images: [{ url: "/og?title=Modes" }] },
};

const MODE_DETAILS = [
  {
    id: "internal",
    name: "Internal",
    badge: "All plans",
    badgeColor: "bg-stone-100 text-stone-600",
    headline: "For the room where everyone already knows the numbers are bad.",
    body: "Internal mode is for founders, operators, and finance leads. Margot does not soften the message here. Gross margin is down 580 basis points — she says so, names the cause, and tells you what to watch. If the data does not support a conclusion, she says that too. Internal mode is on every plan because clear internal communication is table stakes, not a premium feature.",
    examples: [
      "Monthly P&L summary with variance vs. prior period",
      "Cash runway and burn-rate analysis",
      "Project profitability breakdowns",
      "Year-over-year comparisons",
    ],
  },
  {
    id: "proposal",
    name: "Proposal",
    badge: "Studio and up",
    badgeColor: "bg-blue-50 text-blue-700",
    headline: "For winning the room before the contract is signed.",
    body: "Proposal mode reframes your financial reality for an external audience — a prospective client who does not know your books and does not need to. Margot leads with capacity, track record, and confidence. The same 78% utilization rate that is a risk in Internal mode is a proof point in Proposal mode — it means you can take on the engagement without overextending. Proposal and Board modes are gated at Studio because they only matter once you have clients and a board.",
    examples: [
      "Agency capacity and availability statements",
      "Historical performance summaries for proposals",
      "Billable utilization and throughput metrics",
      "Rate and margin benchmarks for new engagements",
    ],
  },
  {
    id: "board",
    name: "Board",
    badge: "Studio and up",
    badgeColor: "bg-amber-50 text-amber-700",
    headline: "For the investors who expect a CFO in the room.",
    body: "Board mode speaks the language of investors and board members — coverage ratios, pipeline multiples, concentration risk, operating leverage. Margot formats answers for a board deck context: precise, hedged where appropriate, and structured so a director can read it in 90 seconds. The same cash figure that gets one sentence in Internal mode gets a paragraph with context in Board mode.",
    examples: [
      "Quarterly board reporting narratives",
      "Cash position and runway analysis",
      "Revenue concentration and churn risk",
      "Operating leverage and scalability framing",
    ],
  },
];

export default function ModesPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 border-b border-stone-200">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            Modes
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Three audiences.
            <br />
            One financial truth.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Every CFO knows that how you describe Q1 to your team is not how you
            describe it to a prospective client — and neither is how you
            describe it to the board. Margot has that judgment built in.
          </p>
        </div>
      </section>

      {/* Live side-by-side */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <div className="max-w-xl mb-10">
          <h2
            className="text-2xl font-light text-stone-900"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Q1 closed last night. Here is what Margot says to each room.
          </h2>
        </div>
        <ModesSideBySide />
      </section>

      {/* Mode deep-dives */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="space-y-20">
          {MODE_DETAILS.map((mode) => (
            <div
              key={mode.id}
              id={mode.id}
              className="flex gap-12 flex-col md:flex-row"
            >
              <div className="md:w-48 flex-shrink-0 pt-1">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${mode.badgeColor}`}
                >
                  {mode.badge}
                </span>
                <p
                  className="text-xl font-semibold text-stone-800 mt-3"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  {mode.name}
                </p>
              </div>
              <div className="flex-1">
                <h3
                  className="text-2xl font-light text-stone-900 mb-4"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  {mode.headline}
                </h3>
                <p className="text-stone-600 leading-relaxed mb-6">
                  {mode.body}
                </p>
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                    What you can ask
                  </p>
                  <ul className="space-y-2">
                    {mode.examples.map((ex) => (
                      <li
                        key={ex}
                        className="flex items-start gap-2 text-sm text-stone-600"
                      >
                        <span className="text-stone-300 mt-0.5 flex-shrink-0">
                          —
                        </span>
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-200 bg-stone-50 py-16 text-center">
        <div className="max-w-md mx-auto px-6">
          <h2
            className="text-2xl font-light text-stone-900 mb-3"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Proposal and Board modes unlock at Studio.
          </h2>
          <p className="text-stone-500 text-sm mb-6">
            $199/month. Three entities, 500 narratives, 2,000 CFO turns.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="mkt-accent-bg inline-flex items-center justify-center px-5 py-2.5 rounded text-sm font-medium"
            >
              Start with Studio
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded text-sm text-stone-600 border border-stone-300 hover:border-stone-400 transition-colors"
            >
              Compare all plans
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
