import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/api";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email       = searchParams.get("email") || "";
  const reset_token = searchParams.get("token") || "";

  // Password strength
  const checks = {
    length:  password.length >= 8,
    upper:   /[A-Z]/.test(password),
    lower:   /[a-z]/.test(password),
    number:  /\d/.test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords do not match.");
    if (strength < 3) return setError("Please choose a stronger password.");
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, reset_token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <CheckCircle size={56} color="#22c55e" style={{ marginBottom: 16 }} />
          <h2>Password Reset!</h2>
          <p style={{ color: "#6b7280" }}>
            Your password has been updated. Redirecting to login…
          </p>
        </div>
      </div>
    );
  }

  const strengthColor = ["#ef4444","#f97316","#eab308","#22c55e"][strength - 1] || "#e5e7eb";
  const strengthLabel = ["","Weak","Fair","Good","Strong"][strength];

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>WabyOne</h1>
          <p>Set your new password</p>
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
          {/* New password */}
          <div className="form-group">
            <label>New Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position:"absolute", right:12, top:"50%",
                         transform:"translateY(-50%)", background:"none",
                         border:"none", cursor:"pointer" }}>
                {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                  {[1,2,3,4].map((n) => (
                    <div key={n} style={{
                      height: 4, flex: 1, borderRadius: 99,
                      background: n <= strength ? strengthColor : "#e5e7eb",
                      transition: "background 0.3s",
                    }}/>
                  ))}
                </div>
                <span style={{ fontSize:12, color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}

            {/* Checklist */}
            {password && (
              <ul style={{ listStyle:"none", padding:0, marginTop:8, fontSize:12 }}>
                {[
                  [checks.length, "At least 8 characters"],
                  [checks.upper,  "One uppercase letter"],
                  [checks.lower,  "One lowercase letter"],
                  [checks.number, "One number"],
                ].map(([ok, label]) => (
                  <li key={label} style={{ color: ok ? "#22c55e" : "#9ca3af", marginBottom:2 }}>
                    {ok ? "✓" : "○"} {label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label>Confirm Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                className="form-control"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
                style={{ borderColor: confirm && confirm !== password ? "#ef4444" : undefined }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                style={{ position:"absolute", right:12, top:"50%",
                         transform:"translateY(-50%)", background:"none",
                         border:"none", cursor:"pointer" }}>
                {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
            {confirm && confirm !== password && (
              <p style={{ color:"#ef4444", fontSize:12, marginTop:4 }}>Passwords don't match</p>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg"
            disabled={loading || password !== confirm || strength < 3}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">← Back to login</Link>
        </div>
      </div>
    </div>
  );
}