import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Search,
  Plus,
  Minus,
  X,
  Trash2,
  Banknote,
  CreditCard,
  Landmark,
  Clock,
  Printer,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Landmark },
  { value: "credit", label: "Credit", icon: Clock },
];

// One card per product/SKU, merging every in-stock batch into a single
// entry (oldest batch first) — mirrors the reference POS's grouping so a
// product with several differently-priced batches still shows as one tile.
function groupBatchesBySku(batches) {
  const map = new Map();
  for (const b of batches) {
    if (!map.has(b.product_id)) {
      map.set(b.product_id, {
        product_id: b.product_id,
        name: b.product_name,
        sku: b.sku,
        barcode: b.barcode,
        batches: [],
      });
    }
    map.get(b.product_id).batches.push(b);
  }
  for (const entry of map.values()) {
    entry.batches.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    entry.combinedQty = entry.batches.reduce((s, b) => s + parseFloat(b.current_qty), 0);
    const first = entry.batches[0];
    entry.startingPrice = parseFloat(first.sell_rate || first.product_price || 0);
    entry.mixedPricing = entry.batches.some(
      (b) => parseFloat(b.sell_rate || b.product_price || 0) !== entry.startingPrice,
    );
  }
  return Array.from(map.values());
}

// FIFO-allocates `qty` across a product's batches (oldest first), pricing
// each unit at its own batch's rate — never a naive qty * headline price.
function allocateFifo(product, qty) {
  let remaining = qty;
  const allocations = [];
  for (const batch of product.batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, parseFloat(batch.current_qty));
    if (take <= 0) continue;
    allocations.push({
      batch_id: batch.id,
      quantity: take,
      unit_price: parseFloat(batch.sell_rate || batch.product_price || 0),
    });
    remaining -= take;
  }
  return { allocations, fulfilled: remaining <= 0.000001 };
}

const emptyCustomerForm = { first_name: "", last_name: "", phone: "" };

export default function POS() {
  const { organization } = useAuth();
  const searchRef = useRef(null);

  const [batches, setBatches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState([]); // [{ product_id, name, sku, qty }]
  const [customerId, setCustomerId] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);

  const [discount, setDiscount] = useState(0);
  const [vatPercent, setVatPercent] = useState(organization?.tax_rate || 0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount || 0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [batchRes, custRes] = await Promise.all([api.get("/products/batches"), api.get("/customers", { params: { limit: 500 } })]);
      setBatches(batchRes.data.batches);
      setCustomers(custRes.data.customers);
    } catch (err) {
      toast.error("Failed to load products/customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const products = useMemo(() => groupBatchesBySku(batches), [batches]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q),
    );
  }, [products, search]);

  const combinedStock = (productId) => {
    const p = products.find((p) => p.product_id === productId);
    return p ? p.combinedQty : 0;
  };

  const addToCart = (product, qty = 1) => {
    const stock = combinedStock(product.product_id);
    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === product.product_id);
      const currentQty = existing ? existing.qty : 0;
      if (currentQty + qty > stock) {
        toast.error(`Only ${stock} of ${product.name} in stock`);
        return prev;
      }
      if (existing) {
        return prev.map((l) => (l.product_id === product.product_id ? { ...l, qty: l.qty + qty } : l));
      }
      return [...prev, { product_id: product.product_id, name: product.name, sku: product.sku, qty }];
    });
  };

  const updateCartQty = (productId, qty) => {
    const stock = combinedStock(productId);
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.product_id !== productId));
      return;
    }
    if (qty > stock) {
      toast.error(`Only ${stock} in stock`);
      return;
    }
    setCart((prev) => prev.map((l) => (l.product_id === productId ? { ...l, qty } : l)));
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((l) => l.product_id !== productId));

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
    setDiscount(0);
    setPaymentMethod("cash");
    setCashReceived("");
    setLastReceipt(null);
  };

  // Per-line FIFO-allocated pricing for display (avg unit price + subtotal).
  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const product = products.find((p) => p.product_id === line.product_id);
      if (!product) return { ...line, subTotal: 0, unitPrice: 0, mixed: false };
      const { allocations } = allocateFifo(product, line.qty);
      const subTotal = allocations.reduce((s, a) => s + a.quantity * a.unit_price, 0);
      const unitPrice = line.qty > 0 ? subTotal / line.qty : 0;
      const mixed = new Set(allocations.map((a) => a.unit_price)).size > 1;
      return { ...line, subTotal, unitPrice, mixed };
    });
  }, [cart, products]);

  const subtotal = cartLines.reduce((s, l) => s + l.subTotal, 0);
  const discountValue = Math.min(parseFloat(discount) || 0, subtotal);
  const taxableBase = subtotal - discountValue;
  const vatAmount = taxableBase * ((parseFloat(vatPercent) || 0) / 100);
  const grandTotal = taxableBase + vatAmount;

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const isWalkIn = !customerId;

  useEffect(() => {
    if (paymentMethod === "credit" && isWalkIn) {
      setPaymentMethod("cash");
      toast.error("Credit isn't available for Walk-in — select a customer first.");
    }
  }, [paymentMethod, isWalkIn]);

  useEffect(() => {
    if (paymentMethod === "card" || paymentMethod === "bank_transfer") {
      setCashReceived(grandTotal.toFixed(2));
    } else if (paymentMethod === "credit") {
      setCashReceived("0.00");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, grandTotal]);

  const paidAmount = paymentMethod === "credit" ? 0 : parseFloat(cashReceived) || 0;
  const change = paymentMethod === "cash" ? Math.max(0, paidAmount - grandTotal) : 0;
  const cashShortfall = paymentMethod === "cash" ? Math.max(0, grandTotal - paidAmount) : 0;

  const handleQuickAddCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.first_name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const res = await api.post("/customers", customerForm);
      toast.success("Customer added");
      setCustomers((prev) => [...prev, res.data]);
      setCustomerId(res.data.id);
      setShowQuickAdd(false);
      setCustomerForm(emptyCustomerForm);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add customer");
    }
  };

  const completeSale = useCallback(async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (paymentMethod === "credit" && isWalkIn) {
      toast.error("Credit sales require a customer");
      return;
    }
    if (paymentMethod === "cash" && cashShortfall > 0) {
      toast.error(`Cash insufficient — short by ${formatCurrency(cashShortfall)}`);
      return;
    }

    setProcessing(true);
    try {
      // Re-verify stock live and re-allocate against the freshest batch
      // state before submitting — a defense against another till depleting
      // stock mid-session.
      const freshBatches = (await api.get("/products/batches")).data.batches;
      const freshProducts = groupBatchesBySku(freshBatches);

      const items = [];
      for (const line of cart) {
        const product = freshProducts.find((p) => p.product_id === line.product_id);
        if (!product || product.combinedQty < line.qty) {
          toast.error(`${line.name} no longer has enough stock. Please review your cart.`);
          setBatches(freshBatches);
          setProcessing(false);
          return;
        }
        const { allocations, fulfilled } = allocateFifo(product, line.qty);
        if (!fulfilled) {
          toast.error(`Could not allocate stock for ${line.name}. Please review your cart.`);
          setBatches(freshBatches);
          setProcessing(false);
          return;
        }
        for (const a of allocations) {
          items.push({ product_id: line.product_id, batch_id: a.batch_id, quantity: a.quantity, unit_price: a.unit_price });
        }
      }

      const res = await api.post("/sales/process", {
        customer_id: customerId || null,
        discount: discountValue,
        vat_percent: parseFloat(vatPercent) || 0,
        payment_method: paymentMethod,
        items,
      });

      toast.success(`Sale ${res.data.sale_no} completed`);
      setLastReceipt({
        sale_no: res.data.sale_no,
        id: res.data.id,
        customer_name: isWalkIn ? "Walk-in Customer" : `${selectedCustomer?.first_name || ""} ${selectedCustomer?.last_name || ""}`.trim(),
        lines: cartLines,
        subtotal,
        discount: discountValue,
        vat_amount: vatAmount,
        total: grandTotal,
        paid_amount: paymentMethod === "credit" ? 0 : grandTotal,
        balance_due: paymentMethod === "credit" ? grandTotal : 0,
        payment_method: paymentMethod,
        date: new Date().toISOString(),
      });
      setCart([]);
      setCustomerId("");
      setDiscount(0);
      setPaymentMethod("cash");
      setCashReceived("");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process sale");
    } finally {
      setProcessing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, cartLines, customerId, discountValue, vatPercent, paymentMethod, isWalkIn, cashShortfall, subtotal, vatAmount, grandTotal, selectedCustomer]);

  const printReceipt = useCallback(() => {
    if (!lastReceipt) return;
    setShowReceipt(true);
    setTimeout(() => window.print(), 150);
  }, [lastReceipt]);

  // Keyboard shortcuts: F10 complete sale, F12 print (if available), Escape
  // clears the cart — but not while the user is typing in a field.
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "F10") {
        e.preventDefault();
        completeSale();
      } else if (e.key === "F12") {
        if (lastReceipt) {
          e.preventDefault();
          printReceipt();
        }
      } else if (e.key === "Escape" && !typing) {
        clearCart();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [completeSale, printReceipt, lastReceipt]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setSearch("");
        searchRef.current?.focus();
      } else if (filteredProducts.length === 0) {
        toast.error("No matching product");
      }
    }
  };

  return (
    <>
      <Header title="Point of Sale" />
      <div className="page-content" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: product search + grid */}
        <div className="card">
          <div className="search-input" style={{ position: "relative", marginBottom: 12 }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              ref={searchRef}
              autoFocus
              type="text"
              className="form-control"
              placeholder="Search or scan barcode, then press Enter..."
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
          </div>

          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart size={64} />
              <h3>No in-stock products</h3>
              <p>Receive purchases to create sellable batches</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
              {filteredProducts.map((p) => {
                const outOfStock = p.combinedQty <= 0;
                const low = p.combinedQty > 0 && p.combinedQty <= 5;
                return (
                  <div
                    key={p.product_id}
                    onClick={() => !outOfStock && addToCart(p)}
                    className="card"
                    style={{
                      padding: 12,
                      cursor: outOfStock ? "not-allowed" : "pointer",
                      opacity: outOfStock ? 0.5 : 1,
                      marginBottom: 0,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.sku || "—"}</div>
                    <div style={{ marginTop: 8, fontWeight: 600 }}>
                      {p.mixedPricing ? "from " : ""}
                      {formatCurrency(p.startingPrice)}
                    </div>
                    <span
                      className={`badge badge-${outOfStock ? "danger" : low ? "warning" : "success"}`}
                      style={{ marginTop: 6, display: "inline-block" }}
                    >
                      {outOfStock ? "Out of stock" : `${p.combinedQty} in stock`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: cart + checkout */}
        <div className="card" style={{ position: "sticky", top: 12 }}>
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className="card-title">Cart</h3>
            {cart.length > 0 && (
              <button className="btn-icon" onClick={clearCart} title="Clear cart (Esc)">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="form-group">
            <label>Customer</label>
            <div style={{ display: "flex", gap: 6 }}>
              <select className="form-control" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} {parseFloat(c.balance_due) > 0 ? `(due ${formatCurrency(c.balance_due)})` : ""}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowQuickAdd(true)}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Cart lines */}
          {cartLines.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>
              <p>Cart is empty</p>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              {cartLines.map((line) => (
                <div key={line.product_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{line.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {formatCurrency(line.unitPrice)} {line.mixed && "(avg, mixed batches)"} × {line.qty}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button className="btn-icon" onClick={() => updateCartQty(line.product_id, line.qty - 1)}>
                      <Minus size={14} />
                    </button>
                    <span style={{ minWidth: 24, textAlign: "center" }}>{line.qty}</span>
                    <button className="btn-icon" onClick={() => updateCartQty(line.product_id, line.qty + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ width: 80, textAlign: "right", fontWeight: 600 }}>{formatCurrency(line.subTotal)}</div>
                  <button className="btn-icon" onClick={() => removeFromCart(line.product_id)} style={{ color: "var(--danger)" }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Discount / VAT */}
          <div className="form-row">
            <div className="form-group">
              <label>Discount</label>
              <input type="number" min="0" step="0.01" className="form-control" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="form-group">
              <label>VAT %</label>
              <input type="number" min="0" step="0.01" className="form-control" value={vatPercent} onChange={(e) => setVatPercent(e.target.value)} />
            </div>
          </div>

          {/* Totals */}
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Discount</span><span>-{formatCurrency(discountValue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>VAT</span><span>{formatCurrency(vatAmount)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 16, fontWeight: 700, borderTop: "2px solid var(--border)" }}>
              <span>Total</span><span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
            {PAYMENT_METHODS.map((m) => {
              const Icon = m.icon;
              const disabled = m.value === "credit" && isWalkIn;
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={disabled}
                  title={disabled ? "Select a customer for Credit" : undefined}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`btn ${paymentMethod === m.value ? "btn-primary" : "btn-secondary"}`}
                  style={{ flexDirection: "column", gap: 2, padding: "8px 4px", fontSize: 11, opacity: disabled ? 0.4 : 1 }}
                >
                  <Icon size={16} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {paymentMethod === "cash" && (
            <div className="form-group">
              <label>Cash Received</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setCashReceived(grandTotal.toFixed(2))}>
                  Exact
                </button>
              </div>
              {cashShortfall > 0 ? (
                <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>
                  Cash insufficient — short by {formatCurrency(cashShortfall)}
                </div>
              ) : paidAmount > 0 ? (
                <div style={{ fontSize: 12, marginTop: 4 }}>Change: {formatCurrency(change)}</div>
              ) : null}
            </div>
          )}

          {paymentMethod === "credit" && (
            <div style={{ background: "var(--warning-bg, #fff3cd)", padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 10 }}>
              Credit Sale — Full {formatCurrency(grandTotal)} added to customer's due balance
            </div>
          )}

          <button className="btn btn-primary" style={{ width: "100%" }} onClick={completeSale} disabled={processing || cart.length === 0}>
            {processing ? "Processing..." : `Complete Sale (F10) — ${formatCurrency(grandTotal)}`}
          </button>

          {lastReceipt && (
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: 8 }} onClick={printReceipt}>
              <Printer size={16} /> Print Receipt ({lastReceipt.sale_no}) — F12
            </button>
          )}
        </div>
      </div>

      {/* Quick add customer */}
      {showQuickAdd && (
        <div className="modal-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>New Customer</h3>
              <button className="btn-icon" onClick={() => setShowQuickAdd(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleQuickAddCustomer}>
              <div className="modal-body">
                <div className="form-group">
                  <label>First Name *</label>
                  <input className="form-control" value={customerForm.first_name} onChange={(e) => setCustomerForm({ ...customerForm, first_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input className="form-control" value={customerForm.last_name} onChange={(e) => setCustomerForm({ ...customerForm, last_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input className="form-control" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowQuickAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt (print) */}
      {showReceipt && lastReceipt && (
        <div className="modal-overlay" onClick={() => setShowReceipt(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3>Receipt {lastReceipt.sale_no}</h3>
              <button className="btn-icon" onClick={() => setShowReceipt(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" id="receipt-print">
              <p>{organization?.name}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(lastReceipt.date).toLocaleString()}</p>
              <p style={{ fontSize: 13 }}>Customer: {lastReceipt.customer_name}</p>
              <table style={{ width: "100%", marginTop: 10 }}>
                <thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead>
                <tbody>
                  {lastReceipt.lines.map((l) => (
                    <tr key={l.product_id}>
                      <td>{l.name}</td>
                      <td>{l.qty}</td>
                      <td>{formatCurrency(l.subTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{formatCurrency(lastReceipt.subtotal)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Discount</span><span>-{formatCurrency(lastReceipt.discount)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>VAT</span><span>{formatCurrency(lastReceipt.vat_amount)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span>{formatCurrency(lastReceipt.total)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Paid</span><span>{formatCurrency(lastReceipt.paid_amount)}</span></div>
                {lastReceipt.balance_due > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--danger)" }}><span>Balance Due</span><span>{formatCurrency(lastReceipt.balance_due)}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
