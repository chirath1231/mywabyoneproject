import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const STATUS_COLORS = {
  paid: "#22c55e",
  sent: "#3b82f6",
  draft: "#94a3b8",
  overdue: "#ef4444",
  cancelled: "#f97316",
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { organization } = useAuth();
  const { t } = useWorkspace();

  useEffect(() => {
    api
      .get("/reports/summary")
      .then((res) => setData(res.data))
      .catch((err) => console.error("Reports load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);

  const fmtFull = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount);

  if (loading) {
    return (
      <>
        <Header title="Business Reports" />
        <div className="page-content">
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        </div>
      </>
    );
  }

  const {
    invoiceStats = {},
    monthlyRevenue = [],
    topCustomers = [],
    topProducts = [],
    topServices = [],
    paymentMetrics = {},
    revenueGrowth,
    currentRevenue = 0,
  } = data || {};

  // Build insight bullets
  const insights = buildInsights({
    invoiceStats,
    paymentMetrics,
    revenueGrowth,
    currentRevenue,
    topCustomers,
    topProducts,
    topServices,
    fmt,
  });

  // Pie data for invoice status
  const pieData = [
    { name: "Paid", value: invoiceStats.paid || 0, color: STATUS_COLORS.paid },
    { name: "Sent", value: invoiceStats.sent || 0, color: STATUS_COLORS.sent },
    { name: "Draft", value: invoiceStats.draft || 0, color: STATUS_COLORS.draft },
    { name: "Overdue", value: invoiceStats.overdue || 0, color: STATUS_COLORS.overdue },
    { name: "Cancelled", value: invoiceStats.cancelled || 0, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  // Combined top sellers (products + services)
  const topSellers = [
    ...topProducts.map((p) => ({ ...p, type: "Product" })),
    ...topServices.map((s) => ({ ...s, type: "Service" })),
  ]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const healthScore = computeHealthScore({ invoiceStats, paymentMetrics, revenueGrowth, monthlyRevenue });

  return (
    <>
      <Header title="Business Reports" />
      <div className="page-content">

        {/* Business Summary Card */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            borderRadius: 14,
            padding: "24px 28px",
            marginBottom: 24,
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.8, fontWeight: 500, letterSpacing: 1 }}>
                BUSINESS SUMMARY
              </p>
              <h2 style={{ margin: "6px 0 12px", fontSize: 26, fontWeight: 800 }}>
                {organization?.name || "Your Business"}
              </h2>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9, lineHeight: 1.6, maxWidth: 560 }}>
                {generateSummaryText({ invoiceStats, revenueGrowth, currentRevenue, paymentMetrics, fmt })}
              </p>
            </div>

            {/* Health Score */}
            <div
              style={{
                background: "rgba(255,255,255,0.15)",
                borderRadius: 12,
                padding: "16px 24px",
                textAlign: "center",
                minWidth: 120,
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, marginBottom: 6 }}>HEALTH SCORE</div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  lineHeight: 1,
                  color: healthScore >= 75 ? "#86efac" : healthScore >= 50 ? "#fde68a" : "#fca5a5",
                }}
              >
                {healthScore}
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                {healthScore >= 75 ? "Excellent" : healthScore >= 50 ? "Good" : "Needs Attention"}
              </div>
            </div>
          </div>

          {/* Insight bullets */}
          {insights.length > 0 && (
            <div
              style={{
                marginTop: 20,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {insights.map((ins, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    borderRadius: 20,
                    padding: "5px 14px",
                    fontSize: 12,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KPI Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon success">
              <DollarSign size={22} />
            </div>
            <div className="stat-info">
              <h3>{fmt(invoiceStats.totalCollected || 0)}</h3>
              <p>Revenue Collected</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon primary">
              <FileText size={22} />
            </div>
            <div className="stat-info">
              <h3>{invoiceStats.total || 0}</h3>
              <p>Total Invoices</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <Award size={22} />
            </div>
            <div className="stat-info">
              <h3>{invoiceStats.collectionRate || 0}%</h3>
              <p>Collection Rate</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <Clock size={22} />
            </div>
            <div className="stat-info">
              <h3>{paymentMetrics.avgDaysToPay || 0} days</h3>
              <p>Avg Days to Pay</p>
            </div>
          </div>
          <div className="stat-card">
            <div className={`stat-icon ${revenueGrowth >= 0 ? "success" : "danger"}`}>
              {revenueGrowth >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <div className="stat-info">
              <h3>
                {revenueGrowth !== null
                  ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`
                  : "N/A"}
              </h3>
              <p>YoY Growth</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <AlertCircle size={22} />
            </div>
            <div className="stat-info">
              <h3>{fmt(invoiceStats.totalOverdue || 0)}</h3>
              <p>Overdue Amount</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart + Invoice Status */}
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <BarChart2 size={16} style={{ marginRight: 8 }} />
                Monthly Revenue (Last 12 Months)
              </h3>
            </div>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => fmt(v)} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v) => [fmtFull(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No revenue data yet</p></div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Invoice Status Breakdown</h3>
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8 }}
                    formatter={(v, name) => [v + " invoices", name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><p>No invoices yet</p></div>
            )}
          </div>
        </div>

        {/* Top Customers + Top Sellers */}
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Users size={16} style={{ marginRight: 8 }} />
                Top Customers by Revenue
              </h3>
            </div>
            {topCustomers.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Invoices</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.map((c, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.invoiceCount}</td>
                        <td style={{ fontWeight: 700, color: "var(--success)" }}>
                          {fmtFull(c.totalPaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No customer data yet</p></div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Award size={16} style={{ marginRight: 8 }} />
                Top Products & Services
              </h3>
            </div>
            {topSellers.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellers.map((item, i) => (
                      <tr key={i}>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>
                          <span
                            className={`badge badge-${item.type === "Product" ? "info" : "secondary"}`}
                            style={{ fontSize: 11 }}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--success)" }}>
                          {fmtFull(item.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><p>No sales data yet</p></div>
            )}
          </div>
        </div>

        {/* Payment Performance */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Payment Performance</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, padding: "8px 0" }}>
            <MetricBlock
              label="Invoices Paid"
              value={`${invoiceStats.paid || 0} / ${invoiceStats.total || 0}`}
              sub="total invoices"
              icon={<CheckCircle size={20} />}
              color="var(--success)"
            />
            <MetricBlock
              label="Collection Rate"
              value={`${invoiceStats.collectionRate || 0}%`}
              sub="of invoices collected"
              icon={<DollarSign size={20} />}
              color={invoiceStats.collectionRate >= 70 ? "var(--success)" : "var(--warning)"}
            />
            <MetricBlock
              label="On-Time Payment Rate"
              value={`${paymentMetrics.onTimeRate || 0}%`}
              sub="paid before due date"
              icon={<Clock size={20} />}
              color={paymentMetrics.onTimeRate >= 70 ? "var(--success)" : "var(--warning)"}
            />
            <MetricBlock
              label="Avg Invoice Value"
              value={fmtFull(invoiceStats.avgInvoiceValue || 0)}
              sub="per paid invoice"
              icon={<Award size={20} />}
              color="var(--primary)"
            />
            <MetricBlock
              label="Overdue Invoices"
              value={invoiceStats.overdue || 0}
              sub={`${fmtFull(invoiceStats.totalOverdue || 0)} at risk`}
              icon={<AlertCircle size={20} />}
              color={invoiceStats.overdue > 0 ? "var(--danger)" : "var(--success)"}
            />
            <MetricBlock
              label="YoY Revenue Growth"
              value={
                revenueGrowth !== null
                  ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%`
                  : "N/A"
              }
              sub="vs previous 12 months"
              icon={revenueGrowth >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              color={revenueGrowth === null ? "var(--text-muted)" : revenueGrowth >= 0 ? "var(--success)" : "var(--danger)"}
            />
          </div>
        </div>

      </div>
    </>
  );
}

function MetricBlock({ label, value, sub, icon, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}20`,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
      </div>
    </div>
  );
}

function generateSummaryText({ invoiceStats, revenueGrowth, currentRevenue, paymentMetrics, fmt }) {
  const parts = [];

  if (invoiceStats.total > 0) {
    parts.push(
      `Your business has processed ${invoiceStats.total} invoice${invoiceStats.total !== 1 ? "s" : ""} with a ${invoiceStats.collectionRate}% collection rate.`
    );
  }

  if (currentRevenue > 0) {
    parts.push(`Total revenue collected in the last 12 months is ${fmt(currentRevenue)}.`);
  }

  if (revenueGrowth !== null) {
    parts.push(
      revenueGrowth >= 0
        ? `Revenue has grown ${revenueGrowth.toFixed(1)}% compared to the previous year — great momentum!`
        : `Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% compared to the previous year — there's room to improve.`
    );
  }

  if (invoiceStats.overdue > 0) {
    parts.push(`You have ${invoiceStats.overdue} overdue invoice${invoiceStats.overdue !== 1 ? "s" : ""} that need follow-up.`);
  } else if (invoiceStats.total > 0) {
    parts.push("No overdue invoices — your payment collection is on track.");
  }

  if (!parts.length) {
    return "Start creating invoices and recording sales to see your business summary here.";
  }

  return parts.join(" ");
}

function buildInsights({ invoiceStats, paymentMetrics, revenueGrowth, currentRevenue, topCustomers, topProducts, topServices, fmt }) {
  const insights = [];

  if (revenueGrowth !== null && revenueGrowth > 0) {
    insights.push({ icon: "📈", text: `+${revenueGrowth.toFixed(1)}% revenue growth` });
  } else if (revenueGrowth !== null && revenueGrowth < 0) {
    insights.push({ icon: "📉", text: `${revenueGrowth.toFixed(1)}% revenue decline` });
  }

  if (invoiceStats.collectionRate >= 80) {
    insights.push({ icon: "✅", text: `${invoiceStats.collectionRate}% collection rate` });
  } else if (invoiceStats.collectionRate > 0) {
    insights.push({ icon: "⚠️", text: `${invoiceStats.collectionRate}% collection rate` });
  }

  if (invoiceStats.overdue > 0) {
    insights.push({ icon: "🔔", text: `${invoiceStats.overdue} overdue invoice${invoiceStats.overdue !== 1 ? "s" : ""}` });
  }

  if (topCustomers.length > 0) {
    insights.push({ icon: "👤", text: `Top customer: ${topCustomers[0].name}` });
  }

  const topSeller = [...(topProducts || []), ...(topServices || [])].sort((a, b) => b.revenue - a.revenue)[0];
  if (topSeller) {
    insights.push({ icon: "🏆", text: `Best seller: ${topSeller.name}` });
  }

  if (paymentMetrics.avgDaysToPay > 0) {
    insights.push({ icon: "⏱️", text: `Avg ${paymentMetrics.avgDaysToPay}d to pay` });
  }

  return insights;
}

function computeHealthScore({ invoiceStats, paymentMetrics, revenueGrowth, monthlyRevenue }) {
  let score = 0;

  // Collection rate (0–30 pts)
  const cr = invoiceStats.collectionRate || 0;
  score += Math.min(30, (cr / 100) * 30);

  // On-time payment rate (0–20 pts)
  const otr = paymentMetrics.onTimeRate || 0;
  score += Math.min(20, (otr / 100) * 20);

  // Revenue growth (0–20 pts)
  if (revenueGrowth !== null) {
    if (revenueGrowth > 0) score += Math.min(20, 10 + revenueGrowth * 0.5);
    else score += Math.max(0, 10 + revenueGrowth * 0.3);
  } else {
    score += 10; // neutral if no comparison data
  }

  // No overdue invoices bonus (0–15 pts)
  const overdueRatio = invoiceStats.total > 0 ? (invoiceStats.overdue || 0) / invoiceStats.total : 0;
  score += Math.max(0, 15 - overdueRatio * 50);

  // Has revenue data (0–15 pts)
  if (monthlyRevenue.length >= 6) score += 15;
  else if (monthlyRevenue.length >= 3) score += 8;
  else if (monthlyRevenue.length > 0) score += 4;

  return Math.min(100, Math.round(score));
}
