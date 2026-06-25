import React, { useEffect, useState } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

export default function Onboarding() {
  const { loadUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [presets, setPresets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [businessSize, setBusinessSize] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    api.get("/onboarding/presets").then((res) => setPresets(res.data.presets));
  }, []);

  const skipAll = async () => {
    if (applying) return; // Prevent double-click
    setApplying(true);
    try {
      await api.post("/onboarding/complete");
      await loadUser();
      toast.success("Welcome! You can customize your workspace anytime in Settings.");
      navigate("/");
    } catch (err) {
      toast.error("Failed to skip setup. Please try again.");
      setApplying(false);
    }
  };

  const applyPreset = async () => {
    if (!selected) return;
    setApplying(true);
    try {
      await api.post("/onboarding/apply-preset", {
        preset_key: selected,
        business_size: businessSize || null,
        primary_goal: primaryGoal || null,
        team_size: teamSize ? parseInt(teamSize) : null,
      });
      // Create the user's first workspace from this preset
      await api.post("/onboarding/ensure-workspace", { preset_key: selected });
      await api.post("/onboarding/complete");
      await loadUser();
      toast.success("Workspace customized for your industry!");
      // Tell dashboard to auto-start the tour
      localStorage.setItem("wabyone_start_tour", "1");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to apply preset");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          width: "100%",
          background: "white",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={24} color="white" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>Welcome to WabyOne</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
                Let's tailor your workspace ({step}/3)
              </p>
            </div>
          </div>
          <button
            onClick={skipAll}
            disabled={applying}
            style={{
              background: "transparent",
              border: "none",
              color: applying ? "#cbd5e1" : "#64748b",
              cursor: applying ? "not-allowed" : "pointer",
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 4,
              opacity: applying ? 0.6 : 1,
              transition: "all 0.2s",
              padding: "8px 12px",
              borderRadius: 6,
              hoverColor: !applying ? "#475569" : undefined,
            }}
            title={applying ? "Setting up..." : "Skip onboarding"}
          >
            Skip setup <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32 }}>
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: n <= step ? "#6366f1" : "#e2e8f0",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Step 1: Pick industry */}
        {step === 1 && (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 24 }}>
              What's your industry?
            </h3>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              We'll pre-configure categories, fields, terminology, and dashboard
              widgets for you.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
                maxHeight: 400,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setSelected(p.key)}
                  style={{
                    background: selected === p.key ? "#eef2ff" : "white",
                    border:
                      selected === p.key
                        ? "2px solid #6366f1"
                        : "2px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 16,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {p.description}
                  </div>
                  {selected === p.key && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "#6366f1",
                        borderRadius: "50%",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Check size={14} color="white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Business details */}
        {step === 2 && (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 24 }}>
              Tell us about your business
            </h3>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              These help us recommend better defaults (all optional).
            </p>
            <div style={{ display: "grid", gap: 20 }}>
              <div>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
                >
                  Business size
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["solo", "small", "medium", "large", "enterprise"].map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => setBusinessSize(s)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          border:
                            businessSize === s
                              ? "2px solid #6366f1"
                              : "1px solid #cbd5e1",
                          background: businessSize === s ? "#eef2ff" : "white",
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {s}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
                >
                  Primary goal
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 8,
                  }}
                >
                  {[
                    { v: "manage_inventory", l: "Manage inventory" },
                    { v: "track_sales", l: "Track sales" },
                    { v: "manage_clients", l: "Manage clients" },
                    { v: "billing", l: "Send invoices / bills" },
                    { v: "appointments", l: "Schedule appointments" },
                    { v: "everything", l: "All-in-one ERP" },
                  ].map((g) => (
                    <button
                      key={g.v}
                      onClick={() => setPrimaryGoal(g.v)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border:
                          primaryGoal === g.v
                            ? "2px solid #6366f1"
                            : "1px solid #cbd5e1",
                        background: primaryGoal === g.v ? "#eef2ff" : "white",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      {g.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{ display: "block", fontWeight: 600, marginBottom: 8 }}
                >
                  Team size
                </label>
                <input
                  type="number"
                  min="1"
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  placeholder="Number of people"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    width: 200,
                    fontSize: 14,
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            <h3 style={{ margin: "0 0 8px", fontSize: 24 }}>
              Ready to launch!
            </h3>
            <p style={{ color: "#64748b", marginBottom: 24 }}>
              We'll set everything up for you. You can change any of this later
              in Settings.
            </p>
            {selected && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 32 }}>
                    {presets.find((p) => p.key === selected)?.icon}
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>
                      {presets.find((p) => p.key === selected)?.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#64748b" }}>
                      {presets.find((p) => p.key === selected)?.description}
                    </div>
                  </div>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: "#475569",
                    fontSize: 14,
                    lineHeight: 1.8,
                  }}
                >
                  <li>Industry-specific dashboard widgets</li>
                  <li>Pre-built categories for products & services</li>
                  <li>Custom fields tailored to your sector</li>
                  <li>Themed colors matching your industry</li>
                  <li>Renamed labels (e.g., Patients vs Customers)</li>
                </ul>
              </div>
            )}
          </>
        )}

        {/* Footer buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 32,
          }}
        >
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "white",
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selected}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background:
                  step === 1 && !selected
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
                cursor: step === 1 && !selected ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={applyPreset}
              disabled={applying}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white",
                cursor: applying ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {applying ? "Setting up..." : "Apply & Launch"}{" "}
              <Sparkles size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
