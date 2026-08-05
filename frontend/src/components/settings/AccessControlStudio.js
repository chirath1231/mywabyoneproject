import React, { useState } from "react";
import { UserCog, ShieldCheck, Layers } from "lucide-react";
import AccessControlPanel from "./AccessControlPanel";
import PermissionMatrix from "./PermissionMatrix";
import ModulesTab from "./ModulesTab";

const STUDIO_TABS = [
  { key: "members", label: "Team Members", icon: UserCog },
  { key: "matrix", label: "Permission Matrix", icon: ShieldCheck },
  { key: "modules", label: "Subscription & Modules", icon: Layers },
];

// Entry point for both the standalone /users route and the "System &
// Access Control" tab in Settings.js. Three related-but-separate concerns
// each get their own sub-tab: membership/role management
// (AccessControlPanel), the role-baseline + per-member override editor
// (PermissionMatrix), and the org's subscription tier + feature-module
// toggles (ModulesTab) — rather than being crammed into one screen.
export default function AccessControlStudio() {
  const [tab, setTab] = useState("members");

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, padding: "8px 12px" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {STUDIO_TABS.map((t) => (
            <button
              key={t.key}
              className={`btn ${tab === t.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setTab(t.key)}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "members" && <AccessControlPanel />}
      {tab === "matrix" && <PermissionMatrix />}
      {tab === "modules" && <ModulesTab />}
    </div>
  );
}
