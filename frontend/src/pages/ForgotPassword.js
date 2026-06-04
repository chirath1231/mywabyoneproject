import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
          <h2 style={{ marginBottom: 8 }}>Check your inbox</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            We sent a 6-digit OTP to <strong>{email}</strong>.<br />
            It expires in 10 minutes.
          </p>
          <Link
            to={`/verify-otp?email=${encodeURIComponent(email)}`}
            className="btn btn-primary btn-lg"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            Enter OTP →
          </Link>
          <div style={{ marginTop: 20 }}>
            <Link to="/login" style={{ color: "#6366f1", fontSize: 14 }}>
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>WabyOne</h1>
          <p>Reset your password</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", color: "#ef4444",
            padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? "Sending OTP..." : <><Mail size={18} /> Send OTP</>}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">
            <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}