const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const { deleteOciImage } = require("./ociStorage"); // adjust path to match your structure

const router = express.Router();

/* ─────────────────────────────────────────────────────────────
   GET /products
───────────────────────────────────────────────────────────── */
router.get("/", auth, async (req, res) => {
  try {
    const { search, category_id, is_active, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.*, c.name AS category_name
      FROM   wabyone_products p
      LEFT JOIN wabyone_categories c ON p.category_id = c.id
      WHERE  p.org_id = $1
        AND  (p.workspace_id = $2 OR ($2::uuid IS NULL AND p.workspace_id IS NULL))`;

    const params = [req.user.orgId, req.user.workspaceId || null];
    let idx = 3;

    if (search) {
      sql += ` AND (p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.description ILIKE $${idx} OR p.serial_number ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (category_id) {
      sql += ` AND p.category_id = $${idx}`;
      params.push(category_id);
      idx++;
    }
    if (is_active !== undefined) {
      sql += ` AND p.is_active = $${idx}`;
      params.push(is_active === "true");
      idx++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_products
       WHERE org_id = $1
         AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      products: result.rows,
      total:    parseInt(countResult.rows[0].count),
      page:     parseInt(page),
      limit:    parseInt(limit),
    });
  } catch (err) {
    console.error("Get products error:", err.message, err.stack);
    res.status(500).json({ error: "Failed to fetch products", details: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   GET /products/:id
───────────────────────────────────────────────────────────── */
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT p.*, c.name AS category_name
       FROM   wabyone_products p
       LEFT JOIN wabyone_categories c ON p.category_id = c.id
       WHERE  p.id = $1 AND p.org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─────────────────────────────────────────────────────────────
   POST /products
───────────────────────────────────────────────────────────── */
router.post(
  "/",
  auth,
  [body("name").trim().notEmpty(), body("price").isFloat({ min: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        name, description, sku, barcode, serial_number,
        price, cost_price, quantity, min_stock, unit,
        image_url, category_id, custom_fields,
        has_warranty, warranty_months,
      } = req.body;

      if (has_warranty && (!warranty_months || parseInt(warranty_months) <= 0)) {
        return res.status(400).json({ error: "warranty_months must be a positive number when has_warranty is true" });
      }

      const result = await db(
        `INSERT INTO wabyone_products
           (org_id, workspace_id, name, description, sku, barcode, serial_number,
            price, cost_price, quantity, min_stock, unit,
            image_url, category_id, custom_fields, has_warranty, warranty_months)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          name,
          description    || null,
          sku            || null,
          barcode        || null,
          serial_number  || null,
          price,
          cost_price     || 0,
          quantity       || 0,
          min_stock      || 0,
          unit           || "pcs",
          image_url      || null,
          category_id    || null,
          JSON.stringify(custom_fields || {}),
          has_warranty   ? true : false,
          has_warranty && warranty_months ? parseInt(warranty_months) : null,
        ],
      );

      await db(
        `INSERT INTO wabyone_activity_log (org_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1,$2,'created','product',$3,$4)`,
        [req.user.orgId, req.user.userId, result.rows[0].id, JSON.stringify({ name })],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create product error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/* ─────────────────────────────────────────────────────────────
   PUT /products/:id
   If image_url changed and the old one was an OCI proxy URL,
   delete the old image from OCI.
───────────────────────────────────────────────────────────── */
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      name, description, sku, barcode, serial_number,
      price, cost_price, quantity, min_stock, unit,
      image_url, category_id, is_active, custom_fields,
      has_warranty, warranty_months,
    } = req.body;

    if (has_warranty && (!warranty_months || parseInt(warranty_months) <= 0)) {
      return res.status(400).json({ error: "warranty_months must be a positive number when has_warranty is true" });
    }

    // Fetch the current image_url BEFORE updating so we can clean it up if replaced
    const existing = await db(
      "SELECT image_url FROM wabyone_products WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Product not found" });
    const oldImageUrl = existing.rows[0].image_url;

    const result = await db(
      `UPDATE wabyone_products SET
         name            = COALESCE($1,  name),
         description     = COALESCE($2,  description),
         sku             = COALESCE($3,  sku),
         barcode         = COALESCE($4,  barcode),
         serial_number   = COALESCE($5,  serial_number),
         price           = COALESCE($6,  price),
         cost_price      = COALESCE($7,  cost_price),
         quantity        = COALESCE($8,  quantity),
         min_stock       = COALESCE($9,  min_stock),
         unit            = COALESCE($10, unit),
         image_url       = COALESCE($11, image_url),
         category_id     = COALESCE($12, category_id),
         is_active       = COALESCE($13, is_active),
         custom_fields   = COALESCE($14, custom_fields),
         has_warranty    = COALESCE($15, has_warranty),
         warranty_months = COALESCE($16, warranty_months),
         updated_at      = NOW()
       WHERE id = $17 AND org_id = $18
       RETURNING *`,
      [
        name          || null,
        description   !== undefined ? description   : null,
        sku           !== undefined ? sku           : null,
        barcode       !== undefined ? barcode       : null,
        serial_number !== undefined ? serial_number : null,
        price         !== undefined ? parseFloat(price)        : null,
        cost_price    !== undefined ? parseFloat(cost_price)   : null,
        quantity      !== undefined ? parseInt(quantity)       : null,
        min_stock     !== undefined ? parseInt(min_stock)      : null,
        unit          || null,
        image_url     !== undefined ? image_url     : null,
        category_id   !== undefined ? category_id   : null,
        is_active     !== undefined ? is_active     : null,
        custom_fields ? JSON.stringify(custom_fields) : null,
        has_warranty  !== undefined ? (has_warranty ? true : false) : null,
        has_warranty && warranty_months
          ? parseInt(warranty_months)
          : has_warranty === false
            ? null
            : warranty_months !== undefined
              ? parseInt(warranty_months)
              : null,
        req.params.id,
        req.user.orgId,
      ],
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Product not found" });

    // ── Clean up old OCI image if it was replaced with a different one ──
    const newImageUrl = result.rows[0].image_url;
    if (
      oldImageUrl &&
      oldImageUrl !== newImageUrl &&
      oldImageUrl.includes("image-proxy")
    ) {
      // Fire-and-forget — don't delay the response
      deleteOciImage(oldImageUrl).catch(() => {});
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ─────────────────────────────────────────────────────────────
   DELETE /products/:id
   Also deletes the associated OCI image if one exists.
───────────────────────────────────────────────────────────── */
router.delete("/:id", auth, async (req, res) => {
  try {
    // Fetch image_url before deleting so we can clean up OCI
    const existing = await db(
      "SELECT image_url FROM wabyone_products WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    const imageUrl = existing.rows[0].image_url;

    // Delete from DB
    await db(
      "DELETE FROM wabyone_products WHERE id = $1 AND org_id = $2",
      [req.params.id, req.user.orgId],
    );

    // ── Delete from OCI (fire-and-forget, never blocks the response) ──
    if (imageUrl && imageUrl.includes("image-proxy")) {
      deleteOciImage(imageUrl).catch(() => {});
    }

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;