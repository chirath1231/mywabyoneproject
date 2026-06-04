import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Moon, Sun, Building2, Users } from "lucide-react";
import api from "../api/api";
import { useTheme } from "../context/ThemeContext";
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

export default function UserHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDark, setTheme, loadThemeFromOrg } = useTheme();
  const { logout, organization } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("wabyone_view_mode") || "others"
  );

  // Apply theme based on stored view mode on first load
  useEffect(() => {
    if (viewMode === "organization" && organization?.theme_config) {
      loadThemeFromOrg(organization.theme_config);
    } else {
      setTheme("indigo");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  const handleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("wabyone_view_mode", mode);
    if (mode === "organization" && organization?.theme_config) {
      loadThemeFromOrg(organization.theme_config);
    } else {
      setTheme("indigo");
    }
  };

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          api.get("/products", { params: { limit: 1000 } }),
          api.get("/services", { params: { limit: 1000 } }),
        ]);

        const productItems = (productsRes.data.products || []).map((product) => ({
          id: `product-${product.id}`,
          recordId: product.id,
          name: product.name,
          type: "product",
          price: Number(product.price) || 0,
          description: product.description || "",
          raw: product,
        }));

        const serviceItems = (servicesRes.data.services || []).map((service) => ({
          id: `service-${service.id}`,
          recordId: service.id,
          name: service.name,
          type: "service",
          price: Number(service.price) || 0,
          description: service.description || "",
          raw: service,
        }));

        setItems([...productItems, ...serviceItems]);
      } catch (error) {
        console.error("Failed to load products/services:", error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = category === "all" ? true : item.type === category;
      const priceMatch = item.price >= minPrice && item.price <= maxPrice;
      return categoryMatch && priceMatch;
    });
  }, [items, category, minPrice, maxPrice]);

  const handleExit = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="page-content" style={{ width: "100%", maxWidth: 1280, margin: "0 auto" }}>

      {/* Organization / Others view toggle */}
      <div
        style={{
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "var(--bg-secondary)",
          padding: "14px 20px",
          borderRadius: 14,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <span style={{ color: "var(--text-secondary)", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
          View as:
        </span>

        <div
          style={{
            display: "flex",
            gap: 4,
            background: "var(--bg-tertiary)",
            borderRadius: 10,
            padding: 4,
          }}
        >
          <button
            onClick={() => handleViewMode("organization")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: viewMode === "organization" ? "var(--primary)" : "transparent",
              color: viewMode === "organization" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: 14,
            }}
          >
            <Building2 size={15} />
            Organization
          </button>
          <button
            onClick={() => handleViewMode("others")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: viewMode === "others" ? "var(--primary)" : "transparent",
              color: viewMode === "others" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s ease",
              fontSize: 14,
            }}
          >
            <Users size={15} />
            Others
          </button>
        </div>

        {viewMode === "organization" && organization && (
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              borderLeft: "1px solid var(--border)",
              paddingLeft: 16,
            }}
          >
            {organization.industry
              ? `${organization.name} · ${organization.industry.replace(/_/g, " ")}`
              : organization.name}
          </span>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          gap: 20,
          alignItems: "start",
        }}
      >
        <aside
          style={{
            border: "1px solid var(--border)",
            borderRadius: 16,
            background:
              "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)",
            padding: 18,
            position: "sticky",
            top: 16,
          }}
        >
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Explore Catalog</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
            Filter all products and services from one place.
          </p>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            >
              <option value="all">All</option>
              <option value="product">Products</option>
              <option value="service">Services</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Min Price</label>
            <input
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Max Price</label>
            <input
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value) || 0)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            onClick={() => navigate("/seller")}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.2)",
            }}
          >
            I am seller
          </button>

          <button
            onClick={toggleDark}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-primary)",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>

          <button
            onClick={handleExit}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(239, 68, 68, 0.35)",
              background: "rgba(239, 68, 68, 0.12)",
              color: "#ef4444",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <LogOut size={16} />
            Exit
          </button>
        </aside>

        <section>
          <div style={{ marginBottom: 18 }}>
            <h1 style={{ fontSize: 30, marginBottom: 8 }}>Products & Services</h1>
            <p style={{ color: "var(--text-secondary)" }}>
              Discover available offerings with live filtering and pricing.
            </p>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
              Showing {filteredItems.length} item(s)
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {filteredItems.map((item, idx) => {
                const isProduct = item.type === "product";
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      navigate(`/catalog/${item.type}/${item.recordId}`, {
                        state: { from: location.pathname + location.search },
                      })
                    }
                    style={{
                      borderRadius: 16,
                      padding: 16,
                      border: "1px solid var(--border)",
                      background: isProduct
                        ? "linear-gradient(180deg, rgba(14,165,233,0.12), var(--bg-secondary))"
                        : "linear-gradient(180deg, rgba(139,92,246,0.12), var(--bg-secondary))",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                      cursor: "pointer",
                      animation: `fadeInUp 0.4s ${idx * 0.06}s both`,
                      transition: "transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = "translateY(-6px) scale(1.01)";
                      e.currentTarget.style.boxShadow = "0 20px 40px rgba(99,102,241,0.18)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
                    }}
                  >
                    <img
                      src={item.raw?.image_url || getFallbackImage(item.type)}
                      alt={item.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = getFallbackImage(item.type);
                      }}
                      style={{
                        width: "100%",
                        height: 150,
                        objectFit: "cover",
                        borderRadius: 12,
                        marginBottom: 12,
                        border: "1px solid var(--border)",
                      }}
                    />
                    <div
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 700,
                        marginBottom: 10,
                        background: isProduct
                          ? "rgba(14,165,233,0.16)"
                          : "rgba(139,92,246,0.16)",
                        color: isProduct ? "#0284c7" : "#7c3aed",
                      }}
                    >
                      {item.type}
                    </div>
                    <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>{item.name}</h3>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 24,
                        marginBottom: 8,
                        color: "var(--text-primary)",
                      }}
                    >
                      ${item.price.toFixed(2)}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        borderTop: "1px solid var(--border)",
                        paddingTop: 10,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {Object.entries(item.raw || {}).map(([key, value]) => (
                        <div
                          key={`${item.id}-${key}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "95px minmax(0, 1fr)",
                            gap: 8,
                            alignItems: "start",
                            fontSize: 12,
                          }}
                        >
                          <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>
                            {formatLabel(key)}
                          </span>
                          <span
                            style={{
                              color: "var(--text-secondary)",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {formatValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .page-content > div {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
