import React, { useState, useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const TOUR_STEPS = [
  {
    title: "Welcome to your dashboard! 👋",
    body: "This is your home — see key metrics, recent activity, and quick stats at a glance.",
    target: "/",
  },
  {
    title: "Manage products & inventory 📦",
    body: "Track stock levels, prices, categories, and get low-stock alerts automatically.",
    target: "/products",
  },
  {
    title: "Offer services 🛠️",
    body: "List the services you provide with prices and durations. Perfect for bookings.",
    target: "/services",
  },
  {
    title: "Build your customer base 👥",
    body: "Store customer info, track history, and use industry-specific custom fields.",
    target: "/customers",
  },
  {
    title: "Send invoices & get paid 💰",
    body: "Create professional invoices, track payments, and view revenue insights.",
    target: "/invoices",
  },
  {
    title: "Customize anytime ⚙️",
    body: "Change your industry preset, theme, or add custom fields from Settings.",
    target: "/settings",
  },
];

export default function Tour() {
  const { user, loadUser } = useAuth();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem("wabyone_start_tour");
    if (flag === "1" && !user.tour_completed && !user.tour_skipped) {
      setActive(true);
      localStorage.removeItem("wabyone_start_tour");
    }
  }, [user]);

  const finish = async (skipped = false) => {
    setActive(false);
    try {
      await api.post("/onboarding/tour", {
        completed: !skipped,
        skipped: skipped,
      });
      await loadUser();
    } catch {
      // ignore
    }
  };

  if (!active) return null;

  const current = TOUR_STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.65)",
          zIndex: 9998,
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Tooltip card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          borderRadius: 16,
          padding: 28,
          maxWidth: 480,
          width: "90%",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          zIndex: 9999,
        }}
      >
        <button
          onClick={() => finish(true)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#64748b",
          }}
          aria-label="Close tour"
        >
          <X size={20} />
        </button>

        <div
          style={{
            fontSize: 12,
            color: "#6366f1",
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          STEP {step + 1} OF {TOUR_STEPS.length}
        </div>
        <h3 style={{ margin: "0 0 12px", fontSize: 22 }}>{current.title}</h3>
        <p style={{ color: "#475569", lineHeight: 1.6, marginBottom: 24 }}>
          {current.body}
        </p>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? "#6366f1" : "#e2e8f0",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => finish(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Skip tour
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {step < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => finish(false)}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Got it! 🚀
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
