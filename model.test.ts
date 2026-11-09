import { describe, it, expect } from "vitest";
import {
  seed,
  usable,
  daysLeft,
  risk,
  reorder,
  changeStock,
  dailyDemand,
  rows,
  csv,
  validState,
  summarizePositions,
  expirySummary,
  inExpiryWindow,
  restoreDemo,
  confirmedIncoming,
  today,
  day,
} from "./model";
describe("synthetic dataset", () => {
  it("has complete history and batch coverage", () => {
    const s = seed("2026-11-09");
    expect(s.sales).toHaveLength(2160);
    expect(s.batches).toHaveLength(360);
    expect(rows(s)).toHaveLength(180);
    expect(validState(s)).toBe(true);
  });
});
describe("inventory and expiry", () => {
  it("excludes expired stock and retains expiry-day stock", () => {
    const b = [
      { id: "a", sku: "x", location: "l", quantity: 100, expiry: "2026-11-08" },
      { id: "b", sku: "x", location: "l", quantity: 20, expiry: "2026-11-09" },
      { id: "c", sku: "x", location: "m", quantity: 50, expiry: "2026-12-10" },
    ];
    expect(usable(b, "x", "l", "2026-11-09")).toBe(20);
    expect(daysLeft("2026-12-09", "2026-11-09")).toBe(30);
    expect(daysLeft("2026-11-08", "2026-11-09")).toBe(-1);
  });
  it("receives stock, records audit and leaves original immutable", () => {
    const s = seed();
    const id = s.batches[0].id;
    const n = changeStock(s, id, 12, "Demo receipt");
    expect(n.batches[0].quantity).toBe(s.batches[0].quantity + 12);
    expect(n.audit[0].detail).toContain("Demo receipt");
    expect(s.audit).toHaveLength(0);
  });
  it("rejects negative balance, missing reason, zero and fractional movements", () => {
    const s = seed(),
      id = s.batches[0].id;
    expect(() =>
      changeStock(s, id, -(s.batches[0].quantity + 1), "count"),
    ).toThrow("negative");
    expect(() => changeStock(s, id, 1, " ")).toThrow();
    expect(() => changeStock(s, id, 0.5, "count")).toThrow();
    expect(() => changeStock(s, id, 0, "count")).toThrow();
  });
  it("allows adjustment down to zero", () => {
    const s = seed();
    s.batches[0].quantity = 10;
    expect(
      changeStock(s, s.batches[0].id, -10, "count").batches[0].quantity,
    ).toBe(0);
  });
});
describe("stock-out warnings", () => {
  it("uses the final four weeks divided by 28", () => {
    const s = seed();
    const relevant = s.sales.filter(
      (x) => x.sku === "PS-001" && x.location === "L1" && x.week >= 8,
    );
    expect(dailyDemand(s.sales, "PS-001", "L1")).toBe(
      relevant.reduce((v, x) => v + x.quantity, 0) / 28,
    );
  });
  it("classifies zero, lead-time boundary and buffer boundary", () => {
    expect(risk(0, 10, 5).status).toBe("Out of Stock");
    expect(risk(50, 10, 5).status).toBe("Critical");
    expect(risk(120, 10, 5).status).toBe("Low Stock");
    expect(risk(121, 10, 5).status).toBe("Healthy");
    expect(risk(10, 0, 5).status).toBe("Healthy");
  });
});
describe("replenishment", () => {
  it("rounds up and subtracts confirmed incoming", () => {
    expect(reorder(10, 2.5, 5, 7, 4)).toEqual({ target: 30, quantity: 16 });
    expect(reorder(100, 2.5, 5, 7).quantity).toBe(0);
    expect(reorder(0, 1.1, 1, 0).quantity).toBe(2);
  });
  it("only approved requests count as incoming; stock receipts recalculate", () => {
    const s = seed();
    s.requests = [
      {
        id: "r1",
        sku: "PS-001",
        location: "L1",
        quantity: 10,
        status: "Draft",
      },
      {
        id: "r2",
        sku: "PS-001",
        location: "L1",
        quantity: 5,
        status: "Approved",
      },
    ];
    const before = rows(s).find((r) => r.key === "PS-001L1")!;
    expect(before.incoming).toBe(5);
    const b = s.batches.find(
      (b) =>
        b.sku === "PS-001" && b.location === "L1" && daysLeft(b.expiry) >= 0,
    )!;
    const after = rows(changeStock(s, b.id, 2, "Demo receipt")).find(
      (r) => r.key === before.key,
    )!;
    expect(after.stock).toBe(before.stock + 2);
    expect(after.quantity).toBe(Math.max(0, before.quantity - 2));
  });
});
describe("CSV and saved data", () => {
  it("escapes commas, quotes and newlines", () => {
    expect(csv([{ name: 'A,"B"', detail: "line\nnext" }])).toBe(
      '\uFEFF"name","detail"\r\n"A,""B""","line\nnext"',
    );
  });
  it("rejects invalid saved inventory", () => {
    const s = seed();
    s.batches[0].quantity = -2;
    expect(validState(s)).toBe(false);
    expect(validState({ version: 1 })).toBe(false);
  });
});

describe("KPI aggregation and revised seed", () => {
  it("counts exclusive positions separately from unique SKUs and calculates availability", () => {
    const positions = [
      { product: { id: "A" }, stock: 20, status: "Healthy" as const },
      { product: { id: "A" }, stock: 0, status: "Out of Stock" as const },
      { product: { id: "B" }, stock: 5, status: "Critical" as const },
      { product: { id: "C" }, stock: 15, status: "Low Stock" as const },
    ];
    const m = summarizePositions(positions);
    expect(m).toEqual({
      activeSkus: 3,
      positions: 4,
      healthy: 1,
      out: 1,
      critical: 1,
      low: 1,
      usable: 40,
      availability: 75,
    });
    expect(m.healthy + m.out + m.critical + m.low).toBe(m.positions);
    expect(summarizePositions([]).availability).toBeNull();
  });
  it("has varied, reproducible scenarios without affecting every SKU with shortages", () => {
    const s = seed();
    expect(s).toEqual(seed());
    expect(s.seedRevision).toBe(2);
    const r = rows(s),
      m = summarizePositions(r);
    for (const status of ["Healthy", "Low Stock", "Critical", "Out of Stock"])
      expect(r.some((x) => x.status === status)).toBe(true);
    expect(
      new Set(r.filter((x) => x.status !== "Healthy").map((x) => x.product.id))
        .size,
    ).toBeLessThan(30);
    expect(
      r.some(
        (x) =>
          x.status === "Healthy" &&
          r.some(
            (y) => y.product.id === x.product.id && y.status === "Out of Stock",
          ),
      ),
    ).toBe(true);
    expect(r.some((x) => x.daily === 0)).toBe(true);
    expect(r.some((x) => x.daily > 0 && x.daily < 2)).toBe(true);
    expect(m.healthy + m.low + m.critical + m.out).toBe(180);
  });
  it("has zero reorder and undefined finite coverage when demand is zero", () => {
    expect(risk(0, 0, 5)).toEqual({
      status: "Out of Stock",
      coverage: Infinity,
    });
    expect(risk(1, 0, 5)).toEqual({ status: "Healthy", coverage: Infinity });
    expect(reorder(0, 0, 5, 7).quantity).toBe(0);
  });
  it("validates lead/safety assumptions and invalid numerical inputs", () => {
    for (const lead of [-1, 0, 1.5, Infinity, NaN])
      expect(() => reorder(1, 1, lead, 7)).toThrow();
    for (const safety of [-1, 1.5, NaN])
      expect(() => reorder(1, 1, 5, safety)).toThrow();
    expect(() => reorder(1, 1, 5, 7, -1)).toThrow();
    expect(() => risk(-1, 1, 5)).toThrow();
  });
});
describe("calendar expiry boundaries", () => {
  const base = "2026-11-09";
  const batch = (offset: number, quantity = 1) => ({
    id: String(offset),
    sku: "x",
    location: "l",
    quantity,
    expiry: new Date(day(base) + offset * 86400000).toISOString().slice(0, 10),
  });
  it("separates expired and exclusive future bands; cumulative filters never include expired", () => {
    const bs = [-1, 0, 30, 31, 60, 61, 90, 91].map((x) => batch(x));
    bs.push(batch(-10, 0));
    const e = expirySummary(bs, base);
    expect(e.expired).toHaveLength(1);
    expect(e.within30).toHaveLength(2);
    expect(e.within60).toHaveLength(4);
    expect(e.within90).toHaveLength(6);
    expect(e.days31to60).toHaveLength(2);
    expect(e.days61to90).toHaveLength(2);
    expect(
      new Set(
        [...e.within30, ...e.days31to60, ...e.days61to90].map((b) => b.id),
      ).size,
    ).toBe(6);
    expect(inExpiryWindow(batch(-1), 90, base)).toBe(false);
    expect(inExpiryWindow(batch(0), 30, base)).toBe(true);
  });
  it("uses the Indian calendar date across UTC midnight and ignores DST in date arithmetic", () => {
    expect(today(new Date("2026-11-08T20:00:00Z"))).toBe("2026-11-09");
    expect(daysLeft("2026-03-30", "2026-03-29")).toBe(1);
    expect(day("2026-02-30")).toBeNaN();
  });
});
describe("preserving user demo ledgers", () => {
  it("restores a legacy seed with all stock movements, sales and workflow states intact", () => {
    let old = seed();
    delete old.seedRevision;
    old = changeStock(old, old.batches[0].id, 13, "User transaction");
    old.requests = [
      {
        id: "saved",
        sku: "PS-001",
        location: "L1",
        quantity: 12,
        status: "Pending Approval",
      },
    ];
    const raw = JSON.stringify(old),
      loaded = restoreDemo(raw);
    expect(loaded.state).toEqual(old);
    expect(loaded.notice).toContain("preserved");
    expect(JSON.stringify(loaded.state)).toBe(raw);
  });
  it("only produces a revised seed for empty storage or explicit reset and warns about invalid data", () => {
    expect(restoreDemo(null).state.seedRevision).toBe(2);
    expect(restoreDemo(JSON.stringify(seed())).notice).toBe("");
    expect(restoreDemo("bad json").notice).toContain("has not been changed");
  });
});
describe("reconciling incoming stock on receipt", () => {
  it("deducts only unreceived approved packs and prevents counting a matched receipt twice", () => {
    let s = seed();
    const b = s.batches.find((b) => daysLeft(b.expiry) > 90)!;
    s.requests = [
      {
        id: "incoming",
        sku: b.sku,
        location: b.location,
        quantity: 100,
        status: "Approved",
      },
    ];
    const before = rows(s).find((r) => r.key === b.sku + b.location)!;
    s = changeStock(s, b.id, 25, "Matched delivery", "incoming");
    const after = rows(s).find((r) => r.key === before.key)!;
    expect(after.stock).toBe(before.stock + 25);
    expect(after.incoming).toBe(75);
    expect(after.quantity).toBe(before.quantity);
    expect(
      confirmedIncoming({ ...s.requests[0], status: "Pending Approval" }),
    ).toBe(0);
    expect(() => changeStock(s, b.id, 76, "too much", "incoming")).toThrow();
    expect(() =>
      changeStock(s, b.id, -1, "not a receipt", "incoming"),
    ).toThrow();
  });
});
