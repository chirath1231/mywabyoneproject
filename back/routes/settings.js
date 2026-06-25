const express = require("express");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get organization settings
router.get("/organization", auth, async (req, res) => {
  try {
    const result = await db(
      "SELECT * FROM wabyone_organizations WHERE id = $1",
      [req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Organization not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get org settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update organization settings
router.put("/organization", auth, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      phone,
      email,
      website,
      currency,
      tax_rate,
      logo_url,
      settings,
    } = req.body;
    const result = await db(
      `UPDATE wabyone_organizations SET
        name = COALESCE($1, name), description = COALESCE($2, description),
        address = COALESCE($3, address), phone = COALESCE($4, phone),
        email = COALESCE($5, email), website = COALESCE($6, website),
        currency = COALESCE($7, currency), tax_rate = COALESCE($8, tax_rate),
        logo_url = COALESCE($9, logo_url), settings = COALESCE($10, settings),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        name,
        description,
        address,
        phone,
        email,
        website,
        currency,
        tax_rate,
        logo_url,
        settings ? JSON.stringify(settings) : null,
        req.user.orgId,
      ],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Organization not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update org settings error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update theme config
router.put("/theme", auth, async (req, res) => {
  try {
    const { theme_config } = req.body;
    const result = await db(
      `UPDATE wabyone_organizations SET theme_config = $1, updated_at = NOW()
       WHERE id = $2 RETURNING theme_config`,
      [JSON.stringify(theme_config), req.user.orgId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Organization not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update theme error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get custom fields
router.get("/custom-fields", auth, async (req, res) => {
  try {
    const { entity_type } = req.query;
    let sql = `SELECT * FROM wabyone_custom_fields WHERE org_id = $1
               AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`;
    const params = [req.user.orgId, req.user.workspaceId || null];

    if (entity_type) {
      sql += " AND entity_type = $3";
      params.push(entity_type);
    }
    sql += " ORDER BY sort_order";

    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get custom fields error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create custom field
router.post("/custom-fields", auth, async (req, res) => {
  try {
    const {
      entity_type,
      field_name,
      field_label,
      field_type,
      options,
      is_required,
      sort_order,
    } = req.body;
    const result = await db(
      `INSERT INTO wabyone_custom_fields (org_id, workspace_id, entity_type, field_name, field_label, field_type, options, is_required, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.user.orgId,
        req.user.workspaceId || null,
        entity_type,
        field_name,
        field_label,
        field_type || "text",
        JSON.stringify(options || []),
        is_required || false,
        sort_order || 0,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create custom field error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete custom field
router.delete("/custom-fields/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "DELETE FROM wabyone_custom_fields WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Custom field not found" });
    res.json({ message: "Custom field deleted" });
  } catch (err) {
    console.error("Delete custom field error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get categories
router.get("/categories", auth, async (req, res) => {
  try {
    const { type } = req.query;
    let sql = `SELECT * FROM wabyone_categories WHERE org_id = $1
               AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    if (type) {
      sql += " AND type = $3";
      params.push(type);
    }
    sql += " ORDER BY name";
    const result = await db(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create category
router.post("/categories", auth, async (req, res) => {
  try {
    const { name, description, type, color } = req.body;
    const result = await db(
      `INSERT INTO wabyone_categories (org_id, workspace_id, name, description, type, color) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        req.user.orgId,
        req.user.workspaceId || null,
        name,
        description,
        type || "product",
        color,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete category
router.delete("/categories/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "DELETE FROM wabyone_categories WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("Delete category error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
