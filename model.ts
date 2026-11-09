export type Product = {
  id: string;
  name: string;
  category: string;
  form: string;
  pack: string;
};
export type Location = { id: string; name: string; city: string; lead: number };
export type Batch = {
  id: string;
  sku: string;
  location: string;
  quantity: number;
  expiry: string;
};
export type Sale = {
  sku: string;
  location: string;
  week: number;
  quantity: number;
};
export type Request = {
  id: string;
  sku: string;
  location: string;
  quantity: number;
  status: "Draft" | "Pending Approval" | "Approved";
  received?: number;
};
export type Audit = { at: string; action: string; detail: string };
export type State = {
  version: 1;
  seedRevision?: number;
  anchor: string;
  batches: Batch[];
  sales: Sale[];
  requests: Request[];
  audit: Audit[];
};
export const locations: Location[] = [
  "Guwahati",
  "Tinsukia",
  "Dibrugarh",
  "Jorhat",
  "Nagaon",
  "Silchar",
].map((city, i) => ({
  id: `L${i + 1}`,
  city,
  name: [
    "Pragati Demo Distribution",
    "Brahmaputra Demo Supply",
    "Uday Demo Healthcare",
    "Sangam Demo Distribution",
    "Kopili Demo Supply",
    "Barak Demo Healthcare",
  ][i],
  lead: [5, 9, 8, 6, 7, 12][i],
}));
const names = [
  "Parafen 500",
  "Amocare 250",
  "Cetrix 10",
  "Azorin 500",
  "Metaglu 500",
  "Pantocare 40",
  "Calvita D3",
  "Ironova Plus",
  "ORS Restore",
  "Dolozen 650",
  "Cofrelief",
  "Allerfree",
  "Zinco 20",
  "Vitamax B",
  "Cardiwell 5",
  "Gastrocalm",
  "Respira 100",
  "Dermacare",
  "Neurovit",
  "Hydralyte",
  "Ceforin 200",
  "Painova",
  "Monticare 10",
  "Folicare 5",
  "Glycobal 2",
  "Acidrel 20",
  "Coughzen",
  "Digestiva",
  "Pediwell 125",
  "Nutrifen",
];
export const products: Product[] = names.map((name, i) => ({
  id: `PS-${String(i + 1).padStart(3, "0")}`,
  name,
  category: [
    "General care",
    "Anti-infectives",
    "Respiratory",
    "Chronic care",
    "Nutrition",
  ][i % 5],
  form: ["Tablet", "Capsule", "Syrup", "Suspension"][i % 4],
  pack: i % 4 < 2 ? "Strip of 10" : "Bottle 100 ml",
}));
export const day = (date: string) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const time = Date.parse(date + "T00:00:00Z");
  return Number.isFinite(time) &&
    new Date(time).toISOString().slice(0, 10) === date
    ? time
    : NaN;
};
export const today = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
export const daysLeft = (expiry: string, asOf = today()) =>
  Math.ceil((day(expiry) - day(asOf)) / 86400000);
// Stable hash streams vary demand, coverage and expiry independently across positions.
function sample(index: number, stream: number) {
  let n = Math.imul(index + 1, 0x45d9f3b) ^ Math.imul(stream + 1, 0x27d4eb2d);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function seed(anchor = today()): State {
  const batches: Batch[] = [],
    sales: Sale[] = [];
  products.forEach((p, i) =>
    locations.forEach((l, j) => {
      const index = i * locations.length + j;
      const pace = sample(index, 0);
      const daily =
        pace < 0.06
          ? 0
          : pace < 0.2
            ? 0.3 + sample(index, 1)
            : 3 + sample(index, 1) * 20;
      for (let week = 0; week < 12; week++)
        sales.push({
          sku: p.id,
          location: l.id,
          week,
          quantity: Math.round(
            daily *
              7 *
              (0.85 + week * 0.015 + sample(index * 12 + week, 2) * 0.3),
          ),
        });
      const observedDaily = dailyDemand(sales, p.id, l.id);
      // Inventory coverage is independent of expiry; no dashboard totals are hard-coded.
      const level = sample(index, 3);
      const coverage =
        level < 0.08
          ? 0
          : level < 0.22
            ? l.lead * 0.6
            : level < 0.42
              ? l.lead + 3
              : 22 + sample(index, 4) * 48;
      const total =
        coverage === 0
          ? 0
          : Math.max(1, Math.round((observedDaily || 0.4) * coverage));
      const first = Math.round(total * 0.6);
      [0, 1].forEach((k) => {
        const e = sample(index * 2 + k, 5);
        const offset =
          e < 0.035
            ? -1 - Math.floor(e * 300)
            : e < 0.18
              ? 1 + Math.floor(sample(index * 2 + k, 6) * 90)
              : 120 + Math.floor(sample(index * 2 + k, 6) * 300);
        batches.push({
          id: `B-${i + 1}-${j + 1}-${k + 1}`,
          sku: p.id,
          location: l.id,
          quantity: k === 0 ? first : total - first,
          expiry: new Date(day(anchor) + offset * 86400000)
            .toISOString()
            .slice(0, 10),
        });
      });
    }),
  );
  return {
    version: 1,
    seedRevision: 2,
    anchor,
    batches,
    sales,
    requests: [],
    audit: [],
  };
}
export type StockStatus = "Out of Stock" | "Critical" | "Low Stock" | "Healthy";
export function inExpiryWindow(batch: Batch, days: number, asOf = today()) {
  const left = daysLeft(batch.expiry, asOf);
  return batch.quantity > 0 && left >= 0 && left <= days;
}
export function expirySummary(batches: Batch[], asOf = today()) {
  const stocked = batches.filter((b) => b.quantity > 0);
  return {
    expired: stocked.filter((b) => daysLeft(b.expiry, asOf) < 0),
    within30: stocked.filter((b) => inExpiryWindow(b, 30, asOf)),
    within60: stocked.filter((b) => inExpiryWindow(b, 60, asOf)),
    within90: stocked.filter((b) => inExpiryWindow(b, 90, asOf)),
    // Exclusive bands can safely be added; cumulative windows above cannot.
    days31to60: stocked.filter(
      (b) => daysLeft(b.expiry, asOf) > 30 && daysLeft(b.expiry, asOf) <= 60,
    ),
    days61to90: stocked.filter(
      (b) => daysLeft(b.expiry, asOf) > 60 && daysLeft(b.expiry, asOf) <= 90,
    ),
  };
}
export function summarizePositions(
  positions: { product: { id: string }; stock: number; status: StockStatus }[],
) {
  const count = (status: StockStatus) =>
    positions.filter((r) => r.status === status).length;
  const out = count("Out of Stock");
  return {
    activeSkus: new Set(positions.map((r) => r.product.id)).size,
    positions: positions.length,
    out,
    critical: count("Critical"),
    low: count("Low Stock"),
    healthy: count("Healthy"),
    usable: positions.reduce((sum, r) => sum + r.stock, 0),
    availability: positions.length
      ? ((positions.length - out) / positions.length) * 100
      : null,
  };
}
export function confirmedIncoming(request: Request) {
  return request.status === "Approved"
    ? Math.max(0, request.quantity - (request.received ?? 0))
    : 0;
}
export function usable(
  batches: Batch[],
  sku: string,
  location: string,
  asOf = today(),
) {
  return batches
    .filter(
      (b) =>
        b.sku === sku &&
        b.location === location &&
        daysLeft(b.expiry, asOf) >= 0,
    )
    .reduce((s, b) => s + b.quantity, 0);
}
export function dailyDemand(sales: Sale[], sku: string, location: string) {
  return (
    sales
      .filter(
        (s) =>
          s.sku === sku &&
          s.location === location &&
          s.week >= 8 &&
          s.week <= 11,
      )
      .reduce((v, s) => v + s.quantity, 0) / 28
  );
}
export function risk(
  stock: number,
  daily: number,
  lead: number,
): { coverage: number; status: StockStatus } {
  if (
    ![stock, daily, lead].every(Number.isFinite) ||
    stock < 0 ||
    daily < 0 ||
    !Number.isInteger(lead) ||
    lead < 1
  )
    throw new Error("Invalid stock, demand or lead time.");
  const coverage = daily > 0 ? stock / daily : Infinity;
  return {
    coverage,
    status:
      stock === 0
        ? "Out of Stock"
        : coverage <= lead
          ? "Critical"
          : coverage <= lead + 7
            ? "Low Stock"
            : "Healthy",
  };
}
export function reorder(
  stock: number,
  daily: number,
  lead: number,
  safety: number,
  incoming = 0,
) {
  if (
    ![stock, daily, lead, safety, incoming].every(Number.isFinite) ||
    stock < 0 ||
    daily < 0 ||
    incoming < 0 ||
    !Number.isInteger(lead) ||
    lead < 1 ||
    !Number.isInteger(safety) ||
    safety < 0
  )
    throw new Error(
      "Use nonnegative finite stock and demand, positive whole lead days and nonnegative whole safety days.",
    );
  const target = daily * (lead + safety);
  return {
    target,
    quantity: Math.max(0, Math.ceil(target - stock - incoming)),
  };
}
export function rows(state: State, leadOverride?: number, safety = 7) {
  return products.flatMap((p) =>
    locations.map((l) => {
      const stock = usable(state.batches, p.id, l.id),
        daily = dailyDemand(state.sales, p.id, l.id),
        lead = leadOverride ?? l.lead;
      const incoming = state.requests
        .filter(
          (r) =>
            r.sku === p.id && r.location === l.id && r.status === "Approved",
        )
        .reduce((s, r) => s + confirmedIncoming(r), 0);
      return {
        key: p.id + l.id,
        product: p,
        location: l,
        stock,
        daily,
        lead,
        incoming,
        ...risk(stock, daily, lead),
        ...reorder(stock, daily, lead, safety, incoming),
      };
    }),
  );
}
export function changeStock(
  state: State,
  id: string,
  delta: number,
  reason: string,
  requestId?: string,
): State {
  if (!Number.isSafeInteger(delta) || delta === 0 || !reason.trim())
    throw new Error("Enter a nonzero whole number and a reason.");
  const batch = state.batches.find((b) => b.id === id);
  if (!batch) throw new Error("Batch not found.");
  if (!Number.isSafeInteger(batch.quantity + delta))
    throw new Error("Movement exceeds the safe whole-pack range.");
  if (batch.quantity + delta < 0)
    throw new Error("Adjustment would create a negative balance.");
  const request = requestId
    ? state.requests.find((r) => r.id === requestId)
    : undefined;
  if (
    requestId &&
    (!request ||
      delta <= 0 ||
      request.sku !== batch.sku ||
      request.location !== batch.location ||
      daysLeft(batch.expiry) < 0 ||
      delta > confirmedIncoming(request))
  )
    throw new Error(
      "Receipt must match an approved request, an in-date batch and its outstanding quantity.",
    );
  return {
    ...state,
    requests: request
      ? state.requests.map((r) =>
          r.id === request.id
            ? { ...r, received: (r.received ?? 0) + delta }
            : r,
        )
      : state.requests,
    batches: state.batches.map((b) =>
      b.id === id ? { ...b, quantity: b.quantity + delta } : b,
    ),
    audit: [
      {
        at: new Date().toISOString(),
        action: delta > 0 ? "Stock receipt / increase" : "Stock adjustment",
        detail: `${id}: ${delta > 0 ? "+" : ""}${delta} packs. ${reason.trim()}${request ? ` · matched request ${request.id}` : ""}`,
      },
      ...state.audit,
    ],
  };
}
export function csv(data: Record<string, unknown>[]) {
  const keys = Object.keys(data[0] ?? {});
  const quote = (v: unknown) =>
    '"' + String(v ?? "").replaceAll('"', '""') + '"';
  return (
    "\uFEFF" +
    [keys, ...data.map((r) => keys.map((k) => r[k]))]
      .map((row) => row.map(quote).join(","))
      .join("\r\n")
  );
}
export function validState(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const s = value as State;
  return (
    s.version === 1 &&
    typeof s.anchor === "string" &&
    Number.isFinite(day(s.anchor)) &&
    Array.isArray(s.batches) &&
    s.batches.length > 0 &&
    s.batches.every(
      (b) =>
        typeof b.id === "string" &&
        products.some((p) => p.id === b.sku) &&
        locations.some((l) => l.id === b.location) &&
        Number.isInteger(b.quantity) &&
        b.quantity >= 0 &&
        Number.isFinite(day(b.expiry)),
    ) &&
    Array.isArray(s.sales) &&
    s.sales.length === 2160 &&
    s.sales.every((x) => Number.isFinite(x.quantity) && x.quantity >= 0) &&
    Array.isArray(s.requests) &&
    s.requests.every(
      (r) =>
        products.some((p) => p.id === r.sku) &&
        locations.some((l) => l.id === r.location) &&
        Number.isInteger(r.quantity) &&
        r.quantity > 0 &&
        (r.received === undefined ||
          (Number.isInteger(r.received) &&
            r.received >= 0 &&
            r.received <= r.quantity)) &&
        ["Draft", "Pending Approval", "Approved"].includes(r.status),
    ) &&
    Array.isArray(s.audit) &&
    s.audit.every(
      (a) =>
        typeof a.at === "string" &&
        typeof a.action === "string" &&
        typeof a.detail === "string",
    )
  );
}

// Seed revision is metadata, not a reason to overwrite a valid version-1 ledger.
export const storageKey = "pharmasetu-demo-v1";
export function restoreDemo(raw: string | null): {
  state: State;
  notice: string;
} {
  if (!raw) return { state: seed(), notice: "" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validState(parsed))
      return {
        state: parsed,
        notice:
          parsed.seedRevision === 2
            ? ""
            : "Your saved demo ledger is preserved. Revised synthetic scenarios are available through Reset demo data (confirmation required); resetting removes your local transactions.",
      };
  } catch {
    /* Preserve the original storage entry; this function never writes. */
  }
  return {
    state: seed(),
    notice:
      "Saved demo data could not be loaded. A temporary synthetic dataset is shown; the stored entry has not been changed. Export or back up your existing browser data before saving or resetting.",
  };
}
