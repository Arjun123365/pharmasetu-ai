# From prototype to a supervised pilot

The current implementation uses only synthetic data and rule-based projections. None of the following capabilities are represented as implemented.

| Pilot period | Work and exit evidence |
| --- | --- |
| Weeks 1–2 | Obtain participating distributor consent, appoint a pharmacist/operations owner, map pack units and batch identifiers, agree data-sharing scope and baseline stock-out/expiry definitions. No patient-level data is required. |
| Weeks 3–4 | Design a secure database, authentication, role-based access, audit integrity and backup/restore. Verify access boundaries and recovery with test data. |
| Weeks 5–6 | Develop read-only distributor integrations or validated CSV ingestion. Reconcile inventory, returns, lead times, incoming orders and batch expiry against authorised source records. |
| Weeks 7–8 | Establish seasonal-naive and moving-average baselines. Evaluate time-series/ML forecasts only with adequate historical data, held-out temporal evaluation and documented uncertainty. Publish measured errors, never assumed accuracy. |
| Weeks 9–10 | Run shadow-mode alerts and FEFO/replenishment suggestions beside existing operations. Pharmacist and procurement reviewers approve every action; no automatic disposal or medicine transfer. |
| Weeks 11–12 | Assess observed fill rate, stock-out duration, expiry exposure, alert precision, data completeness and user adoption versus agreed baselines. Investigate all apparent improvements for confounding factors. |
| Weeks 13–16 (optional extension) | Address failures, retest security and accessibility, expand to another location only after stage-gate review, train users and decide whether production investment is justified. |

Additional work includes delivery receipts that reconcile incoming quantities, demand censored by stock-outs, promotions, returns, cold-chain constraints, multiple units of measure, multi-echelon stock planning, regional language support and intermittent-connectivity synchronisation. Secure shared persistence and operational validation must precede real use. ML forecasting does not replace pharmaceutical expertise or procurement controls.
