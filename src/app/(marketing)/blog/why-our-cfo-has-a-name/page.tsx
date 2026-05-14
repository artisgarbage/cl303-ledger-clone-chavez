import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Why our CFO has a name",
  description:
    "On the decision to build a persona instead of a feature — and why that distinction matters more than it looks.",
  openGraph: { images: [{ url: "/og?title=Why+our+CFO+has+a+name" }] },
};

export default function Post1() {
  return (
    <article className="max-w-2xl mx-auto px-6 pt-20 pb-24">
      <header className="mb-12">
        <p className="text-xs text-stone-400 mb-4">May 12, 2026 · 5 min read</p>
        <h1
          className="text-5xl font-light text-stone-900 leading-tight"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Why our CFO has a name.
        </h1>
      </header>

      <div className="space-y-6 text-stone-700 leading-relaxed">
        <p>
          When we decided to build Margot, the first question was whether to
          ship her as a feature or a person. It sounds like a branding question.
          It is not.
        </p>

        <p>
          A feature is a capability. &ldquo;AI-powered narratives&rdquo; is a
          feature. It sits inside a product that is fundamentally about
          something else — accounting software, financial dashboards, a ledger.
          The AI is a layer on top. You call it when you need it and forget
          about it the rest of the time.
        </p>

        <p>
          A person is different. A person has a consistent voice. A person has a
          point of view. A person pushes back when you ask them to say something
          they do not believe. A person is in the room whether or not you
          summoned them — when you look at the numbers, you hear their voice.
        </p>

        <p>
          The agency founders we were building for do not avoid financial
          information because they are bad at finance. They avoid it because the
          tools speak a language they do not trust. QuickBooks is transactional.
          Financial dashboards are decorative. Neither one tells you what you
          actually want to know: &ldquo;Is this business okay? What should I
          do?&rdquo;
        </p>

        <p>
          A good fractional CFO answers that question in plain English. They
          say: &ldquo;Q1 gross margin came in at 38%. That is six points below
          your trailing-twelve-month average and the proximate cause is
          contractor spend on the Acme rebuild.&rdquo; No preamble. No hedge.
          The answer first, the context second.
        </p>

        <p>
          That is not a prompt template. That is a voice. And voice requires a
          person to anchor it — not because of some mystical property of
          personhood, but because a person&apos;s consistency is legible to the
          humans they work with. You know what a person will say before you ask.
          That predictability is how trust gets built.
        </p>

        <p>
          So we built Margot. We wrote her voice guidelines the way you would
          write copy for a brand, not the way you would write a system prompt.
          We version-controlled them. We built her refusal to invent figures
          into the tool layer, not the prompt layer. And we made her available
          in three modes — Internal, Proposal, Board — because a real CFO knows
          that the right answer to &ldquo;how did Q1 go&rdquo; is different
          depending on who is in the room.
        </p>

        <p>
          The bet is that a named CFO with a consistent voice earns more trust
          than a generic AI layer ever could. Three months in, we think that bet
          is paying off. The founders using Margot do not describe her as
          &ldquo;the AI.&rdquo; They say &ldquo;Margot said.&rdquo;
        </p>

        <p>That sentence is the whole product.</p>
      </div>
    </article>
  );
}
