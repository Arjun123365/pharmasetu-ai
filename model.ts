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
};
export type Audit = { at: string; action: string; detail: string };
export type State = {
  version: 1;
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
export const day = (date: string) => Date.parse(date + "T00:00:00Z");
export const today = () => new Date().toISOString().slice(0, 10);
export const daysLeft = (expiry: string, asOf = today()) =>
  Math.ceil((day(expiry) - day(asOf)) / 86400000);
export function seed(anchor = today()): State {
  const batches: Batch[] = [],
    sales: Sale[] = [];
  products.forEach((p, i) =>
    locations.forEach((l, j) => {
      const daily = 2 + ((i * 7 + j * 3) % 18);
      for (let w = 0; w < 12; w++)
        sales.push({
          sku: p.id,
          location: l.id,
          week: w,
          quantity: Math.round(
            daily * 7 * (0.8 + w * 0.025 + ((i + j + w) % 5) * 0.07),
          ),
        });
      const coverage = [0, 3, 9, 24, 50, 75][(i + j) % 6];
      [0, 1].forEach((k) =>
        batches.push({
          id: `B-${i + 1}-${j + 1}-${k + 1}`,
          sku: p.id,
          location: l.id,
          quantity: Math.round(daily * coverage * (k === 0 ? 0.6 : 0.4)),
          expiry: new Date(
            day(anchor) +
              [-12, 18, 45, 75, 150, 280][(i + j + k) % 6] * 86400000,
          )
            .toISOString()
            .slice(0, 10),
        }),
      );
    }),
  );
  return { version: 1, anchor, batches, sales, requests: [], audit: [] };
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
      .filter((s) => s.sku === sku && s.location === location && s.week >= 8)
      .reduce((v, s) => v + s.quantity, 0) / 28
  );
}
export function risk(stock: number, daily: number, lead: number) {
  const coverage = daily > 0 ? stock / daily : Infinity;
  return {
    coverage,
    status:
      stock === 0
        ? "Critical"
        : coverage <= lead
          ? "Critical"
          : coverage <= lead + 7
            ? "Warning"
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
        .reduce((s, r) => s + r.quantity, 0);
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
): State {
  if (!Number.isInteger(delta) || delta === 0 || !reason.trim())
    throw new Error("Enter a nonzero whole number and a reason.");
  const batch = state.batches.find((b) => b.id === id);
  if (!batch) throw new Error("Batch not found.");
  if (batch.quantity + delta < 0)
    throw new Error("Adjustment would create a negative balance.");
  return {
    ...state,
    batches: state.batches.map((b) =>
      b.id === id ? { ...b, quantity: b.quantity + delta } : b,
    ),
    audit: [
      {
        at: new Date().toISOString(),
        action: delta > 0 ? "Stock receipt / increase" : "Stock adjustment",
        detail: `${id}: ${delta > 0 ? "+" : ""}${delta} packs. ${reason.trim()}`,
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
