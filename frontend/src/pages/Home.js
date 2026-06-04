import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart2,
  Users,
  Package,
  FileText,
  Bell,
  Settings,
  CheckCircle,
  ArrowRight,
  Menu,
  X,
  Zap,
  Shield,
  Star,
  ChevronDown,
  MessageSquare,
  Mail,
  Layers,
  TrendingUp,
  Award,
  Clock,
  Sparkles,
} from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Pricing", href: "#pricing" },
];

const FEATURES = [
  {
    icon: BarChart2,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    title: "Smart Dashboard",
    desc: "Real-time analytics, revenue charts, and key business metrics at a glance. Know your numbers, always.",
  },
  {
    icon: Package,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    title: "Products & Services",
    desc: "Manage your entire catalog with stock tracking, SKUs, pricing, and category organization.",
  },
  {
    icon: Users,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Customer Management",
    desc: "Build lasting customer relationships with full contact history, notes, and invoice tracking.",
  },
  {
    icon: FileText,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "Invoicing & Billing",
    desc: "Create professional invoices in seconds. Auto-number, tax calculation, and full status workflow.",
  },
  {
    icon: MessageSquare,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    title: "WhatsApp & Email",
    desc: "Send notifications directly to customers via WhatsApp and Email — powered by n8n automation.",
  },
  {
    icon: Settings,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.12)",
    title: "Full Customization",
    desc: "Choose your theme, set your currency, define custom fields, and make WabyOne truly yours.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Create your account",
    desc: "Sign up in seconds — no credit card required. Set up your business profile and you're ready to go.",
    icon: Zap,
  },
  {
    num: "02",
    title: "Add your catalog",
    desc: "Import or add your products and services. Organize with categories and set your pricing.",
    icon: Package,
  },
  {
    num: "03",
    title: "Manage & grow",
    desc: "Start invoicing customers, track payments, send updates, and watch your business grow.",
    icon: TrendingUp,
  },
];

const TESTIMONIALS = [
  {
    name: "Amara Perera",
    role: "Boutique Owner, Colombo",
    avatar: "AP",
    color: "#6366f1",
    rating: 5,
    text: "WabyOne transformed how I run my shop. Invoicing used to take hours — now it takes minutes. The WhatsApp integration is a game-changer for my customers.",
  },
  {
    name: "Rohan De Mel",
    role: "IT Consultant, Kandy",
    avatar: "RD",
    color: "#10b981",
    rating: 5,
    text: "Finally an ERP that doesn't require an IT degree to use. I set it up in a day, and the custom fields let me track exactly what matters for my business.",
  },
  {
    name: "Niluka Jayawardena",
    role: "Restaurant Manager, Galle",
    avatar: "NJ",
    color: "#f59e0b",
    rating: 5,
    text: "The dashboard gives me a clear picture every morning. Low stock alerts have saved us from running out multiple times. Absolutely love it!",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    color: "#6366f1",
    features: [
      "1 industry workspace",
      "Up to 50 products",
      "25 customers",
      "50 invoices/month",
      "Email notifications",
      "1 user",
      "Basic themes",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Business",
    price: "$19",
    period: "/month",
    color: "#8b5cf6",
    features: [
      "5 industry workspaces",
      "Unlimited products",
      "Unlimited customers",
      "Unlimited invoices",
      "WhatsApp + Email",
      "5 users",
      "All themes",
      "Custom fields",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$49",
    period: "/month",
    color: "#06b6d4",
    features: [
      "Unlimited industry workspaces",
      "Everything in Business",
      "Unlimited users",
      "Custom branding",
      "API access",
      "Advanced analytics",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const THEMES = [
  { name: "Indigo", from: "#6366f1", to: "#8b5cf6" },
  { name: "Ocean", from: "#0ea5e9", to: "#06b6d4" },
  { name: "Forest", from: "#10b981", to: "#059669" },
  { name: "Sunset", from: "#f59e0b", to: "#ef4444" },
  { name: "Royal", from: "#7c3aed", to: "#4f46e5" },
  { name: "Midnight", from: "#1e293b", to: "#334155" },
  { name: "Rose", from: "#f43f5e", to: "#ec4899" },
  { name: "Teal", from: "#14b8a6", to: "#06b6d4" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeTheme, setActiveTheme] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      style={{
        fontFamily: '"Inter", -apple-system, sans-serif',
        background: "#0a0a14",
        color: "#f1f5f9",
        overflowX: "hidden",
      }}
    >
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: "0 24px",
          background: scrolled ? "rgba(10,10,20,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 68,
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(99,102,241,0.5)",
              }}
            >
              <Layers size={18} color="white" />
            </div>
            <span
              style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.5px" }}
            >
              Waby<span style={{ color: "#818cf8" }}>One</span>
            </span>
          </div>

          {/* Desktop Links */}
          <div
            style={{ display: "flex", gap: 32, alignItems: "center" }}
            className="desktop-nav"
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(241,245,249,0.7)",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: 500,
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#f1f5f9")}
                onMouseLeave={(e) =>
                  (e.target.style.color = "rgba(241,245,249,0.7)")
                }
              >
                {l.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <Link
              to="/login"
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(241,245,249,0.8)",
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#f1f5f9";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(241,245,249,0.8)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
            >
              Login
            </Link>
            <Link
              to="/register"
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(99,102,241,0.6)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 14px rgba(99,102,241,0.4)";
                e.currentTarget.style.transform = "none";
              }}
            >
              Get Started Free
            </Link>
            <button
              style={{
                display: "none",
                background: "none",
                border: "none",
                color: "#f1f5f9",
                cursor: "pointer",
              }}
              className="mobile-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            style={{
              padding: "16px 0 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(10,10,20,0.95)",
              backdropFilter: "blur(20px)",
            }}
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "12px 24px",
                  background: "none",
                  border: "none",
                  color: "rgba(241,245,249,0.8)",
                  textAlign: "left",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {l.label}
              </button>
            ))}
            <div style={{ display: "flex", gap: 12, padding: "12px 24px 0" }}>
              <Link
                to="/login"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#f1f5f9",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  flex: 1,
                  padding: "10px 0",
                  textAlign: "center",
                  borderRadius: 8,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 80px",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.25) 0%, transparent 70%)",
        }}
      >
        {/* Ambient grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "15%",
            left: "10%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15), transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "8%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{ maxWidth: 900, textAlign: "center", position: "relative" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
              padding: "6px 16px 6px 10px",
              borderRadius: 100,
              background: "rgba(99,102,241,0.12)",
              border: "1px solid rgba(99,102,241,0.3)",
            }}
          >
            <span
              style={{
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                borderRadius: 100,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: 1,
              }}
            >
              NEW
            </span>
            <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 500 }}>
              WhatsApp & Email automation with n8n
            </span>
            <ArrowRight size={14} color="#818cf8" />
          </div>

          <h1
            style={{
              fontSize: "clamp(42px, 8vw, 80px)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              marginBottom: 28,
            }}
          >
            The ERP built for{" "}
            <span
              style={{
                background:
                  "linear-gradient(135deg, #818cf8, #c084fc, #fb7185)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              your business
            </span>
            <br />
            not someone else's
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2.5vw, 20px)",
              color: "rgba(241,245,249,0.6)",
              lineHeight: 1.7,
              maxWidth: 620,
              margin: "0 auto 48px",
              fontWeight: 400,
            }}
          >
            WabyOne gives you full control — products, services, customers,
            invoices, and messaging — all in one beautifully customizable
            workspace.
          </p>

          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 700,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                textDecoration: "none",
                boxShadow: "0 8px 30px rgba(99,102,241,0.5)",
                transition: "all 0.25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 40px rgba(99,102,241,0.65)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(99,102,241,0.5)";
              }}
            >
              Start for free <ArrowRight size={18} />
            </Link>
            <button
              onClick={() => scrollTo("#features")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 32px",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#f1f5f9",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
            >
              See features <ChevronDown size={18} />
            </button>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "flex",
              gap: 40,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 72,
              paddingTop: 40,
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[
              { val: "8", label: "Color Themes" },
              { val: "11", label: "DB Entities" },
              { val: "100%", label: "Customizable" },
              { val: "n8n", label: "Automation" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #818cf8, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.val}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(241,245,249,0.45)",
                    marginTop: 4,
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section style={{ padding: "0 24px 100px", position: "relative" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.15)",
              background:
                "linear-gradient(180deg, rgba(30,27,75,0.95) 0%, rgba(15,23,42,0.98) 100%)",
            }}
          >
            {/* Fake browser bar */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                {["#ef4444", "#f59e0b", "#10b981"].map((c) => (
                  <div
                    key={c}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: c,
                    }}
                  />
                ))}
              </div>
              <div
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  height: 28,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 14,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                app.wabyone.com/dashboard
              </div>
            </div>

            {/* Mock dashboard content */}
            <div style={{ display: "flex", minHeight: 420 }}>
              {/* Sidebar */}
              <div
                style={{
                  width: 220,
                  background: "rgba(10,10,30,0.6)",
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                  padding: "24px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 28,
                    paddingLeft: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Layers size={14} color="white" />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>
                    Waby<span style={{ color: "#818cf8" }}>One</span>
                  </span>
                </div>
                {[
                  { icon: BarChart2, label: "Dashboard", active: true },
                  { icon: Package, label: "Products", active: false },
                  { icon: Users, label: "Customers", active: false },
                  { icon: FileText, label: "Invoices", active: false },
                  { icon: Bell, label: "Notifications", active: false },
                  { icon: Settings, label: "Settings", active: false },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 12px",
                      borderRadius: 8,
                      marginBottom: 4,
                      fontSize: 13,
                      fontWeight: item.active ? 600 : 400,
                      background: item.active
                        ? "rgba(99,102,241,0.2)"
                        : "transparent",
                      color: item.active ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                      borderLeft: item.active
                        ? "3px solid #6366f1"
                        : "3px solid transparent",
                    }}
                  >
                    <item.icon size={15} />
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div
                style={{ flex: 1, padding: "28px 24px", overflowX: "hidden" }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    marginBottom: 20,
                    color: "#f1f5f9",
                  }}
                >
                  Dashboard
                </div>

                {/* Stat cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 14,
                    marginBottom: 22,
                  }}
                >
                  {[
                    {
                      label: "Revenue",
                      val: "$24,580",
                      change: "+12%",
                      color: "#6366f1",
                    },
                    {
                      label: "Customers",
                      val: "342",
                      change: "+8%",
                      color: "#10b981",
                    },
                    {
                      label: "Invoices",
                      val: "128",
                      change: "+5%",
                      color: "#f59e0b",
                    },
                    {
                      label: "Products",
                      val: "89",
                      change: "+3%",
                      color: "#06b6d4",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10,
                        padding: "14px 16px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          marginBottom: 8,
                          fontWeight: 500,
                        }}
                      >
                        {s.label}
                      </div>
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: "#f1f5f9",
                        }}
                      >
                        {s.val}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}
                      >
                        {s.change} this month
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                    padding: "16px",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                      marginBottom: 12,
                    }}
                  >
                    Revenue Overview
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: 6,
                      height: 80,
                    }}
                  >
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map(
                      (h, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: `${h}%`,
                            borderRadius: "3px 3px 0 0",
                            background:
                              i === 11
                                ? "linear-gradient(180deg,#6366f1,#8b5cf6)"
                                : "rgba(99,102,241,0.25)",
                            transition: "height 0.3s",
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 13,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Live preview of WabyOne dashboard
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        id="features"
        style={{
          padding: "100px 24px",
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
                marginBottom: 20,
              }}
            >
              <Sparkles size={13} color="#818cf8" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#818cf8",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Everything you need
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(30px, 5vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-1px",
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Powerful features,
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg,#818cf8,#c084fc)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                zero complexity
              </span>
            </h2>
            <p
              style={{
                fontSize: 17,
                color: "rgba(241,245,249,0.5)",
                maxWidth: 520,
                margin: "0 auto",
              }}
            >
              Built for real businesses that need to move fast without
              sacrificing control.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
              gap: 20,
            }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "28px 28px 32px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.25s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                  e.currentTarget.style.transform = "translateY(-4px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: f.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                  }}
                >
                  <f.icon size={22} color={f.color} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: "rgba(241,245,249,0.5)",
                    lineHeight: 1.75,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THEME SHOWCASE ── */}
      <section style={{ padding: "100px 24px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 64,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.25)",
                marginBottom: 20,
              }}
            >
              <Sparkles size={13} color="#c084fc" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#c084fc",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Fully Yours
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 900,
                letterSpacing: "-1px",
                lineHeight: 1.2,
                marginBottom: 20,
              }}
            >
              Your brand,
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg,#c084fc,#818cf8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                your colors
              </span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(241,245,249,0.5)",
                lineHeight: 1.8,
                marginBottom: 32,
              }}
            >
              Pick from 8 beautifully crafted color themes or toggle dark mode.
              Every color, every surface adapts instantly.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 12,
              }}
            >
              {THEMES.map((t, i) => (
                <div
                  key={i}
                  onClick={() => setActiveTheme(i)}
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    cursor: "pointer",
                    border:
                      activeTheme === i
                        ? `2px solid #818cf8`
                        : "2px solid rgba(255,255,255,0.08)",
                    transition: "all 0.2s",
                    transform: activeTheme === i ? "scale(1.08)" : "none",
                    boxShadow:
                      activeTheme === i
                        ? "0 4px 20px rgba(99,102,241,0.4)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      height: 36,
                      background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
                    }}
                  />
                  <div
                    style={{
                      padding: "6px 8px",
                      background: "rgba(255,255,255,0.05)",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                      textAlign: "center",
                    }}
                  >
                    {t.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              borderRadius: 20,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${THEMES[activeTheme].from}33`,
              transition: "box-shadow 0.4s",
            }}
          >
            <div
              style={{
                height: 8,
                background: `linear-gradient(90deg, ${THEMES[activeTheme].from}, ${THEMES[activeTheme].to})`,
              }}
            />
            <div style={{ background: "rgba(15,23,42,0.95)", padding: "20px" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    flex: 2,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    height: 80,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    border: `1px solid ${THEMES[activeTheme].from}33`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: THEMES[activeTheme].from,
                    }}
                  >
                    $24K
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Revenue
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 8,
                    height: 80,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}
                  >
                    342
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    Customers
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 8,
                  padding: 14,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 5,
                    height: 56,
                  }}
                >
                  {[30, 60, 40, 80, 50, 90, 65, 85, 55, 100].map((h, j) => (
                    <div
                      key={j}
                      style={{
                        flex: 1,
                        height: `${h}%`,
                        borderRadius: "2px 2px 0 0",
                        background:
                          j === 9
                            ? `linear-gradient(180deg, ${THEMES[activeTheme].from}, ${THEMES[activeTheme].to})`
                            : `${THEMES[activeTheme].from}33`,
                        transition: "background 0.4s",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                {["Paid", "Pending", "Draft"].map((s, j) => (
                  <div
                    key={s}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      textAlign: "center",
                      fontWeight: 600,
                      background:
                        j === 0
                          ? `${THEMES[activeTheme].from}22`
                          : "rgba(255,255,255,0.04)",
                      color:
                        j === 0
                          ? THEMES[activeTheme].from
                          : "rgba(255,255,255,0.4)",
                      border: `1px solid ${j === 0 ? THEMES[activeTheme].from + "44" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        style={{
          padding: "100px 24px",
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.25)",
                marginBottom: 20,
              }}
            >
              <CheckCircle size={13} color="#10b981" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#10b981",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Simple setup
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Up and running in minutes
            </h2>
            <p style={{ fontSize: 17, color: "rgba(241,245,249,0.5)" }}>
              No lengthy onboarding. Just sign up and go.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 24,
            }}
          >
            {STEPS.map((step, i) => (
              <div key={i} style={{ position: "relative" }}>
                {i < STEPS.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 36,
                      left: "65%",
                      right: "-50%",
                      height: 1,
                      background:
                        "linear-gradient(90deg, rgba(255,255,255,0.1), transparent)",
                      display: "none",
                    }}
                    className="step-connector"
                  />
                )}
                <div
                  style={{
                    padding: "28px 24px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      background: "rgba(99,102,241,0.12)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      marginBottom: 18,
                    }}
                  >
                    <step.icon size={22} color="#818cf8" />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "rgba(99,102,241,0.6)",
                      letterSpacing: 2,
                      marginBottom: 12,
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: "rgba(241,245,249,0.5)",
                      lineHeight: 1.7,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                marginBottom: 20,
              }}
            >
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#f59e0b",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Loved by businesses
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Don't take our word for it
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 20,
            }}
          >
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: "28px",
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={14} color="#f59e0b" fill="#f59e0b" />
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: "rgba(241,245,249,0.65)",
                    lineHeight: 1.75,
                    marginBottom: 24,
                  }}
                >
                  "{t.text}"
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: t.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>
                      {t.name}
                    </div>
                    <div
                      style={{ fontSize: 12, color: "rgba(241,245,249,0.4)" }}
                    >
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MESSAGING HIGHLIGHT ── */}
      <section
        style={{
          padding: "80px 24px",
          background: "rgba(255,255,255,0.015)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MessageSquare size={24} color="#10b981" />
            </div>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={24} color="#3b82f6" />
            </div>
          </div>
          <h2
            style={{
              fontSize: "clamp(26px, 4vw, 40px)",
              fontWeight: 900,
              letterSpacing: "-1px",
              marginBottom: 16,
            }}
          >
            Stay connected with your customers
          </h2>
          <p
            style={{
              fontSize: 17,
              color: "rgba(241,245,249,0.5)",
              lineHeight: 1.8,
              maxWidth: 580,
              margin: "0 auto 32px",
            }}
          >
            Send invoices, payment reminders, and updates directly via WhatsApp
            or Email — powered by your own n8n automation workflows.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 10,
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <Shield size={16} color="#10b981" />
            <span style={{ fontSize: 14, color: "rgba(241,245,249,0.7)" }}>
              Your n8n instance, your data — full privacy control
            </span>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(6,182,212,0.1)",
                border: "1px solid rgba(6,182,212,0.25)",
                marginBottom: 20,
              }}
            >
              <Award size={13} color="#06b6d4" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#06b6d4",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Simple pricing
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 900,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Start free, scale when ready
            </h2>
            <p style={{ fontSize: 17, color: "rgba(241,245,249,0.5)" }}>
              No hidden fees. Cancel anytime.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            {PLANS.map((plan, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 20,
                  padding: plan.popular ? "32px 28px" : "28px 24px",
                  background: plan.popular
                    ? "linear-gradient(180deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))"
                    : "rgba(255,255,255,0.03)",
                  border: plan.popular
                    ? "1px solid rgba(99,102,241,0.4)"
                    : "1px solid rgba(255,255,255,0.07)",
                  position: "relative",
                  boxShadow: plan.popular
                    ? "0 20px 60px rgba(99,102,241,0.2)"
                    : "none",
                  transition: "transform 0.25s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-4px)")
                }
                onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -13,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      padding: "4px 16px",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#fff",
                      whiteSpace: "nowrap",
                      letterSpacing: 0.5,
                      boxShadow: "0 4px 14px rgba(99,102,241,0.5)",
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 4 }}
                  >
                    <span
                      style={{
                        fontSize: 42,
                        fontWeight: 900,
                        color: plan.popular ? "#818cf8" : "#f1f5f9",
                      }}
                    >
                      {plan.price}
                    </span>
                    <span
                      style={{ fontSize: 15, color: "rgba(241,245,249,0.4)" }}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    marginBottom: 28,
                    display: "flex",
                    flexDirection: "column",
                    gap: 11,
                  }}
                >
                  {plan.features.map((f, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 14,
                        color: "rgba(241,245,249,0.7)",
                      }}
                    >
                      <CheckCircle
                        size={15}
                        color={plan.popular ? "#818cf8" : "#10b981"}
                        style={{ flexShrink: 0 }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "13px",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    textDecoration: "none",
                    background: plan.popular
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "rgba(255,255,255,0.07)",
                    color: plan.popular ? "#fff" : "rgba(241,245,249,0.8)",
                    border: plan.popular
                      ? "none"
                      : "1px solid rgba(255,255,255,0.12)",
                    boxShadow: plan.popular
                      ? "0 6px 20px rgba(99,102,241,0.4)"
                      : "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9";
                    e.currentTarget.style.transform = "scale(1.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: "80px 24px 100px" }}>
        <div
          style={{
            maxWidth: 900,
            margin: "0 auto",
            textAlign: "center",
            padding: "64px 40px",
            borderRadius: 24,
            background:
              "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.12))",
            border: "1px solid rgba(99,102,241,0.3)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 250,
              height: 250,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(99,102,241,0.2), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(139,92,246,0.15), transparent 70%)",
              filter: "blur(30px)",
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 100,
                background: "rgba(99,102,241,0.15)",
                border: "1px solid rgba(99,102,241,0.3)",
                marginBottom: 24,
              }}
            >
              <Clock size={13} color="#818cf8" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#818cf8",
                  letterSpacing: 1,
                }}
              >
                GET STARTED IN 2 MINUTES
              </span>
            </div>
            <h2
              style={{
                fontSize: "clamp(28px, 5vw, 48px)",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                marginBottom: 20,
                lineHeight: 1.1,
              }}
            >
              Ready to run your business
              <br />
              the smart way?
            </h2>
            <p
              style={{
                fontSize: 17,
                color: "rgba(241,245,249,0.55)",
                marginBottom: 36,
                lineHeight: 1.7,
              }}
            >
              Join hundreds of businesses using WabyOne to save time,
              <br />
              stay organized, and keep customers happy.
            </p>
            <div
              style={{
                display: "flex",
                gap: 14,
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "15px 36px",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  textDecoration: "none",
                  boxShadow: "0 8px 30px rgba(99,102,241,0.5)",
                  transition: "all 0.25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 14px 40px rgba(99,102,241,0.65)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow =
                    "0 8px 30px rgba(99,102,241,0.5)";
                }}
              >
                Create free account <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "15px 28px",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(241,245,249,0.8)",
                  textDecoration: "none",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }}
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "48px 24px 32px",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 40,
              marginBottom: 48,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Layers size={16} color="white" />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800 }}>
                  Waby<span style={{ color: "#818cf8" }}>One</span>
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(241,245,249,0.4)",
                  lineHeight: 1.8,
                }}
              >
                The ERP that adapts to your business — not the other way around.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Changelog", "Roadmap"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
              {
                title: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Security"],
              },
            ].map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(241,245,249,0.6)",
                    letterSpacing: 0.8,
                    marginBottom: 16,
                    textTransform: "uppercase",
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <div key={link} style={{ marginBottom: 10 }}>
                    <span
                      style={{
                        fontSize: 14,
                        color: "rgba(241,245,249,0.35)",
                        cursor: "pointer",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.target.style.color = "rgba(241,245,249,0.8)")
                      }
                      onMouseLeave={(e) =>
                        (e.target.style.color = "rgba(241,245,249,0.35)")
                      }
                    >
                      {link}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 13, color: "rgba(241,245,249,0.3)" }}>
              © 2026 WabyOne. All rights reserved.
            </span>
            <span style={{ fontSize: 13, color: "rgba(241,245,249,0.3)" }}>
              Built with React + Node.js + PostgreSQL
            </span>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
