const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all suppliers
router.get("/", auth, async (req, res) => {
  try {
    const { search, is_active, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM wabyone_suppliers WHERE org_id = $1
               AND (workspace_id = $2 OR workspace_id IS NULL)`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    let paramIdx = 3;

    if (search) {
      sql += ` AND (name ILIKE $${paramIdx} OR contact_person ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (is_active !== undefined) {
      sql += ` AND is_active = $${paramIdx}`;
      params.push(is_active === "true");
      paramIdx++;
    }

    sql += ` ORDER BY name LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_suppliers WHERE org_id = $1
         AND (workspace_id = $2 OR workspace_id IS NULL)`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      suppliers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get suppliers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single supplier
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "SELECT * FROM wabyone_suppliers WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Supplier not found" });

    const purchases = await db(
      "SELECT * FROM wabyone_purchases WHERE supplier_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 20",
      [req.params.id, req.user.orgId],
    );

    res.json({ ...result.rows[0], purchases: purchases.rows });
  } catch (err) {
    console.error("Get supplier error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create supplier
router.post(
  "/",
  auth,
  [body("name").trim().notEmpty().withMessage("Name is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { name, contact_person, phone, email, address, notes } = req.body;
      const result = await db(
        `INSERT INTO wabyone_suppliers (org_id, workspace_id, name, contact_person, phone, email, address, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          name,
          contact_person || null,
          phone || null,
          email || null,
          address || null,
          notes || null,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create supplier error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Update supplier
router.put("/:id", auth, async (req, res) => {
  try {
    const { name, contact_person, phone, email, address, notes, is_active } = req.body;
    const result = await db(
      `UPDATE wabyone_suppliers SET
        name = COALESCE($1, name), contact_person = COALESCE($2, contact_person),
        phone = COALESCE($3, phone), email = COALESCE($4, email),
        address = COALESCE($5, address), notes = COALESCE($6, notes),
        is_active = COALESCE($7, is_active), updated_at = NOW()
       WHERE id = $8 AND org_id = $9 RETURNING *`,
      [
        name,
        contact_person,
        phone,
        email,
        address,
        notes,
        is_active,
        req.params.id,
        req.user.orgId,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Supplier not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update supplier error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete supplier
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "DELETE FROM wabyone_suppliers WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Supplier not found" });
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    console.error("Delete supplier error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
