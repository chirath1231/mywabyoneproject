import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Save,
  Palette,
  Building2,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  PlayCircle,
  Layers,
  Crown,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";
import { useLocation } from "react-router-dom";

// Example workspace names for each industry preset
const WORKSPACE_EXAMPLES = {
  healthcare: "e.g. My Dental Clinic",
  engineering: "e.g. ABC Construction",
  education: "e.g. Springfield Academy",
  student: "e.g. CS 101 - Fall 2024",
  sales: "e.g. Enterprise Sales",
  retail: "e.g. Fashion Boutique",
  warehouse: "e.g. Central Distribution",
  accounting: "e.g. Smith & Associates CPAs",
  restaurant: "e.g. The Italian Kitchen",
  freelancer: "e.g. My Design Studio",
  realestate: "e.g. Urban Properties",
  salon: "e.g. Beautiful You Salon",
  general: "e.g. My Business",
};

const EMPTY_ORG_FORM = {
  name: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  currency: "USD",
  tax_rate: 0,
};

const mapOrgToForm = (org) => ({
  name: org.name || "",
  description: org.description || "",
  address: org.address || "",
  phone: org.phone || "",
  email: org.email || "",
  website: org.website || "",
  currency: org.currency || "USD",
  tax_rate: org.tax_rate ?? 0,
});

export default function Settings() {
  const { organization, updateOrganization, loading: authLoading } = useAuth();
  const { themes, currentTheme, setTheme, isDark, toggleDark } = useTheme();
  const ws = useWorkspace();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialTab =
    params.get("tab") === "workspaces" ? "workspaces" : "business";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [newWsName, setNewWsName] = useState("");
  const [newWsPreset, setNewWsPreset] = useState("");
  const [creatingWs, setCreatingWs] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(params.get("upgrade") === "1");
  const [orgForm, setOrgForm] = useState(EMPTY_ORG_FORM);
  const [orgLoading, setOrgLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);
  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({
    entity_type: "product",
    field_name: "",
    field_label: "",
    field_type: "text",
  });
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState("");
  const [applyingPreset, setApplyingPreset] = useState(false);

  // Populate the business form once AuthContext has finished loading.
  // Then, fall back to /settings/organization to fill in any fields
  // that /auth/me might not return (address, phone, website, tax_rate, etc).
  useEffect(() => {
    if (authLoading) {
      setOrgLoading(true);
      return;
    }

    let cancelled = false;

    const hydrateForm = async () => {
      if (organization) {
        setOrgForm(mapOrgToForm(organization));
      }

      try {
        const res = await api.get("/settings/organization");
        if (cancelled) return;
        if (res.data) {
          updateOrganization(res.data);
          setOrgForm(mapOrgToForm(res.data));
        }
      } catch (err) {
        /* ignore - keep whatever we already have from AuthContext */
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    };

    hydrateForm();
    loadCustomFields();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, organization]);

  useEffect(() => {
    api
      .get("/onboarding/presets")
      .then((res) => setPresets(res.data.presets))
      .catch(() => {});
  }, []);

  const applyIndustryPreset = async () => {
    if (!selectedPreset) {
      toast.error("Please select an industry");
      return;
    }
    setApplyingPreset(true);
    try {
      const res = await api.post("/onboarding/apply-preset", {
        preset_key: selectedPreset,
      });
      toast.success(res.data.message || "Preset applied!");
      // Reload org info
      const orgRes = await api.get("/settings/organization");
      updateOrganization(orgRes.data);
      setOrgForm(mapOrgToForm(orgRes.data));
      loadCustomFields();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to apply preset");
    } finally {
      setApplyingPreset(false);
    }
  };

  const startTour = () => {
    localStorage.setItem("wabyone_start_tour", "1");
    window.location.href = "/";
  };

  const loadCustomFields = async () => {
    try {
      const res = await api.get("/settings/custom-fields");
      setCustomFields(res.data);
    } catch (err) {
      /* ignore */
    }
  };

  const saveOrg = async (e) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      const res = await api.put("/settings/organization", orgForm);
      updateOrganization(res.data);
      setOrgForm(mapOrgToForm(res.data));
      toast.success("Business settings saved");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save settings");
    } finally {
      setSavingOrg(false);
    }
  };

  const saveTheme = async (themeName) => {
    setTheme(themeName);
    try {
      await api.put("/settings/theme", {
        theme_config: { theme: themeName, isDark, ...themes[themeName] },
      });
      toast.success(`Theme updated to ${themes[themeName].name}`);
    } catch (err) {
      toast.error("Failed to save theme");
    }
  };

  const addCustomField = async (e) => {
    e.preventDefault();
    if (!newField.field_name || !newField.field_label) return;
    try {
      await api.post("/settings/custom-fields", newField);
      toast.success("Custom field added");
      setNewField({
        entity_type: "product",
        field_name: "",
        field_label: "",
        field_type: "text",
      });
      loadCustomFields();
    } catch (err) {
      toast.error("Failed to add custom field");
    }
  };

  const deleteCustomField = async (id) => {
    try {
      await api.delete(`/settings/custom-fields/${id}`);
      toast.success("Custom field deleted");
      loadCustomFields();
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const tabs = [
    { id: "business", label: "Business", icon: Building2 },
    { id: "workspaces", label: "Workspaces", icon: Layers },
    { id: "industry", label: "Industry Preset", icon: Sparkles },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "custom-fields", label: "Custom Fields", icon: Plus },
  ];

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName.trim()) return toast.error("Workspace name required");
    setCreatingWs(true);
    try {
      await ws.createWorkspace({
        name: newWsName.trim(),
        preset_key: newWsPreset || null,
      });
      toast.success("Workspace created!");
      setNewWsName("");
      setNewWsPreset("");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to create workspace";
      toast.error(msg);
      if (err.response?.data?.error === "PLAN_LIMIT_REACHED")
        setShowUpgrade(true);
    } finally {
      setCreatingWs(false);
    }
  };

  const handleUpgrade = async (tier) => {
    try {
      await ws.upgradePlan(tier);
      toast.success(`Upgraded to ${tier}`);
      setShowUpgrade(false);
    } catch (err) {
      toast.error("Upgrade failed");
    }
  };

  return (
    <>
      <Header title="Settings" />
      <div className="page-content">
        <div className="page-header">
          <h1>Settings</h1>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* Workspaces Tab */}
        {activeTab === "workspaces" && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div
                className="card-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3 className="card-title">Industry Workspaces</h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      margin: "4px 0 0",
                    }}
                  >
                    Each workspace has its own products, customers, invoices,
                    terminology and theme.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Plan
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {ws.plan.label} · {ws.workspaces.length}/
                    {ws.plan.workspace_limit ?? "Unlimited"}
                  </div>
                </div>
              </div>

              <div style={{ padding: 16 }}>
                {ws.workspaces.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      marginBottom: 8,
                      background:
                        w.id === ws.current?.id
                          ? "var(--bg-tertiary)"
                          : "transparent",
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{w.icon || "🏢"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        {w.name}{" "}
                        {w.is_default && (
                          <span
                            className="badge badge-primary"
                            style={{ marginLeft: 8 }}
                          >
                            Default
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12, color: "var(--text-secondary)" }}
                      >
                        {w.industry}
                      </div>
                    </div>
                    {w.id === ws.current?.id ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: "var(--success, #10b981)",
                          fontSize: 13,
                        }}
                      >
                        <Check size={14} /> Active
                      </span>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        onClick={() => ws.switchWorkspace(w.id)}
                      >
                        Switch
                      </button>
                    )}
                    {ws.workspaces.length > 1 && (
                      <button
                        className="btn-icon"
                        style={{ color: "var(--danger)" }}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Delete "${w.name}"? All its data will be removed.`,
                            )
                          )
                            return;
                          try {
                            await ws.deleteWorkspace(w.id);
                            toast.success("Workspace deleted");
                          } catch {
                            toast.error("Failed to delete");
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {!ws.atLimit ? (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Add New Industry Workspace</h3>
                </div>
                <form onSubmit={handleCreateWorkspace} style={{ padding: 16 }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Workspace Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        placeholder={
                          newWsPreset && WORKSPACE_EXAMPLES[newWsPreset]
                            ? WORKSPACE_EXAMPLES[newWsPreset]
                            : "e.g. My Business"
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Industry Preset</label>
                      <select
                        className="form-control"
                        value={newWsPreset}
                        onChange={(e) => setNewWsPreset(e.target.value)}
                      >
                        <option value="">— Generic —</option>
                        {presets.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.icon} {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={creatingWs}
                  >
                    {creatingWs ? (
                      "Creating..."
                    ) : (
                      <>
                        <Plus size={16} /> Create Workspace
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div
                className="card"
                style={{ borderColor: "var(--primary, #007bff)" }}
              >
                <div className="card-header">
                  <h3
                    className="card-title"
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <Crown size={18} /> Upgrade to add more industries
                  </h3>
                </div>
                <div style={{ padding: 16 }}>
                  <p
                    style={{ color: "var(--text-secondary)", marginBottom: 16 }}
                  >
                    Your <strong>{ws.plan.label}</strong> plan allows{" "}
                    {ws.plan.workspace_limit} workspace
                    {ws.plan.workspace_limit === 1 ? "" : "s"}. Upgrade to
                    manage more industries from one account.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        padding: 16,
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        Business
                      </div>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          margin: "4px 0 12px",
                        }}
                      >
                        $19/mo · 5 industries
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpgrade("business")}
                      >
                        Upgrade to Business
                      </button>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        border: "2px solid var(--primary, #007bff)",
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 18 }}>
                        Enterprise
                      </div>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          margin: "4px 0 12px",
                        }}
                      >
                        $49/mo · Unlimited industries
                      </div>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpgrade("enterprise")}
                      >
                        Upgrade to Enterprise
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Business Settings */}
        {activeTab === "business" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Business Information</h3>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  margin: "4px 0 0",
                }}
              >
                This is the information you provided when you registered.
                You can update it at any time.
              </p>
            </div>

            {orgLoading ? (
              <div style={{ padding: 24, textAlign: "center" }}>
                <RefreshCw
                  size={20}
                  className="spin"
                  style={{ marginBottom: 8 }}
                />
                <div style={{ color: "var(--text-secondary)" }}>
                  Loading business information...
                </div>
              </div>
            ) : (
              <form onSubmit={saveOrg} style={{ padding: 16 }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Business Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={orgForm.name}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, name: e.target.value })
                      }
                      placeholder="e.g. My Business"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={orgForm.email}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, email: e.target.value })
                      }
                      placeholder="business@example.com"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={orgForm.phone}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, phone: e.target.value })
                      }
                      placeholder="e.g. +94 71 234 5678"
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      className="form-control"
                      value={orgForm.website}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, website: e.target.value })
                      }
                      placeholder="https://example.com"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    className="form-control"
                    value={orgForm.address}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, address: e.target.value })
                    }
                    placeholder="Business address"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    value={orgForm.description}
                    onChange={(e) =>
                      setOrgForm({ ...orgForm, description: e.target.value })
                    }
                    placeholder="A short description of your business"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      className="form-control"
                      value={orgForm.currency}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, currency: e.target.value })
                      }
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="LKR">LKR - Sri Lankan Rupee</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                      <option value="CAD">CAD - Canadian Dollar</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="AED">AED - UAE Dirham</option>
                      <option value="SGD">SGD - Singapore Dollar</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Default Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={orgForm.tax_rate}
                      onChange={(e) =>
                        setOrgForm({ ...orgForm, tax_rate: e.target.value })
                      }
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ marginTop: 8 }}
                  disabled={savingOrg}
                >
                  <Save size={16} />
                  {savingOrg ? "Saving..." : "Save Settings"}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Industry Preset Settings */}
        {activeTab === "industry" && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Sparkles
                  size={18}
                  style={{ marginRight: 8, verticalAlign: "middle" }}
                />
                Industry Preset
              </h3>
            </div>

            {organization?.preset_applied ? (
              <div
                style={{
                  padding: 16,
                  background: "rgba(16, 185, 129, 0.1)",
                  borderLeft: "4px solid #10b981",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                <strong>Active preset:</strong>{" "}
                {presets.find((p) => p.key === organization.preset_applied)
                  ?.label || organization.preset_applied}
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Your workspace is pre-configured for this industry.
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: 16,
                  background: "rgba(245, 158, 11, 0.1)",
                  borderLeft: "4px solid #f59e0b",
                  borderRadius: 8,
                  marginBottom: 20,
                }}
              >
                No industry preset applied. Pick one below to auto-configure
                categories, custom fields, terminology, and theme.
              </div>
            )}

            <div className="form-group">
              <label>Choose your industry</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedPreset(p.key)}
                    style={{
                      padding: 14,
                      borderRadius: 10,
                      border:
                        selectedPreset === p.key
                          ? "2px solid var(--primary)"
                          : "1px solid var(--border)",
                      background:
                        selectedPreset === p.key
                          ? "rgba(99,102,241,0.1)"
                          : "var(--bg-secondary)",
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--text-primary)",
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 6 }}>
                      {p.icon}
                    </div>
                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-secondary)",
                        marginTop: 4,
                      }}
                    >
                      {p.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-primary"
                onClick={applyIndustryPreset}
                disabled={!selectedPreset || applyingPreset}
              >
                <RefreshCw size={16} />
                {applyingPreset ? "Applying..." : "Apply Preset"}
              </button>
              <button className="btn btn-secondary" onClick={startTour}>
                <PlayCircle size={16} /> Start Guided Tour
              </button>
            </div>

            <div
              style={{
                marginTop: 24,
                padding: 16,
                background: "var(--bg-tertiary, rgba(0,0,0,0.03))",
                borderRadius: 8,
                fontSize: 13,
                color: "var(--text-secondary)",
              }}
            >
              <strong>Note:</strong> Applying a preset adds new categories and
              custom fields (existing data won't be deleted). Theme and
              terminology will be updated.
            </div>
          </div>
        )}

        {/* Appearance Settings */}
        {activeTab === "appearance" && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Color Theme</h3>
              </div>
              <div className="theme-grid">
                {Object.entries(themes).map(([key, theme]) => (
                  <div
                    key={key}
                    className={`theme-card ${currentTheme === key ? "active" : ""}`}
                    onClick={() => saveTheme(key)}
                  >
                    <div
                      className="theme-preview"
                      style={{
                        background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                      }}
                    />
                    <span>{theme.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Display Mode</h3>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div
                  className={`theme-card ${!isDark ? "active" : ""}`}
                  onClick={() => {
                    if (isDark) toggleDark();
                  }}
                  style={{ flex: 1, padding: 20 }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 40,
                      background: "#f8fafc",
                      border: "2px solid #e2e8f0",
                      borderRadius: 8,
                      margin: "0 auto 8px",
                    }}
                  />
                  <span>Light Mode</span>
                </div>
                <div
                  className={`theme-card ${isDark ? "active" : ""}`}
                  onClick={() => {
                    if (!isDark) toggleDark();
                  }}
                  style={{ flex: 1, padding: 20 }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 40,
                      background: "#1e293b",
                      border: "2px solid #334155",
                      borderRadius: 8,
                      margin: "0 auto 8px",
                    }}
                  />
                  <span>Dark Mode</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Custom Fields */}
        {activeTab === "custom-fields" && (
          <>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">Add Custom Field</h3>
              </div>
              <form onSubmit={addCustomField}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                    gap: 12,
                    alignItems: "end",
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Entity</label>
                    <select
                      className="form-control"
                      value={newField.entity_type}
                      onChange={(e) =>
                        setNewField({
                          ...newField,
                          entity_type: e.target.value,
                        })
                      }
                    >
                      <option value="product">Product</option>
                      <option value="service">Service</option>
                      <option value="customer">Customer</option>
                      <option value="invoice">Invoice</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Field Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newField.field_name}
                      onChange={(e) =>
                        setNewField({ ...newField, field_name: e.target.value })
                      }
                      placeholder="e.g. warranty_period"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Display Label</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newField.field_label}
                      onChange={(e) =>
                        setNewField({
                          ...newField,
                          field_label: e.target.value,
                        })
                      }
                      placeholder="e.g. Warranty Period"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Type</label>
                    <select
                      className="form-control"
                      value={newField.field_type}
                      onChange={(e) =>
                        setNewField({ ...newField, field_type: e.target.value })
                      }
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Select</option>
                      <option value="textarea">Text Area</option>
                      <option value="checkbox">Checkbox</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ height: 42 }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </form>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Existing Custom Fields</h3>
              </div>
              {customFields.length === 0 ? (
                <div className="empty-state">
                  <p>No custom fields defined yet</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Entity</th>
                        <th>Field Name</th>
                        <th>Label</th>
                        <th>Type</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customFields.map((f) => (
                        <tr key={f.id}>
                          <td>
                            <span className="badge badge-primary">
                              {f.entity_type}
                            </span>
                          </td>
                          <td>
                            <code
                              style={{
                                background: "var(--bg-tertiary)",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}
                            >
                              {f.field_name}
                            </code>
                          </td>
                          <td>{f.field_label}</td>
                          <td>{f.field_type}</td>
                          <td>
                            <button
                              className="btn-icon"
                              onClick={() => deleteCustomField(f.id)}
                              style={{ color: "var(--danger)" }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}