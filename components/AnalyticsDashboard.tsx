"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type DailyCount = { date: string; count: number };

type ItemViewEntry = { page: string; views: number; uniqueUsers: number };

type AnalyticsData = {
  days: number;
  activeVisitors: number;
  summary: {
    totalUniqueVisitors: number;
    totalSignups: number;
    totalOrders: number;
    totalRevenue: number;
  };
  uniqueVisitors: DailyCount[];
  signups: DailyCount[];
  orders: DailyCount[];
  orderStatusBreakdown: Record<string, number>;
  topPages: Array<{ page: string; count: number }>;
  topProductViews: ItemViewEntry[];
  topServiceViews: ItemViewEntry[];
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#22c55e",
  delivered: "#3b82f6",
  payment_pending_admin_review: "#f59e0b",
  cancelled: "#ef4444",
  processing: "#8b5cf6",
  shipped: "#06b6d4",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatStatus(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SummaryCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold" style={{ color }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${d}`, { cache: "no-store" });
      if (res.ok) {
        setData((await res.json()) as AnalyticsData);
      }
    } catch (e) {
      console.error("[AnalyticsDashboard] fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData(days);
    // Auto-refresh every 30 seconds so active-visitors count stays current
    const interval = setInterval(() => void fetchData(days), 30_000);
    return () => clearInterval(interval);
  }, [days, fetchData]);

  const chartData =
    data?.uniqueVisitors.map((uv, i) => ({
      date: formatDate(uv.date),
      Visitors: uv.count,
      Signups: data.signups[i]?.count ?? 0,
      Orders: data.orders[i]?.count ?? 0,
    })) ?? [];

  const pieData = Object.entries(data?.orderStatusBreakdown ?? {}).map(
    ([name, value]) => ({ name: formatStatus(name), value })
  );

  const topPagesData = (data?.topPages ?? []).map((p) => ({
    page: p.page.length > 20 ? p.page.slice(0, 20) + "…" : p.page,
    fullPage: p.page,
    visits: p.count,
  }));

  if (loading && !data) {
    return (
      <section className="panel p-6">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand)] border-t-transparent" />
          <span className="text-sm text-gray-500">Loading analytics…</span>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="panel p-6">
        <p className="text-sm text-red-600">
          Failed to load analytics. Make sure the <code>analytics_events</code> table exists in Supabase.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <section className="panel p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-lg font-extrabold text-[var(--brand-deep)]">📊 Analytics Dashboard</h2>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  days === d
                    ? "bg-[var(--brand)] text-white"
                    : "border border-[var(--brand)] text-[var(--brand-deep)] hover:bg-[var(--brand)]/10"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Live active visitors banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 px-5 py-3.5 shadow-sm">
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black text-emerald-700">{data.activeVisitors ?? 0}</span>
          <span className="text-sm font-semibold text-emerald-600">
            visitor{(data.activeVisitors ?? 0) !== 1 ? "s" : ""} active now
          </span>
        </div>
        <span className="ml-auto text-xs text-emerald-500/70">last 15 min · auto-refreshes</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Visitors" value={data.summary.totalUniqueVisitors.toLocaleString()} icon="👤" color="#3b82f6" />
        <SummaryCard label="Signups" value={data.summary.totalSignups.toLocaleString()} icon="✍️" color="#22c55e" />
        <SummaryCard label="Orders" value={data.summary.totalOrders.toLocaleString()} icon="📦" color="#f59e0b" />
        <SummaryCard
          label="Revenue"
          value={`GHS ${data.summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon="💰"
          color="#ef4444"
        />
      </div>

      {/* Daily visitors chart */}
      <section className="panel p-5">
        <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">Daily Visitors</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Visitors" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVisitors)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Signups & orders chart */}
      <section className="panel p-5">
        <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">Daily Signups & Orders</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Signups" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Orders" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Bottom row: order status pie + top pages */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Order status breakdown */}
        {pieData.length > 0 && (
          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">Order Status Breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[Object.keys(data.orderStatusBreakdown)[idx]] ?? PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Top pages */}
        {topPagesData.length > 0 && (
          <section className="panel p-5">
            <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">Top Pages</h3>
            <div className="space-y-2">
              {topPagesData.map((p, i) => (
                <div key={p.fullPage} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 text-xs font-bold text-[var(--brand-deep)]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate font-medium" title={p.fullPage}>
                        {p.fullPage}
                      </span>
                      <span className="ml-2 shrink-0 font-bold text-[var(--brand)]">{p.visits}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-[var(--brand)]"
                        style={{
                          width: `${Math.max(5, (p.visits / (topPagesData[0]?.visits || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Top Products & Services by Views */}
      {(data.topProductViews.length > 0 || data.topServiceViews.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">
          {data.topProductViews.length > 0 && (
            <section className="panel p-5">
              <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">🛍️ Top Products by Views</h3>
              <div className="space-y-2">
                {data.topProductViews.map((item, i) => {
                  const name = item.page.replace("/products/", "");
                  return (
                    <div key={item.page} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium" title={name}>{name}</span>
                          <span className="ml-2 shrink-0 font-bold text-[var(--brand)]">{item.views} views</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                          <div className="mt-1 h-1.5 flex-1 rounded-full bg-gray-100 mr-2">
                            <div
                              className="h-full rounded-full bg-blue-400"
                              style={{ width: `${Math.max(5, (item.views / (data.topProductViews[0]?.views || 1)) * 100)}%` }}
                            />
                          </div>
                          <span>{item.uniqueUsers} unique</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {data.topServiceViews.length > 0 && (
            <section className="panel p-5">
              <h3 className="mb-4 text-sm font-bold text-[var(--brand-deep)]">🔧 Top Services by Views</h3>
              <div className="space-y-2">
                {data.topServiceViews.map((item, i) => {
                  const name = item.page.replace("/services/", "");
                  return (
                    <div key={item.page} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-bold text-purple-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="truncate font-medium" title={name}>{name}</span>
                          <span className="ml-2 shrink-0 font-bold text-[var(--brand)]">{item.views} views</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-0.5">
                          <div className="mt-1 h-1.5 flex-1 rounded-full bg-gray-100 mr-2">
                            <div
                              className="h-full rounded-full bg-purple-400"
                              style={{ width: `${Math.max(5, (item.views / (data.topServiceViews[0]?.views || 1)) * 100)}%` }}
                            />
                          </div>
                          <span>{item.uniqueUsers} unique</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center text-xs text-gray-400">Refreshing…</div>
      )}
    </div>
  );
}
