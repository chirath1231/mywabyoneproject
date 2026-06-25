import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/api";

export default function VerifyOTP() {
  const [digits, setDigits]       = useState(Array(6).fill(""));
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // ✅ All 6 refs declared at top level — no hooks inside callbacks
  const ref0 = useRef(null);
  const ref1 = useRef(null);
  const ref2 = useRef(null);
  const ref3 = useRef(null);
  const ref4 = useRef(null);
  const ref5 = useRef(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  useEffect(() => {
    refs[0].current?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 5) refs[index + 1].current?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0)
      refs[index - 1].current?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      refs[5].current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otp = digits.join("");
    if (otp.length < 6) return setError("Please enter all 6 digits.");
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      navigate(
        `/reset-password?email=${encodeURIComponent(email)}&token=${res.data.reset_token}`
      );
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed.");
      setDigits(Array(6).fill(""));
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setCountdown(60);
      setCanResend(false);
      setDigits(Array(6).fill(""));
      refs[0].current?.focus();
    } catch (err) {
      setError(err.response?.data?.error || "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>WabyOne</h1>
          <p>Enter the OTP sent to</p>
          <p style={{ fontWeight: 600, color: "#6366f1" }}>{email}</p>
        </div>

        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", color: "#ef4444",
            padding: "12px 16px", borderRadius: 8, marginBottom: 20, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={refs[i]}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                style={{
                  width: 48, height: 56, textAlign: "center", fontSize: 24,
                  fontWeight: 700, borderRadius: 10,
                  border: `2px solid ${d ? "#6366f1" : "#d1d5db"}`,
                  outline: "none", transition: "border-color 0.2s",
                  background: "transparent", color: "inherit",
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || digits.join("").length < 6}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#6b7280" }}>
          {canResend ? (
            <button
              onClick={handleResend}
              disabled={resending}
              style={{
                background: "none", border: "none", color: "#6366f1",
                cursor: "pointer", fontSize: 14,
              }}
            >
              {resending ? "Sending..." : "Resend OTP"}
            </button>
          ) : (
            <span>Resend OTP in <strong>{countdown}s</strong></span>
          )}
        </div>

        <div className="auth-footer">
          <Link to="/forgot-password">← Try a different email</Link>
        </div>
      </div>
    </div>
  );
}