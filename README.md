# PharmaSetu AI

**Predict Demand. Prevent Stock-Outs. Reduce Expiry.**

Northeast Pharmaceutical Supply Chain Intelligence — an NESFIC 2026 demonstration prototype, using the GRD Pharmaceuticals Guwahati/Rani pilot context. **All medicines, distributors, sales and stock records are fictional. This application is not connected to GRD operational systems.**

## Run locally

Node 22.12+ (Node 24 also supported), npm, and a modern browser are required.

```sh
npm ci --cache .npm-cache
npm run dev
```

Run commands from this repository root. Use the existing isolated checkout; no nested project or worktree is needed. No credentials, APIs, database or backend are required. In cloud environments with an unwritable default npm cache, the repository-local cache above avoids permission failures.

```sh
npm test
npm run build
npm run preview
```

The browser regression uses system Chromium:

```sh
# Keep npm run dev running in a separate terminal
npm run test:browser
# Alternate browser or production server:
CHROMIUM_PATH=/path/to/chromium APP_URL=http://localhost:4173 npm run test:browser
```

Browser tests use a fresh isolated browser profile and reset only their own synthetic data. Screenshots and CSV output are generated in ignored `test-results/`. Chromium is installed in the prepared cloud image; on other machines install Chromium through your OS package manager and set `CHROMIUM_PATH`. Node unit tests and production builds do not require Chromium.

## Implemented workflow

- Executive overview: calculated KPIs, usable stock, availability, demand, location inventory, category mix, critical alerts and top movers.
- Demand intelligence: 12 synthetic weeks, product/location filters, four-week moving-average outlook and adjustable simulated seasonal uplift.
- Inventory: searchable batch catalogue, receipts against existing batches, signed adjustments with required reasons, nonnegative balances and local audit log.
- Early warning: daily demand, coverage and location-specific lead time comparisons with explanations.
- Expiry: expired stock and cumulative 30/60/90-day windows, units at risk, within-location/SKU FEFO guidance.
- Replenishment: adjustable lead/safety days, calculation breakdown, confirmed incoming deduction, Draft → Pending Approval → Approved simulation.
- Reports: inventory health, shortage risk, expiry, replenishment and distributor summaries; quoted CSV exports and printable management summary.

## Architecture and calculations

React + TypeScript + Vite, Tailwind CSS, Recharts and Lucide. All application source is directly at repository root. `model.ts` owns deterministic seeding and pure domain functions. `App.tsx` owns navigation, filters, forms and charts. `style.css` provides responsive and print styling. The versioned localStorage key `pharmasetu-demo-v1` retains stock, sales, requests and audit events. Data is generated relative to the first-load date (or reset date); expiry is evaluated against today's Indian calendar date. There are 30 fictional SKUs, six fictional distributors, 360 batches and 2,160 weekly SKU-location demand records.

- Usable stock excludes batches whose expiry is before today; a batch remains in date on its labelled expiry date (demo convention, not a regulatory policy).
- Daily demand = weeks 9–12 packs / 28. Coverage = usable packs / daily demand.
- Stock statuses are exclusive: Out of Stock (zero usable), Critical (positive stock, coverage ≤ lead), Low Stock (coverage ≤ lead + 7), Healthy (above the buffer or positive stock with zero recent demand).
- Target = daily demand × (lead days + safety days). Reorder = max(0, ceil(target − usable − outstanding approved incoming)).
- Forecast = mean demand in weeks 9–12 × (1 + simulated seasonal uplift), repeated for the next four weeks. No trained ML or accuracy claims.
- Availability = fraction of selected SKU-location positions with positive usable inventory, not fulfilment rate. Low-stock, critical and out-of-stock cards count exclusive SKU-location positions. A SKU can be healthy in one location and out of stock in another.

## Limitations

This is a browser-only decision-support demonstration. Local data can be edited or cleared by the browser and is not shared across users, encrypted storage, a secure database or a regulatory audit trail. Workflow approval is a simulation without authentication or role enforcement. Approved requests represent incoming stock; no automatic receipt occurs. Inventory receipts update an existing batch and preserve its expiry; new batch creation is outside this prototype. Seasonal uplift is deliberately simulated. Products are fictional labels, not prescribing guidance or a validated pharmaceutical catalogue. Redistribution, disposal and purchase orders are never executed. Human review is required for real operational decisions.

See [demo guide](DEMO_GUIDE.md), [verification evidence](NESFIC_PROOF_OF_WORK.md), [Netlify deployment](NETLIFY_DEPLOYMENT.md) and [roadmap](FUTURE_ROADMAP.md).

## Step 2: validated dashboard metrics

The revised dashboard uses **SKU-location positions**, rather than distinct affected medicines, for stock alerts. Each position has exactly one status:

| Status | Definition |
| --- | --- |
| Out of Stock | Zero usable packs, including positions whose remaining batches are all expired |
| Critical | Positive stock; coverage ≤ location lead time |
| Low Stock | Positive stock; lead time < coverage ≤ lead time + 7 days |
| Healthy | Coverage > lead time + 7 days, or positive stock with zero recent demand |

These four counts sum to the number of positions in scope. Active SKUs still counts distinct catalogue medicines. Availability = (positions − Out of Stock) / positions × 100, with **N/A** for an empty scope. It does not measure orders or fulfilment. Dashboard cards have definition tooltips; the expandable calculation guide shows denominators, the status partition and expiry bands. Inventory, warnings and reports reuse `rows()` and `risk()`.

Expiry is evaluated against the **Asia/Kolkata calendar date**, using date-only arithmetic so time of day and daylight-saving changes cannot shift a bucket. The labelled expiry date itself remains in date for this demo. Expired stocked batches are separate from in-date batches due in 0–90 days. Summary bands (0–30, 31–60, 61–90) are exclusive; filters labelled “Within 30/60/90 days” are cumulative and must not be added. Zero-quantity batches contribute no expiry exposure.

Revised synthetic seed revision 2 independently varies demand, coverage and expiry by position, including slow-moving and zero-demand positions. No KPI totals are forced. The version-1 localStorage ledger schema and key remain compatible. Valid saved ledgers load **without changing any transactions, batches, sales, requests or audit records**; legacy ledgers show a notice offering a confirmed reset to the revised scenarios. Nothing resets automatically. Added `seedRevision` and request `received` metadata are optional for older ledgers.

Approved incoming = approved quantity − matched receipts, clamped at zero. In Receive / adjust, optionally match a positive receipt against an approved request at the same SKU/location and an in-date batch. The received quantity reduces incoming, preventing double deduction when that stock becomes usable. Unmatched stock movements are independent demo transactions. Lead and safety inputs use whole days; the model rejects invalid, non-finite or negative assumptions. Zero demand creates no demand-driven reorder and displays coverage as N/A.

### Demo video

`record-demo.mjs` records real interactions against a disposable browser profile of the local production preview, with an offline synthetic male English voice (Flite RMS), captions and an MP4 output. It requires Chromium, FFmpeg with the `flite` filter and the Playwright video encoder. See [DEMO_VIDEO.md](DEMO_VIDEO.md) for reproduction. Recording does not change the public site or another visitor's data.
