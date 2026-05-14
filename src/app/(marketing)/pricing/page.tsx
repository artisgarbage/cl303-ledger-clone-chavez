import type { Metadata } from "next";
import { PricingTable } from "@/components/marketing/PricingTable";
import { OverageCalculator } from "@/components/marketing/OverageCalculator";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Two rails. Rail A for agency owners — $0 to $599/mo. Rail B for agents and LLM platforms — usage-based from $0.002/read.",
  openGraph: { images: [{ url: "/og?title=Pricing" }] },
};

const FAQ = [
  {
    q: "What counts as a CFO turn?",
    a: "One back-and-forth with Margot in the CFO chat. A message you send and her response. Tool calls she makes internally to retrieve data do not count as turns — only the visible conversation exchange does.",
  },
  {
    q: "What counts as a narrative?",
    a: "A generated financial narrative document — monthly summary, quarterly review, year-over-year analysis, margin deep-dive, or custom report. Viewing an existing narrative does not count; only generation does.",
  },
  {
    q: "What happens when I hit my cap?",
    a: "Margot keeps working. You are billed overage at $0.50 per additional narrative and $0.05 per additional CFO turn. You will not be locked out or throttled. Cap-then-degrade is what cheap tools do.",
  },
  {
    q: "What is an entity?",
    a: "A legal entity — a company, LLC, or business unit with its own books. Most agencies have one. Multi-entity support is for holdcos, fractional CFO firms managing multiple clients, and Series A+ companies with subsidiaries.",
  },
  {
    q: "Can I switch plans mid-month?",
    a: "Yes. Upgrades take effect immediately; you are billed pro-rata for the remainder of the period. Downgrades take effect at the next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free tier is the trial — 5 narratives and 25 CFO turns per month, no credit card required. It is not time-limited. It is genuinely free for solo operators who want to stay on it.",
  },
  {
    q: "What is the difference between Rail A and Rail B?",
    a: "Rail A is for humans — agency owners and their teams — on a per-org subscription. Rail B is for software — agent platforms, LLM vendors, and developers who want to call Margot programmatically. If you want API access as a human, you are on Practice tier (read-only, your own data). If you want to build on top of Margot, you are on Rail B.",
  },
  {
    q: "What is signed agent identity?",
    a: "Every Rail B caller registers a public key and receives an AgentIdentity. API calls must be signed with the corresponding private key. This lets Margot know which agent is making which call — for safety, for rate limiting, and for analytics. It is required even on the free agent tier.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            Pricing
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Metered on what is scarce.
            <br />
            Not on what is cheap.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed">
            Transactions are not metered — they are cheap and metering them
            punishes you for growing. Margot bills on narratives and CFO turns:
            the work that actually costs something.
          </p>
        </div>
      </section>

      {/* Pricing table */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <PricingTable />
      </section>

      {/* Overage calculator */}
      <section className="border-t border-stone-200 py-16 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-xl mb-10">
            <h2
              className="text-2xl font-light text-stone-900"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              Estimate your overage.
            </h2>
            <p className="mt-2 text-stone-500 text-sm">
              Based on Studio plan caps. Adjust the sliders to see what a heavy
              month actually costs.
            </p>
          </div>
          <OverageCalculator />
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <h2
          className="text-2xl font-light text-stone-900 mb-10"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Common questions
        </h2>
        <div className="divide-y divide-stone-200">
          {FAQ.map((item) => (
            <div key={item.q} className="py-6">
              <p className="font-medium text-stone-900 mb-2">{item.q}</p>
              <p className="text-stone-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
