import type { Metadata } from "next";
import Link from "next/link";
import { AgentQuickstart } from "@/components/marketing/AgentQuickstart";
import { RAIL_B_PLANS } from "@/components/marketing/pricing-data";

export const metadata: Metadata = {
  title: "Agent API — Margot for Agents",
  description:
    "Margot is the finance brain other agents call. MCP endpoint, signed JWT identity, usage-based pricing from $0.002/read.",
  openGraph: { images: [{ url: "/og?title=Agent+API" }] },
};

const CAPABILITIES = [
  {
    label: "Query Margot",
    description:
      "POST /api/agent/v1/query — ask any financial question. Margot runs the same tool loop as the human interface: she reads periods, projects, narratives, and people from the ledger and answers with citations.",
  },
  {
    label: "Generate narratives",
    description:
      "POST /api/agent/v1/narrative — trigger a narrative generation directly. Returns the full narrative text plus the data snapshot it was generated from.",
  },
  {
    label: "MCP endpoint",
    description:
      "Margot is available as an MCP server. Mount it in your agent registry and your agent can call Margot like any other tool — without knowing anything about financial data modeling.",
  },
  {
    label: "Usage transparency",
    description:
      "GET /api/agent/v1/usage — current period usage, quota remaining, and overage accrued. Your agent can check before calling if budget is a constraint.",
  },
];

export default function AgentsPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 border-b border-stone-200">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
            For developers
          </p>
          <h1
            className="text-5xl font-light text-stone-900 leading-tight mb-6"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            The finance brain other agents call.
          </h1>
          <p className="text-lg text-stone-600 leading-relaxed mb-8">
            Margot is MCP-exposed and callable via signed JWT. If your users ask
            financial questions — and they do — Margot is the tool to reach for.
            She returns citable answers grounded in real ledger data, not
            generated approximations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/login"
              className="mkt-accent-bg inline-flex items-center justify-center px-5 py-2.5 rounded text-sm font-medium"
            >
              Register an agent identity
            </Link>
            <a
              href="#quickstart"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded text-sm text-stone-600 border border-stone-300 hover:border-stone-400 transition-colors"
            >
              See the quickstart →
            </a>
          </div>
        </div>
      </section>

      {/* Why Margot for agents */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <div className="grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-semibold text-stone-800 mb-2">
              Authoritative, not generated
            </p>
            <p className="text-stone-600 leading-relaxed">
              Margot does not generate financial figures from statistical
              priors. She reads from a real ledger. Every answer cites the
              period and basis it covers. Your users get a sourced answer, not a
              plausible one.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-800 mb-2">
              Below token cost
            </p>
            <p className="text-stone-600 leading-relaxed">
              Reads are priced at $0.002 — deliberately below GPT-class token
              cost. Margot is never the expensive hop in your agent pipeline.
              Narrative and synthesis calls reflect real model work and are
              priced accordingly.
            </p>
          </div>
          <div>
            <p className="font-semibold text-stone-800 mb-2">Mode-aware</p>
            <p className="text-stone-600 leading-relaxed">
              Pass a{" "}
              <code className="text-xs bg-stone-100 px-1 py-0.5 rounded">
                mode
              </code>{" "}
              parameter and Margot responds in the right register. Internal for
              internal tooling, Proposal for bizdev workflows, Board for
              investor-facing agents. Unauthorized callers are rejected at the
              scope level.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <h2
          className="text-2xl font-light text-stone-900 mb-8"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          What you can call
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.label}
              className="border border-stone-200 rounded-lg p-5 bg-white"
            >
              <p className="font-semibold text-stone-800 mb-2">{cap.label}</p>
              <p className="text-sm text-stone-600 leading-relaxed">
                {cap.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Auth */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <div className="max-w-2xl">
          <h2
            className="text-2xl font-light text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Signed agent identity
          </h2>
          <p className="text-stone-600 leading-relaxed mb-4">
            Every agent caller registers a public key and receives an
            AgentIdentity record. API calls are signed with the corresponding
            private key and verified server-side. This is required even on the
            free tier.
          </p>
          <p className="text-stone-600 leading-relaxed mb-4">
            Signed identity is how Margot knows which agent is asking what — for
            safety (she must refuse Proposal-mode data to unauthorized callers),
            for rate limiting, and for analytics. It is also how we eventually
            price by agent reputation.
          </p>
          <ol className="text-sm text-stone-600 space-y-2 list-decimal list-inside">
            <li>Generate an RSA or EC key pair</li>
            <li>POST your public key to /api/agent/v1/identity/register</li>
            <li>Sign your JWT with the private key on every request</li>
            <li>Include it as a Bearer token in the Authorization header</li>
          </ol>
        </div>
      </section>

      {/* Quickstart */}
      <section
        id="quickstart"
        className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200"
      >
        <div className="max-w-2xl mb-8">
          <h2
            className="text-2xl font-light text-stone-900 mb-2"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            60-second quickstart
          </h2>
          <p className="text-stone-600 text-sm">
            Register an identity, sign a token, ask a question.
          </p>
        </div>
        <AgentQuickstart />
      </section>

      {/* Rail B pricing */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-b border-stone-200">
        <h2
          className="text-2xl font-light text-stone-900 mb-8"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Agent pricing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RAIL_B_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg border border-stone-200 bg-white p-5 flex flex-col"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1">
                {plan.name}
              </p>
              <p
                className="text-xl font-semibold text-stone-900"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                {plan.price}
              </p>
              {plan.subPrice && (
                <p className="text-xs text-stone-400 mt-0.5">{plan.subPrice}</p>
              )}
              <p className="text-xs text-stone-500 mt-2 leading-snug">
                {plan.who}
              </p>
              <ul className="mt-4 text-xs text-stone-600 space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-stone-300 mt-0.5">—</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-stone-500">
          Full pricing details on the{" "}
          <a href="/pricing" className="underline hover:text-stone-800">
            Pricing page
          </a>
          .
        </p>
      </section>

      {/* CTA */}
      <section className="py-16 text-center">
        <div className="max-w-md mx-auto px-6">
          <h2
            className="text-2xl font-light text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Start building with Margot.
          </h2>
          <p className="text-stone-500 text-sm mb-6">
            Free tier includes 1,000 reads and 25 narratives per month. No
            credit card required to register an agent identity.
          </p>
          <Link
            href="/login"
            className="mkt-accent-bg inline-flex items-center justify-center px-6 py-3 rounded text-sm font-medium"
          >
            Register an agent identity
          </Link>
        </div>
      </section>
    </>
  );
}
