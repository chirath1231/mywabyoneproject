const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get all expenses
router.get("/", auth, async (req, res) => {
  try {
    const { search, category_id, startDate, endDate, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = `SELECT e.*, c.name as category_name, c.color as category_color
               FROM wabyone_expenses e
               LEFT JOIN wabyone_categories c ON e.category_id = c.id
               WHERE e.org_id = $1
                 AND (e.workspace_id = $2 OR e.workspace_id IS NULL)`;
    const params = [req.user.orgId, req.user.workspaceId || null];
    let paramIdx = 3;

    if (search) {
      sql += ` AND (e.title ILIKE $${paramIdx} OR e.notes ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category_id) {
      sql += ` AND e.category_id = $${paramIdx}`;
      params.push(category_id);
      paramIdx++;
    }
    if (startDate) {
      sql += ` AND e.expense_date >= $${paramIdx}`;
      params.push(startDate);
      paramIdx++;
    }
    if (endDate) {
      sql += ` AND e.expense_date <= $${paramIdx}`;
      params.push(endDate);
      paramIdx++;
    }

    sql += ` ORDER BY e.expense_date DESC, e.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      `SELECT COUNT(*) FROM wabyone_expenses WHERE org_id = $1
         AND (workspace_id = $2 OR workspace_id IS NULL)`,
      [req.user.orgId, req.user.workspaceId || null],
    );

    res.json({
      expenses: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get expenses error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Stats for the expense log stat cards
router.get("/stats", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const orgId = req.user.orgId;
    const wsId = req.user.workspaceId || null;

    let periodSql = `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
                      FROM wabyone_expenses
                      WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL)`;
    const periodParams = [orgId, wsId];
    let idx = 3;
    if (startDate) {
      periodSql += ` AND expense_date >= $${idx}`;
      periodParams.push(startDate);
      idx++;
    }
    if (endDate) {
      periodSql += ` AND expense_date <= $${idx}`;
      periodParams.push(endDate);
      idx++;
    }
    const periodResult = await db(periodSql, periodParams);

    const topCategoryParams = [orgId, wsId, ...periodParams.slice(2)];
    let topCategorySql = `SELECT c.name, SUM(e.amount) as total
                           FROM wabyone_expenses e
                           LEFT JOIN wabyone_categories c ON e.category_id = c.id
                           WHERE e.org_id = $1 AND (e.workspace_id = $2 OR e.workspace_id IS NULL)`;
    let tIdx = 3;
    if (startDate) {
      topCategorySql += ` AND e.expense_date >= $${tIdx}`;
      tIdx++;
    }
    if (endDate) {
      topCategorySql += ` AND e.expense_date <= $${tIdx}`;
      tIdx++;
    }
    topCategorySql += ` GROUP BY c.name ORDER BY total DESC LIMIT 1`;
    const topCategoryResult = await db(topCategorySql, topCategoryParams);

    const allTimeResult = await db(
      `SELECT COALESCE(SUM(amount), 0) as total FROM wabyone_expenses
       WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL)`,
      [orgId, wsId],
    );

    const categoryCountResult = await db(
      `SELECT COUNT(*) FROM wabyone_categories
       WHERE org_id = $1 AND (workspace_id = $2 OR workspace_id IS NULL) AND type = 'expense'`,
      [orgId, wsId],
    );

    res.json({
      totalExpenses: parseFloat(periodResult.rows[0].total),
      totalBills: parseInt(periodResult.rows[0].count),
      topCategory: topCategoryResult.rows[0]?.name || null,
      allTimeTotal: parseFloat(allTimeResult.rows[0].total),
      totalCategories: parseInt(categoryCountResult.rows[0].count),
    });
  } catch (err) {
    console.error("Get expense stats error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get single expense
router.get("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT e.*, c.name as category_name
       FROM wabyone_expenses e
       LEFT JOIN wabyone_categories c ON e.category_id = c.id
       WHERE e.id = $1 AND e.org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Expense not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Get expense error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Create expense
router.post(
  "/",
  auth,
  [
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("amount").isFloat({ gt: 0 }).withMessage("Amount must be greater than 0"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { title, amount, category_id, expense_date, payment_method, notes } = req.body;

      const result = await db(
        `INSERT INTO wabyone_expenses (org_id, workspace_id, category_id, title, amount, expense_date, payment_method, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          req.user.orgId,
          req.user.workspaceId || null,
          category_id || null,
          title,
          amount,
          expense_date || new Date().toISOString().slice(0, 10),
          payment_method || "cash",
          notes || null,
        ],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Create expense error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Update expense
router.patch(
  "/:id",
  auth,
  [
    body("title").optional().trim().notEmpty(),
    body("amount").optional().isFloat({ gt: 0 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { title, amount, category_id, expense_date, payment_method, notes } = req.body;

      const result = await db(
        `UPDATE wabyone_expenses SET
           title = COALESCE($1, title),
           amount = COALESCE($2, amount),
           category_id = COALESCE($3, category_id),
           expense_date = COALESCE($4, expense_date),
           payment_method = COALESCE($5, payment_method),
           notes = COALESCE($6, notes),
           updated_at = NOW()
         WHERE id = $7 AND org_id = $8 RETURNING *`,
        [
          title,
          amount,
          category_id || null,
          expense_date,
          payment_method,
          notes,
          req.params.id,
          req.user.orgId,
        ],
      );

      if (result.rows.length === 0)
        return res.status(404).json({ error: "Expense not found" });

      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update expense error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Delete expense
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      "DELETE FROM wabyone_expenses WHERE id = $1 AND org_id = $2 RETURNING id",
      [req.params.id, req.user.orgId],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("Delete expense error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
