"use client";

import { useState } from "react";

const NARRATIVE_PRICE = 0.5; // $ per additional narrative
const TURN_PRICE = 0.05; // $ per additional CFO turn

// Studio plan caps (the most common starting point for overages)
const NARRATIVE_CAP = 500;
const TURN_CAP = 2000;

export function OverageCalculator() {
  const [extraNarratives, setExtraNarratives] = useState(0);
  const [extraTurns, setExtraTurns] = useState(0);

  const narrativeCost = extraNarratives * NARRATIVE_PRICE;
  const turnCost = extraTurns * TURN_PRICE;
  const total = narrativeCost + turnCost;

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6 max-w-xl">
      <h3
        className="text-lg font-semibold text-stone-900 mb-1"
        style={{ fontFamily: "var(--font-newsreader)" }}
      >
        Overage calculator
      </h3>
      <p className="text-sm text-stone-500 mb-6">
        Based on Studio plan caps ({NARRATIVE_CAP.toLocaleString()} narratives /{" "}
        {TURN_CAP.toLocaleString()} CFO turns per month).
      </p>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <label className="text-stone-700 font-medium">
              Additional narratives
            </label>
            <span className="text-stone-900 font-semibold">
              +{extraNarratives}
              {extraNarratives > 0 && (
                <span className="text-stone-500 font-normal ml-1">
                  = ${narrativeCost.toFixed(2)}
                </span>
              )}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={500}
            step={10}
            value={extraNarratives}
            onChange={(e) => setExtraNarratives(Number(e.target.value))}
            className="w-full accent-[--color-accent]"
          />
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>0</span>
            <span>500</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-2">
            <label className="text-stone-700 font-medium">
              Additional CFO turns
            </label>
            <span className="text-stone-900 font-semibold">
              +{extraTurns.toLocaleString()}
              {extraTurns > 0 && (
                <span className="text-stone-500 font-normal ml-1">
                  = ${turnCost.toFixed(2)}
                </span>
              )}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={10000}
            step={100}
            value={extraTurns}
            onChange={(e) => setExtraTurns(Number(e.target.value))}
            className="w-full accent-[--color-accent]"
          />
          <div className="flex justify-between text-xs text-stone-400 mt-1">
            <span>0</span>
            <span>10,000</span>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-stone-500">Monthly overage</p>
            <p
              className="text-2xl font-semibold text-stone-900"
              style={{ fontFamily: "var(--font-newsreader)" }}
            >
              ${total.toFixed(2)}
            </p>
          </div>
          {total > 0 && (
            <p className="text-xs text-stone-400 max-w-xs text-right">
              Total billed at next period end. You are not throttled or locked
              out.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
