import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { HelpCircle, Check, Layers } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

function resolveIcon(iconName) {
  return Icons[iconName] || HelpCircle;
}

// Small local toggle switch — scoped to this file since no shared
// component of this kind exists elsewhere in the app yet.
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "none",
        padding: 2,
        background: checked ? "var(--primary, #007bff)" : "var(--border)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.15s",
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          transition: "transform 0.15s",
        }}
      />
    </button>
  );
}

// Subscription tier (reuses the SAME plan_tier / upgradePlan() the
// Workspaces tab already uses — deliberately not a second tier system)
// plus per-module manual overrides on top of whatever that tier defaults
// to. Owner+admin can view; only owner can change tier or toggle a module.
export default function ModulesTab() {
  const { hasRole, loadUser } = useAuth();
  const isOwner = hasRole("owner");
  const { upgradePlan } = useWorkspace();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tierSaving, setTierSaving] = useState(false);
  const [togglingKey, setTogglingKey] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/org/modules");
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not load modules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeTier = async (tier) => {
    if (!data || tier === data.tier) return;
    setTierSaving(true);
    try {
      await upgradePlan(tier);
      await Promise.all([load(), loadUser()]);
      toast.success(`Subscription tier updated to ${tier}`);
    } catch (err) {
      toast.error("Could not update tier");
    } finally {
      setTierSaving(false);
    }
  };

  const toggleModule = async (key, isEnabled) => {
    setTogglingKey(key);
    // Optimistic update — reverted below if the request fails.
    setData((prev) => ({
      ...prev,
      modules: prev.modules.map((m) => (m.key === key ? { ...m, is_enabled: isEnabled } : m)),
    }));
    try {
      const res = await api.put(`/org/modules/${key}`, { is_enabled: isEnabled });
      setData((prev) => ({ ...prev, modules: res.data.modules }));
      loadUser();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not toggle module");
      load();
    } finally {
      setTogglingKey(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="card">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Subscription Package</h3>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
            Changing the tier resets any per-module overrides below back to that tier's
            defaults. Individual modules can still be toggled independently afterwards.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.all_tiers.length}, 1fr)`, gap: 12 }}>
            {data.all_tiers.map((t) => {
              const active = data.tier === t.tier;
              return (
                <button
                  key={t.tier}
                  type="button"
                  disabled={!isOwner || tierSaving}
                  onClick={() => changeTier(t.tier)}
                  className={`btn ${active ? "btn-primary" : "btn-secondary"}`}
                  style={{ flexDirection: "column", gap: 4, padding: "12px 8px" }}
                >
                  {active && <Check size={16} />}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Layers size={16} />
            System Modules ({data.modules.filter((m) => m.is_enabled).length}/{data.modules.length} enabled)
          </h3>
        </div>
        <div
          style={{
            padding: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {data.modules.map((m) => {
            const Icon = resolveIcon(m.icon_name);
            return (
              <div
                key={m.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  background: m.is_enabled ? "var(--bg-tertiary)" : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: m.is_enabled ? "var(--primary, #007bff)" : "var(--bg-tertiary)",
                      color: m.is_enabled ? "#fff" : "var(--text-muted)",
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {m.label}
                  </span>
                </div>
                <ToggleSwitch
                  checked={m.is_enabled}
                  disabled={!isOwner || togglingKey === m.key}
                  onChange={(next) => toggleModule(m.key, next)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
