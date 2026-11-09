# Three-minute NESFIC judge demonstration

Start with a fresh browser profile or use **Reset demo data**, then confirm. Every screen displays the synthetic-data notice. Introduce PharmaSetu AI as a browser-only prototype, not a GRD integration.

1. **0:00–0:35 — Overview.** Explain the availability gap across Northeast India. Show calculated usable stock, active SKUs, exclusive stock-position statuses, and separate expired/future-expiry batches. Expand the calculation guide, then click a shortage alert to drill into its exact medicine and location. Clear filters before continuing.
2. **0:35–1:00 — Demand intelligence.** Select a medicine and Guwahati. Explain the four-week moving average and change the simulated seasonal uplift. Historical observations and projections are explicitly labelled; no accuracy is claimed.
3. **1:00–1:35 — Inventory and warnings.** Select PS-001 and Guwahati. In Inventory, find its in-date batch, choose Receive / adjust, add 25 packs and a reason. Show audit history. Open Stock-out warnings to see changed coverage. Negative adjustments beyond the balance are rejected. Reload to show persistence.
4. **1:35–2:00 — Expiry.** Show the expired window and then 30/60/90-day windows. Explain why expired stock never contributes to usable inventory. FEFO guidance prioritises in-date batches within the same medicine and location; disposal needs human review.
5. **2:00–2:35 — Replenishment.** Increase assumed lead time to 30 days, inspect the target calculation, create a draft, submit for review and simulate approval. Show approved incoming deducted from further recommendations. This creates no actual purchase order.
6. **2:35–3:00 — Reports.** Clear filters, choose Distributor summary, export CSV, then Print summary. Close with the 12–16-week pilot plan and the need for validated data, security and operational approval before deployment.

All inventory figures are packs (strips or bottles), not individual tablets. The default dataset is intentionally mixed: healthy coverage, shortages, zero stock and expiry risks. No external services or credentials are required during the demonstration. Keep the browser's local storage enabled. If printing, use your browser's print dialog to save a PDF.
