const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all invoices
router.get("/", auth, async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT i.*, c.first_name as customer_first_name, c.last_name as customer_last_name, c.email as customer_email
               FROM wabyone_invoices i
               LEFT JOIN wabyone_customers c ON i.customer_id = c.id
               WHERE i.org_id = $1
                 AND (i.workspace_id = $2 OR i.workspace_id IS NULL)`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    let paramIdx = 3;

    if (search) {
      sql += ` AND (i.invoice_number ILIKE $${paramIdx} OR c.first_name ILIKE $${paramIdx} OR c.last_name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (status) {
      sql += ` AND i.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    sql += ` ORDER BY i.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_invoices WHERE org_id = $1
         AND (workspace_id = $2 OR workspace_id IS NULL)`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      invoices: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get invoices error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single invoice with items
router.get("/:id", auth, async (req, res) => {
  try {
    const invoiceResult = await db(
      `SELECT i.*, c.first_name as customer_first_name, c.last_name as customer_last_name,
              c.email as customer_email, c.phone as customer_phone, c.address as customer_address
       FROM wabyone_invoices i
       LEFT JOIN wabyone_customers c ON i.customer_id = c.id
       WHERE i.id = $1 AND i.org_id = $2`,
      [req.params.id, req.user.orgId],
    );

    if (invoiceResult.rows.length === 0)
      return res.status(404).json({ error: "Invoice not found" });

    const itemsResult = await db(
      `SELECT ii.*, p.name as product_name, s.name as service_name
       FROM wabyone_invoice_items ii
       LEFT JOIN wabyone_products p ON ii.product_id = p.id
       LEFT JOIN wabyone_services s ON ii.service_id = s.id
       WHERE ii.invoice_id = $1 ORDER BY ii.created_at`,
      [req.params.id],
    );

    res.json({ ...invoiceResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error("Get invoice error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate next invoice number
async function getNextInvoiceNumber(orgId) {
  const result = await db(
    `SELECT invoice_number FROM wabyone_invoices WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId],
  );
  if (result.rows.length === 0) return "INV-0001";
  const last = result.rows[0].invoice_number;
  const num = parseInt(last.replace(/\D/g, "")) + 1;
  return `INV-${String(num).padStart(4, "0")}`;
}

// Create invoice
router.post(
  "/",
  auth,
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const {
        customer_id,
        items,
        notes,
        due_date,
        payment_method,
        discount_amount = 0,
        custom_fields,
      } = req.body;

      // Get org tax rate
      const orgResult = await db(
        "SELECT tax_rate FROM wabyone_organizations WHERE id = $1",
        [req.user.orgId],
      );
      const taxRate = parseFloat(orgResult.rows[0]?.tax_rate || 0);

      const invoice_number = await getNextInvoiceNumber(req.user.orgId);

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        const itemTotal =
          item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
        subtotal += itemTotal;
      }
      const tax_amount = subtotal * (taxRate / 100);
      const total = subtotal + tax_amount - (discount_amount || 0);

      // Create invoice
      const invoiceResult = await db(
        `INSERT INTO wabyone_invoices (org_id, workspace_id, customer_id, invoice_number, status, due_date, subtotal, tax_amount, discount_amount, total, notes, payment_method, custom_fields)
       VALUES ($1,$2,$3,$4,'draft',$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          customer_id,
          invoice_number,
          due_date,
          subtotal,
          tax_amount,
          discount_amount || 0,
          total,
          notes,
          payment_method,
          JSON.stringify(custom_fields || {}),
        ],
      );

      const invoice = invoiceResult.rows[0];

      // Create invoice items
      for (const item of items) {
        const itemTotal =
          item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
        await db(
          `INSERT INTO wabyone_invoice_items (invoice_id, product_id, service_id, description, quantity, unit_price, discount, total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            invoice.id,
            item.product_id || null,
            item.service_id || null,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount || 0,
            itemTotal,
          ],
        );
      }

      // Get items
      const itemsResult = await db(
        "SELECT * FROM wabyone_invoice_items WHERE invoice_id = $1",
        [invoice.id],
      );

      await db(
        `INSERT INTO wabyone_activity_log (org_id, user_id, action, entity_type, entity_id, details) VALUES ($1,$2,'created','invoice',$3,$4)`,
        [
          req.user.orgId,
          req.user.userId,
          invoice.id,
          JSON.stringify({ invoice_number, total }),
        ],
      );

      res.status(201).json({ ...invoice, items: itemsResult.rows });
    } catch (err) {
      console.error("Create invoice error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Update invoice status
router.patch(
  "/:id/status",
  auth,
  [body("status").isIn(["draft", "sent", "paid", "overdue", "cancelled"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { status } = req.body;

      // Fetch current status before updating
      const current = await db(
        `SELECT status FROM wabyone_invoices WHERE id = $1 AND org_id = $2`,
        [req.params.id, req.user.orgId],
      );
      if (current.rows.length === 0)
        return res.status(404).json({ error: "Invoice not found" });

      const oldStatus = current.rows[0].status;

      // No-op if status hasn't changed
      if (oldStatus === status) {
        const unchanged = await db(
          `SELECT i.*, c.first_name as customer_first_name, c.last_name as customer_last_name
           FROM wabyone_invoices i
           LEFT JOIN wabyone_customers c ON i.customer_id = c.id
           WHERE i.id = $1`,
          [req.params.id],
        );
        return res.json(unchanged.rows[0]);
      }

      // Build the UPDATE query — only set paid_at when transitioning TO paid,
      // preserve it when already set, clear it only when explicitly leaving paid.
      let updateSql;
      let updateParams;

      if (status === "paid" && oldStatus !== "paid") {
        // Transitioning to paid — stamp paid_at
        updateSql = `UPDATE wabyone_invoices SET status = $1, paid_at = NOW(), updated_at = NOW()
                     WHERE id = $2 AND org_id = $3 RETURNING *`;
        updateParams = [status, req.params.id, req.user.orgId];
      } else if (oldStatus === "paid" && status !== "paid") {
        // Reversing from paid — clear paid_at
        updateSql = `UPDATE wabyone_invoices SET status = $1, paid_at = NULL, updated_at = NOW()
                     WHERE id = $2 AND org_id = $3 RETURNING *`;
        updateParams = [status, req.params.id, req.user.orgId];
      } else {
        // Any other transition — don't touch paid_at
        updateSql = `UPDATE wabyone_invoices SET status = $1, updated_at = NOW()
                     WHERE id = $2 AND org_id = $3 RETURNING *`;
        updateParams = [status, req.params.id, req.user.orgId];
      }

      const result = await db(updateSql, updateParams);

      // ─── Stock management ────────────────────────────────────────────────
      // Fetch all product line-items for this invoice
      const invoiceItems = await db(
        `SELECT product_id, quantity FROM wabyone_invoice_items
         WHERE invoice_id = $1 AND product_id IS NOT NULL`,
        [req.params.id],
      );

      for (const item of invoiceItems.rows) {
        const qty = parseFloat(item.quantity);

        // 1. PAID: decrease actual quantity (stock leaves the shelf)
        if (status === "paid" && oldStatus !== "paid") {
          await db(
            `UPDATE wabyone_products
             SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );

          // If coming from "sent", also release the reserved quantity
          if (oldStatus === "sent") {
            await db(
              `UPDATE wabyone_products
               SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
               WHERE id = $2 AND org_id = $3`,
              [qty, item.product_id, req.user.orgId],
            );
          }
        }

        // 2. REVERSE from paid: restore actual quantity
        if (oldStatus === "paid" && status !== "paid") {
          await db(
            `UPDATE wabyone_products
             SET quantity = quantity + $1, updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );
        }

        // 3. SENT: reserve stock (soft-lock)
        if (status === "sent" && oldStatus !== "sent" && oldStatus !== "paid") {
          await db(
            `UPDATE wabyone_products
             SET reserved_quantity = GREATEST(0, reserved_quantity + $1), updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );
        }

        // 4. LEAVING sent (to draft/cancelled, not to paid — paid handles it above):
        if (oldStatus === "sent" && status !== "paid") {
          await db(
            `UPDATE wabyone_products
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Log status change
      await db(
        `INSERT INTO wabyone_activity_log (org_id, user_id, action, entity_type, entity_id, details)
         VALUES ($1,$2,'status_changed','invoice',$3,$4)`,
        [
          req.user.orgId,
          req.user.userId,
          req.params.id,
          JSON.stringify({ from: oldStatus, to: status }),
        ],
      );

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update invoice status error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Delete invoice
router.delete("/:id", auth, async (req, res) => {
  try {
    // If the invoice was paid or sent, restore stock before deleting
    const current = await db(
      `SELECT status FROM wabyone_invoices WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );

    if (current.rows.length === 0)
      return res.status(404).json({ error: "Invoice not found" });

    const { status } = current.rows[0];

    if (status === "paid" || status === "sent") {
      const invoiceItems = await db(
        `SELECT product_id, quantity FROM wabyone_invoice_items
         WHERE invoice_id = $1 AND product_id IS NOT NULL`,
        [req.params.id],
      );

      for (const item of invoiceItems.rows) {
        const qty = parseFloat(item.quantity);

        if (status === "paid") {
          // Restore actual stock
          await db(
            `UPDATE wabyone_products
             SET quantity = quantity + $1, updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );
        }

        if (status === "sent") {
          // Release reserved stock
          await db(
            `UPDATE wabyone_products
             SET reserved_quantity = GREATEST(0, reserved_quantity - $1), updated_at = NOW()
             WHERE id = $2 AND org_id = $3`,
            [qty, item.product_id, req.user.orgId],
          );
        }
      }
    }

    const result = await db(
      "DELETE FROM wabyone_invoices WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Invoice not found" });

    res.json({ message: "Invoice deleted" });
  } catch (err) {
    console.error("Delete invoice error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;