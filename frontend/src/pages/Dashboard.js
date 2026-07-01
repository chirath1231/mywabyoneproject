import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import {
  Package,
  Briefcase,
  Users,
  FileText,
  ExternalLink,
  Copy,
  Check,
  DollarSign,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [copied,    setCopied]    = useState(false);
  const { organization } = useAuth();
  const { t, current } = useWorkspace();

  const storeUrl = organization?.slug
    ? `${window.location.origin}/store/${organization.slug}`
    : null;

  const copyStoreLink = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/dashboard");
      setData(res.data);
    } catch (err) {
      console.error("Dashboard load error:", err);
      toast.error(err.response?.data?.error || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <>
        <Header title={t("dashboard", "Dashboard")} />
        <div className="page-content">
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        </div>
      </>
    );
  }

  const stats = data?.stats || {};
  const invoiceStats = stats.invoices || {};

  return (
    <>
      <Header
        title={`${current?.icon || ""} ${t("dashboard", "Dashboard")}${current?.name ? " — " + current.name : ""}`}
      />
      <div className="page-content">

        {/* Share your store banner */}
        {storeUrl && (
          <div style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))", borderRadius: 14, padding: "18px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "white", fontSize: 15 }}>🏪 Your Public Storefront</p>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{storeUrl}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={copyStoreLink}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600, cursor: "pointer", fontSize: 13, transition: "background 0.2s" }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "white", color: "var(--primary)", fontWeight: 700, cursor: "pointer", fontSize: 13, textDecoration: "none" }}
              >
                <ExternalLink size={15} />
                Open Store
              </a>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.products || 0}</h3>
              <p>Active {t("products", "Products")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent">
              <Briefcase size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.services || 0}</h3>
              <p>Active {t("services", "Services")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon info">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <h3>{stats.customers || 0}</h3>
              <p>{t("customers", "Customers")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning">
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <h3>{invoiceStats.total || 0}</h3>
              <p>Total {t("invoices", "Invoices")}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success">
              <DollarSign size={24} />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(invoiceStats.paid_amount || 0)}</h3>
              <p>{t("revenue", "Revenue")} Collected</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h3>
                {formatCurrency(
                  invoiceStats.total_amount - invoiceStats.paid_amount || 0,
                )}
              </h3>
              <p>Outstanding</p>
            </div>
          </div>
        </div>

        <div className="grid-2">
          {/* Revenue Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                {t("monthly_revenue", "Monthly " + t("revenue", "Revenue"))}
              </h3>
            </div>
            {data?.monthlyRevenue?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.monthlyRevenue.map((r) => ({
                    month: new Date(r.month).toLocaleDateString("en-US", {
                      month: "short",
                    }),
                    revenue: parseFloat(r.revenue),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    fontSize={12}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                    formatter={(value) => [formatCurrency(value), "Revenue"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                <p>No revenue data yet</p>
              </div>
            )}
          </div>

          {/* Recent Invoices */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent {t("invoices", "Invoices")}</h3>
            </div>
            {data?.recentInvoices?.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: 600 }}>
                          {inv.invoice_number}
                        </td>
                        <td>
                          {inv.customer_first_name} {inv.customer_last_name}
                        </td>
                        <td>{formatCurrency(inv.total)}</td>
                        <td>
                          <span
                            className={`badge badge-${inv.status === "paid" ? "success" : inv.status === "overdue" ? "danger" : inv.status === "sent" ? "info" : "secondary"}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>No invoices yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock & Activity */}
        <div className="grid-2" style={{ marginTop: 20 }}>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <AlertTriangle size={18} style={{ marginRight: 8 }} />
                Low Stock Alerts
              </h3>
            </div>
            {data?.lowStockProducts?.length > 0 ? (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Stock</th>
                      <th>Min Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>
                          <span className="badge badge-danger">
                            {p.quantity}
                          </span>
                        </td>
                        <td>{p.min_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>All stock levels OK</p>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Recent Activity</h3>
            </div>
            {data?.recentActivity?.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {data.recentActivity.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 0",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--primary)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>
                        {a.first_name} {a.last_name}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          {a.action}
                        </span>{" "}
                        {a.entity_type}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {new Date(a.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
