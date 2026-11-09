import { useMemo, useState } from "react";
import {
  Activity,
  LayoutDashboard,
  TrendingUp,
  Package,
  ShieldAlert,
  Clock,
  Truck,
  FileBarChart,
  Search,
  ArrowUpRight,
  RotateCcw,
  Download,
  Printer,
  ChevronRight,
  MapPin,
  Plus,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  products,
  locations,
  seed,
  rows,
  daysLeft,
  changeStock,
  csv,
  restoreDemo,
  storageKey,
  summarizePositions,
  expirySummary,
  confirmedIncoming,
  today,
  type State,
} from "./model";
const modules = [
  ["Overview", LayoutDashboard],
  ["Demand intelligence", TrendingUp],
  ["Inventory management", Package],
  ["Stock-out warnings", ShieldAlert],
  ["Expiry monitoring", Clock],
  ["Smart replenishment", Truck],
  ["Reports & analytics", FileBarChart],
] as const;
const colors = ["#315cf5", "#28bda0", "#80a6ff", "#ffbd5a", "#a48af5"];
const fmt = (n: number) => Math.round(n).toLocaleString("en-IN");
let loadNotice = "";
function load(): State {
  try {
    const restored = restoreDemo(localStorage.getItem(storageKey));
    loadNotice = restored.notice;
    return restored.state;
  } catch {
    loadNotice =
      "Browser storage could not be read. Using a fresh demo dataset.";
    return seed();
  }
}
function Badge({ value }: { value: string }) {
  return (
    <span className={"badge " + value.toLowerCase().replaceAll(" ", "-")}>
      {value}
    </span>
  );
}
function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function Export({
  data,
  name,
}: {
  data: Record<string, unknown>[];
  name: string;
}) {
  return (
    <button
      className="button"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([csv(data)], { type: "text/csv;charset=utf-8;" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = name + ".csv";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <Download size={15} /> Export CSV
    </button>
  );
}
export default function App() {
  const [state, setState] = useState<State>(load),
    [active, setActive] = useState(0),
    [sku, setSku] = useState(""),
    [loc, setLoc] = useState(""),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState(loadNotice),
    [mobile, setMobile] = useState(false),
    [reset, setReset] = useState(false),
    [lead, setLead] = useState(7),
    [safety, setSafety] = useState(7),
    [season, setSeason] = useState(10),
    [expiryWindow, setExpiryWindow] = useState("90"),
    [riskFilter, setRiskFilter] = useState("All"),
    [report, setReport] = useState("Inventory health"),
    [edit, setEdit] = useState<string | null>(null),
    [delta, setDelta] = useState(""),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [receiptRequest, setReceiptRequest] = useState("");
  const save = (next: State) => {
    setState(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      setNotice(
        "Changes work for this session, but browser storage is unavailable. Export a report before leaving.",
      );
    }
  };
  const all = useMemo(() => rows(state), [state]);
  const filtered = all.filter(
    (r) =>
      (!sku || r.product.id === sku) &&
      (!loc || r.location.id === loc) &&
      (!search ||
        `${r.product.name} ${r.product.id} ${r.product.category} ${r.product.form} ${r.location.city} ${r.location.name}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const batches = state.batches.filter(
    (b) =>
      (!sku || b.sku === sku) &&
      (!loc || b.location === loc) &&
      (!search ||
        `${products.find((p) => p.id === b.sku)?.name} ${products.find((p) => p.id === b.sku)?.category} ${products.find((p) => p.id === b.sku)?.form} ${locations.find((l) => l.id === b.location)?.city} ${locations.find((l) => l.id === b.location)?.name} ${b.id} ${b.sku}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const metrics = summarizePositions(filtered);
  const stock = metrics.usable;
  const out = filtered.filter((r) => r.status === "Out of Stock");
  const expiry = expirySummary(batches);
  const exp = expiry.within90;
  const allExpiryRisk = [...expiry.expired, ...exp];
  const positionKeys = new Set(filtered.map((r) => r.key));
  const visibleRequests = state.requests.filter((r) =>
    positionKeys.has(r.sku + r.location),
  );
  const pending = state.requests.filter(
    (r) =>
      r.status !== "Approved" &&
      (!sku || r.sku === sku) &&
      (!loc || r.location === loc) &&
      positionKeys.has(r.sku + r.location),
  );
  const weekly = Array.from({ length: 12 }, (_, week) => ({
    week: `W${week + 1}`,
    demand: state.sales
      .filter((s) => s.week === week && positionKeys.has(s.sku + s.location))
      .reduce((v, s) => v + s.quantity, 0),
  }));
  const moving = weekly.slice(-4).reduce((s, w) => s + w.demand, 0) / 4;
  const projection = [
    ...weekly.map((w) => ({ ...w, projection: null as number | null })),
    ...Array.from({ length: 4 }, (_, i) => ({
      week: `P${i + 1}`,
      demand: null,
      projection: Math.round(moving * (1 + season / 100)),
    })),
  ];
  const locationChart = locations
    .filter((l) => !loc || l.id === loc)
    .map((l) => ({
      name: l.city,
      stock: filtered
        .filter((r) => r.location.id === l.id)
        .reduce((s, r) => s + r.stock, 0),
      demand: state.sales
        .filter(
          (s) => s.location === l.id && positionKeys.has(s.sku + s.location),
        )
        .reduce((v, s) => v + s.quantity, 0),
    }));
  const categories = [...new Set(products.map((p) => p.category))].map(
    (name) => ({
      name,
      value: filtered
        .filter((r) => r.product.category === name)
        .reduce((s, r) => s + r.stock, 0),
    }),
  );
  const recommendations = rows(state, lead, safety).filter(
    (r) =>
      (!sku || r.product.id === sku) &&
      (!loc || r.location.id === loc) &&
      (!search ||
        `${r.product.name} ${r.product.id} ${r.location.city}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  const alertRows = filtered
    .filter((r) => r.status !== "Healthy")
    .sort(
      (a, b) =>
        Number(b.stock === 0) - Number(a.stock === 0) ||
        a.coverage - b.coverage,
    );
  const exportRows = filtered.map((r) => ({
    SKU: r.product.id,
    Medicine: r.product.name,
    Location: r.location.city,
    "Usable packs": r.stock,
    "Daily demand": r.daily.toFixed(2),
    "Coverage days": Number.isFinite(r.coverage)
      ? r.coverage.toFixed(1)
      : "N/A · no recent demand",
    Status: r.status,
    "Suggested packs": r.quantity,
  }));
  const expiryRows = batches
    .filter(
      (b) =>
        b.quantity > 0 &&
        (expiryWindow === "expired"
          ? daysLeft(b.expiry) < 0
          : daysLeft(b.expiry) >= 0 &&
            daysLeft(b.expiry) <= Number(expiryWindow)),
    )
    .sort((a, b) => a.expiry.localeCompare(b.expiry));
  const reportData: Record<string, unknown>[] =
    report === "Expiry risk"
      ? [...allExpiryRisk]
          .sort((a, b) => a.expiry.localeCompare(b.expiry))
          .map((b) => ({
            Batch: b.id,
            SKU: b.sku,
            Location: locations.find((l) => l.id === b.location)!.city,
            Expiry: b.expiry,
            Packs: b.quantity,
            "Days remaining": daysLeft(b.expiry),
          }))
      : report === "Distributor summary"
        ? locationChart.map((l) => ({
            Location: l.name,
            "Usable packs": l.stock,
            "Historical demand": l.demand,
          }))
        : report === "Replenishment recommendations"
          ? recommendations.map((r) => ({
              SKU: r.product.id,
              Location: r.location.city,
              Stock: r.stock,
              Incoming: r.incoming,
              Target: r.target.toFixed(2),
              Reorder: r.quantity,
              "Lead days": lead,
              "Safety days": safety,
            }))
          : report === "Stock-out risk"
            ? exportRows.filter((r) => r.Status !== "Healthy")
            : exportRows;
  function navigate(i: number) {
    window.scrollTo({ top: 0, behavior: "instant" });
    setActive(i);
    setSearch("");
    setMobile(false);
  }
  function request(r: (typeof all)[number]) {
    if (r.quantity <= 0) return;
    const existing = state.requests.some(
      (q) =>
        q.sku === r.product.id &&
        q.location === r.location.id &&
        q.status !== "Approved",
    );
    if (existing) {
      setNotice(
        "An open draft or pending request already exists for this SKU and location.",
      );
      return;
    }
    const id = crypto.randomUUID();
    save({
      ...state,
      requests: [
        {
          id,
          sku: r.product.id,
          location: r.location.id,
          quantity: r.quantity,
          status: "Draft",
        },
        ...state.requests,
      ],
      audit: [
        {
          at: new Date().toISOString(),
          action: "Draft replenishment",
          detail: `${r.product.id} · ${r.location.city} · ${r.quantity} packs`,
        },
        ...state.audit,
      ],
    });
    setNotice(
      "Demo request created as Draft. Review it in the request queue below.",
    );
  }
  const filterBar = (
    <div className="filters">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search medicines, SKU or location"
          placeholder="Search medicine, SKU or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <select
        aria-label="Filter product"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
      >
        <option value="">All medicines</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.id}
          </option>
        ))}
      </select>
      <select
        aria-label="Filter distributor location"
        value={loc}
        onChange={(e) => setLoc(e.target.value)}
      >
        <option value="">All locations</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.city}
          </option>
        ))}
      </select>
      <button
        className="text-button"
        onClick={() => {
          setSku("");
          setLoc("");
          setSearch("");
        }}
      >
        Clear filters
      </button>
    </div>
  );
  const lineChart = (data: object[], projected = false) => (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4169f4" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#4169f4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 5"
            vertical={false}
            stroke="#e9edf5"
          />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            fontSize={11}
          />
          <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
          <Tooltip />
          <Area
            isAnimationActive={false}
            name="Historical packs"
            type="monotone"
            dataKey="demand"
            stroke="#4068f5"
            fill="url(#blueFill)"
            strokeWidth={3}
          />
          {projected && (
            <Area
              isAnimationActive={false}
              name="Illustrative projection"
              type="monotone"
              dataKey="projection"
              stroke="#15aa8e"
              fill="#15aa8e18"
              strokeDasharray="5 4"
              strokeWidth={3}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
  const riskTable = (data: typeof all) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Medicine / SKU</th>
            <th>Location</th>
            <th>Usable packs</th>
            <th>Daily demand</th>
            <th>Coverage</th>
            <th>Lead time</th>
            <th>Status / explanation</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.key}>
              <td>
                <strong>{r.product.name}</strong>
                <small>{r.product.id}</small>
              </td>
              <td>{r.location.city}</td>
              <td>{fmt(r.stock)}</td>
              <td>{r.daily.toFixed(1)}</td>
              <td>
                {Number.isFinite(r.coverage)
                  ? r.coverage.toFixed(1) + " days"
                  : "N/A · no recent demand"}
              </td>
              <td>{r.lead} days</td>
              <td>
                <Badge value={r.status} />
                <small>
                  {r.stock === 0
                    ? "No usable inventory"
                    : r.status === "Critical"
                      ? "Coverage is at or below lead time"
                      : r.status === "Low Stock"
                        ? "Within 7 days of lead time"
                        : r.daily === 0
                          ? "No demand in the last four weeks; no demand-driven reorder"
                          : "Coverage exceeds lead time + 7 days"}
                </small>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!data.length && (
        <p className="empty">
          No matching stock positions. Try clearing filters.
        </p>
      )}
    </div>
  );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate(0);
          }}
        >
          <span className="brand-icon">
            <Activity size={25} />
          </span>
          <span>
            PharmaSetu <b>AI</b>
            <small>INTELLIGENCE THAT CONNECTS</small>
          </span>
        </a>
        <div className="sidebar-label">WORKSPACE</div>
        <nav>
          {modules.map(([label, Icon], i) => (
            <button
              key={label}
              className={active === i ? "nav-item active" : "nav-item"}
              onClick={() => navigate(i)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {i === 3 && (
                <em>
                  {
                    all.filter(
                      (r) =>
                        r.status === "Critical" || r.status === "Out of Stock",
                    ).length
                  }
                </em>
              )}
            </button>
          ))}
        </nav>
        <div className="pilot">
          <span className="mini-icon">
            <MapPin size={18} />
          </span>
          <b>Northeast India pilot</b>
          <p>
            GRD Pharmaceuticals context
            <br />
            Guwahati / Rani, Assam
          </p>
          <span className="pilot-status">● Synthetic demonstration</span>
        </div>
        <button className="reset" onClick={() => setReset(true)}>
          <RotateCcw size={16} />
          Reset demo data
        </button>
        <div className="sidebar-foot">
          Built for NESFIC 2026
          <br />
          <span>Connecting care. Enabling availability.</span>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <button
            className="mobile-toggle"
            aria-label="Toggle navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <span>
            Workspace <ChevronRight size={14} /> <b>{modules[active][0]}</b>
          </span>
          <span className="demo-tag">NESFIC 2026 DEMO</span>
        </div>
        <div className="notice-strip">
          <ShieldAlert size={15} />
          <span>
            Demonstration prototype · All products, distributors and data are
            fictional. No connection to GRD live systems.
          </span>
        </div>
        {notice && (
          <div role="status" className="toast">
            {notice}
            <button
              aria-label="Dismiss notification"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <header className={active === 0 ? "hero" : "page-heading"}>
          <div className="eyebrow">
            NORTHEAST PHARMACEUTICAL SUPPLY CHAIN INTELLIGENCE
          </div>
          <div className="heading-row">
            <div>
              <h1>
                {active === 0
                  ? "Every medicine. Every location. In view."
                  : modules[active][0]}
              </h1>
              <p>
                {active === 0
                  ? "Predict Demand. Prevent Stock-Outs. Reduce Expiry."
                  : "Actionable visibility across your synthetic distribution network."}
              </p>
            </div>
            <div className="as-of">
              <span className="live-dot" /> Demo snapshot{" "}
              <b>
                {new Date().toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </b>
            </div>
          </div>
          {active === 0 && (
            <>
              <div className="hero-divider" />
              <div className="kpis">
                {[
                  [
                    Package,
                    "Usable inventory",
                    fmt(stock),
                    "packs · in-date only",
                    "Sum of packs in batches whose expiry is today or later; expired packs are excluded.",
                  ],
                  [
                    Activity,
                    "Active SKUs",
                    metrics.activeSkus,
                    "distinct medicines in scope",
                    "Unique catalogue medicines in the selected scope, regardless of stock balance.",
                  ],
                  [
                    MapPin,
                    "SKU-location positions",
                    metrics.positions,
                    "one medicine × one location",
                    "Denominator for stock statuses and availability. A medicine can have a different status in each location.",
                  ],
                  [
                    ShieldAlert,
                    "Critical positions",
                    metrics.critical,
                    "positive stock · at risk",
                    "Positive usable stock with coverage at or below that location’s lead time; zero-stock positions are separate.",
                  ],
                  [
                    Clock,
                    "Low-stock positions",
                    metrics.low,
                    "within the 7-day buffer",
                    "Positive usable stock with coverage above lead time but at or below lead time + 7 days. Excludes Critical and Out of Stock.",
                  ],
                  [
                    X,
                    "Out-of-stock positions",
                    metrics.out,
                    "zero usable packs",
                    "SKU-location positions with zero usable inventory, even if expired packs remain.",
                  ],
                  [
                    Clock,
                    "Expired batches",
                    expiry.expired.length,
                    "stocked batches · excluded",
                    "Batches with positive quantity and an expiry date before today; not included in future expiry counts.",
                  ],
                  [
                    Clock,
                    "Expiring in 90 days",
                    exp.length,
                    "stocked batches · not expired",
                    "Positive-stock batches expiring today through 90 days from today, inclusive. Does not include expired batches.",
                  ],
                ].map(([Icon, label, value, caption, definition]) => {
                  const I = Icon as typeof Package;
                  return (
                    <div
                      className={
                        "kpi metric-" +
                        String(label).split(" ")[0].toLowerCase()
                      }
                      key={String(label)}
                      tabIndex={0}
                      title={String(definition)}
                      aria-label={`${label}: ${value}. ${definition}`}
                    >
                      <div className="kpi-label">
                        <I size={16} />
                        {String(label)}
                      </div>
                      <strong>{String(value)}</strong>
                      <small>{String(caption)}</small>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </header>
        <div className="content">
          {filterBar}
          {active === 0 && (
            <>
              <div className="availability">
                <span>
                  <CheckCircle2 size={19} />{" "}
                  <b>
                    {metrics.availability === null
                      ? "N/A"
                      : Math.round(metrics.availability)}
                    {metrics.availability === null ? "" : "%"}
                  </b>{" "}
                  inventory availability
                </span>
                <p>
                  {metrics.positions - out.length} stocked / {metrics.positions}{" "}
                  selected positions · not order fulfilment or a service-level
                  estimate
                </p>
              </div>
              <details className="metric-guide">
                <summary>How these metrics are calculated</summary>
                <p>
                  All figures respect the selected filters. Active SKUs count
                  unique medicines; stock statuses count SKU-location positions.
                  Healthy {metrics.healthy} + Low Stock {metrics.low} + Critical{" "}
                  {metrics.critical} + Out of Stock {metrics.out} ={" "}
                  {metrics.positions} positions. A single SKU may be healthy at
                  one location and out of stock at another.
                </p>
                <p>
                  Average daily demand = weeks 9–12 ÷ 28. Coverage = usable
                  packs ÷ daily demand. Out of Stock means zero usable packs;
                  Critical means positive stock and coverage ≤ lead days; Low
                  Stock means lead days &lt; coverage ≤ lead days + 7; Healthy
                  means above this buffer, or positive stock with zero recent
                  demand. No-demand coverage is shown as N/A, not a finite
                  estimate.
                </p>
                <p>
                  Availability = stocked positions ÷ all selected positions ×
                  100. It is not actual order fulfilment. No matching positions
                  yields N/A.
                </p>
                <p>
                  Expiry uses calendar dates in India (Asia/Kolkata), with the
                  expiry date itself considered in date for this demonstration.
                  Stocked batch counts: expired {expiry.expired.length}; due
                  0–30 days {expiry.within30.length}; due 31–60 days{" "}
                  {expiry.days31to60.length}; due 61–90 days{" "}
                  {expiry.days61to90.length}. These exclusive bands do not
                  overlap. The 30/60/90-day filters are cumulative and must not
                  be added together.
                </p>
              </details>
              <div className="scope-summary">
                <span>
                  <Badge value="Healthy" /> {metrics.healthy} healthy positions
                </span>
                <button className="text-button" onClick={() => navigate(5)}>
                  <Truck size={14} /> {pending.length} open demo replenishment
                  requests <ChevronRight size={14} />
                </button>
              </div>
              <div className="grid-main">
                <Card
                  title="Demand at a glance"
                  subtitle="Synthetic weekly demand · packs across the network"
                >
                  <div className="chart-summary">
                    <strong>{fmt(weekly.at(-1)!.demand)}</strong>
                    <span>packs in week 12</span>
                    <Badge value="12 weeks" />
                  </div>
                  {lineChart(weekly)}
                </Card>
                <Card
                  title="Inventory by location"
                  subtitle="Usable stock · expired batches excluded"
                >
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={locationChart} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 5"
                          horizontal={false}
                        />
                        <XAxis type="number" fontSize={11} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={80}
                          fontSize={11}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Legend
                          iconType="circle"
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Bar
                          isAnimationActive={false}
                          name="Usable packs"
                          dataKey="stock"
                          fill="#476bf2"
                          radius={[0, 5, 5, 0]}
                          barSize={15}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
              <div className="grid-three">
                <Card
                  title="Stock attention"
                  subtitle={`${alertRows.length} positions need review`}
                >
                  <div className="alerts">
                    {alertRows.slice(0, 4).map((r) => (
                      <button
                        key={r.key}
                        onClick={() => {
                          navigate(3);
                          setSku(r.product.id);
                          setLoc(r.location.id);
                        }}
                      >
                        <span
                          className={
                            "alert-icon " +
                            r.status.toLowerCase().replaceAll(" ", "-")
                          }
                        >
                          <ShieldAlert size={17} />
                        </span>
                        <span>
                          <b>{r.product.name}</b>
                          <small>
                            {r.location.city} ·{" "}
                            {r.stock === 0
                              ? "Out of usable stock"
                              : r.coverage.toFixed(1) + " days of coverage"}
                          </small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                    {!alertRows.length && (
                      <p className="empty">
                        No shortage positions in this scope.
                      </p>
                    )}
                  </div>
                  <button
                    className="text-button full"
                    onClick={() => navigate(3)}
                  >
                    View all stock alerts <ChevronRight size={14} />
                  </button>
                </Card>
                <Card title="Category mix" subtitle="Share of usable inventory">
                  <div className="chart donut">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          isAnimationActive={false}
                          data={categories}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={76}
                          paddingAngle={3}
                        >
                          {categories.map((c, i) => (
                            <Cell key={c.name} fill={colors[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          iconType="circle"
                          iconSize={7}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card
                  title="Top moving medicines"
                  subtitle="Ranked by 12-week synthetic demand"
                >
                  <div className="top-products">
                    {products
                      .filter((p) =>
                        filtered.some((r) => r.product.id === p.id),
                      )
                      .map((p) => ({
                        ...p,
                        total: state.sales
                          .filter(
                            (s) =>
                              s.sku === p.id &&
                              positionKeys.has(s.sku + s.location),
                          )
                          .reduce((v, s) => v + s.quantity, 0),
                      }))
                      .sort((a, b) => b.total - a.total)
                      .slice(0, 5)
                      .map((p, i) => (
                        <div key={p.id}>
                          <span className="rank">0{i + 1}</span>
                          <span>
                            <b>{p.name}</b>
                            <small>{p.category}</small>
                          </span>
                          <strong>
                            {fmt(p.total)}
                            <small>packs</small>
                          </strong>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            </>
          )}
          {active === 1 && (
            <>
              <div className="info-box">
                <TrendingUp size={20} />
                <div>
                  <b>Transparent projections, grounded in simple rules</b>
                  <p>
                    Four-week projection = average of weeks 9–12 × (1 +
                    simulated seasonal uplift). This is rule-based, not a
                    trained machine-learning model. No forecast accuracy is
                    claimed.
                  </p>
                </div>
              </div>
              <div className="control-row">
                <label>
                  Simulated seasonal uplift (%){" "}
                  <input
                    type="number"
                    min="-50"
                    max="100"
                    value={season}
                    onChange={(e) =>
                      setSeason(
                        Math.max(-50, Math.min(100, Number(e.target.value))),
                      )
                    }
                  />
                </label>
                <p>
                  Assumption for demonstration only; not an observed seasonal
                  effect.
                </p>
              </div>
              <Card
                title="Historical demand & four-week outlook"
                subtitle={`Moving average: ${fmt(moving)} packs/week · projection: ${fmt(moving * (1 + season / 100))} packs/week`}
              >
                {lineChart(projection, true)}
                <p className="chart-note">
                  W1–W12: synthetic observations. P1–P4: constant moving-average
                  projections with an adjustable simulated uplift. All units are
                  packs.
                </p>
              </Card>
              <Card
                title="Location-wise demand comparison"
                subtitle="Total synthetic demand over 12 weeks"
              >
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={locationChart}>
                      <CartesianGrid strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="name" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Bar
                        isAnimationActive={false}
                        dataKey="demand"
                        name="Demand packs"
                        fill="#22ad98"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </>
          )}
          {active === 2 && (
            <>
              <div className="section-title">
                <div>
                  <h2>Batch inventory</h2>
                  <p>
                    {batches.length} batches · receipts and adjustments are
                    saved in this browser
                  </p>
                </div>
                <Export
                  data={batches.map((b) => ({
                    Batch: b.id,
                    SKU: b.sku,
                    Location: b.location,
                    Quantity: b.quantity,
                    Expiry: b.expiry,
                  }))}
                  name="batch-inventory"
                />
              </div>
              <Card
                title="Medicine catalogue & stock ledger"
                subtitle="Pack counts, not individual tablets. Select Receive / adjust to record a movement."
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine / SKU</th>
                        <th>Category / pack</th>
                        <th>Location / batch</th>
                        <th>Expiry</th>
                        <th>Packs</th>
                        <th>Position status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((b) => {
                        const p = products.find((p) => p.id === b.sku)!,
                          l = locations.find((l) => l.id === b.location)!;
                        return (
                          <tr key={b.id}>
                            <td>
                              <strong>{p.name}</strong>
                              <small>
                                {p.id} · {p.form}
                              </small>
                            </td>
                            <td>
                              {p.category}
                              <small>{p.pack}</small>
                            </td>
                            <td>
                              {l.city}
                              <small>{b.id}</small>
                            </td>
                            <td>
                              {b.expiry}
                              <small
                                className={
                                  daysLeft(b.expiry) < 0
                                    ? "red-text"
                                    : daysLeft(b.expiry) <= 90
                                      ? "amber-text"
                                      : "green-text"
                                }
                              >
                                {daysLeft(b.expiry) < 0
                                  ? "Expired — excluded"
                                  : daysLeft(b.expiry) <= 30
                                    ? "Due within 30 days"
                                    : daysLeft(b.expiry) <= 90
                                      ? "Due within 90 days"
                                      : "In date"}
                              </small>
                            </td>
                            <td>
                              <b>{fmt(b.quantity)}</b>
                            </td>
                            <td>
                              <Badge
                                value={
                                  all.find((r) => r.key === b.sku + b.location)!
                                    .status
                                }
                              />
                              <small>All in-date batches at {l.city}</small>
                            </td>
                            <td>
                              <button
                                className="button compact"
                                onClick={() => {
                                  setEdit(b.id);
                                  setReceiptRequest("");
                                  setDelta("");
                                  setReason("");
                                  setError("");
                                }}
                              >
                                <Plus size={13} /> Receive / adjust
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!batches.length && (
                    <p className="empty">No matching batches.</p>
                  )}
                </div>
              </Card>
              <Card
                title="Audit history"
                subtitle="Local demonstration log · not a tamper-proof regulatory audit trail"
              >
                {state.audit.length ? (
                  <div className="audit">
                    {state.audit.map((a, i) => (
                      <div key={i}>
                        <span>{new Date(a.at).toLocaleString("en-IN")}</span>
                        <b>{a.action}</b>
                        <p>{a.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty">
                    No movements yet. Record a stock receipt or adjustment to
                    begin.
                  </p>
                )}
              </Card>
            </>
          )}
          {active === 3 && (
            <>
              <div className="info-box">
                <ShieldAlert size={20} />
                <div>
                  <b>Lead-time aware early warnings</b>
                  <p>
                    Daily demand = last four weeks of sales ÷ 28. Coverage =
                    usable packs ÷ daily demand. Out of Stock: zero usable
                    packs. Critical: positive stock with coverage ≤ lead time.
                    Low Stock: lead time &lt; coverage ≤ lead time + 7 days.
                    Healthy: above that buffer or positive stock with no recent
                    demand. These categories are mutually exclusive.
                  </p>
                </div>
              </div>
              <div className="section-title">
                <div className="tabs">
                  {[
                    "All",
                    "Out of Stock",
                    "Critical",
                    "Low Stock",
                    "Healthy",
                  ].map((v) => (
                    <button
                      className={riskFilter === v ? "selected" : ""}
                      onClick={() => setRiskFilter(v)}
                      key={v}
                    >
                      {v}{" "}
                      <span>
                        {v === "All"
                          ? filtered.length
                          : filtered.filter((r) => r.status === v).length}
                      </span>
                    </button>
                  ))}
                </div>
                <Export
                  data={exportRows.filter(
                    (r) => riskFilter === "All" || r.Status === riskFilter,
                  )}
                  name="stock-risk"
                />
              </div>
              <Card
                title="Stock coverage monitor"
                subtitle="Lead-time assumptions vary by location (5–12 days)."
              >
                {riskTable(
                  filtered.filter(
                    (r) => riskFilter === "All" || r.status === riskFilter,
                  ),
                )}
              </Card>
            </>
          )}
          {active === 4 && (
            <>
              <div className="mini-kpis">
                {[
                  ["Expired", expiry.expired],
                  ["Due 0–30 days", expiry.within30],
                  ["Due 31–60 days", expiry.days31to60],
                  ["Due 61–90 days", expiry.days61to90],
                ].map(([label, bs]) => (
                  <div className="card" key={String(label)}>
                    <span>{String(label)}</span>
                    <strong>
                      {fmt(
                        (bs as typeof batches).reduce(
                          (s, b) => s + b.quantity,
                          0,
                        ),
                      )}
                    </strong>
                    <small>
                      {(bs as typeof batches).length} stocked batches ·
                      exclusive band
                    </small>
                  </div>
                ))}
              </div>
              <div className="info-box">
                <Clock size={20} />
                <div>
                  <b>FEFO: first expiry, first out</b>
                  <p>
                    Review in-date batches in expiry order within each SKU and
                    location. Expired inventory is excluded from usable stock.
                    Expired medicines must not be redistributed. In-date
                    redistribution and disposal require qualified human review;
                    neither is approved by this prototype.
                  </p>
                </div>
              </div>
              <div className="section-title">
                <label>
                  Expiry window{" "}
                  <select
                    value={expiryWindow}
                    onChange={(e) => setExpiryWindow(e.target.value)}
                  >
                    <option value="30">Within 30 days</option>
                    <option value="60">Within 60 days</option>
                    <option value="90">Within 90 days</option>
                    <option value="expired">Expired stock</option>
                  </select>
                </label>
                <Export
                  data={expiryRows.map((b) => ({
                    Batch: b.id,
                    SKU: b.sku,
                    Location: b.location,
                    Expiry: b.expiry,
                    Packs: b.quantity,
                  }))}
                  name="expiry-risk"
                />
              </div>
              <Card
                title="Batch expiry review"
                subtitle="Sorted by earliest expiry · only batches with stock shown"
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Location / batch</th>
                        <th>Expiry</th>
                        <th>Days left</th>
                        <th>Packs at risk</th>
                        <th>Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiryRows.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <strong>
                              {products.find((p) => p.id === b.sku)!.name}
                            </strong>
                            <small>{b.sku}</small>
                          </td>
                          <td>
                            {locations.find((l) => l.id === b.location)!.city}
                            <small>{b.id}</small>
                          </td>
                          <td>{b.expiry}</td>
                          <td>
                            <Badge
                              value={
                                daysLeft(b.expiry) < 0
                                  ? "Expired"
                                  : daysLeft(b.expiry) + " days"
                              }
                            />
                          </td>
                          <td>{fmt(b.quantity)}</td>
                          <td>
                            {daysLeft(b.expiry) < 0
                              ? "Segregate; no redistribution. Seek authorised disposal review"
                              : state.batches.some(
                                    (other) =>
                                      other.sku === b.sku &&
                                      other.location === b.location &&
                                      other.quantity > 0 &&
                                      daysLeft(other.expiry) >= 0 &&
                                      other.expiry < b.expiry,
                                  )
                                ? "Use earlier in-date batch first"
                                : "Prioritise this batch under FEFO"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!expiryRows.length && (
                    <p className="empty">
                      No stocked batches in this expiry window.
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}
          {active === 5 && (
            <>
              <div className="info-box">
                <Truck size={20} />
                <div>
                  <b>Replenishment you can explain</b>
                  <p>
                    Target stock = daily demand × (lead time + safety days).
                    Suggested reorder = max(0, ceil(target − usable stock −
                    confirmed incoming)). Approved demo requests count as
                    outstanding confirmed incoming; matching a stock receipt
                    reduces this incoming balance. They are not actual purchase
                    orders.
                  </p>
                </div>
              </div>
              <div className="control-row">
                <label>
                  Assumed lead time (days)
                  <input
                    aria-label="Assumed lead time"
                    type="number"
                    min="1"
                    max="90"
                    value={lead}
                    onChange={(e) =>
                      setLead(
                        Math.max(
                          1,
                          Math.min(90, Math.trunc(Number(e.target.value))),
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Safety stock (days)
                  <input
                    aria-label="Safety stock days"
                    type="number"
                    min="0"
                    max="90"
                    value={safety}
                    onChange={(e) =>
                      setSafety(
                        Math.max(
                          0,
                          Math.min(90, Math.trunc(Number(e.target.value))),
                        ),
                      )
                    }
                  />
                </label>
                <span>Overrides location lead times for this scenario.</span>
              </div>
              <Card
                title="Suggested replenishment"
                subtitle={`${recommendations.filter((r) => r.quantity > 0).length} positions require additional stock · quantities in packs`}
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine / location</th>
                        <th>Daily demand</th>
                        <th>Target</th>
                        <th>Usable</th>
                        <th>Incoming</th>
                        <th>Reorder</th>
                        <th>Demo action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recommendations.map((r) => (
                        <tr key={r.key}>
                          <td>
                            <strong>{r.product.name}</strong>
                            <small>
                              {r.product.id} · {r.location.city}
                            </small>
                          </td>
                          <td>
                            {r.daily.toFixed(2)}
                            <small>
                              × ({lead} + {safety}) days
                            </small>
                          </td>
                          <td>{r.target.toFixed(1)}</td>
                          <td>{r.stock}</td>
                          <td>{r.incoming}</td>
                          <td>
                            <b className={r.quantity ? "blue-text" : ""}>
                              {r.quantity}
                            </b>
                          </td>
                          <td>
                            <button
                              className="button compact"
                              disabled={
                                !r.quantity ||
                                state.requests.some(
                                  (q) =>
                                    q.sku === r.product.id &&
                                    q.location === r.location.id &&
                                    q.status !== "Approved",
                                )
                              }
                              onClick={() => request(r)}
                            >
                              Create draft
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!recommendations.length && (
                    <p className="empty">No matching stock positions.</p>
                  )}
                </div>
              </Card>
              <Card
                title="Demo request queue"
                subtitle="Draft → Pending Approval → Approved · local simulation only"
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Location</th>
                        <th>Packs</th>
                        <th>Status</th>
                        <th>Next step</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRequests.map((r) => (
                        <tr key={r.id}>
                          <td>{products.find((p) => p.id === r.sku)!.name}</td>
                          <td>
                            {locations.find((l) => l.id === r.location)!.city}
                          </td>
                          <td>
                            {r.quantity}
                            <small>
                              {r.received ?? 0} received ·{" "}
                              {confirmedIncoming(r)} confirmed incoming
                            </small>
                          </td>
                          <td>
                            <Badge value={r.status} />
                          </td>
                          <td>
                            {r.status !== "Approved" ? (
                              <button
                                className="button compact"
                                onClick={() => {
                                  const status =
                                    r.status === "Draft"
                                      ? "Pending Approval"
                                      : "Approved";
                                  save({
                                    ...state,
                                    requests: state.requests.map((q) =>
                                      q.id === r.id ? { ...q, status } : q,
                                    ),
                                    audit: [
                                      {
                                        at: new Date().toISOString(),
                                        action: "Demo request " + status,
                                        detail: `${r.sku} · ${r.quantity} packs · no actual order placed`,
                                      },
                                      ...state.audit,
                                    ],
                                  });
                                }}
                              >
                                {r.status === "Draft"
                                  ? "Submit for review"
                                  : "Simulate approval"}
                              </button>
                            ) : (
                              <span className="green-text">
                                {confirmedIncoming(r) > 0
                                  ? "Confirmed incoming (demo)"
                                  : "Fully received (demo)"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!visibleRequests.length && (
                    <p className="empty">
                      No requests yet. Create a draft from a recommendation
                      above.
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}
          {active === 6 && (
            <>
              <div className="section-title">
                <label>
                  Report{" "}
                  <select
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                  >
                    {[
                      "Inventory health",
                      "Stock-out risk",
                      "Expiry risk",
                      "Replenishment recommendations",
                      "Distributor summary",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <div className="actions">
                  <Export
                    data={reportData}
                    name={report.toLowerCase().replaceAll(" ", "-")}
                  />
                  <button
                    className="button primary"
                    onClick={() => window.print()}
                  >
                    <Printer size={15} /> Print summary
                  </button>
                </div>
              </div>
              <div className="print-summary">
                <div className="eyebrow">PHARMASETU AI · NESFIC 2026</div>
                <h2>Management summary</h2>
                <p>
                  Synthetic demonstration · {today()} · {sku || "All medicines"}{" "}
                  ·{" "}
                  {locations.find((l) => l.id === loc)?.city || "All locations"}
                </p>
                <div className="summary-stats">
                  <div>
                    <strong>{fmt(stock)}</strong>
                    <span>usable packs</span>
                  </div>
                  <div>
                    <strong>{out.length}</strong>
                    <span>out-of-stock positions</span>
                  </div>
                  <div>
                    <strong>{exp.length}</strong>
                    <span>in-date batches due within 90 days</span>
                  </div>
                  <div>
                    <strong>{pending.length}</strong>
                    <span>open demo requests</span>
                  </div>
                </div>
                <p>
                  Priority: review critical shortages, use FEFO for in-date
                  inventory, and route replenishment recommendations to human
                  review. Expired stock is excluded from usable balances.
                </p>
              </div>
              <Card
                title={report}
                subtitle={`${reportData.length} records · exports respect product and location filters${report === "Expiry risk" ? " · expired + due within 90 days" : ""}`}
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {Object.keys(reportData[0] ?? {}).map((k) => (
                          <th key={k}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((r, i) => (
                        <tr key={i}>
                          {Object.values(r).map((v, j) => (
                            <td key={j}>{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!reportData.length && (
                    <p className="empty">
                      No records match this report and filters.
                    </p>
                  )}
                </div>
              </Card>
              <p className="muted">
                Replenishment report uses the assumptions set in Smart
                replenishment ({lead} lead days + {safety} safety days).
                Inventory availability describes stocked positions, not
                fulfilment or forecast accuracy.
              </p>
            </>
          )}
          <footer>
            <span>
              <Activity size={14} /> PharmaSetu AI
            </span>
            <span>Synthetic data only · Browser-local demo · NESFIC 2026</span>
          </footer>
        </div>
      </main>
      {reset && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Reset demonstration data?</h2>
            <p>
              This clears all local stock changes, requests and audit history,
              then generates the revised synthetic scenarios relative to today.
              Your existing transactions are retained until you confirm this
              reset.
            </p>
            <div className="actions">
              <button
                autoFocus
                className="button"
                onClick={() => setReset(false)}
              >
                Cancel
              </button>
              <button
                className="button danger"
                onClick={() => {
                  save(seed());
                  setReset(false);
                  setNotice(
                    "Demo data reset. All figures now reflect a fresh synthetic dataset.",
                  );
                }}
              >
                Reset demo
              </button>
            </div>
          </section>
        </div>
      )}
      {edit && (
        <div className="modal-backdrop">
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                save(
                  changeStock(
                    state,
                    edit,
                    Number(delta),
                    reason,
                    receiptRequest || undefined,
                  ),
                );
                setEdit(null);
                setNotice(
                  "Stock movement saved. Metrics and recommendations have been recalculated.",
                );
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            <h2 id="edit-title">Receive / adjust stock</h2>
            <p>
              Batch {edit} · current balance:{" "}
              {state.batches.find((b) => b.id === edit)?.quantity} packs
            </p>
            <label>
              Change in packs (positive receipt, negative adjustment)
              <input
                autoFocus
                required
                type="number"
                step="1"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </label>
            <label>
              Mandatory movement reason
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Demo receipt, physical count correction"
              />
            </label>
            <label>
              Match confirmed incoming (optional)
              <select
                aria-label="Match confirmed incoming"
                value={receiptRequest}
                onChange={(e) => setReceiptRequest(e.target.value)}
              >
                <option value="">Separate demo receipt / adjustment</option>
                {state.requests
                  .filter((r) => {
                    const b = state.batches.find((b) => b.id === edit)!;
                    return (
                      r.sku === b.sku &&
                      r.location === b.location &&
                      confirmedIncoming(r) > 0
                    );
                  })
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {confirmedIncoming(r)} outstanding packs ·{" "}
                      {r.id.slice(0, 8)}
                    </option>
                  ))}
              </select>
            </label>
            {error && (
              <p role="alert" className="red-text">
                {error}
              </p>
            )}
            <p className="muted">
              Receipts are recorded against this existing batch and retain its
              expiry date. Unmatched receipts represent separate demo stock;
              match an approved request below when receiving its incoming
              quantity. No actual stock is moved.
            </p>
            <div className="actions">
              <button
                type="button"
                className="button"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit">
                Save movement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
