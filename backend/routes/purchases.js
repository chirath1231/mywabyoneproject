const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all purchases
router.get("/", auth, async (req, res) => {
  try {
    const { search, supplier_id, status, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT p.*, s.name as supplier_name
               FROM wabyone_purchases p
               LEFT JOIN wabyone_suppliers s ON p.supplier_id = s.id
               WHERE p.org_id = $1
                 AND (p.workspace_id = $2 OR p.workspace_id IS NULL)`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    let paramIdx = 3;

    if (search) {
      sql += ` AND (p.purchase_number ILIKE $${paramIdx} OR p.bill_number ILIKE $${paramIdx} OR s.name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (supplier_id) {
      sql += ` AND p.supplier_id = $${paramIdx}`;
      params.push(supplier_id);
      paramIdx++;
    }
    if (status) {
      sql += ` AND p.status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }
    if (startDate) {
      sql += ` AND p.purchase_date >= $${paramIdx}`;
      params.push(startDate);
      paramIdx++;
    }
    if (endDate) {
      sql += ` AND p.purchase_date <= $${paramIdx}`;
      params.push(endDate);
      paramIdx++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_purchases WHERE org_id = $1
         AND (workspace_id = $2 OR workspace_id IS NULL)`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      purchases: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get purchases error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Stats for the purchases stat cards
router.get("/stats", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.user.orgId;
    const wsId = req.user.workspaceId || null;

    let periodSql = `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as value
                      FROM wabyone_purchases
                      WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL)
                        AND status != 'cancelled'`;
    const periodParams = [orgId, wsId];
    let idx = 3;
    if (startDate) {
      periodSql += ` AND purchase_date >= $${idx}`;
      periodParams.push(startDate);
      idx++;
    }
    if (endDate) {
      periodSql += ` AND purchase_date <= $${idx}`;
      periodParams.push(endDate);
      idx++;
    }
    const periodResult = await db(periodSql, periodParams);

    const outstandingResult = await db(
      `SELECT COALESCE(SUM(total - amount_paid), 0) as outstanding
       FROM wabyone_purchases
       WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL) AND status != 'cancelled'`,
      [orgId, wsId],
    );

    const allTimeResult = await db(
      `SELECT COALESCE(SUM(total), 0) as total FROM wabyone_purchases
       WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL) AND status != 'cancelled'`,
      [orgId, wsId],
    );

    const supplierCountResult = await db(
      `SELECT COUNT(*) FROM wabyone_suppliers
       WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL) AND is_active = true`,
      [orgId, wsId],
    );

    res.json({
      totalPurchases: parseInt(periodResult.rows[0].count),
      totalPurchaseValue: parseFloat(periodResult.rows[0].value),
      outstandingToSuppliers: parseFloat(outstandingResult.rows[0].outstanding),
      allTimePurchaseValue: parseFloat(allTimeResult.rows[0].total),
      activeSuppliers: parseInt(supplierCountResult.rows[0].count),
    });
  } catch (err) {
    console.error("Get purchase stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single purchase with items
router.get("/:id", auth, async (req, res) => {
  try {
    const purchaseResult = await db(
      `SELECT p.*, s.name as supplier_name, s.phone as supplier_phone, s.email as supplier_email
       FROM wabyone_purchases p
       LEFT JOIN wabyone_suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1 AND p.org_id = $2`,
      [req.params.id, req.user.orgId],
    );

    if (purchaseResult.rows.length === 0)
      return res.status(404).json({ error: "Purchase not found" });

    const itemsResult = await db(
      `SELECT pi.*, pr.name as product_name
       FROM wabyone_purchase_items pi
       LEFT JOIN wabyone_products pr ON pi.product_id = pr.id
       WHERE pi.purchase_id = $1 ORDER BY pi.created_at`,
      [req.params.id],
    );

    res.json({ ...purchaseResult.rows[0], items: itemsResult.rows });
  } catch (err) {
    console.error("Get purchase error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Generate next purchase number
async function getNextPurchaseNumber(orgId) {
  const result = await db(
    `SELECT purchase_number FROM wabyone_purchases WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orgId],
  );
  if (result.rows.length === 0) return "PO-0001";
  const last = result.rows[0].purchase_number;
  const num = parseInt(last.replace(/\D/g, "")) + 1;
  return `PO-${String(num).padStart(4, "0")}`;
}

// Create purchase
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
        supplier_id,
        bill_number,
        purchase_date,
        status = "pending",
        payment_method,
        amount_paid = 0,
        vat_percent = 0,
        discount = 0,
        shipping_charge = 0,
        notes,
        items,
      } = req.body;

      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantity * item.cost_rate;
      }
      const vat_amount = subtotal * (parseFloat(vat_percent) / 100);
      const total =
        subtotal + vat_amount - (parseFloat(discount) || 0) + (parseFloat(shipping_charge) || 0);

      const purchase_number = await getNextPurchaseNumber(req.user.orgId);

      const purchaseResult = await db(
        `INSERT INTO wabyone_purchases
          (org_id, workspace_id, supplier_id, purchase_number, bill_number, status, purchase_date,
           payment_method, subtotal, vat_percent, vat_amount, discount, shipping_charge, total, amount_paid, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          supplier_id || null,
          purchase_number,
          bill_number || null,
          status,
          purchase_date || new Date().toISOString().slice(0, 10),
          payment_method || "cash",
          subtotal,
          vat_percent || 0,
          vat_amount,
          discount || 0,
          shipping_charge || 0,
          total,
          amount_paid || 0,
          notes || null,
        ],
      );

      const purchase = purchaseResult.rows[0];

      for (const item of items) {
        const itemTotal = item.quantity * item.cost_rate;
        await db(
          `INSERT INTO wabyone_purchase_items (purchase_id, product_id, description, quantity, cost_rate, new_sell_rate, total)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            purchase.id,
            item.product_id || null,
            item.description,
            item.quantity,
            item.cost_rate,
            item.new_sell_rate || null,
            itemTotal,
          ],
        );
      }

      // If created directly as "received", apply stock immediately
      if (status === "received") {
        await applyStockChange(purchase.id, req.user.orgId, +1);
      }

      const itemsResult = await db(
        "SELECT * FROM wabyone_purchase_items WHERE purchase_id = $1",
        [purchase.id],
      );

      res.status(201).json({ ...purchase, items: itemsResult.rows });
    } catch (err) {
      console.error("Create purchase error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// direction: +1 to receive stock (increase qty, set cost/sell price), -1 to reverse (decrease qty only)
async function applyStockChange(purchaseId, orgId, direction) {
  const itemsResult = await db(
    `SELECT product_id, quantity, cost_rate, new_sell_rate FROM wabyone_purchase_items
     WHERE purchase_id = $1 AND product_id IS NOT NULL`,
    [purchaseId],
  );

  for (const item of itemsResult.rows) {
    const qty = parseFloat(item.quantity);

    if (direction > 0) {
      const setClauses = ["quantity = quantity + $1", "cost_price = $2", "updated_at = NOW()"];
      const params = [qty, item.cost_rate];
      let idx = 3;
      if (item.new_sell_rate) {
        setClauses.push(`price = $${idx}`);
        params.push(item.new_sell_rate);
        idx++;
      }
      params.push(item.product_id, orgId);
      await db(
        `UPDATE wabyone_products SET ${setClauses.join(", ")}
         WHERE id = $${idx} AND org_id = $${idx + 1}`,
        params,
      );
    } else {
      await db(
        `UPDATE wabyone_products
         SET quantity = GREATEST(0, quantity - $1), updated_at = NOW()
         WHERE id = $2 AND org_id = $3`,
        [qty, item.product_id, orgId],
      );
    }
  }
}

// Update purchase status
router.patch(
  "/:id/status",
  auth,
  [body("status").isIn(["pending", "received", "cancelled"])],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { status } = req.body;

      const current = await db(
        `SELECT status FROM wabyone_purchases WHERE id = $1 AND org_id = $2`,
        [req.params.id, req.user.orgId],
      );
      if (current.rows.length === 0)
        return res.status(404).json({ error: "Purchase not found" });

      const oldStatus = current.rows[0].status;
      if (oldStatus === status) {
        const unchanged = await db(
          `SELECT p.*, s.name as supplier_name FROM wabyone_purchases p
           LEFT JOIN wabyone_suppliers s ON p.supplier_id = s.id WHERE p.id = $1`,
          [req.params.id],
        );
        return res.json(unchanged.rows[0]);
      }

      const result = await db(
        `UPDATE wabyone_purchases SET status = $1, updated_at = NOW()
         WHERE id = $2 AND org_id = $3 RETURNING *`,
        [status, req.params.id, req.user.orgId],
      );

      if (status === "received" && oldStatus !== "received") {
        await applyStockChange(req.params.id, req.user.orgId, +1);
      } else if (oldStatus === "received" && status !== "received") {
        await applyStockChange(req.params.id, req.user.orgId, -1);
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update purchase status error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Record an additional payment against a purchase
router.patch(
  "/:id/payment",
  auth,
  [body("amount").isFloat({ gt: 0 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { amount } = req.body;
      const result = await db(
        `UPDATE wabyone_purchases SET amount_paid = amount_paid + $1, updated_at = NOW()
         WHERE id = $2 AND org_id = $3 RETURNING *`,
        [amount, req.params.id, req.user.orgId],
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: "Purchase not found" });

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Record purchase payment error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Delete purchase
router.delete("/:id", auth, async (req, res) => {
  try {
    const current = await db(
      `SELECT status FROM wabyone_purchases WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );

    if (current.rows.length === 0)
      return res.status(404).json({ error: "Purchase not found" });

    if (current.rows[0].status === "received") {
      await applyStockChange(req.params.id, req.user.orgId, -1);
    }

    const result = await db(
      "DELETE FROM wabyone_purchases WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Purchase not found" });

    res.json({ message: "Purchase deleted" });
  } catch (err) {
    console.error("Delete purchase error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
