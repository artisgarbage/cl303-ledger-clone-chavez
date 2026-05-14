// The same Q1 financial moment rendered in three modes.
// Copy is hand-written to demonstrate Margot's voice.

const SCENARIO = "Q1 closed last night.";

const MODES = [
  {
    id: "internal",
    label: "Internal",
    badge: "Team",
    description: "For founders and internal leadership.",
    color: "bg-stone-50 border-stone-200",
    badgeColor: "bg-stone-100 text-stone-600",
    response: `Q1 revenue: $1.2M, down 8% from Q4. Gross margin held at 36%, which is inside your target band.

The drop is volume, not margin — two retainers paused in February. Both have since resumed.

Cash position: $340K. Q2 pipeline coverage is 1.4x. You need two proposals to convert by May 1 to maintain payroll without touching the credit line.

The real risk is pipeline velocity, not margin.`,
  },
  {
    id: "proposal",
    label: "Proposal",
    badge: "Client",
    description: "For business development and new client pitches.",
    color: "bg-white border-stone-300",
    badgeColor: "bg-blue-50 text-blue-700",
    response: `Meridian Creative closed Q1 with $1.2M in revenue and a 36% gross margin — inside our target range.

We are positioned to take on three to four new retainer clients in Q2 without adding headcount. Current utilization is 78%, which gives us 12–15 unbilled hours per week of immediate capacity.

If your engagement profile looks like our recent work — $15K–$40K/month retainers in the $10M–$50M revenue band — we have room to start immediately.

References available on request.`,
  },
  {
    id: "board",
    label: "Board",
    badge: "Investors",
    description: "For board decks and investor reporting.",
    color: "bg-white border-stone-300",
    badgeColor: "bg-amber-50 text-amber-700",
    response: `Q1 revenue of $1.2M was 8% below Q4, driven by two retainer pauses that have since resolved. Gross margin of 36% is stable within the 34–38% target band established for the year.

The business is pre-churn (zero client losses), pre-dilution in staffing, and cash-positive at $340K with no draws on the credit facility.

Q2 coverage ratio: 1.4x based on current pipeline. The constraint to growth is proposal velocity, not margin or headroom. Recommend reviewing the BD funnel cadence before the Q2 board call.`,
  },
];

export function ModesSideBySide() {
  return (
    <div>
      <div className="mb-8 bg-stone-100 border border-stone-200 rounded-lg px-5 py-4">
        <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">
          The scenario
        </p>
        <p className="text-stone-800 font-medium">&ldquo;{SCENARIO}&rdquo;</p>
        <p className="text-xs text-stone-500 mt-1">
          Same data. Same Margot. Three audiences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MODES.map((mode) => (
          <div
            key={mode.id}
            className={`rounded-lg border p-5 flex flex-col ${mode.color}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${mode.badgeColor}`}
              >
                {mode.badge}
              </span>
              <span className="text-sm font-semibold text-stone-800">
                {mode.label} mode
              </span>
            </div>
            <p className="text-xs text-stone-400 mb-4">{mode.description}</p>
            <div className="flex-1">
              {mode.response.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="text-sm text-stone-700 leading-relaxed mb-3 last:mb-0"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center text-xs text-stone-400">
        Internal mode is on every plan. Proposal and Board modes unlock at
        Studio ($199/mo).
      </div>
    </div>
  );
}
