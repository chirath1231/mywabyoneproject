import React, { useEffect, useState } from "react";
import { CreditCard, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";

const CSS = `
@keyframes cartModalIn { from{opacity:0;transform:scale(0.93) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes cartFadeIn  { from{opacity:0} to{opacity:1} }
@keyframes cartSuccessPop { 0%{transform:scale(0.7)} 70%{transform:scale(1.08)} 100%{transform:scale(1)} }

.cart-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid #e2e8f0;
  font-family:inherit; font-size:14px; outline:none; transition:border-color 0.2s,box-shadow 0.2s;
  box-sizing:border-box; }
.cart-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); }

.cart-step-btn { width:26px; height:26px; border:none; background:transparent; cursor:pointer;
  display:flex; align-items:center; justify-content:center; color:#475569; border-radius:6px; transition:background 0.15s; }
.cart-step-btn:hover:not(:disabled) { background:rgba(99,102,241,0.1); }
.cart-step-btn:disabled { opacity:0.35; cursor:not-allowed; }
`;

export default function CartDrawer({
  slug, cart, updateQty, remove, clear, onClose,
  currency, primary, accent, second, font,
}) {
  const [injected, setInjected] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successInv, setSuccessInv] = useState(null);

  useEffect(() => {
    if (!injected) {
      const s = document.createElement("style");
      s.textContent = CSS;
      document.head.appendChild(s);
      setInjected(true);
      return () => { document.head.removeChild(s); };
    }
  }, [injected]);

  const fmt   = a => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(a);
  const total = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handleClose = () => {
    if (submitting) return;
    setSuccessInv(null);
    setForm({ name: "", email: "", phone: "" });
    onClose();
  };

  const handlePlaceOrder = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter your name", {
        style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0" },
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/store/${slug}/order`, {
        items: cart.map(c => ({ type: c.type, item_id: c.id, quantity: c.quantity })),
        customer_name:  form.name.trim(),
        customer_email: form.email.trim() || undefined,
        customer_phone: form.phone.trim() || undefined,
      });
      setSuccessInv(res.data.invoice_number);
      clear();
    } catch (e) {
      toast.error(e.response?.data?.error || "Something went wrong. Please try again.", {
        style: { background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,23,42,0.65)", backdropFilter: "blur(6px)", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>

      <div style={{ background: "white", borderRadius: 24, padding: "32px 28px", maxWidth: 480, width: "100%",
        maxHeight: "86vh", overflowY: "auto", boxShadow: "0 32px 80px rgba(0,0,0,0.25)",
        animation: "cartModalIn 0.25s both", position: "relative", fontFamily: font, boxSizing: "border-box" }}>

        {!submitting && (
          <button onClick={handleClose}
            style={{ position: "absolute", top: 16, right: 16, background: "#f1f5f9", border: "none",
              borderRadius: 999, width: 32, height: 32, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <X size={16} />
          </button>
        )}

        {successInv ? (
          /* ── Success screen ── */
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 12, animation: "cartSuccessPop 0.5s both" }}>🎉</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900, color: "#0f172a" }}>
              Order Placed!
            </h3>
            <p style={{ margin: "0 0 16px", color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
              Your order <strong style={{ color: primary }}>{successInv}</strong> has been created as a draft.
            </p>

            <div style={{ borderRadius: 16, padding: "18px 20px", marginBottom: 20,
              background: `linear-gradient(135deg,${primary}12,${accent}12)`,
              border: `2px solid ${primary}33`, textAlign: "left" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
                Please make payment via bank transfer
              </p>
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                Our team will contact you shortly with the bank account details to complete your payment.
              </p>
            </div>

            <button onClick={handleClose}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontFamily: font,
                background: `linear-gradient(135deg,${primary},${accent})`,
                color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : cart.length === 0 ? (
          /* ── Empty cart ── */
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🛒</div>
            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Your cart is empty</h3>
            <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 14 }}>
              Add some products or services to get started.
            </p>
            <button onClick={handleClose}
              style={{ width: "100%", padding: "13px 0", borderRadius: 14, border: "none", fontFamily: font,
                background: `linear-gradient(135deg,${primary},${accent})`,
                color: "white", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                background: `linear-gradient(135deg,${primary},${accent})`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShoppingCart size={20} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a" }}>Your Cart</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                  {cart.reduce((s, c) => s + c.quantity, 0)} item{cart.reduce((s, c) => s + c.quantity, 0) === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {/* Cart items */}
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {cart.map(c => (
                <div key={c.key} style={{ display: "flex", gap: 10, alignItems: "center",
                  padding: "10px 12px", borderRadius: 14, border: "1px solid #e2e8f0",
                  animation: "cartFadeIn 0.25s both" }}>
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name}
                      style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                      background: `linear-gradient(135deg,${second}22,${primary}22)`,
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                      {c.type === "product" ? "📦" : "🛠️"}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>
                      {fmt(c.price)}{c.unit ? ` / ${c.unit}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 2,
                    border: `1.5px solid ${primary}33`, borderRadius: 8, padding: 2, flexShrink: 0 }}>
                    <button className="cart-step-btn" onClick={() => updateQty(c.key, c.quantity - 1)}
                      disabled={c.quantity <= 1}>
                      <Minus size={12} />
                    </button>
                    <span style={{ minWidth: 22, textAlign: "center", fontWeight: 800, fontSize: 13, color: "#0f172a" }}>
                      {c.quantity}
                    </span>
                    <button className="cart-step-btn" onClick={() => updateQty(c.key, c.quantity + 1)}
                      disabled={c.maxQty != null && c.quantity >= c.maxQty}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 13, minWidth: 64, textAlign: "right", color: "#0f172a" }}>
                    {fmt(c.price * c.quantity)}
                  </div>
                  <button onClick={() => remove(c.key)} title="Remove item"
                    style={{ background: "#fef2f2", border: "1.5px solid #fecaca", cursor: "pointer",
                      color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, padding: 7, borderRadius: 8, transition: "background 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderRadius: 14, marginBottom: 20,
              background: `linear-gradient(135deg,${primary}12,${accent}12)`,
              border: `1px dashed ${primary}44` }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 900,
                background: `linear-gradient(135deg,${primary},${accent})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                {fmt(total)}
              </span>
            </div>

            {/* Customer info */}
            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Full Name *
                </label>
                <input className="cart-input" placeholder="e.g. Kamal Perera"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Email <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(optional)</span>
                </label>
                <input className="cart-input" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569",
                  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
                  Phone <span style={{ color: "#94a3b8", fontWeight: 500, textTransform: "none" }}>(optional)</span>
                </label>
                <input className="cart-input" type="tel" placeholder="077 123 4567"
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>

            <button onClick={handlePlaceOrder} disabled={submitting}
              style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", fontFamily: font,
                background: submitting ? "#cbd5e1" : `linear-gradient(135deg,${primary},${accent})`,
                color: "white", fontWeight: 800, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {submitting ? "Placing Order…" : (<><CreditCard size={17} /> Confirm Order</>)}
            </button>
            <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 10, marginBottom: 0 }}>
              Payment via bank transfer · Our team will reach out
            </p>
          </>
        )}
      </div>
    </div>
  );
}
