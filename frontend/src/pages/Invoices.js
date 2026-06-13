import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus,
  Search,
  Eye,
  Trash2,
  FileText,
  X,
  Send,
  CheckCircle,
  Ban,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Invoices() {
  const { t: tWs } = useWorkspace();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const { organization } = useAuth();

  const [form, setForm] = useState({
    customer_id: "",
    due_date: "",
    notes: "",
    discount_amount: 0,
    items: [
      {
        description: "",
        quantity: 1,
        unit_price: 0,
        discount: 0,
        product_id: "",
        service_id: "",
      },
    ],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invRes, custRes, prodRes, svcRes] = await Promise.all([
        api.get("/invoices", { params: { search, status: statusFilter } }),
        api.get("/customers"),
        api.get("/products"),
        api.get("/services"),
      ]);
      setInvoices(invRes.data.invoices);
      setCustomers(custRes.data.customers);
      setProducts(prodRes.data.products);
      setServices(svcRes.data.services);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount);
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          description: "",
          quantity: 1,
          unit_price: 0,
          discount: 0,
          product_id: "",
          service_id: "",
        },
      ],
    });
  };

  const removeItem = (idx) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const getAvailableStock = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return null;
    return (product.quantity || 0) - (product.reserved_quantity || 0);
  };

  const updateItem = (idx, field, value) => {
    if (field === "quantity") {
      const productId = form.items[idx].product_id;
      if (productId) {
        const available = getAvailableStock(productId);
        if (available != null && parseFloat(value) > available) {
          toast.error(`Insufficient Stock. Only ${available} available.`);
          return;
        }
      }
    }

    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };

    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        items[idx].description = product.name;
        items[idx].unit_price = parseFloat(product.price);
        items[idx].service_id = "";
      }
    }
    if (field === "service_id" && value) {
      const service = services.find((s) => s.id === value);
      if (service) {
        items[idx].description = service.name;
        items[idx].unit_price = parseFloat(service.price);
        items[idx].product_id = "";
      }
    }

    setForm({ ...form, items });
  };

  const getSubtotal = () => {
    return form.items.reduce((sum, item) => {
      return (
        sum + item.quantity * item.unit_price * (1 - (item.discount || 0) / 100)
      );
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (const item of form.items) {
      if (item.product_id) {
        const available = getAvailableStock(item.product_id);
        if (available != null && parseFloat(item.quantity) > available) {
          toast.error(`Insufficient Stock. Only ${available} available.`);
          return;
        }
      }
    }

    try {
      await api.post("/invoices", {
        ...form,
        items: form.items.map((item) => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
          discount: parseFloat(item.discount) || 0,
          product_id: item.product_id || null,
          service_id: item.service_id || null,
        })),
        discount_amount: parseFloat(form.discount_amount) || 0,
      });
      toast.success("Invoice created");
      setShowModal(false);
      setForm({
        customer_id: "",
        due_date: "",
        notes: "",
        discount_amount: 0,
        items: [
          {
            description: "",
            quantity: 1,
            unit_price: 0,
            discount: 0,
            product_id: "",
            service_id: "",
          },
        ],
      });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create invoice");
    }
  };

  const updateStatus = async (id, status) => {
    // Confirm before marking as paid — this reduces product stock
    if (status === "paid") {
      const confirmed = window.confirm(
        "Mark this invoice as paid? This will reduce product stock quantities."
      );
      if (!confirmed) return;
    }

    // Confirm before cancelling — restores/releases any committed stock
    if (status === "cancelled") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order?"
      );
      if (!confirmed) return;
    }

    try {
      await api.patch(`/invoices/${id}/status`, { status });
      toast.success(status === "cancelled" ? "Invoice cancelled" : `Invoice marked as ${status}`);
      loadData();
      if (showDetail) {
        const res = await api.get(`/invoices/${id}`);
        setShowDetail(res.data);
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const viewInvoice = async (id) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setShowDetail(res.data);
    } catch (err) {
      toast.error("Failed to load invoice");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice? Stock changes will be reversed."))
      return;
    try {
      await api.delete(`/invoices/${id}`);
      toast.success("Invoice deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete invoice");
    }
  };

  const statusBadge = (status) => {
    const map = {
      paid: "success",
      sent: "info",
      draft: "secondary",
      overdue: "danger",
      cancelled: "danger",
    };
    return (
      <span className={`badge badge-${map[status] || "secondary"}`}>
        {status}
      </span>
    );
  };

  return (
    <>
      <Header title={tWs("invoices", "Invoices")} />
      <div className="page-content">
        <div className="page-header">
          <h1>Invoices</h1>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <Plus size={18} /> Create Invoice
          </button>
        </div>

        <div className="toolbar">
          <div className="search-input" style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search invoices..."
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="form-control"
            style={{ width: 160 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} />
              <h3>No invoices yet</h3>
              <p>Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>
                        {inv.customer_first_name} {inv.customer_last_name}
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {new Date(inv.issue_date).toLocaleDateString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(inv.total)}
                      </td>
                      <td>{statusBadge(inv.status)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-icon"
                            onClick={() => viewInvoice(inv.id)}
                            title="View"
                          >
                            <Eye size={16} />
                          </button>

                          {/* Draft: can mark sent OR directly mark paid */}
                          {inv.status === "draft" && (
                            <>
                              <button
                                className="btn-icon"
                                onClick={() => updateStatus(inv.id, "sent")}
                                title="Mark as Sent"
                              >
                                <Send size={16} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => updateStatus(inv.id, "paid")}
                                style={{ color: "var(--success)" }}
                                title="Mark as Paid"
                              >
                                <CheckCircle size={16} />
                              </button>
                            </>
                          )}

                          {/* Sent: can mark paid */}
                          {inv.status === "sent" && (
                            <button
                              className="btn-icon"
                              onClick={() => updateStatus(inv.id, "paid")}
                              style={{ color: "var(--success)" }}
                              title="Mark as Paid"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}

                          {inv.status !== "cancelled" && (
                            <button
                              className="btn-icon"
                              onClick={() => updateStatus(inv.id, "cancelled")}
                              style={{ color: "var(--danger)" }}
                              title="Cancel Order"
                            >
                              <Ban size={16} />
                            </button>
                          )}

                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(inv.id)}
                            style={{ color: "var(--danger)" }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Invoice Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 750 }}
            >
              <div className="modal-header">
                <h3>Create Invoice</h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Customer</label>
                      <select
                        className="form-control"
                        value={form.customer_id}
                        onChange={(e) =>
                          setForm({ ...form, customer_id: e.target.value })
                        }
                      >
                        <option value="">Select customer...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.first_name} {c.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Due Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.due_date}
                        onChange={(e) =>
                          setForm({ ...form, due_date: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        marginBottom: 8,
                        display: "block",
                      }}
                    >
                      Items
                    </label>
                    {form.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 80px 100px 80px 40px",
                          gap: 8,
                          marginBottom: 8,
                          alignItems: "end",
                        }}
                      >
                        <div>
                          {idx === 0 && (
                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Product/Service
                            </label>
                          )}
                          <select
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.product_id || item.service_id || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isProd = products.find((p) => p.id === val);
                              if (isProd) updateItem(idx, "product_id", val);
                              else updateItem(idx, "service_id", val);
                            }}
                          >
                            <option value="">Custom item</option>
                            <optgroup label="Products">
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} - ${p.price} (Stock: {(p.quantity || 0) - (p.reserved_quantity || 0)})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Services">
                              {services.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} - ${s.price}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                        <div>
                          {idx === 0 && (
                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Description
                            </label>
                          )}
                          <input
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.description}
                            onChange={(e) =>
                              updateItem(idx, "description", e.target.value)
                            }
                            placeholder="Description"
                            required
                          />
                        </div>
                        <div>
                          {idx === 0 && (
                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Qty
                            </label>
                          )}
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(idx, "quantity", e.target.value)
                            }
                            min="1"
                            max={
                              item.product_id
                                ? getAvailableStock(item.product_id) ?? undefined
                                : undefined
                            }
                          />
                        </div>
                        <div>
                          {idx === 0 && (
                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Price
                            </label>
                          )}
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(idx, "unit_price", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          {idx === 0 && (
                            <label
                              style={{
                                fontSize: 11,
                                color: "var(--text-muted)",
                              }}
                            >
                              Disc%
                            </label>
                          )}
                          <input
                            type="number"
                            className="form-control"
                            style={{ padding: "8px 10px", fontSize: 13 }}
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(idx, "discount", e.target.value)
                            }
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removeItem(idx)}
                          style={{ color: "var(--danger)", height: 38 }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={addItem}
                    >
                      <Plus size={16} /> Add Item
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 16,
                    }}
                  >
                    <div style={{ width: 250 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 0",
                          fontSize: 14,
                        }}
                      >
                        <span>Subtotal:</span>
                        <span style={{ fontWeight: 600 }}>
                          {formatCurrency(getSubtotal())}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 0",
                          fontSize: 14,
                        }}
                      >
                        <span>Discount:</span>
                        <input
                          type="number"
                          className="form-control"
                          style={{
                            width: 100,
                            padding: "4px 8px",
                            fontSize: 13,
                          }}
                          value={form.discount_amount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              discount_amount: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          fontSize: 16,
                          fontWeight: 700,
                          borderTop: "2px solid var(--border)",
                          marginTop: 8,
                        }}
                      >
                        <span>Total:</span>
                        <span>
                          {formatCurrency(
                            getSubtotal() -
                              (parseFloat(form.discount_amount) || 0),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {showDetail && (
          <div className="modal-overlay" onClick={() => setShowDetail(null)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 650 }}
            >
              <div className="modal-header">
                <h3>Invoice {showDetail.invoice_number}</h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowDetail(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Customer
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {showDetail.customer_first_name}{" "}
                      {showDetail.customer_last_name}
                    </div>
                    {showDetail.customer_email && (
                      <div style={{ fontSize: 13 }}>
                        {showDetail.customer_email}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      Status
                    </div>
                    {statusBadge(showDetail.status)}
                    <div style={{ fontSize: 13, marginTop: 4 }}>
                      Date:{" "}
                      {new Date(showDetail.issue_date).toLocaleDateString()}
                    </div>
                    {showDetail.due_date && (
                      <div style={{ fontSize: 13 }}>
                        Due:{" "}
                        {new Date(showDetail.due_date).toLocaleDateString()}
                      </div>
                    )}
                    {showDetail.paid_at && (
                      <div style={{ fontSize: 13, color: "var(--success)" }}>
                        Paid:{" "}
                        {new Date(showDetail.paid_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showDetail.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 16,
                  }}
                >
                  <div style={{ width: 220 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontSize: 14,
                      }}
                    >
                      <span>Subtotal:</span>
                      <span>{formatCurrency(showDetail.subtotal)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        fontSize: 14,
                      }}
                    >
                      <span>Tax:</span>
                      <span>{formatCurrency(showDetail.tax_amount)}</span>
                    </div>
                    {parseFloat(showDetail.discount_amount) > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          fontSize: 14,
                        }}
                      >
                        <span>Discount:</span>
                        <span>
                          -{formatCurrency(showDetail.discount_amount)}
                        </span>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        fontSize: 18,
                        fontWeight: 700,
                        borderTop: "2px solid var(--border)",
                      }}
                    >
                      <span>Total:</span>
                      <span>{formatCurrency(showDetail.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {showDetail.status === "draft" && (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => updateStatus(showDetail.id, "sent")}
                    >
                      <Send size={16} /> Mark as Sent
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => updateStatus(showDetail.id, "paid")}
                    >
                      <CheckCircle size={16} /> Mark as Paid
                    </button>
                  </>
                )}
                {showDetail.status === "sent" && (
                  <button
                    className="btn btn-success"
                    onClick={() => updateStatus(showDetail.id, "paid")}
                  >
                    <CheckCircle size={16} /> Mark as Paid
                  </button>
                )}
                {showDetail.status !== "cancelled" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => updateStatus(showDetail.id, "cancelled")}
                    style={{ color: "var(--danger)" }}
                  >
                    <Ban size={16} /> Cancel Order
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