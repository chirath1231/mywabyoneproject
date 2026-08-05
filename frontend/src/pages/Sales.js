import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Search,
  Eye,
  Printer,
  RotateCcw,
  Download,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Banknote,
  CreditCard,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { exportToCsv } from "../utils/csv";

const PERIODS = [
  { label: "Today", key: "today" },
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
  { label: "All", key: "all" },
  { label: "Custom", key: "custom" },
];

function getPeriodDates(key) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  switch (key) {
    case "today":
      return { start: today, end: today };
    case "week": {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay());
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "all":
    default:
      return { start: "", end: "" };
  }
}

const REFUND_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "AdjustDue", label: "Adjust Customer Due" },
];

export default function Sales() {
  const { organization, hasPermission } = useAuth();

  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");

  const [showDetail, setShowDetail] = useState(null);
  const [detailReturns, setDetailReturns] = useState([]);
  const [returnModal, setReturnModal] = useState(null);
  const [returnableItems, setReturnableItems] = useState([]);
  const [returnQtys, setReturnQtys] = useState({});
  const [returnReason, setReturnReason] = useState("");
  const [returnRefundMethod, setReturnRefundMethod] = useState("Cash");

  const activeDates = period === "custom" ? { start: customStart, end: customEnd } : getPeriodDates(period);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount || 0);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, statsRes] = await Promise.all([
        api.get("/sales", {
          params: {
            search,
            payment_method: methodFilter === "returns" ? undefined : methodFilter,
            startDate: activeDates.start || undefined,
            endDate: activeDates.end || undefined,
          },
        }),
        api.get("/sales/stats", {
          params: { startDate: activeDates.start || undefined, endDate: activeDates.end || undefined },
        }),
      ]);
      let rows = salesRes.data.sales;
      if (methodFilter === "returns") {
        rows = rows.filter((s) => s.return_status === "full" || s.return_status === "partial");
      }
      setSales(rows);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load sales");
    } finally {
      setLoading(false);
    }
  }, [search, methodFilter, activeDates.start, activeDates.end]);

  useEffect(() => {
    const timer = setTimeout(() => loadSales(), 250);
    return () => clearTimeout(timer);
  }, [loadSales]);

  const viewSale = async (id) => {
    try {
      const res = await api.get(`/sales/${id}`);
      setShowDetail(res.data);
      const retRes = await api.get(`/sales/${id}/returns`);
      setDetailReturns(retRes.data);
    } catch (err) {
      toast.error("Failed to load sale");
    }
  };

  const openReturn = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale.id}/returnable-items`);
      setReturnableItems(res.data);
      setReturnModal(sale);
      setReturnQtys({});
      setReturnReason("");
      setReturnRefundMethod("Cash");
    } catch (err) {
      toast.error("Failed to load sale items");
    }
  };

  const submitReturn = async () => {
    const items = Object.entries(returnQtys)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([sale_item_id, qty]) => ({ sale_item_id, quantity: parseFloat(qty) }));

    if (items.length === 0) {
      toast.error("Enter a return quantity for at least one item");
      return;
    }
    if (returnRefundMethod === "AdjustDue" && !(returnModal.payment_method === "credit" && parseFloat(returnModal.balance_due) > 0)) {
      toast.error("AdjustDue is only valid for a Credit sale with an outstanding balance.");
      return;
    }

    try {
      await api.post(`/sales/${returnModal.id}/returns`, {
        reason: returnReason,
        refund_method: returnRefundMethod,
        items,
      });
      toast.success("Return recorded");
      setReturnModal(null);
      loadSales();
      if (showDetail?.id === returnModal.id) viewSale(returnModal.id);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record return");
    }
  };

  const printSale = async (sale) => {
    try {
      const res = await api.get(`/sales/${sale.id}`);
      const w = window.open("", "_blank", "width=380,height=600");
      w.document.write(`
        <html><head><title>${res.data.sale_no}</title></head><body>
        <p>${organization?.name || ""}</p>
        <p>${res.data.sale_no} — ${new Date(res.data.created_at).toLocaleString()}</p>
        <table border="1" cellspacing="0" cellpadding="4" style="width:100%">
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            ${res.data.items
              .map((i) => `<tr><td>${i.product_name || ""}</td><td>${i.quantity}</td><td>${formatCurrency(i.unit_price)}</td><td>${formatCurrency(i.sub_total)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
        <p>Total: ${formatCurrency(res.data.total)}</p>
        <p>Paid: ${formatCurrency(res.data.amount_paid)}</p>
        <p>Balance: ${formatCurrency(res.data.balance_due)}</p>
        </body></html>
      `);
      w.document.close();
      w.print();
    } catch (err) {
      toast.error("Failed to load sale for printing");
    }
  };

  const handleExport = () => {
    if (sales.length === 0) return;
    exportToCsv(
      "sales.csv",
      sales.map((s) => ({
        "Invoice #": s.sale_no,
        Customer: s.customer_first_name ? `${s.customer_first_name} ${s.customer_last_name || ""}` : "Walk-in",
        Date: s.created_at?.slice(0, 10) || "",
        Method: s.payment_method,
        Gross: s.subtotal,
        Total: s.total,
        Paid: s.amount_paid,
        Balance: s.balance_due,
      })),
    );
  };

  const methodBadge = (method) => {
    const map = { cash: "success", card: "primary", bank_transfer: "primary", credit: "warning" };
    return <span className={`badge badge-${map[method] || "secondary"}`}>{method?.replace("_", " ")}</span>;
  };

  return (
    <>
      <Header title="Sales" />
      <div className="page-content">
        <div className="page-header">
          <h1>Sales</h1>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary"><ShoppingCart size={24} /></div>
            <div className="stat-info">
              <h3>{stats.totalInvoices || 0}</h3>
              <p>Total Invoices</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success"><DollarSign size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.totalRevenue)}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger"><AlertTriangle size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.outstandingBalance)}</h3>
              <p>Outstanding Balance</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent"><Banknote size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.cashCollections)}</h3>
              <p>Cash Collections</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning"><CreditCard size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.cardCollections)}</h3>
              <p>Card/Digital Payments</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Filter by period:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  style={{
                    padding: "5px 13px",
                    borderRadius: 20,
                    border: "1.5px solid",
                    borderColor: period === p.key ? "var(--primary)" : "var(--border)",
                    background: period === p.key ? "var(--primary)" : "transparent",
                    color: period === p.key ? "#fff" : "var(--text-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="date" className="form-control" style={{ width: 150, fontSize: 13 }} value={customStart} max={customEnd || undefined} onChange={(e) => setCustomStart(e.target.value)} />
                <span>—</span>
                <input type="date" className="form-control" style={{ width: 150, fontSize: 13 }} value={customEnd} min={customStart || undefined} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="search-input" style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input type="text" className="form-control" placeholder="Search sales..." style={{ paddingLeft: 40 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 170 }} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit">Credit</option>
            <option value="returns">Returns</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : sales.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={64} />
              <h3>No sales yet</h3>
              <p>Sales made through the POS will show up here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Total</th>
                    <th>Balance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600 }}>{s.sale_no}</td>
                      <td>{s.customer_first_name ? `${s.customer_first_name} ${s.customer_last_name || ""}` : "Walk-in"}</td>
                      <td style={{ fontSize: 13 }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td>{methodBadge(s.payment_method)}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(s.total)}</td>
                      <td>
                        {s.return_status === "full" || s.return_status === "partial" ? (
                          <span className={`badge badge-${s.return_status === "full" ? "danger" : "warning"}`}>
                            {s.return_status === "full" ? "Fully Returned" : "Partially Returned"}
                          </span>
                        ) : parseFloat(s.outstanding_amount) > 0 ? (
                          <span className="badge badge-danger">{formatCurrency(s.outstanding_amount)}</span>
                        ) : (
                          <span className="badge badge-success">Paid</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-icon" onClick={() => viewSale(s.id)} title="View">
                            <Eye size={16} />
                          </button>
                          <button className="btn-icon" onClick={() => printSale(s)} title="Reprint">
                            <Printer size={16} />
                          </button>
                          {hasPermission("process_returns") && s.customer_first_name && s.return_status !== "full" && (
                            <button className="btn-icon" onClick={() => openReturn(s)} title="Process Return">
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sale detail */}
        {showDetail && (
          <div className="modal-overlay" onClick={() => setShowDetail(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
              <div className="modal-header">
                <h3>Sale {showDetail.sale_no}</h3>
                <button className="btn-icon" onClick={() => setShowDetail(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Customer</div>
                    <div style={{ fontWeight: 600 }}>
                      {showDetail.customer_first_name ? `${showDetail.customer_first_name} ${showDetail.customer_last_name || ""}` : "Walk-in Customer"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Method</div>
                    {methodBadge(showDetail.payment_method)}
                    <div style={{ fontSize: 13, marginTop: 4 }}>{new Date(showDetail.created_at).toLocaleString()}</div>
                  </div>
                </div>

                <table>
                  <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {showDetail.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.sub_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <div style={{ width: 220 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Subtotal:</span><span>{formatCurrency(showDetail.subtotal)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Discount:</span><span>-{formatCurrency(showDetail.discount)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>VAT:</span><span>{formatCurrency(showDetail.vat_amount)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 18, fontWeight: 700, borderTop: "2px solid var(--border)" }}><span>Total:</span><span>{formatCurrency(showDetail.total)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>Paid:</span><span>{formatCurrency(showDetail.amount_paid)}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "var(--danger)" }}><span>Balance:</span><span>{formatCurrency(showDetail.balance_due)}</span></div>
                  </div>
                </div>

                {detailReturns.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Returns</div>
                    <table>
                      <thead><tr><th>Date</th><th>Refund Method</th><th>Total</th></tr></thead>
                      <tbody>
                        {detailReturns.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.created_at).toLocaleDateString()}</td>
                            <td>{r.refund_method}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => printSale(showDetail)}>
                  <Printer size={16} /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Process return */}
        {returnModal && (
          <div className="modal-overlay" onClick={() => setReturnModal(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
              <div className="modal-header">
                <h3>Process Return — {returnModal.sale_no}</h3>
                <button className="btn-icon" onClick={() => setReturnModal(null)}>×</button>
              </div>
              <div className="modal-body">
                <table>
                  <thead><tr><th>Item</th><th>Sold</th><th>Return Qty</th></tr></thead>
                  <tbody>
                    {returnableItems.filter((i) => i.max_returnable_qty > 0).map((item) => (
                      <tr key={item.sale_item_id}>
                        <td>{item.product_name}</td>
                        <td>{item.original_qty}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.max_returnable_qty}
                            step="0.01"
                            className="form-control"
                            style={{ width: 90 }}
                            value={returnQtys[item.sale_item_id] || ""}
                            onChange={(e) => setReturnQtys({ ...returnQtys, [item.sale_item_id]: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 14 }}>
                  <label>Refund Method</label>
                  <select className="form-control" value={returnRefundMethod} onChange={(e) => setReturnRefundMethod(e.target.value)}>
                    {REFUND_METHODS.map((m) => (
                      <option
                        key={m.value}
                        value={m.value}
                        disabled={m.value === "AdjustDue" && !(returnModal.payment_method === "credit" && parseFloat(returnModal.balance_due) > 0)}
                      >
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginTop: 14 }}>
                  <label>Reason</label>
                  <textarea className="form-control" rows={2} value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setReturnModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={submitReturn}>Record Return</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
