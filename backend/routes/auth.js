const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { createMailTransporter } = require("../config/mail");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = express.Router();

async function sendOtpEmail({ to, firstName, otp }) {
  if (process.env.SMTP_LOG_OTP === "true") {
    console.info(`[SMTP_LOG_OTP] OTP for ${to}: ${otp}`);
    return;
  }

  const transporter = createMailTransporter();
  await transporter.sendMail({
    from: `"WabyOne" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your WabyOne Password Reset OTP",
    html: otpEmailTemplate(firstName, otp),
  });
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Safely convert password_hash to string in case DB returns a Buffer (BYTEA column)
function toHashString(value) {
  if (!value) return null;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (typeof value === "object") return value.toString();
  return String(value);
}

function otpEmailTemplate(firstName, otp) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
                border:1px solid #e5e7eb;border-radius:12px;background:#ffffff;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#6366f1;margin:0;font-size:24px;">WabyOne</h2>
        <p style="color:#6b7280;margin:4px 0 0;">Password Reset Request</p>
      </div>
      <p style="color:#374151;">Hi <strong>${firstName}</strong>,</p>
      <p style="color:#374151;">
        Use the OTP below to reset your WabyOne password.
        It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#f5f3ff;border:2px dashed #6366f1;border-radius:12px;
                  padding:24px;text-align:center;margin:24px 0;">
        <span style="font-size:42px;font-weight:800;letter-spacing:14px;color:#6366f1;">
          ${otp}
        </span>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        If you did not request this, you can safely ignore this email.
        Your password will not change.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        © ${new Date().getFullYear()} WabyOne ERP. All rights reserved.
      </p>
    </div>
  `;
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("first_name").trim().notEmpty(),
    body("last_name").trim().notEmpty(),
    body("org_name")
      .trim()
      .notEmpty()
      .withMessage("Organization name is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, first_name, last_name, phone, org_name } = req.body;

      const existing = await db(
        "SELECT id FROM wabyone_users WHERE email = $1",
        [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(password, salt);

      const userResult = await db(
        `INSERT INTO wabyone_users (email, password_hash, first_name, last_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, first_name, last_name`,
        [email, password_hash, first_name, last_name, phone || null]
      );
      const user = userResult.rows[0];

      const slug = org_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const orgResult = await db(
        `INSERT INTO wabyone_organizations (name, slug, email, theme_config)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, slug`,
        [
          org_name,
          slug + "-" + Date.now(),
          email,
          JSON.stringify({
            primaryColor:   "#6366f1",
            secondaryColor: "#8b5cf6",
            accentColor:    "#06b6d4",
            sidebarColor:   "#1e1b4b",
            theme:          "indigo",
          }),
        ]
      );
      const org = orgResult.rows[0];

      await db(
        `INSERT INTO wabyone_org_members (user_id, org_id, role, permissions)
         VALUES ($1, $2, 'owner', $3)`,
        [user.id, org.id, JSON.stringify(["all"])]
      );

      const token = jwt.sign(
        { userId: user.id, email: user.email, orgId: org.id, role: "owner" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.status(201).json({
        token,
        user: { ...user, role: "owner" },
        organization: org,
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, rememberMe } = req.body;

      // ✅ Explicit column list + ::text cast — fixes "Illegal arguments: string, object"
      const result = await db(
        `SELECT
           u.id,
           u.email,
           u.password_hash::text  AS password_hash,
           u.first_name,
           u.last_name,
           u.phone,
           u.avatar_url,
           u.is_active,
           om.org_id,
           om.role,
           o.name        AS org_name,
           o.slug        AS org_slug,
           o.theme_config
         FROM wabyone_users u
         JOIN wabyone_org_members om ON u.id = om.user_id
         JOIN wabyone_organizations o ON om.org_id = o.id
         WHERE u.email = $1 AND u.is_active = true
         LIMIT 1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const user = result.rows[0];

      // Guard: Google-only accounts have no password
      if (!user.password_hash) {
        return res.status(401).json({
          error: "This account uses Google Sign-In. Please sign in with Google.",
        });
      }

      const validPassword = await bcrypt.compare(
        password,
        toHashString(user.password_hash)
      );
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const expiresIn = rememberMe ? "30d" : "7d";
      const token = jwt.sign(
        {
          userId: user.id,
          email:  user.email,
          orgId:  user.org_id,
          role:   user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn }
      );

      res.json({
        token,
        user: {
          id:         user.id,
          email:      user.email,
          first_name: user.first_name,
          last_name:  user.last_name,
          phone:      user.phone,
          avatar_url: user.avatar_url,
          role:       user.role,
        },
        organization: {
          id:           user.org_id,
          name:         user.org_name,
          slug:         user.org_slug,
          theme_config: user.theme_config,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────
// GET CURRENT USER
// ─────────────────────────────────────────────
router.get("/me", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT
         u.id,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         u.avatar_url,
         u.tour_completed  AS user_tour_completed,
         u.tour_skipped    AS user_tour_skipped,
         om.role,
         om.permissions,
         o.id              AS org_id,
         o.name            AS org_name,
         o.slug            AS org_slug,
         o.theme_config,
         o.settings,
         o.logo_url,
         o.currency,
         o.industry,
         o.sub_industry,
         o.business_size,
         o.primary_goal,
         o.team_size,
         o.onboarding_completed,
         o.preset_applied,
         o.terminology,
         o.dashboard_config,
         o.feature_flags
       FROM wabyone_users u
       JOIN wabyone_org_members om ON u.id = om.user_id
       JOIN wabyone_organizations o ON om.org_id = o.id
       WHERE u.id = $1 AND om.org_id = $2`,
      [req.user.userId, req.user.orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const row = result.rows[0];
    res.json({
      user: {
        id:             row.id,
        email:          row.email,
        first_name:     row.first_name,
        last_name:      row.last_name,
        phone:          row.phone,
        avatar_url:     row.avatar_url,
        role:           row.role,
        tour_completed: row.user_tour_completed,
        tour_skipped:   row.user_tour_skipped,
      },
      organization: {
        id:                   row.org_id,
        name:                 row.org_name,
        slug:                 row.org_slug,
        theme_config:         row.theme_config,
        settings:             row.settings,
        logo_url:             row.logo_url,
        currency:             row.currency,
        industry:             row.industry,
        sub_industry:         row.sub_industry,
        business_size:        row.business_size,
        primary_goal:         row.primary_goal,
        team_size:            row.team_size,
        onboarding_completed: row.onboarding_completed,
        preset_applied:       row.preset_applied,
        terminology:          row.terminology      || {},
        dashboard_config:     row.dashboard_config  || {},
        feature_flags:        row.feature_flags     || {},
      },
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────
router.put("/profile", auth, async (req, res) => {
  try {
    const { first_name, last_name, phone } = req.body;
    const result = await db(
      `UPDATE wabyone_users
       SET first_name = COALESCE($1, first_name),
           last_name  = COALESCE($2, last_name),
           phone      = COALESCE($3, phone),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name, phone`,
      [first_name, last_name, phone, req.user.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ─────────────────────────────────────────────
// CHANGE PASSWORD  (authenticated)
// ─────────────────────────────────────────────
router.put(
  "/change-password",
  auth,
  [
    body("current_password").notEmpty(),
    body("new_password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { current_password, new_password } = req.body;

      // ✅ ::text cast
      const userResult = await db(
        "SELECT password_hash::text AS password_hash FROM wabyone_users WHERE id = $1",
        [req.user.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const { password_hash } = userResult.rows[0];

      if (!password_hash) {
        return res.status(400).json({
          error: "This account uses Google Sign-In. Password change is not applicable.",
        });
      }

      const valid = await bcrypt.compare(
        current_password,
        toHashString(password_hash)
      );
      if (!valid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(new_password, salt);
      await db(
        "UPDATE wabyone_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [hash, req.user.userId]
      );

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────
// GOOGLE LOGIN / REGISTER
// ─────────────────────────────────────────────
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload    = ticket.getPayload();
    const email      = payload.email;
    const first_name = payload.given_name  || "";
    const last_name  = payload.family_name || "";
    const avatar_url = payload.picture;

    let user, org;

    const existingUser = await db(
      "SELECT * FROM wabyone_users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      // ── EXISTING USER ──
      user = existingUser.rows[0];

      if (avatar_url && user.avatar_url !== avatar_url) {
        await db(
          "UPDATE wabyone_users SET avatar_url = $1, updated_at = NOW() WHERE id = $2",
          [avatar_url, user.id]
        );
        user.avatar_url = avatar_url;
      }

      const orgResult = await db(
        `SELECT om.org_id, om.role, o.name, o.slug
         FROM wabyone_org_members om
         JOIN wabyone_organizations o ON om.org_id = o.id
         WHERE om.user_id = $1
         LIMIT 1`,
        [user.id]
      );

      if (orgResult.rows.length > 0) {
        org = orgResult.rows[0];
      } else {
        const orgCreate = await db(
          `INSERT INTO wabyone_organizations (name, slug, email, theme_config)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            `${first_name}'s Organization`,
            `org-${Date.now()}`,
            email,
            JSON.stringify({
              primaryColor:   "#6366f1",
              secondaryColor: "#8b5cf6",
              accentColor:    "#06b6d4",
              sidebarColor:   "#1e1b4b",
              theme:          "indigo",
            }),
          ]
        );
        org = orgCreate.rows[0];
        await db(
          `INSERT INTO wabyone_org_members (user_id, org_id, role, permissions)
           VALUES ($1, $2, 'owner', $3)`,
          [user.id, org.id, JSON.stringify(["all"])]
        );
      }
    } else {
      // ── NEW USER ──
      const newUser = await db(
        `INSERT INTO wabyone_users
           (email, first_name, last_name, avatar_url, password_hash)
         VALUES ($1, $2, $3, $4, NULL)
         RETURNING *`,
        [email, first_name, last_name, avatar_url]
      );
      user = newUser.rows[0];

      const newOrg = await db(
        `INSERT INTO wabyone_organizations (name, slug, email, theme_config)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          `${first_name}'s Organization`,
          `org-${Date.now()}`,
          email,
          JSON.stringify({
            primaryColor:   "#6366f1",
            secondaryColor: "#8b5cf6",
            accentColor:    "#06b6d4",
            sidebarColor:   "#1e1b4b",
            theme:          "indigo",
          }),
        ]
      );
      org = newOrg.rows[0];

      await db(
        `INSERT INTO wabyone_org_members (user_id, org_id, role, permissions)
         VALUES ($1, $2, 'owner', $3)`,
        [user.id, org.id, JSON.stringify(["all"])]
      );
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email:  user.email,
        orgId:  org.org_id || org.id,
        role:   "owner",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id:         user.id,
        email:      user.email,
        first_name: user.first_name,
        last_name:  user.last_name,
        avatar_url: user.avatar_url,
      },
      organization: {
        id:   org.org_id || org.id,
        name: org.name,
        slug: org.slug,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({ error: "Google authentication failed" });
  }
});

// ─────────────────────────────────────────────
// FORGOT PASSWORD — STEP 1: Request OTP
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const userResult = await db(
        "SELECT id, first_name FROM wabyone_users WHERE email = $1 AND is_active = true",
        [email]
      );
      if (userResult.rows.length === 0) {
        return res.json({ message: "If that email exists, an OTP has been sent." });
      }

      const user = userResult.rows[0];

      // Rate limit: max 3 per 15 min
      const recentResult = await db(
        `SELECT COUNT(*) FROM wabyone_password_resets
         WHERE email = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
        [email]
      );
      if (parseInt(recentResult.rows[0].count, 10) >= 3) {
        return res.status(429).json({
          error: "Too many requests. Please wait 15 minutes before trying again.",
        });
      }

      // Invalidate previous unused OTPs
      await db(
        "UPDATE wabyone_password_resets SET used = true WHERE email = $1 AND used = false",
        [email]
      );

      const otp        = generateOTP();
      const salt       = await bcrypt.genSalt(10);
      const otp_hash   = await bcrypt.hash(otp, salt);
      const expires_at = new Date(Date.now() + 10 * 60 * 1000);

      await db(
        `INSERT INTO wabyone_password_resets (user_id, email, otp_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, email, otp_hash, expires_at]
      );

      try {
        await sendOtpEmail({ to: email, firstName: user.first_name, otp });
      } catch (mailErr) {
        console.error("Forgot password email error:", mailErr.message);
        // In dev, log OTP to console so testing is possible without SMTP
        if (process.env.NODE_ENV !== "production") {
          console.info(`[dev] OTP for ${email}: ${otp}`);
          return res.json({ message: "If that email exists, an OTP has been sent." });
        }
        // In production, return a clear error rather than a generic 500
        return res.status(503).json({
          error: "Email service is unavailable. Please contact support or try again later.",
        });
      }

      res.json({ message: "If that email exists, an OTP has been sent." });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────
// FORGOT PASSWORD — STEP 2: Verify OTP
// POST /api/auth/verify-otp
// ─────────────────────────────────────────────
router.post(
  "/verify-otp",
  [
    body("email").isEmail().normalizeEmail(),
    body("otp").isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, otp } = req.body;

      // ✅ ::text cast on otp_hash
      const result = await db(
        `SELECT id, user_id, otp_hash::text AS otp_hash, attempts
         FROM wabyone_password_resets
         WHERE email = $1 AND used = false AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: "OTP expired or not found. Please request a new one.",
        });
      }

      const record = result.rows[0];

      if (record.attempts >= 5) {
        await db(
          "UPDATE wabyone_password_resets SET used = true WHERE id = $1",
          [record.id]
        );
        return res.status(400).json({
          error: "Too many failed attempts. Please request a new OTP.",
        });
      }

      const valid = await bcrypt.compare(otp, toHashString(record.otp_hash));

      if (!valid) {
        await db(
          "UPDATE wabyone_password_resets SET attempts = attempts + 1 WHERE id = $1",
          [record.id]
        );
        const remaining = 4 - record.attempts;
        return res.status(400).json({
          error: `Incorrect OTP. ${remaining} attempt(s) remaining.`,
        });
      }

      // Mark OTP used
      await db(
        "UPDATE wabyone_password_resets SET used = true WHERE id = $1",
        [record.id]
      );

      // Issue reset token — store SHA-256 hash only
      const resetToken     = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

      await db(
        `INSERT INTO wabyone_password_resets
           (user_id, email, otp_hash, expires_at, used)
         VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes', false)`,
        [record.user_id, email, resetTokenHash]
      );

      res.json({
        message:     "OTP verified successfully.",
        reset_token: resetToken,
      });
    } catch (err) {
      console.error("Verify OTP error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

// ─────────────────────────────────────────────
// FORGOT PASSWORD — STEP 3: Reset Password
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
router.post(
  "/reset-password",
  [
    body("email").isEmail().normalizeEmail(),
    body("reset_token").notEmpty(),
    body("new_password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, reset_token, new_password } = req.body;

      const tokenHash = crypto
        .createHash("sha256")
        .update(reset_token)
        .digest("hex");

      const result = await db(
        `SELECT id, user_id
         FROM wabyone_password_resets
         WHERE email      = $1
           AND otp_hash   = $2
           AND used       = false
           AND expires_at > NOW()
         ORDER BY created_at DESC
         LIMIT 1`,
        [email, tokenHash]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({
          error: "Reset session expired or invalid. Please start over.",
        });
      }

      const record = result.rows[0];

      const salt          = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(new_password, salt);

      await db(
        "UPDATE wabyone_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [password_hash, record.user_id]
      );

      await db(
        "UPDATE wabyone_password_resets SET used = true WHERE id = $1",
        [record.id]
      );

      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

module.exports = router;