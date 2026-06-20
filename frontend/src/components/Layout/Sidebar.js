import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  LayoutDashboard,
  Package,
  Briefcase,
  Users,
  FileText,
  Settings,
  Bell,
  MessageCircle,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Plus,
  Check,
  Lock,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark } = useTheme();
  const { workspaces, current, switchWorkspace, t, plan, atLimit } =
    useWorkspace();
  const navigate = useNavigate();
  const [wsOpen, setWsOpen] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wsRef.current && !wsRef.current.contains(e.target)) setWsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitch = async (id) => {
    setWsOpen(false);
    if (id === current?.id) return;
    await switchWorkspace(id);
  };

  const handleAddWorkspace = () => {
    setWsOpen(false);
    if (atLimit) {
      navigate("/settings?tab=workspaces&upgrade=1");
    } else {
      navigate("/settings?tab=workspaces&new=1");
    }
  };

  const navItems = [
    {
      to: "/",
      icon: LayoutDashboard,
      label: t("dashboard", "Dashboard"),
      section: "main",
    },
    {
      to: "/products",
      icon: Package,
      label: t("products", "Products"),
      section: "business",
    },
    {
      to: "/services",
      icon: Briefcase,
      label: t("services", "Services"),
      section: "business",
    },
    {
      to: "/customers",
      icon: Users,
      label: t("customers", "Customers"),
      section: "business",
    },
    {
      to: "/invoices",
      icon: FileText,
      label: t("invoices", "Invoices"),
      section: "finance",
    },
    {
      to: "/notifications",
      icon: Bell,
      label: t("notifications", "Notifications"),
      section: "communication",
    },
    {
      to: "/whatsapp",
      icon: MessageCircle,
      label: t("whatsapp", "WhatsApp"),
      section: "communication",
    },
    {
      to: "/settings",
      icon: Settings,
      label: t("settings", "Settings"),
      section: "system",
    },
  ];

  const sections = {
    main: null,
    business: "Business",
    finance: "Finance",
    communication: "Communication",
    system: "System",
  };

  let lastSection = "";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon" style={{ position: "relative" }}>
          W
          <span style={{
            position: "absolute", top: -3, right: -3,
            width: 10, height: 10, borderRadius: "50%",
            background: "var(--accent)",
            boxShadow: "0 0 0 0 rgba(6,182,212,0.5)",
            animation: "pulseGlow 2s ease-in-out infinite",
          }} />
        </div>
        <h1>WabyOne</h1>
      </div>

      {/* Workspace switcher */}
      {workspaces.length > 0 && (
        <div
          ref={wsRef}
          style={{ padding: "0 12px 12px", position: "relative" }}
        >
          <button
            onClick={() => setWsOpen(!wsOpen)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "var(--sidebar-text)",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "left",
            }}
          >
            <span style={{ fontSize: 18 }}>{current?.icon || "🏢"}</span>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {current?.name || "Workspace"}
              </div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>
                {plan.label} · {workspaces.length}/{plan.workspace_limit ?? "∞"}
              </div>
            </div>
            <ChevronDown
              size={14}
              style={{
                transform: wsOpen ? "rotate(180deg)" : "none",
                transition: "0.2s",
              }}
            />
          </button>

          {wsOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 12,
                right: 12,
                marginTop: 4,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background:
                      ws.id === current?.id
                        ? "var(--primary-light, rgba(0,123,255,0.1))"
                        : "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "var(--bg-hover, rgba(0,0,0,0.05))")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      ws.id === current?.id
                        ? "var(--primary-light, rgba(0,123,255,0.1))"
                        : "transparent")
                  }
                >
                  <span style={{ fontSize: 16 }}>{ws.icon || "🏢"}</span>
                  <span style={{ flex: 1 }}>{ws.name}</span>
                  {ws.id === current?.id && <Check size={14} />}
                </button>
              ))}
              <button
                onClick={handleAddWorkspace}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  color: atLimit
                    ? "var(--text-secondary)"
                    : "var(--primary, #007bff)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {atLimit ? <Lock size={14} /> : <Plus size={14} />}
                {atLimit ? `Upgrade for more (${plan.label})` : "Add Industry"}
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const showSection =
            item.section !== lastSection && sections[item.section];
          lastSection = item.section;
          return (
            <React.Fragment key={item.to}>
              {showSection && (
                <div className="nav-section-title">{showSection}</div>
              )}
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
                end={item.to === "/"}
              >
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="btn-icon"
          onClick={toggleDark}
          style={{
            marginBottom: 12,
            width: "100%",
            justifyContent: "center",
            gap: 8,
            display: "flex",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "var(--sidebar-text)",
            background: "transparent",
          }}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          <span style={{ fontSize: 13 }}>
            {isDark ? "Light Mode" : "Dark Mode"}
          </span>
        </button>
        <div className="user-info">
          <div className="user-avatar">
            {user?.first_name?.[0]}
            {user?.last_name?.[0]}
          </div>
          <div className="user-details">
            <div className="user-name">
              {user?.first_name} {user?.last_name}
            </div>
            <div className="user-role">{user?.role || "Member"}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "var(--sidebar-text)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}