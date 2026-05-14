import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What it means to build a tool for other AIs to use",
  description:
    "Margot is callable by other agents. Here is how we thought about what that means for trust, pricing, and distribution.",
  openGraph: {
    images: [{ url: "/og?title=Building+a+tool+for+other+AIs" }],
  },
};

export default function Post2() {
  return (
    <article className="max-w-2xl mx-auto px-6 pt-20 pb-24">
      <header className="mb-12">
        <p className="text-xs text-stone-400 mb-4">May 14, 2026 · 7 min read</p>
        <h1
          className="text-5xl font-light text-stone-900 leading-tight"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          What it means to build a tool for other AIs to use.
        </h1>
      </header>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          When we added the agent API, the obvious framing was &ldquo;we built
          an API.&rdquo; That is not quite right. We built a trust surface for
          another AI to hold.
        </p>

        <p>
          The distinction matters. A normal API contract is between a developer
          and a server. The developer is accountable. They read the docs, they
          handle errors, they make judgment calls when the data is ambiguous.
          When you expose your API to an AI agent, none of that applies. The
          agent is not reading docs. It is not making judgment calls. It is
          combining your output with other outputs and presenting a synthesized
          answer to a human who may not know where each piece came from.
        </p>

        <p>
          This creates an accountability gap. If Margot returns a number and an
          agent presents it without attribution, and that number is wrong — who
          is responsible? The answer, in practice, is the agent. But in
          perception, it is whoever produced the data.
        </p>

        <p>
          Our answer was the same as our answer for humans: cite the period and
          the basis, always. Every response from Margot includes where the
          number came from and what time range it covers. The agent can choose
          to pass this through to the user or not — but it is always in the
          payload. We cannot control what the agent does with the answer, but we
          can make the source information impossible to accidentally omit.
        </p>

        <p>
          The second thing we had to figure out was modes. Margot has three
          modes: Internal, Proposal, and Board. Internal mode assumes you are
          the founder — you get the unvarnished version. Proposal mode is for
          external audiences. Board mode is investor-formatted.
        </p>

        <p>
          An agent calling Margot might be acting on behalf of any of these
          audiences. We needed a way to pass that intent — and a way to enforce
          that unauthorized agents do not request modes they have not been
          granted access to. A Proposal-mode response about a client&apos;s own
          books, served by an unauthorized agent to a competitor, is a real
          security failure.
        </p>

        <p>
          The solution was signed agent identity. Every agent that calls Margot
          registers a public key. API calls are signed with the corresponding
          private key. Scopes are issued at registration time. An agent without
          the Proposal scope gets a 403 if it asks for Proposal-mode output.
          This is enforced at the server, not the prompt level — which is the
          only enforcement that matters.
        </p>

        <p>
          Pricing was the last puzzle. AI-to-AI calls are high-volume and
          low-margin. If we priced Margot at human rates for agents, we would be
          the expensive hop in every pipeline. Nobody builds on the expensive
          hop.
        </p>

        <p>
          So we anchored read calls below GPT-class token cost — $0.002 per
          read. Narrative generation and synthesis calls are priced higher
          because they do real model work. The goal was to make Margot a default
          reflex when an agent needs financial data, not a deliberate budget
          decision.
        </p>

        <p>
          The pattern we are following is the one Stripe used to win developer
          mindshare a decade ago: be the obvious default, price to adoption, let
          compounding distribution do the work. The same logic applies at the
          agent layer. If Margot is the finance tool that is already in every
          major agent registry, the human sales cycle gets shorter too.
        </p>

        <p>
          We are early. The AI-to-AI revenue is not material yet. But the call
          graph is forming. That is the leading indicator we are watching.
        </p>
      </div>
    </article>
  );
}
