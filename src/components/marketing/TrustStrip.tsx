const TRUST_ITEMS = [
  {
    label: "Period + basis on every number",
    detail:
      'Every figure Margot cites includes the period it covers and whether the basis is cash or accrual. "Q1 2026, cash basis" is not optional — it is structural.',
  },
  {
    label: "Audit log on every AI action",
    detail:
      "Narrative generations, CFO turns, and agent calls are all logged with timestamps, user identity, and the data snapshot used. You can export it.",
  },
  {
    label: "No hallucinated figures",
    detail:
      "Margot does not invent numbers. If the data is not in your ledger, she says so. Pushback is a feature, not a bug.",
  },
  {
    label: "Encryption at rest and in transit",
    detail:
      "Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Financial data never leaves your authorized infrastructure.",
  },
  {
    label: "Sub-processor transparency",
    detail:
      "A full list of sub-processors, their roles, and their data residency is published and kept current. See the Security page.",
  },
  {
    label: "Status page",
    detail:
      "Live uptime, incident history, and maintenance windows. No surprises before a board call.",
  },
];

export function TrustStrip() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {TRUST_ITEMS.map((item) => (
        <div key={item.label} className="flex gap-3">
          <div className="mt-1 w-1 flex-shrink-0 rounded-full bg-stone-300" />
          <div>
            <p className="text-sm font-semibold text-stone-800">{item.label}</p>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed">
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
