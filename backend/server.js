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
const uploadRoutes       = require("./routes/uploadRoutes");   // ←


const reportsRoutes      = require("./routes/reports");
const whatsappRoutes = require("./routes/whatsapp");
const whatsappAdminRoutes = require("./routes/whatsapp-admin");
const expenseRoutes      = require("./routes/expenses");
const supplierRoutes     = require("./routes/suppliers");
const purchaseRoutes     = require("./routes/purchases");

const { verifySmtp }     = require("./config/mail");

const app = express();

// ─────────────────────────────────────────────
// TRUST PROXY
// ─────────────────────────────────────────────
// Number of reverse proxies in front of the app (Railway / Dokploy Traefik = 1).
app.set("trust proxy", parseInt(process.env.TRUST_PROXY || "1", 10));

// ─────────────────────────────────────────────
// HELMET
// ─────────────────────────────────────────────
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // The React app is served from this server too; helmet's default CSP
    // would block Google Sign-In, PayHere and CRA's inline runtime chunk.
    contentSecurityPolicy: false,
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
  "https://mywabyoneproject.vercel.app",
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
    if (/^https:\/\/mywabyoneproject[\w-]*\.vercel\.app$/.test(normalized))
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

// Requests from the same domain this server is reached on (frontend served by
// this app on Dokploy) are always allowed — no need to list the domain.
const corsDelegate = (req, callback) => {
  const origin = req.header("Origin");
  try {
    if (origin && new URL(origin).host === req.get("host")) {
      return callback(null, { ...corsOptions, origin: true });
    }
  } catch {
    // malformed Origin — fall through to normal checks
  }
  callback(null, corsOptions);
};

app.use(cors(corsDelegate));
app.options("*", cors(corsDelegate));
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
app.use("/api/upload",        uploadRoutes);
app.use("/api/reports",       reportsRoutes);
app.use("/api/whatsapp",      whatsappRoutes);
app.use("/api/whatsapp/admin", whatsappAdminRoutes);
app.use("/api/expenses",      expenseRoutes);
app.use("/api/suppliers",     supplierRoutes);
app.use("/api/purchases",     purchaseRoutes);

// ─────────────────────────────────────────────
// API ROOT
// ─────────────────────────────────────────────
app.get("/api", (req, res) => {
  res.json({ message: "WabyOne API is running!" });
});

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
// FRONTEND (React build) — single-container deploy
// ─────────────────────────────────────────────
// Dockerfile copies the React build to /app/public. Locally / on Railway the
// folder doesn't exist and this block is skipped (API-only, as before).
const fs = require("fs");
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, "..", "public");
if (fs.existsSync(path.join(STATIC_DIR, "index.html"))) {
  app.use(
    "/static",
    express.static(path.join(STATIC_DIR, "static"), { immutable: true, maxAge: "1y" })
  );
  app.use(express.static(STATIC_DIR, { index: false, maxAge: 0 }));
  // React Router: any non-API GET returns index.html
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
  console.log(`    Serving frontend from ${STATIC_DIR}`);
}

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

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅  WabyOne API running on port ${PORT} (${process.env.NODE_ENV || "development"})`);
  console.log(`    Allowed origins: ${allowedOrigins.join(", ")}`);

  if (process.env.SMTP_LOG_OTP !== "true") {
    await verifySmtp();
  }

  try {
    const fs   = require("fs");
    const path = require("path");
    const { pool } = require("./config/db");
    // When bundled with esbuild, __dirname is backend/dist/ — go up one level
    let migrationsDir = path.join(__dirname, "db", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, "..", "db", "migrations");
    }

    // Base schema first (idempotent: CREATE ... IF NOT EXISTS) so a brand-new
    // empty database (e.g. fresh Postgres on Dokploy) boots without a manual
    // `npm run migrate`.
    const schemaPath = path.join(migrationsDir, "..", "schema.sql");
    if (fs.existsSync(schemaPath)) {
      await pool.query(fs.readFileSync(schemaPath, "utf-8"));
      console.log("    ✔ Base schema applied: schema.sql");
    }

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