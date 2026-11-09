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
    expect(() => changeStock(s, id, -1, "count")).toThrow("negative");
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
    expect(risk(0, 10, 5).status).toBe("Critical");
    expect(risk(50, 10, 5).status).toBe("Critical");
    expect(risk(120, 10, 5).status).toBe("Warning");
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
