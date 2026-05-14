import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Margot is a person, not a feature. The reasoning behind building a CFO persona rather than an AI accounting tool.",
  openGraph: { images: [{ url: "/og?title=About" }] },
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-6 pt-20 pb-12">
        <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold mb-4">
          About
        </p>
        <h1
          className="text-5xl font-light text-stone-900 leading-tight mb-8"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Why our CFO has a name.
        </h1>

        <div className="prose-sm space-y-6 text-stone-600 leading-relaxed">
          <p>
            Most AI tools for finance lead with the AI. The feature is{" "}
            <em>that it uses AI</em>. The demo shows a chat box. The pitch is
            that it is smarter than a spreadsheet.
          </p>
          <p>We built something different. We built a person.</p>
          <p>
            Margot Hale is not a persona applied as a coat of paint over a
            retrieval system. She is the architectural center of the product.
            Her voice constraints are version-controlled. Her refusal to invent
            figures is enforced structurally — not via a soft instruction, but
            via the tool implementations that gate every number she returns to a
            real record in the ledger. Her three modes are not settings; they
            are three distinct jobs she does for the same buyer at different
            moments.
          </p>
          <p>
            The decision to build a persona instead of a feature came from
            watching how agency founders actually relate to financial
            information. They do not read dashboards. They avoid QuickBooks.
            They are not financially illiterate — they are financially
            alienated. The tool does not speak to them in a register they trust.
          </p>
          <p>
            A human fractional CFO fixes this. A good one becomes a trusted
            voice: someone the founder calls before a board meeting, someone who
            shows up in their inbox the Monday after a rough month with a clear
            paragraph and one concrete recommendation. The founder does not
            think of this person as &ldquo;a finance software product.&rdquo;
            They think of them as their CFO.
          </p>
          <p>
            Margot is that, without the $8,000/month retainer and the four-day
            response window.
          </p>
          <p>
            The second decision — to expose Margot as a callable tool for other
            AI agents — came from noticing that the same gap exists at the agent
            layer. LLM-based assistants increasingly handle tasks that require
            understanding financial reality. They do not have one. They
            hallucinate figures or refuse to answer. Margot, grounded in a real
            ledger and authorized by the user, is what they should be calling
            instead of guessing.
          </p>
          <p>
            That is the bet. Build the CFO persona carefully enough that it
            earns trust from humans, and it will earn trust from the agents they
            deploy too.
          </p>
          <p className="text-stone-400 text-sm">— The Margot team, May 2026</p>
        </div>
      </section>
    </>
  );
}
