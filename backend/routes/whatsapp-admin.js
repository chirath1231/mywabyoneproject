// routes/whatsapp-admin.js
//
// Dev/admin-only endpoints to stock the instance pool. Not exposed to
// regular org users — gate this router behind an admin check (swap the
// placeholder `requireAdmin` below for your real one).
const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const greenApiPartner = require("../services/greenApiPartner");
const { deriveApiUrl } = require("../services/greenApiInstance");

const router = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role !== "owner" && !req.user?.isAdmin)
    return res.status(403).json({ error: "Admin only" });
  next();
}

/**
 * Option A — bulk-create N fresh instances via the Partner API and drop
 * them straight into the pool, unassigned (org_id = NULL).
 */
router.post(
  "/instances/bulk-create",
  auth,
  requireAdmin,
  [body("count").isInt({ min: 1, max: 50 }), body("namePrefix").optional().trim()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { count, namePrefix = "Instance" } = req.body;
    const created = [];
    const failures = [];

    for (let i = 0; i < count; i++) {
      try {
        // webhookUrl/token are placeholders — real ones get set on assignment
        const result = await greenApiPartner.createInstance({
          name: `${namePrefix} ${Date.now()}-${i}`,
          webhookToken: crypto.randomBytes(8).toString("hex"),
        });
        const inserted = await db(
          `INSERT INTO whatsapp_instances (id_instance, api_token_instance, api_url, media_url, name, status)
           VALUES ($1, $2, $3, $4, $5, 'available')
           RETURNING id, id_instance, name, status`,
          [
            result.idInstance,
            result.apiTokenInstance,
            result.apiUrl || deriveApiUrl(result.idInstance),
            result.mediaUrl || null,
            `${namePrefix} ${i + 1}`,
          ],
        );
        created.push(inserted.rows[0]);
      } catch (err) {
        failures.push({ index: i, error: err.message });
      }
    }

    res.status(201).json({ created, failures });
  },
);

/**
 * Option B — manually paste credentials for an instance you created by hand
 * in the Green API console (no partner account needed for this path).
 */
router.post(
  "/instances/manual-add",
  auth,
  requireAdmin,
  [
    body("idInstance").notEmpty(),
    body("apiTokenInstance").trim().notEmpty(),
    body("apiUrl").optional().trim(),
    body("mediaUrl").optional().trim(),
    body("name").optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { idInstance, apiTokenInstance, apiUrl, mediaUrl, name } = req.body;
      const result = await db(
        `INSERT INTO whatsapp_instances (id_instance, api_token_instance, api_url, media_url, name, status)
         VALUES ($1, $2, $3, $4, $5, 'available')
         RETURNING id, id_instance, name, status`,
        [
          idInstance,
          apiTokenInstance,
          apiUrl || deriveApiUrl(idInstance),
          mediaUrl || null,
          name || `Instance ${idInstance}`,
        ],
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Manual add instance error:", err);
      res.status(500).json({ error: "Server error (idInstance may already exist)" });
    }
  },
);

// Pool overview — how many are free vs assigned
router.get("/instances/pool", auth, requireAdmin, async (req, res) => {
  try {
    const result = await db(
      `SELECT id, id_instance, name, org_id, status, created_at
       FROM whatsapp_instances ORDER BY (org_id IS NULL) DESC, created_at DESC`,
    );
    const available = result.rows.filter((r) => r.org_id === null).length;
    res.json({ total: result.rows.length, available, instances: result.rows });
  } catch (err) {
    console.error("Pool overview error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;