import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
  Download,
  Calendar,
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

// ─── Preset date ranges ───────────────────────────────────────────────────────
const PRESETS = [
  { label: "This Month",    key: "thisMonth" },
  { label: "Last 3 Months", key: "last3" },
  { label: "Last 6 Months", key: "last6" },
  { label: "This Year",     key: "thisYear" },
  { label: "Last 12 Months",key: "last12" },
  { label: "Custom",        key: "custom" },
];

function getPresetDates(key) {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);
  switch (key) {
    case "thisMonth": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "last3": {
      const s = new Date(now); s.setMonth(s.getMonth() - 3);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "last6": {
      const s = new Date(now); s.setMonth(s.getMonth() - 6);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "thisYear": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "last12":
    default: {
      const s = new Date(now); s.setFullYear(s.getFullYear() - 1);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
  }
}

// ─── Status colours ───────────────────────────────────────────────────────────
const STATUS_COLORS = {
  paid:      "#22c55e",
  sent:      "#3b82f6",
  draft:     "#94a3b8",
  overdue:   "#ef4444",
  cancelled: "#f97316",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function Reports() {
  const { organization } = useAuth();
  const { t }            = useWorkspace();

  const [preset,      setPreset]      = useState("last12");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [pdfLoading,  setPdfLoading]  = useState(false);

  // Resolve active date range
  const activeDates = preset === "custom"
    ? { start: customStart, end: customEnd }
    : getPresetDates(preset);

  const loadData = useCallback(() => {
    if (!activeDates.start || !activeDates.end) return;
    setLoading(true);
    api
      .get("/reports/summary", {
        params: { startDate: activeDates.start, endDate: activeDates.end },
      })
      .then((res) => setData(res.data))
      .catch((err) => {
        console.error("Reports load error:", err);
        toast.error(err.response?.data?.error || "Failed to load report data");
      })
      .finally(() => setLoading(false));
  }, [activeDates.start, activeDates.end]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Formatting helpers ──────────────────────────────────────────────────────
  const fmt = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtFull = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(n || 0);

  // ── PDF export ──────────────────────────────────────────────────────────────
  const generatePDF = () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const {
        invoiceStats = {},
        monthlyRevenue = [],
        topCustomers = [],
        topProducts = [],
        topServices = [],
        paymentMetrics = {},
        revenueGrowth,
        currentRevenue = 0,
        invoiceList = [],
      } = data;

      const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W    = doc.internal.pageSize.getWidth();
      const orgName = organization?.name || "Your Business";
      const currency = organization?.currency || "USD";
      const periodLabel = `${activeDates.start}  →  ${activeDates.end}`;
      const generatedOn = new Date().toLocaleString();

      // ── Header banner ──────────────────────────────────────────────────────
      doc.setFillColor(79, 70, 229);                          // indigo-600
      doc.rect(0, 0, W, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Sales & Business Report", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(orgName, 14, 22);
      doc.text(`Period: ${periodLabel}`, 14, 28);
      doc.text(`Generated: ${generatedOn}`, 14, 34);

      let y = 46;

      // ── Business summary text ──────────────────────────────────────────────
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Executive Summary", 14, y);
      y += 6;

      const summaryText = buildSummaryText({ invoiceStats, revenueGrowth, currentRevenue, paymentMetrics, fmtFull });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const lines = doc.splitTextToSize(summaryText, W - 28);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 6;

      // ── KPI summary table ──────────────────────────────────────────────────
      sectionTitle(doc, "Key Performance Indicators", y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Metric", "Value"]],
        body: [
          ["Revenue Collected",   fmtFull(invoiceStats.totalCollected)],
          ["Total Billed",        fmtFull(invoiceStats.totalBilled)],
          ["Total Invoices",      String(invoiceStats.total)],
          ["Paid Invoices",       String(invoiceStats.paid)],
          ["Overdue Invoices",    String(invoiceStats.overdue)],
          ["Collection Rate",     `${invoiceStats.collectionRate}%`],
          ["Avg Invoice Value",   fmtFull(invoiceStats.avgInvoiceValue)],
          ["Avg Days to Pay",     `${paymentMetrics.avgDaysToPay} days`],
          ["On-Time Payment Rate",`${paymentMetrics.onTimeRate}%`],
          ["YoY Revenue Growth",  revenueGrowth !== null ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%` : "N/A"],
          ["Total Overdue Amount",fmtFull(invoiceStats.totalOverdue)],
        ],
        styles:     { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── Invoice status breakdown ───────────────────────────────────────────
      sectionTitle(doc, "Invoice Status Breakdown", y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Status", "Count", "% of Total"]],
        body: [
          ["Paid",      invoiceStats.paid,      pct(invoiceStats.paid,      invoiceStats.total)],
          ["Sent",      invoiceStats.sent,      pct(invoiceStats.sent,      invoiceStats.total)],
          ["Draft",     invoiceStats.draft,     pct(invoiceStats.draft,     invoiceStats.total)],
          ["Overdue",   invoiceStats.overdue,   pct(invoiceStats.overdue,   invoiceStats.total)],
          ["Cancelled", invoiceStats.cancelled, pct(invoiceStats.cancelled, invoiceStats.total)],
        ],
        styles:     { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── Monthly revenue ────────────────────────────────────────────────────
      if (monthlyRevenue.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        sectionTitle(doc, "Monthly Revenue", y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [["Month", "Revenue", "Invoices"]],
          body: monthlyRevenue.map(r => [r.month, fmtFull(r.revenue), String(r.invoiceCount)]),
          styles:     { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 255] },
          margin: { left: 14, right: 14 },
          foot: [[
            "Total",
            fmtFull(monthlyRevenue.reduce((s, r) => s + r.revenue, 0)),
            String(monthlyRevenue.reduce((s, r) => s + r.invoiceCount, 0)),
          ]],
          footStyles: { fillColor: [230, 230, 250], fontStyle: "bold", textColor: [30, 30, 30] },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Top customers ──────────────────────────────────────────────────────
      if (topCustomers.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        sectionTitle(doc, "Top Customers by Revenue", y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [["#", "Customer", "Invoices", "Revenue Paid", "Total Billed"]],
          body: topCustomers.map((c, i) => [
            i + 1, c.name, c.invoiceCount, fmtFull(c.totalPaid), fmtFull(c.totalBilled),
          ]),
          styles:     { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 255] },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Top products ───────────────────────────────────────────────────────
      const topSellers = [
        ...topProducts.map(p => ({ ...p, type: "Product" })),
        ...topServices.map(s => ({ ...s, type: "Service" })),
      ].sort((a, b) => b.revenue - a.revenue);

      if (topSellers.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        sectionTitle(doc, "Top Products & Services", y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [["#", "Name", "Type", "Units Sold", "Revenue"]],
          body: topSellers.map((s, i) => [
            i + 1, s.name, s.type, s.unitsSold, fmtFull(s.revenue),
          ]),
          styles:     { fontSize: 9, cellPadding: 3 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 255] },
          margin: { left: 14, right: 14 },
        });
        y = doc.lastAutoTable.finalY + 10;
      }

      // ── Invoice list ───────────────────────────────────────────────────────
      if (invoiceList.length > 0) {
        doc.addPage();
        y = 20;
        sectionTitle(doc, `Invoice List (${invoiceList.length} invoices)`, y);
        y += 6;
        autoTable(doc, {
          startY: y,
          head: [["Invoice #", "Date", "Customer", "Amount", "Status"]],
          body: invoiceList.map(inv => [
            inv.invoiceNumber,
            new Date(inv.date).toLocaleDateString(),
            inv.customer,
            fmtFull(inv.total),
            inv.status.toUpperCase(),
          ]),
          styles:     { fontSize: 8.5, cellPadding: 2.5 },
          headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [245, 245, 255] },
          margin: { left: 14, right: 14 },
          didParseCell(hookData) {
            if (hookData.section === "body" && hookData.column.index === 4) {
              const status = hookData.cell.raw?.toLowerCase();
              if (status === "paid")    hookData.cell.styles.textColor = [22, 163, 74];
              if (status === "overdue") hookData.cell.styles.textColor = [220, 38, 38];
              if (status === "sent")    hookData.cell.styles.textColor = [37, 99, 235];
            }
          },
        });
      }

      // ── Footer on every page ───────────────────────────────────────────────
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont("helvetica", "normal");
        doc.text(
          `${orgName}  |  Sales Report  |  Page ${i} of ${pageCount}`,
          W / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      const fileName = `sales-report_${activeDates.start}_${activeDates.end}.pdf`;
      doc.save(fileName);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Derived display data ────────────────────────────────────────────────────
  const {
    invoiceStats    = {},
    monthlyRevenue  = [],
    topCustomers    = [],
    topProducts     = [],
    topServices     = [],
    paymentMetrics  = {},
    revenueGrowth   = null,
    currentRevenue  = 0,
  } = data || {};

  const pieData = [
    { name: "Paid",      value: invoiceStats.paid      || 0, color: STATUS_COLORS.paid },
    { name: "Sent",      value: invoiceStats.sent      || 0, color: STATUS_COLORS.sent },
    { name: "Draft",     value: invoiceStats.draft     || 0, color: STATUS_COLORS.draft },
    { name: "Overdue",   value: invoiceStats.overdue   || 0, color: STATUS_COLORS.overdue },
    { name: "Cancelled", value: invoiceStats.cancelled || 0, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0);

  const topSellers = [
    ...topProducts.map((p) => ({ ...p, type: "Product" })),
    ...topServices.map((s) => ({ ...s, type: "Service" })),
  ]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const healthScore = computeHealthScore({ invoiceStats, paymentMetrics, revenueGrowth, monthlyRevenue });
  const insights    = buildInsights({ invoiceStats, paymentMetrics, revenueGrowth, topCustomers, topProducts, topServices, fmtFull });

  return (
    <>
      <Header title="Business Reports" />
      <div className="page-content">

        {/* ── Date range toolbar ─────────────────────────────────────────── */}
        <div
          className="card"
          style={{ marginBottom: 20, padding: "14px 20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <Calendar size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginRight: 4 }}>
              Period:
            </span>

            {/* Preset buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  style={{
                    padding: "5px 13px",
                    borderRadius: 20,
                    border: "1.5px solid",
                    borderColor: preset === p.key ? "var(--primary)" : "var(--border)",
                    background:  preset === p.key ? "var(--primary)" : "transparent",
                    color:       preset === p.key ? "#fff" : "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {preset === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 150, fontSize: 13 }}
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
                <span style={{ color: "var(--text-muted)" }}>—</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: 150, fontSize: 13 }}
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
                {customStart && customEnd && (
                  <button className="btn btn-primary btn-sm" onClick={loadData}>
                    Apply
                  </button>
                )}
              </div>
            )}

            {/* PDF button — right-aligned */}
            <div style={{ marginLeft: "auto" }}>
              <button
                className="btn btn-primary"
                onClick={generatePDF}
                disabled={pdfLoading || loading || !data}
                style={{ display: "flex", alignItems: "center", gap: 7 }}
              >
                <Download size={15} />
                {pdfLoading ? "Generating…" : "Download PDF"}
              </button>
            </div>
          </div>

          {/* Active period label */}
          {activeDates.start && activeDates.end && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Showing data from <strong>{activeDates.start}</strong> to <strong>{activeDates.end}</strong>
            </div>
          )}
        </div>

        {/* ── Loading state ───────────────────────────────────────────────── */}
        {loading && (
          <div className="loading-spinner" style={{ minHeight: 300 }}>
            <div className="spinner" />
          </div>
        )}

        {!loading && data && (
          <>
            {/* ── Business summary banner ──────────────────────────────── */}
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
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.8, fontWeight: 600, letterSpacing: 1 }}>
                    BUSINESS SUMMARY
                  </p>
                  <h2 style={{ margin: "6px 0 12px", fontSize: 24, fontWeight: 800 }}>
                    {organization?.name || "Your Business"}
                  </h2>
                  <p style={{ margin: 0, fontSize: 13.5, opacity: 0.9, lineHeight: 1.65, maxWidth: 560 }}>
                    {buildSummaryText({ invoiceStats, revenueGrowth, currentRevenue, paymentMetrics, fmtFull })}
                  </p>
                </div>

                {/* Health score pill */}
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

              {insights.length > 0 && (
                <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
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

            {/* ── KPI cards ───────────────────────────────────────────── */}
            <div className="stats-grid">
              <StatCard icon={<DollarSign size={22} />} color="success" value={fmt(invoiceStats.totalCollected)} label="Revenue Collected" />
              <StatCard icon={<FileText    size={22} />} color="primary" value={invoiceStats.total || 0}          label="Total Invoices" />
              <StatCard icon={<Award       size={22} />} color="info"    value={`${invoiceStats.collectionRate || 0}%`} label="Collection Rate" />
              <StatCard icon={<Clock       size={22} />} color="warning" value={`${paymentMetrics.avgDaysToPay || 0}d`} label="Avg Days to Pay" />
              <StatCard
                icon={revenueGrowth >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
                color={revenueGrowth === null ? "info" : revenueGrowth >= 0 ? "success" : "danger"}
                value={revenueGrowth !== null ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%` : "N/A"}
                label="Period-over-Period Growth"
              />
              <StatCard icon={<AlertCircle size={22} />} color="danger" value={fmt(invoiceStats.totalOverdue)} label="Overdue Amount" />
            </div>

            {/* ── Charts row ──────────────────────────────────────────── */}
            <div className="grid-2" style={{ marginTop: 20 }}>
              {/* Revenue bar chart */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">
                    <BarChart2 size={16} style={{ marginRight: 8 }} />
                    Revenue by Month
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
                  <div className="empty-state"><p>No revenue data for this period</p></div>
                )}
              </div>

              {/* Invoice status donut */}
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
                        formatter={(v, name) => [`${v} invoices`, name]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state"><p>No invoices for this period</p></div>
                )}
              </div>
            </div>

            {/* ── Top customers + top sellers ──────────────────────────── */}
            <div className="grid-2" style={{ marginTop: 20 }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><Users size={16} style={{ marginRight: 8 }} />Top Customers</h3>
                </div>
                {topCustomers.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Customer</th><th>Invoices</th><th>Revenue</th></tr>
                      </thead>
                      <tbody>
                        {topCustomers.map((c, i) => (
                          <tr key={i}>
                            <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td>{c.invoiceCount}</td>
                            <td style={{ fontWeight: 700, color: "var(--success)" }}>{fmtFull(c.totalPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state"><p>No customer data for this period</p></div>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="card-title"><Award size={16} style={{ marginRight: 8 }} />Top Products & Services</h3>
                </div>
                {topSellers.length > 0 ? (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>#</th><th>Name</th><th>Type</th><th>Revenue</th></tr>
                      </thead>
                      <tbody>
                        {topSellers.map((item, i) => (
                          <tr key={i}>
                            <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{i + 1}</td>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td>
                              <span className={`badge badge-${item.type === "Product" ? "info" : "secondary"}`} style={{ fontSize: 11 }}>
                                {item.type}
                              </span>
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--success)" }}>{fmtFull(item.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state"><p>No sales data for this period</p></div>
                )}
              </div>
            </div>

            {/* ── Payment performance ─────────────────────────────────── */}
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Payment Performance</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, padding: "8px 0" }}>
                <MetricBlock label="Invoices Paid"          value={`${invoiceStats.paid || 0} / ${invoiceStats.total || 0}`} sub="total invoices"       icon={<CheckCircle size={20}/>} color="var(--success)" />
                <MetricBlock label="Collection Rate"        value={`${invoiceStats.collectionRate || 0}%`}                   sub="of invoices collected" icon={<DollarSign size={20}/>}  color={invoiceStats.collectionRate >= 70 ? "var(--success)" : "var(--warning)"} />
                <MetricBlock label="On-Time Payment"        value={`${paymentMetrics.onTimeRate || 0}%`}                     sub="paid before due date"  icon={<Clock size={20}/>}       color={paymentMetrics.onTimeRate >= 70 ? "var(--success)" : "var(--warning)"} />
                <MetricBlock label="Avg Invoice Value"      value={fmtFull(invoiceStats.avgInvoiceValue)}                    sub="per paid invoice"       icon={<Award size={20}/>}       color="var(--primary)" />
                <MetricBlock label="Overdue Invoices"       value={invoiceStats.overdue || 0}                                sub={`${fmtFull(invoiceStats.totalOverdue)} at risk`} icon={<AlertCircle size={20}/>} color={invoiceStats.overdue > 0 ? "var(--danger)" : "var(--success)"} />
                <MetricBlock
                  label="Period Growth"
                  value={revenueGrowth !== null ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth.toFixed(1)}%` : "N/A"}
                  sub="vs equivalent prior period"
                  icon={revenueGrowth >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                  color={revenueGrowth === null ? "var(--text-muted)" : revenueGrowth >= 0 ? "var(--success)" : "var(--danger)"}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── Small reusable components ────────────────────────────────────────────────
function StatCard({ icon, color, value, label }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, sub, icon, color }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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

// ─── PDF helpers ──────────────────────────────────────────────────────────────
function sectionTitle(doc, text, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(text, 14, y);
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.4);
  doc.line(14, y + 1.5, doc.internal.pageSize.getWidth() - 14, y + 1.5);
  doc.setTextColor(30, 30, 30);
}

function pct(part, total) {
  if (!total) return "0%";
  return `${Math.round(((part || 0) / total) * 100)}%`;
}

// ─── Text generation helpers ──────────────────────────────────────────────────
function buildSummaryText({ invoiceStats, revenueGrowth, currentRevenue, paymentMetrics, fmtFull }) {
  const parts = [];
  if (invoiceStats.total > 0) {
    parts.push(`Your business processed ${invoiceStats.total} invoice${invoiceStats.total !== 1 ? "s" : ""} with a ${invoiceStats.collectionRate}% collection rate.`);
  }
  if (currentRevenue > 0) {
    parts.push(`Total revenue collected in this period is ${fmtFull(currentRevenue)}.`);
  }
  if (revenueGrowth !== null) {
    parts.push(
      revenueGrowth >= 0
        ? `Revenue grew ${revenueGrowth.toFixed(1)}% compared to the equivalent prior period — great momentum!`
        : `Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% compared to the prior period — there's room to improve.`
    );
  }
  if (invoiceStats.overdue > 0) {
    parts.push(`You have ${invoiceStats.overdue} overdue invoice${invoiceStats.overdue !== 1 ? "s" : ""} (${fmtFull(invoiceStats.totalOverdue)}) that need follow-up.`);
  } else if (invoiceStats.total > 0) {
    parts.push("No overdue invoices — your payment collection is on track.");
  }
  return parts.length
    ? parts.join(" ")
    : "Start creating invoices and recording sales to see your business summary here.";
}

function buildInsights({ invoiceStats, paymentMetrics, revenueGrowth, topCustomers, topProducts, topServices, fmtFull }) {
  const insights = [];
  if (revenueGrowth !== null && revenueGrowth > 0)  insights.push({ icon: "📈", text: `+${revenueGrowth.toFixed(1)}% growth` });
  if (revenueGrowth !== null && revenueGrowth < 0)  insights.push({ icon: "📉", text: `${revenueGrowth.toFixed(1)}% decline` });
  if (invoiceStats.collectionRate >= 80)            insights.push({ icon: "✅", text: `${invoiceStats.collectionRate}% collection rate` });
  else if (invoiceStats.collectionRate > 0)         insights.push({ icon: "⚠️", text: `${invoiceStats.collectionRate}% collection rate` });
  if (invoiceStats.overdue > 0)                     insights.push({ icon: "🔔", text: `${invoiceStats.overdue} overdue` });
  if (topCustomers.length > 0)                      insights.push({ icon: "👤", text: `Top customer: ${topCustomers[0].name}` });
  const best = [...(topProducts || []), ...(topServices || [])].sort((a, b) => b.revenue - a.revenue)[0];
  if (best)                                         insights.push({ icon: "🏆", text: `Best seller: ${best.name}` });
  if (paymentMetrics.avgDaysToPay > 0)              insights.push({ icon: "⏱️", text: `Avg ${paymentMetrics.avgDaysToPay}d to pay` });
  return insights;
}

function computeHealthScore({ invoiceStats, paymentMetrics, revenueGrowth, monthlyRevenue }) {
  let score = 0;
  const cr = invoiceStats.collectionRate || 0;
  score += Math.min(30, (cr / 100) * 30);
  const otr = paymentMetrics.onTimeRate || 0;
  score += Math.min(20, (otr / 100) * 20);
  if (revenueGrowth !== null) {
    if (revenueGrowth > 0) score += Math.min(20, 10 + revenueGrowth * 0.5);
    else                   score += Math.max(0,  10 + revenueGrowth * 0.3);
  } else {
    score += 10;
  }
  const overdueRatio = invoiceStats.total > 0 ? (invoiceStats.overdue || 0) / invoiceStats.total : 0;
  score += Math.max(0, 15 - overdueRatio * 50);
  if      (monthlyRevenue.length >= 6) score += 15;
  else if (monthlyRevenue.length >= 3) score += 8;
  else if (monthlyRevenue.length >  0) score += 4;
  return Math.min(100, Math.round(score));
}
