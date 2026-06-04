const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const authRoutes         = require("./routes/auth");
const productRoutes      = require("./routes/products");
const serviceRoutes      = require("./routes/services");
const customerRoutes     = require("./routes/customers");
const invoiceRoutes      = require("./routes/invoices");
const settingsRoutes     = require("./routes/settings");
const notificationRoutes = require("./routes/notifications");
const dashboardRoutes    = require("./routes/dashboard");
const onboardingRoutes   = require("./routes/onboarding");
const workspaceRoutes    = require("./routes/workspaces");
const storeRoutes        = require("./routes/store");
const uploadRoutes       = require("./routes/uploadRoutes");   // ← NEW
const { verifySmtp }     = require("./config/mail");

const app = express();

// ─────────────────────────────────────────────
// TRUST PROXY
// ─────────────────────────────────────────────
app.set("trust proxy", 1);

// ─────────────────────────────────────────────
// HELMET
// ─────────────────────────────────────────────
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// ─────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────
const normalizeOrigin = (value) =>
  value ? value.replace(/\/$/, "") : value;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5000",
  "https://waby-one.vercel.app",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map(normalizeOrigin);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    if (/^https:\/\/waby-one[\w-]*\.vercel\.app$/.test(normalized))
      return callback(null, true);
    if (
      process.env.NODE_ENV !== "production" &&
      /^http:\/\/localhost:\d+$/.test(normalized)
    )
      return callback(null, true);
    console.warn(`[CORS] Blocked request from origin: ${origin}`);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Workspace-Id",
    "x-workspace-id",
  ],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─────────────────────────────────────────────
// RATE LIMITING
// ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many reset attempts, please try again later." },
});

app.use("/api/auth/login",            authLimiter);
app.use("/api/auth/register",         authLimiter);
app.use("/api/auth/forgot-password",  forgotPasswordLimiter);
app.use("/api/auth/verify-otp",       forgotPasswordLimiter);
app.use("/api/auth/reset-password",   forgotPasswordLimiter);

// ─────────────────────────────────────────────
// BODY PARSING
// ─────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/products",      productRoutes);
app.use("/api/services",      serviceRoutes);
app.use("/api/customers",     customerRoutes);
app.use("/api/invoices",      invoiceRoutes);
app.use("/api/settings",      settingsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/onboarding",    onboardingRoutes);
app.use("/api/workspaces",    workspaceRoutes);
app.use("/api/store",         storeRoutes);
app.use("/api/upload",        uploadRoutes);                   // ← NEW

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status:    "ok",
    service:   "WabyOne ERP",
    env:       process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─────────────────────────────────────────────
// GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS: origin not allowed" });
  }
  console.error("[Error]", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ─────────────────────────────────────────────
// START SERVER + AUTO-MIGRATIONS
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`✅  WabyOne API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  console.log(`    Allowed origins: ${allowedOrigins.join(", ")}`);

  if (process.env.SMTP_LOG_OTP !== "true") {
    await verifySmtp();
  }

  try {
    const fs   = require("fs");
    const path = require("path");
    const { pool } = require("./config/db");
    const migrationsDir = path.join(__dirname, "db", "migrations");

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith(".sql"))
        .sort();

      for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
        await pool.query(sql);
        console.log(`    ✔ Migration applied: ${file}`);
      }
    } else {
      console.log("    ℹ  No migrations directory found — skipping.");
    }
  } catch (e) {
    console.error("    ✖ Auto-migration failed:", e.message);
  }
});

module.exports = app;