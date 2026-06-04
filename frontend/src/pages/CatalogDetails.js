import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

function formatLabel(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getFallbackImage(type) {
  const label = type === "product" ? "Product" : "Service";
  const bg = type === "product" ? "0ea5e9" : "8b5cf6";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#${bg}'/>
          <stop offset='100%' stop-color='#111827'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        fill='white' font-family='Arial, sans-serif' font-size='34' font-weight='700'>${label}</text>
    </svg>`,
  )}`;
}

const DEFAULT_REVIEWS = [
  { id: 1, name: "Ravin", rating: 5, text: "Great quality and fast response." },
  { id: 2, name: "Nimashi", rating: 4, text: "Value for money and easy process." },
  { id: 3, name: "Akila", rating: 5, text: "Highly recommended, very professional." },
];

export default function CatalogDetails() {
  const { type, id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.payhere) return undefined;
    const script = document.createElement("script");
    script.src = "https://www.payhere.lk/lib/payhere.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const loadItem = async () => {
      setLoading(true);
      try {
        const endpoint = type === "service" ? `/services/${id}` : `/products/${id}`;
        const res = await api.get(endpoint);
        setItem(res.data);
      } catch (error) {
        toast.error("Failed to load item details");
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [id, type]);

  const price = useMemo(() => Number(item?.price) || 0, [item]);

  const handlePayHere = () => {
    const payhere = window.payhere;
    if (!payhere) {
      toast.error("PayHere SDK not loaded");
      return;
    }

    const merchantId = process.env.REACT_APP_PAYHERE_MERCHANT_ID;
    if (!merchantId) {
      toast.error("Set REACT_APP_PAYHERE_MERCHANT_ID in frontend env");
      return;
    }

    payhere.onCompleted = function onCompleted(orderId) {
      toast.success(`Payment completed. Order ID: ${orderId}`);
    };
    payhere.onDismissed = function onDismissed() {
      toast("Payment popup closed");
    };
    payhere.onError = function onError(err) {
      toast.error(`Payment error: ${err}`);
    };

    const order = {
      sandbox: true,
      merchant_id: merchantId,
      return_url: window.location.href,
      cancel_url: window.location.href,
      notify_url: `${window.location.origin}/api/payments/payhere-notify`,
      order_id: `${type}-${id}-${Date.now()}`,
      items: item?.name || "Catalog Item",
      amount: price.toFixed(2),
      currency: "LKR",
      first_name: user?.first_name || "Guest",
      last_name: user?.last_name || "User",
      email: user?.email || "guest@example.com",
      phone: user?.phone || "0771234567",
      address: "N/A",
      city: "Colombo",
      country: "Sri Lanka",
    };

    payhere.startPayment(order);
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-spinner">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-content">
        <p>Item not found.</p>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/" style={{ color: "var(--primary)" }}>
          Back to catalog
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: 16,
            overflow: "hidden",
            background: "var(--bg-secondary)",
          }}
        >
          <img
            src={item.image_url || getFallbackImage(type)}
            alt={item.name}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getFallbackImage(type);
            }}
            style={{ width: "100%", height: 320, objectFit: "cover" }}
          />
          <div style={{ padding: 16 }}>
            <div style={{ color: "var(--text-muted)", textTransform: "uppercase", fontSize: 12 }}>
              {type}
            </div>
            <h1 style={{ marginTop: 8, marginBottom: 8 }}>{item.name}</h1>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>
              LKR {price.toFixed(2)}
            </div>
            <p style={{ color: "var(--text-secondary)" }}>{item.description || "No description."}</p>
            <button
              onClick={handlePayHere}
              style={{
                marginTop: 14,
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                background: "linear-gradient(135deg, #0ea5e9, #22d3ee)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Pay with PayHere
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 16,
              background: "var(--bg-secondary)",
              padding: 14,
            }}
          >
            <h3 style={{ marginBottom: 12 }}>All Information</h3>
            <div style={{ display: "grid", gap: 7 }}>
              {Object.entries(item).map(([key, value]) => (
                <div
                  key={key}
                  style={{ display: "grid", gridTemplateColumns: "130px minmax(0,1fr)", fontSize: 13 }}
                >
                  <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{formatLabel(key)}</span>
                  <span style={{ color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
                    {formatValue(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 16,
              background: "var(--bg-secondary)",
              padding: 14,
            }}
          >
            <h3 style={{ marginBottom: 12 }}>Customer Reviews</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {DEFAULT_REVIEWS.map((review) => (
                <div
                  key={review.id}
                  style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}
                >
                  <div style={{ fontWeight: 700 }}>{review.name}</div>
                  <div style={{ fontSize: 12, color: "#f59e0b", margin: "3px 0" }}>
                    {"★".repeat(review.rating)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{review.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
