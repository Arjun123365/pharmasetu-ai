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

React + TypeScript + Vite, Tailwind CSS, Recharts and Lucide. All application source is directly at repository root. `model.ts` owns deterministic seeding and pure domain functions. `App.tsx` owns navigation, filters, forms and charts. `style.css` provides responsive and print styling. The versioned localStorage key `pharmasetu-demo-v1` retains stock, sales, requests and audit events. Data is generated relative to the first-load date (or reset date); expiry is evaluated against today's UTC date. There are 30 fictional SKUs, six fictional distributors, 360 batches and 2,160 weekly SKU-location demand records.

- Usable stock excludes batches whose expiry is before today; a batch remains in date on its labelled expiry date (demo convention, not a regulatory policy).
- Daily demand = weeks 9–12 packs / 28. Coverage = usable packs / daily demand.
- Critical: no usable stock or coverage ≤ lead time; Warning: coverage ≤ lead time + 7 days; Healthy: above that buffer.
- Target = daily demand × (lead days + safety days). Reorder = max(0, ceil(target − usable − approved incoming)).
- Forecast = mean demand in weeks 9–12 × (1 + simulated seasonal uplift), repeated for the next four weeks. No trained ML or accuracy claims.
- Availability = fraction of selected SKU-location positions with positive usable inventory, not fulfilment rate. Low-stock and stock-out SKU cards count distinct affected products; captions show affected positions. A SKU can be low in one location and out in another.

## Limitations

This is a browser-only decision-support demonstration. Local data can be edited or cleared by the browser and is not shared across users, encrypted storage, a secure database or a regulatory audit trail. Workflow approval is a simulation without authentication or role enforcement. Approved requests represent incoming stock; no automatic receipt occurs. Inventory receipts update an existing batch and preserve its expiry; new batch creation is outside this prototype. Seasonal uplift is deliberately simulated. Products are fictional labels, not prescribing guidance or a validated pharmaceutical catalogue. Redistribution, disposal and purchase orders are never executed. Human review is required for real operational decisions.

See [demo guide](DEMO_GUIDE.md), [verification evidence](NESFIC_PROOF_OF_WORK.md), [Netlify deployment](NETLIFY_DEPLOYMENT.md) and [roadmap](FUTURE_ROADMAP.md).
