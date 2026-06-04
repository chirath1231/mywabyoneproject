const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all customers
router.get("/", auth, async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT * FROM wabyone_customers WHERE org_id = $1
               AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    let paramIdx = 3;

    if (search) {
      sql += ` AND (first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR phone ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_customers WHERE org_id = $1
         AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get customers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single customer
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "SELECT * FROM wabyone_customers WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Customer not found" });

    // Get customer invoices
    const invoices = await db(
      "SELECT * FROM wabyone_invoices WHERE customer_id = $1 AND org_id = $2 ORDER BY created_at DESC LIMIT 20",
      [req.params.id, req.user.orgId],
    );

    res.json({ ...result.rows[0], invoices: invoices.rows });
  } catch (err) {
    console.error("Get customer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create customer
router.post(
  "/",
  auth,
  [body("first_name").trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const {
        first_name,
        last_name,
        email,
        phone,
        whatsapp,
        address,
        city,
        state,
        country,
        postal_code,
        notes,
        tags,
        custom_fields,
      } = req.body;
      const result = await db(
        `INSERT INTO wabyone_customers (org_id, workspace_id, first_name, last_name, email, phone, whatsapp, address, city, state, country, postal_code, notes, tags, custom_fields)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          first_name,
          last_name,
          email,
          phone,
          whatsapp,
          address,
          city,
          state,
          country,
          postal_code,
          notes,
          JSON.stringify(tags || []),
          JSON.stringify(custom_fields || {}),
        ],
      );

      await db(
        `INSERT INTO wabyone_activity_log (org_id, user_id, action, entity_type, entity_id, details) VALUES ($1,$2,'created','customer',$3,$4)`,
        [
          req.user.orgId,
          req.user.userId,
          result.rows[0].id,
          JSON.stringify({ first_name, last_name }),
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create customer error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Update customer
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      whatsapp,
      address,
      city,
      state,
      country,
      postal_code,
      notes,
      tags,
      custom_fields,
    } = req.body;
    const result = await db(
      `UPDATE wabyone_customers SET
        first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
        email = COALESCE($3, email), phone = COALESCE($4, phone),
        whatsapp = COALESCE($5, whatsapp), address = COALESCE($6, address),
        city = COALESCE($7, city), state = COALESCE($8, state),
        country = COALESCE($9, country), postal_code = COALESCE($10, postal_code),
        notes = COALESCE($11, notes), tags = COALESCE($12, tags),
        custom_fields = COALESCE($13, custom_fields), updated_at = NOW()
       WHERE id = $14 AND org_id = $15 RETURNING *`,
      [
        first_name,
        last_name,
        email,
        phone,
        whatsapp,
        address,
        city,
        state,
        country,
        postal_code,
        notes,
        tags ? JSON.stringify(tags) : null,
        custom_fields ? JSON.stringify(custom_fields) : null,
        req.params.id,
        req.user.orgId,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Customer not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update customer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete customer
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "DELETE FROM wabyone_customers WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Customer not found" });
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("Delete customer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
