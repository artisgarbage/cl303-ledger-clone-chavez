"use client";

import { useState } from "react";
import Link from "next/link";
import { RAIL_A_PLANS, RAIL_B_PLANS } from "./pricing-data";

type Tab = "teams" | "agents" | "federation";

export function PricingTable() {
  const [tab, setTab] = useState<Tab>("teams");
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      {/* Tab selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex border border-stone-200 rounded-lg overflow-hidden text-sm">
          {(
            [
              { id: "teams", label: "For Teams" },
              { id: "agents", label: "For Agents" },
              { id: "federation", label: "For LLM Platforms" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 font-medium transition-colors ${
                tab === t.id
                  ? "mkt-accent-bg"
                  : "bg-white text-stone-600 hover:text-stone-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "teams" && (
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
            <span>Monthly</span>
            <button
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                annual ? "bg-accent" : "bg-stone-300"
              }`}
              style={{
                backgroundColor: annual ? "var(--color-accent)" : undefined,
              }}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  annual ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
            <span>
              Annual{" "}
              <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                2 months free
              </span>
            </span>
          </label>
        )}
      </div>

      {tab === "teams" && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {RAIL_A_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-lg border p-5 flex flex-col ${
                  plan.highlighted
                    ? "border-stone-900 bg-stone-900 text-stone-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="mb-4">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                      plan.highlighted ? "text-stone-400" : "text-stone-400"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <p
                    className={`text-2xl font-semibold ${
                      plan.highlighted ? "text-white" : "text-stone-900"
                    }`}
                    style={{ fontFamily: "var(--font-newsreader)" }}
                  >
                    {annual && plan.annualPrice ? plan.annualPrice : plan.price}
                  </p>
                  {plan.subPrice && (
                    <p
                      className={`text-xs mt-0.5 ${
                        plan.highlighted ? "text-stone-400" : "text-stone-400"
                      }`}
                    >
                      {plan.subPrice}
                    </p>
                  )}
                  <p
                    className={`text-xs mt-2 leading-snug ${
                      plan.highlighted ? "text-stone-300" : "text-stone-500"
                    }`}
                  >
                    {plan.who}
                  </p>
                </div>

                <ul
                  className={`text-xs space-y-1.5 flex-1 ${
                    plan.highlighted ? "text-stone-300" : "text-stone-600"
                  }`}
                >
                  <li>
                    {plan.entities === "∞" ? "Unlimited" : `${plan.entities}`}{" "}
                    {plan.entities === 1 ? "entity" : "entities"}
                  </li>
                  <li>
                    {typeof plan.narratives === "number"
                      ? `${plan.narratives.toLocaleString()} narratives/mo`
                      : `${plan.narratives} narratives`}
                  </li>
                  <li>
                    {typeof plan.cfoTurns === "number"
                      ? `${plan.cfoTurns.toLocaleString()} CFO turns/mo`
                      : `${plan.cfoTurns} CFO turns`}
                  </li>
                  <li>
                    {plan.modes.join(", ")} mode
                    {plan.modes.length > 1 ? "s" : ""}
                  </li>
                  <li>{plan.imports}</li>
                  <li>
                    {plan.seats === "∞"
                      ? "Unlimited seats"
                      : `${plan.seats} seat${plan.seats === 1 ? "" : "s"}`}
                  </li>
                </ul>

                <Link
                  href={
                    plan.name === "Enterprise"
                      ? "mailto:hello@margot.so"
                      : "/login"
                  }
                  className={`mt-5 block text-center text-xs font-medium py-2 rounded transition-colors ${
                    plan.highlighted
                      ? "bg-white text-stone-900 hover:bg-stone-100"
                      : plan.name === "Free"
                        ? "border border-stone-300 text-stone-700 hover:border-stone-400"
                        : "mkt-accent-bg"
                  }`}
                >
                  {plan.name === "Free"
                    ? "Start free"
                    : plan.name === "Enterprise"
                      ? "Contact us"
                      : `Start with ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-600">
            <strong className="text-stone-800">Overage, not throttling.</strong>{" "}
            Hitting a cap does not lock Margot. Overage is billed at{" "}
            <strong>$0.50 per additional narrative</strong> and{" "}
            <strong>$0.05 per additional CFO turn</strong>. Cap-then-degrade is
            what cheap tools do.
          </div>
        </div>
      )}

      {tab === "agents" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {RAIL_B_PLANS.map((plan) => (
            <div
              key={plan.name}
              className="rounded-lg border border-stone-200 bg-white p-5 flex flex-col"
            >
              <div className="mb-4">
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
                  <p className="text-xs mt-0.5 text-stone-400">
                    {plan.subPrice}
                  </p>
                )}
                <p className="text-xs mt-2 text-stone-500 leading-snug">
                  {plan.who}
                </p>
              </div>

              <ul className="text-xs text-stone-600 space-y-1.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-stone-300 mt-0.5">—</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={
                  plan.name === "LLM Federation"
                    ? "mailto:hello@margot.so"
                    : "/agents"
                }
                className="mt-5 block text-center text-xs font-medium py-2 rounded border border-stone-300 text-stone-700 hover:border-stone-400 transition-colors"
              >
                {plan.name === "Agent Dev"
                  ? "Get started"
                  : plan.name === "LLM Federation"
                    ? "Talk to us"
                    : "Learn more"}
              </Link>
            </div>
          ))}
        </div>
      )}

      {tab === "federation" && (
        <div className="max-w-2xl mx-auto text-center py-12">
          <h3
            className="text-3xl font-light text-stone-900 mb-4"
            style={{ fontFamily: "var(--font-newsreader)" }}
          >
            Built to be the default finance tool in your registry.
          </h3>
          <p className="text-stone-600 leading-relaxed mb-8">
            The LLM Federation tier is a partnership, not a product. If your
            users ask financial questions and you want authoritative, citable
            answers — without building a ledger — Margot is the call to make.
            Pricing is a revenue-share negotiated deal. Typically 30/70 in favor
            of the platform on first $X, flipping at scale.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left mb-8 text-sm">
            {[
              "Co-marketed listing in your agent registry",
              "Federated identity — your users, Margot's data",
              "Joint reliability SLA, p95 < 800ms",
              "White-glove integration support",
              "Dedicated partner manager",
              "Revenue share on consumption",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-stone-600">
                <span className="text-stone-300 mt-0.5 flex-shrink-0">—</span>
                {f}
              </div>
            ))}
          </div>
          <a
            href="mailto:hello@margot.so"
            className="mkt-accent-bg inline-flex items-center px-6 py-3 rounded text-sm font-medium"
          >
            Start the conversation
          </a>
        </div>
      )}
    </div>
  );
}
