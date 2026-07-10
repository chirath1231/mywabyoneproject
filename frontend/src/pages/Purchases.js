import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Package,
  X,
  CheckCircle,
  Ban,
  Download,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Archive,
  Truck,
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

const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "cheque", "other"];

const emptyItem = { product_id: "", description: "", quantity: 1, cost_rate: 0, new_sell_rate: "" };

const emptyForm = {
  supplier_id: "",
  bill_number: "",
  purchase_date: new Date().toISOString().slice(0, 10),
  status: "received",
  payment_method: "cash",
  amount_paid: 0,
  vat_percent: 0,
  discount: 0,
  shipping_charge: 0,
  notes: "",
  items: [{ ...emptyItem }],
};

export default function Purchases() {
  const { organization } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [showSupplierQuickAdd, setShowSupplierQuickAdd] = useState(false);
  const [supplierQuickForm, setSupplierQuickForm] = useState({ name: "", phone: "", email: "" });

  const activeDates = period === "custom" ? { start: customStart, end: customEnd } : getPeriodDates(period);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount || 0);

  const loadStaticData = useCallback(async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get("/suppliers"),
        api.get("/products"),
      ]);
      setSuppliers(supRes.data.suppliers);
      setProducts(prodRes.data.products);
    } catch (err) {
      toast.error("Failed to load suppliers/products");
    }
  }, []);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const [purRes, statsRes] = await Promise.all([
        api.get("/purchases", {
          params: {
            search,
            supplier_id: supplierFilter,
            status: statusFilter,
            startDate: activeDates.start || undefined,
            endDate: activeDates.end || undefined,
          },
        }),
        api.get("/purchases/stats", {
          params: {
            startDate: activeDates.start || undefined,
            endDate: activeDates.end || undefined,
          },
        }),
      ]);
      setPurchases(purRes.data.purchases);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [search, supplierFilter, statusFilter, activeDates.start, activeDates.end]);

  useEffect(() => {
    loadStaticData();
  }, [loadStaticData]);

  useEffect(() => {
    const timer = setTimeout(() => loadPurchases(), 250);
    return () => clearTimeout(timer);
  }, [loadPurchases]);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItem = (idx) => {
    setForm((prev) => {
      if (prev.items.length === 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== idx) };
    });
  };

  const updateItem = (idx, field, value) => {
    if (field === "product_id" && value) {
      const isDuplicate = form.items.some((item, i) => i !== idx && item.product_id === value);
      if (isDuplicate) {
        toast.error("This product is already added. Increase the quantity in the existing row instead.");
        return;
      }
    }

    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };

    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        items[idx].description = product.name;
        items[idx].cost_rate = parseFloat(product.cost_price) || 0;
      }
    }

    setForm({ ...form, items });
  };

  const getSubtotal = () =>
    form.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.cost_rate) || 0), 0);

  const getVatAmount = () => getSubtotal() * ((parseFloat(form.vat_percent) || 0) / 100);

  const getGrandTotal = () =>
    getSubtotal() + getVatAmount() - (parseFloat(form.discount) || 0) + (parseFloat(form.shipping_charge) || 0);

  const resetForm = () => setForm(emptyForm);

  const handleSubmit = async (e) => {
    e.preventDefault();
    for (const item of form.items) {
      if (!item.description) {
        toast.error("Every line item needs a product or description.");
        return;
      }
    }
    try {
      await api.post("/purchases", {
        ...form,
        supplier_id: form.supplier_id || null,
        amount_paid: parseFloat(form.amount_paid) || 0,
        vat_percent: parseFloat(form.vat_percent) || 0,
        discount: parseFloat(form.discount) || 0,
        shipping_charge: parseFloat(form.shipping_charge) || 0,
        items: form.items.map((item) => ({
          ...item,
          product_id: item.product_id || null,
          quantity: parseFloat(item.quantity),
          cost_rate: parseFloat(item.cost_rate),
          new_sell_rate: item.new_sell_rate ? parseFloat(item.new_sell_rate) : null,
        })),
      });
      toast.success("Purchase recorded");
      setShowModal(false);
      resetForm();
      loadPurchases();
      loadStaticData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record purchase");
    }
  };

  const handleQuickAddSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/suppliers", supplierQuickForm);
      toast.success("Supplier added");
      setSuppliers((prev) => [...prev, res.data]);
      setForm((prev) => ({ ...prev, supplier_id: res.data.id }));
      setShowSupplierQuickAdd(false);
      setSupplierQuickForm({ name: "", phone: "", email: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add supplier");
    }
  };

  const updateStatus = async (id, status) => {
    if (status === "received") {
      const confirmed = window.confirm("Mark this purchase as received? This will increase product stock.");
      if (!confirmed) return;
    }
    if (status === "cancelled") {
      const confirmed = window.confirm("Cancel this purchase order?");
      if (!confirmed) return;
    }
    try {
      await api.patch(`/purchases/${id}/status`, { status });
      toast.success(`Purchase marked as ${status}`);
      loadPurchases();
      loadStaticData();
      if (showDetail) {
        const res = await api.get(`/purchases/${id}`);
        setShowDetail(res.data);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const viewPurchase = async (id) => {
    try {
      const res = await api.get(`/purchases/${id}`);
      setShowDetail(res.data);
    } catch (err) {
      toast.error("Failed to load purchase");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this purchase? Stock changes will be reversed.")) return;
    try {
      await api.delete(`/purchases/${id}`);
      toast.success("Purchase deleted");
      loadPurchases();
      loadStaticData();
    } catch (err) {
      toast.error("Failed to delete purchase");
    }
  };

  const handleExport = () => {
    if (purchases.length === 0) return;
    exportToCsv(
      "purchases.csv",
      purchases.map((p) => ({
        "Invoice #": p.bill_number || p.purchase_number,
        Supplier: p.supplier_name || "",
        Total: p.total,
        Paid: p.amount_paid,
        Balance: (parseFloat(p.total) - parseFloat(p.amount_paid)).toFixed(2),
        Status: p.status,
        Date: p.purchase_date?.slice(0, 10) || "",
      })),
    );
  };

  const statusBadge = (status) => {
    const map = { received: "success", pending: "warning", cancelled: "danger" };
    return <span className={`badge badge-${map[status] || "secondary"}`}>{status}</span>;
  };

  const paymentBadge = (total, paid) => {
    const t = parseFloat(total) || 0;
    const p = parseFloat(paid) || 0;
    if (p <= 0) return <span className="badge badge-danger">unpaid</span>;
    if (p >= t) return <span className="badge badge-success">paid</span>;
    return <span className="badge badge-warning">partial</span>;
  };

  return (
    <>
      <Header title="Purchases" />
      <div className="page-content">
        <div className="page-header">
          <h1>Purchases</h1>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Purchase
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon primary"><ShoppingCart size={24} /></div>
            <div className="stat-info">
              <h3>{stats.totalPurchases || 0}</h3>
              <p>Total Purchases</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon success"><DollarSign size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.totalPurchaseValue)}</h3>
              <p>Total Purchase Value</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon danger"><AlertTriangle size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.outstandingToSuppliers)}</h3>
              <p>Outstanding to Suppliers</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon warning"><Archive size={24} /></div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.allTimePurchaseValue)}</h3>
              <p>All-Time Purchase Value</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon accent"><Truck size={24} /></div>
            <div className="stat-info">
              <h3>{stats.activeSuppliers || 0}</h3>
              <p>Active Suppliers</p>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
              Filter by period:
            </span>
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
              </div>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="search-input" style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search purchases..."
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="form-control" style={{ width: 170 }} value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select className="form-control" style={{ width: 150 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Export CSV
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : purchases.length === 0 ? (
            <div className="empty-state">
              <Package size={64} />
              <h3>No purchases yet</h3>
              <p>Record your first purchase to get started</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Supplier</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Invoice Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => {
                    const balance = (parseFloat(p.total) - parseFloat(p.amount_paid)).toFixed(2);
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.bill_number || p.purchase_number}</td>
                        <td>{p.supplier_name || "—"}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                        <td>{formatCurrency(p.amount_paid)}</td>
                        <td style={{ color: balance > 0 ? "var(--danger)" : "inherit", fontWeight: 600 }}>
                          {formatCurrency(balance)}
                        </td>
                        <td>{statusBadge(p.status)}</td>
                        <td>{paymentBadge(p.total, p.amount_paid)}</td>
                        <td style={{ fontSize: 13 }}>{new Date(p.purchase_date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-icon" onClick={() => viewPurchase(p.id)} title="View">
                              <Eye size={16} />
                            </button>
                            {p.status === "pending" && (
                              <button
                                className="btn-icon"
                                onClick={() => updateStatus(p.id, "received")}
                                style={{ color: "var(--success)" }}
                                title="Mark Received"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            {p.status !== "cancelled" && (
                              <button
                                className="btn-icon"
                                onClick={() => updateStatus(p.id, "cancelled")}
                                style={{ color: "var(--danger)" }}
                                title="Cancel"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                            <button
                              className="btn-icon"
                              onClick={() => handleDelete(p.id)}
                              style={{ color: "var(--danger)" }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* New Purchase Invoice Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
              <div className="modal-header">
                <h3>New Purchase Invoice</h3>
                <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body" style={{ display: "grid", gridTemplateColumns: "260px 1fr 260px", gap: 20 }}>
                  {/* Left: invoice details */}
                  <div>
                    <div className="form-group">
                      <label>Invoice / Bill #</label>
                      <input
                        className="form-control"
                        placeholder="e.g. INV-2026-0142"
                        value={form.bill_number}
                        onChange={(e) => setForm({ ...form, bill_number: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Supplier Invoice Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.purchase_date}
                        onChange={(e) => setForm({ ...form, purchase_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Supplier</label>
                      {showSupplierQuickAdd ? (
                        <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
                          <input
                            className="form-control"
                            style={{ marginBottom: 6 }}
                            placeholder="Supplier name"
                            value={supplierQuickForm.name}
                            onChange={(e) => setSupplierQuickForm({ ...supplierQuickForm, name: e.target.value })}
                          />
                          <input
                            className="form-control"
                            style={{ marginBottom: 6 }}
                            placeholder="Phone (optional)"
                            value={supplierQuickForm.phone}
                            onChange={(e) => setSupplierQuickForm({ ...supplierQuickForm, phone: e.target.value })}
                          />
                          <div style={{ display: "flex", gap: 6 }}>
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleQuickAddSupplier}>Save</button>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSupplierQuickAdd(false)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <select
                            className="form-control"
                            value={form.supplier_id}
                            onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                          >
                            <option value="">Select supplier...</option>
                            {suppliers.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ marginTop: 6 }}
                            onClick={() => setShowSupplierQuickAdd(true)}
                          >
                            <Plus size={14} /> New Supplier
                          </button>
                        </>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="pending">Pending</option>
                        <option value="received">Received</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Payment Method</label>
                      <select
                        className="form-control"
                        value={form.payment_method}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Amount Paid Now</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        value={form.amount_paid}
                        onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Middle: line items */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Line Items</label>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
                        <Plus size={14} /> Add line
                      </button>
                    </div>
                    {form.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 70px 90px 100px 100px 30px",
                          gap: 6,
                          marginBottom: 8,
                          alignItems: "end",
                        }}
                      >
                        <div>
                          {idx === 0 && <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Product</label>}
                          <select
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.product_id}
                            onChange={(e) => updateItem(idx, "product_id", e.target.value)}
                          >
                            <option value="">— Select product —</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          {idx === 0 && <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Qty</label>}
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.quantity}
                            min="1"
                            onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                          />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Cost Rate</label>}
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.cost_rate}
                            onChange={(e) => updateItem(idx, "cost_rate", e.target.value)}
                          />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ fontSize: 11, color: "var(--text-muted)" }}>New Sell Rate</label>}
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            placeholder="optional"
                            value={item.new_sell_rate}
                            onChange={(e) => updateItem(idx, "new_sell_rate", e.target.value)}
                          />
                        </div>
                        <div>
                          {idx === 0 && <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Total</label>}
                          <div style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>
                            {formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.cost_rate) || 0))}
                          </div>
                        </div>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => removeItem(idx)}
                            style={{ color: "var(--danger)", height: 38 }}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Right: totals */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 8 }}>
                      Totals
                    </label>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}>
                      <span>Gross Sub-total</span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(getSubtotal())}</span>
                    </div>
                    <div className="form-group">
                      <label>VAT (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.vat_percent}
                        onChange={(e) => setForm({ ...form, vat_percent: e.target.value })}
                      />
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        VAT Amount: {formatCurrency(getVatAmount())}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Discount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.discount}
                        onChange={(e) => setForm({ ...form, discount: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Shipping Charge</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.shipping_charge}
                        onChange={(e) => setForm({ ...form, shipping_charge: e.target.value })}
                      />
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px", background: "var(--primary)", borderRadius: 8, marginTop: 12,
                    }}>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>GRAND TOTAL</span>
                      <span style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{formatCurrency(getGrandTotal())}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                      <span>Paid Now</span>
                      <span>{formatCurrency(form.amount_paid)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
                      <span>Balance Due</span>
                      <span style={{ fontWeight: 600 }}>
                        {formatCurrency(getGrandTotal() - (parseFloat(form.amount_paid) || 0))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-body" style={{ paddingTop: 0 }}>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Record Purchase</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Purchase Detail Modal */}
        {showDetail && (
          <div className="modal-overlay" onClick={() => setShowDetail(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
              <div className="modal-header">
                <h3>Purchase {showDetail.bill_number || showDetail.purchase_number}</h3>
                <button className="btn-icon" onClick={() => setShowDetail(null)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Supplier</div>
                    <div style={{ fontWeight: 600 }}>{showDetail.supplier_name || "—"}</div>
                    {showDetail.supplier_phone && <div style={{ fontSize: 13 }}>{showDetail.supplier_phone}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Status</div>
                    {statusBadge(showDetail.status)}
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Date: {new Date(showDetail.purchase_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Cost Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showDetail.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.cost_rate)}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <div style={{ width: 220 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
                      <span>Subtotal:</span>
                      <span>{formatCurrency(showDetail.subtotal)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
                      <span>VAT:</span>
                      <span>{formatCurrency(showDetail.vat_amount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 18, fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                      <span>Total:</span>
                      <span>{formatCurrency(showDetail.total)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14 }}>
                      <span>Paid:</span>
                      <span>{formatCurrency(showDetail.amount_paid)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, color: "var(--danger)" }}>
                      <span>Balance:</span>
                      <span>{formatCurrency(showDetail.total - showDetail.amount_paid)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {showDetail.status === "pending" && (
                  <button className="btn btn-success" onClick={() => updateStatus(showDetail.id, "received")}>
                    <CheckCircle size={16} /> Mark as Received
                  </button>
                )}
                {showDetail.status !== "cancelled" && (
                  <button className="btn btn-secondary" onClick={() => updateStatus(showDetail.id, "cancelled")} style={{ color: "var(--danger)" }}>
                    <Ban size={16} /> Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
