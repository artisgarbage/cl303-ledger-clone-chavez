# DNS Setup — codelab303.io → Google Cloud DNS

The Cloud DNS zone `codelab303-io` is provisioned and holds all required records,
but the domain at GoDaddy still points to GoDaddy nameservers.
Until this is changed, `ledger-dev.codelab303.io` won't resolve and the TLS
certificate (`ledger-cert-dev`) will remain in `PROVISIONING` state.

## What needs to happen (one-time)

### Step 1 — Update nameservers at GoDaddy

1. Log in to [godaddy.com](https://godaddy.com) → **My Products** → `codelab303.io` → **DNS**
2. Click **Nameservers** → **Change** → select **Enter my own nameservers**
3. Replace all entries with the four Google Cloud DNS nameservers:

   ```
   ns-cloud-d1.googledomains.com
   ns-cloud-d2.googledomains.com
   ns-cloud-d3.googledomains.com
   ns-cloud-d4.googledomains.com
   ```

4. Save / confirm

### Step 2 — Wait for propagation

Typically 5–30 minutes; up to 48 hours worst case.

Poll until the NS records flip:

```bash
watch -n 30 "dig +short NS codelab303.io @8.8.8.8"
# waiting for: ns-cloud-d*.googledomains.com
```

Verify the ACME challenge record is visible (required for cert issuance):

```bash
dig +short CNAME _acme-challenge.ledger-dev.codelab303.io @8.8.8.8
# expected: 122d89ac-9906-43db-84b0-fb5502bddac5.16.authorize.certificatemanager.goog.
```

### Step 3 — Certificate auto-provisions

Google Certificate Manager retries authorization automatically once the CNAME
is resolvable. Monitor:

```bash
watch -n 60 "gcloud certificate-manager certificates describe ledger-cert-dev \
  --project=codelab303-ledger \
  --format='value(managed.state)'"
# waiting for: ACTIVE
```

### Step 4 — Verify production is live

```bash
curl -s https://ledger-dev.codelab303.io/api/healthz
curl -s https://ledger-dev.codelab303.io/api/status | python3 -m json.tool
```

No Helm redeploy is needed — the pod, gateway, and certificate map are already
correctly configured. It's purely a DNS delegation gap.

## Current state (as of 2026-05-11)

| Component                          | Status                                               |
| ---------------------------------- | ---------------------------------------------------- |
| Cloud DNS zone `codelab303-io`     | ✅ Exists — A + ACME CNAME records present           |
| GoDaddy nameservers                | ❌ Still `ns67/68.domaincontrol.com` — not delegated |
| GKE pod `ledger-app`               | ✅ 2/2 Running, 0 restarts                           |
| Helm release `ledger-app`          | ✅ Revision 5, deployed                              |
| Gateway `ledger-app-gateway`       | ✅ PROGRAMMED, IP `34.120.252.227`                   |
| Certificate `ledger-cert-dev`      | ❌ PROVISIONING (CNAME_MISMATCH — DNS not delegated) |
| `https://ledger-dev.codelab303.io` | ❌ TCP refused (cert not issued)                     |
