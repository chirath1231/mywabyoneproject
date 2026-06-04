const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const { deleteOciImage } = require("./ociStorage");

const router = express.Router();

/* ── GET /services ─────────────────────────────────────────── */
router.get("/", auth, async (req, res) => {
  try {
    const { search, category_id, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT s.*, c.name AS category_name
      FROM   wabyone_services s
      LEFT JOIN wabyone_categories c ON s.category_id = c.id
      WHERE  s.org_id = $1
        AND  (s.workspace_id = $2 OR ($2::uuid IS NULL AND s.workspace_id IS NULL))`;

    const params = [req.user.orgId, req.user.workspaceId || null];
    let idx = 3;

    if (search) {
      sql += ` AND (s.name ILIKE $${idx} OR s.description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (category_id) {
      sql += ` AND s.category_id = $${idx}`;
      params.push(category_id);
      idx++;
    }

    sql += ` ORDER BY s.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result      = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_services WHERE org_id = $1
         AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      services: result.rows,
      total:    parseInt(countResult.rows[0].count),
      page:     parseInt(page),
      limit:    parseInt(limit),
    });
  } catch (err) {
    console.error("Get services error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── GET /services/:id ─────────────────────────────────────── */
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT s.*, c.name AS category_name
       FROM   wabyone_services s
       LEFT JOIN wabyone_categories c ON s.category_id = c.id
       WHERE  s.id = $1 AND s.org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Service not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get service error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── POST /services ────────────────────────────────────────── */
router.post(
  "/",
  auth,
  [body("name").trim().notEmpty(), body("price").isFloat({ min: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, description, price, duration_minutes, category_id, custom_fields, image_url } = req.body;

      const result = await db(
        `INSERT INTO wabyone_services
           (org_id, workspace_id, name, description, price, duration_minutes, category_id, custom_fields, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          name,
          description    || null,
          price,
          duration_minutes || null,
          category_id    || null,
          JSON.stringify(custom_fields || {}),
          image_url      || null,
        ],
      );

      await db(
        `INSERT INTO wabyone_activity_log (org_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1,$2,'created','service',$3,$4)`,
        [req.user.orgId, req.user.userId, result.rows[0].id, JSON.stringify({ name })],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create service error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ── PUT /services/:id ─────────────────────────────────────── */
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      name, description, price, duration_minutes,
      category_id, is_active, custom_fields, image_url,
    } = req.body;

    // Fetch old image_url before updating so we can clean up OCI if replaced
    const existing = await db(
      "SELECT image_url FROM wabyone_services WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Service not found" });

    const oldImageUrl = existing.rows[0].image_url;

    const result = await db(
      `UPDATE wabyone_services SET
         name             = COALESCE($1,  name),
         description      = COALESCE($2,  description),
         price            = COALESCE($3,  price),
         duration_minutes = COALESCE($4,  duration_minutes),
         category_id      = COALESCE($5,  category_id),
         is_active        = COALESCE($6,  is_active),
         custom_fields    = COALESCE($7,  custom_fields),
         image_url        = COALESCE($8,  image_url),
         updated_at       = NOW()
       WHERE id = $9 AND org_id = $10
       RETURNING *`,
      [
        name             || null,
        description      !== undefined ? description      : null,
        price            !== undefined ? parseFloat(price) : null,
        duration_minutes !== undefined ? parseInt(duration_minutes) || null : null,
        category_id      !== undefined ? category_id      : null,
        is_active        !== undefined ? is_active        : null,
        custom_fields    ? JSON.stringify(custom_fields)  : null,
        image_url        !== undefined ? image_url        : null,
        req.params.id,
        req.user.orgId,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Service not found" });

    // Clean up old OCI image if it was replaced
    const newImageUrl = result.rows[0].image_url;
    if (oldImageUrl && oldImageUrl !== newImageUrl && oldImageUrl.includes("image-proxy")) {
      deleteOciImage(oldImageUrl).catch(() => {});
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update service error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ── DELETE /services/:id ──────────────────────────────────── */
router.delete("/:id", auth, async (req, res) => {
  try {
    // Fetch image_url before deleting so we can clean up OCI
    const existing = await db(
      "SELECT image_url FROM wabyone_services WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );
    if (existing.rows.length === 0)
      return res.status(404).json({ error: "Service not found" });

    const imageUrl = existing.rows[0].image_url;

    await db(
      "DELETE FROM wabyone_services WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );

    // Delete from OCI — fire-and-forget
    if (imageUrl && imageUrl.includes("image-proxy")) {
      deleteOciImage(imageUrl).catch(() => {});
    }

    res.json({ message: "Service deleted" });
  } catch (err) {
    console.error("Delete service error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;