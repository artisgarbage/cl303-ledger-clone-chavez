"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const MARGOT_QUOTES = [
  {
    question: "What was gross margin for Q1?",
    answer:
      "Q1 gross margin: 34.2%. That's 580 basis points below your trailing-twelve-month average. The driver is contractor spend on the Henderson rebuild. If that project closes in May, margin normalizes. If it slips, you have a problem.",
  },
  {
    question: "How is cash looking?",
    answer:
      "Cash runway is 8.4 months at current burn. The Q2 pipeline covers the gap if two deals close on your projected timeline. I'd pressure-test that assumption before committing to the senior hire.",
  },
  {
    question: "What's the revenue story for February?",
    answer:
      "February revenue: $487K, up 12% month-over-month. Growth is real, but two clients represent 61% of billings. That's a concentration risk worth naming before your board does.",
  },
];

const TYPING_SPEED = 18; // ms per character
const PAUSE_AFTER_ANSWER = 3200; // ms before cycling

export function Hero() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [displayedAnswer, setDisplayedAnswer] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing">("typing");

  useEffect(() => {
    const quote = MARGOT_QUOTES[quoteIndex];
    const fullAnswer = quote.answer;

    if (phase === "typing") {
      if (displayedAnswer.length < fullAnswer.length) {
        const t = setTimeout(() => {
          setDisplayedAnswer(fullAnswer.slice(0, displayedAnswer.length + 1));
        }, TYPING_SPEED);
        return () => clearTimeout(t);
      } else {
        setPhase("pausing");
      }
    } else {
      const t = setTimeout(() => {
        const nextIndex = (quoteIndex + 1) % MARGOT_QUOTES.length;
        setQuoteIndex(nextIndex);
        setDisplayedAnswer("");
        setPhase("typing");
      }, PAUSE_AFTER_ANSWER);
      return () => clearTimeout(t);
    }
  }, [displayedAnswer, phase, quoteIndex]);

  const quote = MARGOT_QUOTES[quoteIndex];

  return (
    <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="max-w-2xl">
        <h1
          className="text-5xl md:text-6xl font-light leading-[1.1] tracking-tight text-stone-900 mb-6"
          style={{ fontFamily: "var(--font-newsreader)" }}
        >
          Your CFO already knows the answer.
        </h1>
        <p className="text-lg text-stone-600 leading-relaxed mb-10 max-w-xl">
          Margot is a fractional CFO for creative and dev agencies. She lives
          inside your books, speaks three audiences — team, client, board — and
          answers at 2am when the proposal is due.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="mkt-accent-bg inline-flex items-center justify-center px-6 py-3 rounded font-medium text-sm transition-colors"
          >
            Start with Margot — $49/mo
          </Link>
          <Link
            href="/agents"
            className="inline-flex items-center justify-center px-6 py-3 rounded text-sm text-stone-600 border border-stone-300 hover:border-stone-400 hover:text-stone-900 transition-colors"
          >
            Building an agent? Meet Margot&apos;s API →
          </Link>
        </div>
      </div>

      {/* Live Margot demo */}
      <div className="mt-16 max-w-2xl">
        <div className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="bg-stone-50 border-b border-stone-200 px-5 py-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center">
              <span
                className="text-xs font-semibold text-stone-600"
                style={{ fontFamily: "var(--font-newsreader)" }}
              >
                M
              </span>
            </div>
            <span className="text-xs font-medium text-stone-700">
              Margot Hale — CFO
            </span>
            <span className="ml-auto text-xs text-stone-400">
              Internal mode
            </span>
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* User question */}
            <div className="flex justify-end">
              <div className="bg-stone-100 text-stone-700 text-sm px-4 py-2.5 rounded-lg max-w-xs">
                {quote.question}
              </div>
            </div>

            {/* Margot answer */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-stone-200 flex-shrink-0 flex items-center justify-center mt-0.5">
                <span
                  className="text-xs font-semibold text-stone-600"
                  style={{ fontFamily: "var(--font-newsreader)" }}
                >
                  M
                </span>
              </div>
              <div className="text-sm text-stone-800 leading-relaxed min-h-[3rem]">
                {displayedAnswer}
                {phase === "typing" && (
                  <span className="inline-block w-0.5 h-4 bg-stone-400 ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-stone-400 text-center">
          Scripted excerpts — representative of Margot&apos;s voice and output.
        </p>
      </div>
    </section>
  );
}
