# AI Egress Security — Narrative Generation

**Last Updated:** 2026-05-10  
**Related:** SEC-02 in `docs/security/audit-2026-05.md`

---

## Summary

The Ledger platform uses Claude AI (Anthropic) to generate financial narrative summaries. This document describes what data is sent to Anthropic, how it's protected, and the opt-in mechanism.

---

## Default Posture: Opt-In Required

As of **PR #15** (Issue #11, SEC-02 remediation):

- **Default:** `CompanySettings.narrativesEnabled = false`
- AI narrative generation is **OFF by default** for all companies
- Users must **explicitly opt in** via Settings UI before any data is sent to Anthropic

### Why Opt-In?

QuickBooks line-item data often contains:
- Customer names ("Acme Corp - Invoice #1234")
- Vendor names ("Office Supplies Inc")
- Employee names ("John Doe - Contractor")
- Project codes, invoice numbers, etc.

Sending this to a third-party AI service (Anthropic) without explicit consent violates GDPR/CCPA data processing principles.

---

## Data Sent to Claude

When narratives are enabled, the following data is sent to Anthropic's Claude API:

### Aggregated Financial Metrics (Always Sent)
- Company name
- Period start/end dates
- Total revenue, COGS, gross profit, gross margin
- Total OpEx, net income, net margin
- COGS breakdown (payroll, contractors, software)
- Target metrics (revenue target, margin targets)

### Line-Item Data (Redacted as of PR #15)
- **Category:** e.g., "Revenue:Services", "Expenses:Payroll"
- **Amount:** Dollar value
- **Name:** `[REDACTED]` — **never sent** to prevent PII leakage

**Before PR #15** (vulnerable):
```typescript
topLineItems: [
  { category: "Revenue:Services", name: "Acme Corp - Project Alpha", amount: 50000 },
  { category: "Expenses:Contractors", name: "John Doe - May Invoice", amount: 8000 }
]
```

**After PR #15** (secure):
```typescript
topLineItems: [
  { category: "Revenue:Services", name: "[REDACTED]", amount: 50000 },
  { category: "Expenses:Contractors", name: "[REDACTED]", amount: 8000 }
]
```

### Prior Period Comparisons (Year-over-Year Only)
- Prior year period start/end
- Prior year total revenue, net income, gross margin
- **No line-item names** from prior periods

---

## API Endpoints Affected

| Route | Check for `narrativesEnabled`? | Redacts Line-Item Names? |
|-------|--------------------------------|--------------------------|
| `POST /api/narratives/generate` | ✅ As of PR #15 | ✅ As of PR #15 |
| `GET /api/narratives/scheduled` | ⚠️ **TODO** | ⚠️ **TODO** |

### Action Required

The **scheduled cron endpoint** (`/api/narratives/scheduled`) must be updated to:
1. Check `CompanySettings.narrativesEnabled` before generating narratives
2. Redact line-item names in the `generateNarrativeForPeriod()` helper

**Follow-up Issue:** File as P1 security fix.

---

## Anthropic Data Retention

Per [Anthropic's Commercial Terms](https://www.anthropic.com/legal/commercial-terms):
- API inputs/outputs are **not used for training** models
- Data is retained for **30 days** for abuse monitoring, then deleted
- Anthropic employees may review data if flagged for Trust & Safety

**Recommendation:** Include this in the Settings UI opt-in language:
> "AI narratives are generated using Claude (Anthropic). Aggregated financial data (revenue, expenses, margins) will be sent to Anthropic for analysis. Line-item names are redacted to protect customer/vendor privacy. Anthropic retains data for 30 days. See [Anthropic's privacy policy](https://www.anthropic.com/legal/privacy)."

---

## Logging & Audit

**Current State:** No audit logging for narrative generation.

**Recommended (P1 follow-up):**
- Add `NarrativeAudit` table or extend `IngestAudit`:
  - `companyId`, `userId`, `type`, `periodStart`, `periodEnd`
  - `dataHash` (SHA-256 of the snapshot JSON sent to Claude)
  - `createdAt`
- Log every call to `generateNarrative()`, even if it fails
- Do **not** log row contents or the full snapshot — only metadata

---

## Testing Checklist

- [ ] Attempt to generate narrative with `narrativesEnabled = false` → expect 403
- [ ] Enable narratives, generate report → succeeds
- [ ] Inspect `dataSnapshot` JSON in DB → verify `topLineItems[].name = "[REDACTED]"`
- [ ] Check Anthropic API call logs (if available) → verify no PII in request body

---

## Future Enhancements (P2)

1. **Granular redaction settings:**
   - "Include line-item names in narratives? (may expose vendor/customer PII)"
   - Checkbox in Settings, default OFF
2. **Data residency:**
   - Anthropic Claude is US-hosted — EU customers may require on-prem LLM
3. **Narrative review before share:**
   - Preview mode: generate narrative but don't save, allow manual redaction
4. **Differential privacy:**
   - Add noise to aggregated metrics before sending to AI (overkill for B2B SaaS, but worth noting)

---

## References

- Issue #11: https://github.com/artisgarbage/cl303-ledger-clone-chavez/issues/11
- SEC-02 finding: `docs/security/audit-2026-05.md`
- Anthropic Commercial Terms: https://www.anthropic.com/legal/commercial-terms
- GDPR Art. 28 (Data Processing): https://gdpr-info.eu/art-28-gdpr/
