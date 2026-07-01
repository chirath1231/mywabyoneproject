const express = require("express");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get dashboard stats
router.get("/", auth, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const wsId = req.user.workspaceId || null;
    const wsFilter =
      "AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))";
    const wsFilterAlias = (a) =>
      `AND (${a}.workspace_id = $2 OR ($2::uuid IS NULL AND ${a}.workspace_id IS NULL))`;
    // Invoices without a workspace_id (e.g. storefront orders) should count in every
    // workspace view, matching the permissive filter invoices.js already uses to list them.
    const invoiceWsFilter = "AND (workspace_id = $2 OR workspace_id IS NULL)";
    const invoiceWsFilterAlias = (a) =>
      `AND (${a}.workspace_id = $2 OR ${a}.workspace_id IS NULL)`;

    const [
      products,
      services,
      customers,
      invoices,
      recentInvoices,
      revenue,
      activity,
    ] = await Promise.all([
      db(
        `SELECT COUNT(*) FROM wabyone_products WHERE org_id = $1 AND is_active = true ${wsFilter}`,
        [orgId, wsId],
      ),
      db(
        `SELECT COUNT(*) FROM wabyone_services WHERE org_id = $1 AND is_active = true ${wsFilter}`,
        [orgId, wsId],
      ),
      db(
        `SELECT COUNT(*) FROM wabyone_customers WHERE org_id = $1 ${wsFilter}`,
        [orgId, wsId],
      ),
      db(
        `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'paid') as paid,
            COUNT(*) FILTER (WHERE status = 'draft') as draft,
            COUNT(*) FILTER (WHERE status = 'sent') as sent,
            COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
            COALESCE(SUM(total), 0) as total_amount,
            COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as paid_amount,
            COALESCE(SUM(total) FILTER (WHERE status = 'sent'), 0) as sent_amount
          FROM wabyone_invoices WHERE org_id = $1 ${invoiceWsFilter}`,
        [orgId, wsId],
      ),
      db(
        `SELECT i.*, c.first_name as customer_first_name, c.last_name as customer_last_name
          FROM wabyone_invoices i
          LEFT JOIN wabyone_customers c ON i.customer_id = c.id
          WHERE i.org_id = $1 ${invoiceWsFilterAlias("i")} ORDER BY i.created_at DESC LIMIT 5`,
        [orgId, wsId],
      ),
      db(
        `SELECT DATE_TRUNC('month', created_at) as month, COALESCE(SUM(total), 0) as revenue
          FROM wabyone_invoices WHERE org_id = $1 AND status = 'paid'
          AND created_at >= NOW() - INTERVAL '12 months' ${invoiceWsFilter}
          GROUP BY DATE_TRUNC('month', created_at) ORDER BY month`,
        [orgId, wsId],
      ),
      db(
        `SELECT al.*, u.first_name, u.last_name
          FROM wabyone_activity_log al
          LEFT JOIN wabyone_users u ON al.user_id = u.id
          WHERE al.org_id = $1 ORDER BY al.created_at DESC LIMIT 10`,
        [orgId],
      ),
    ]);

    // Low stock products
    const lowStock = await db(
      `SELECT * FROM wabyone_products WHERE org_id = $1 AND quantity <= min_stock AND is_active = true ${wsFilter} ORDER BY quantity LIMIT 5`,
      [orgId, wsId],
    );

    res.json({
      stats: {
        products: parseInt(products.rows[0].count),
        services: parseInt(services.rows[0].count),
        customers: parseInt(customers.rows[0].count),
        invoices: {
          total: parseInt(invoices.rows[0].total),
          paid: parseInt(invoices.rows[0].paid),
          draft: parseInt(invoices.rows[0].draft),
          sent: parseInt(invoices.rows[0].sent),
          overdue: parseInt(invoices.rows[0].overdue),
          total_amount: parseFloat(invoices.rows[0].total_amount),
          paid_amount: parseFloat(invoices.rows[0].paid_amount),
          sent_amount: parseFloat(invoices.rows[0].sent_amount),
        },
      },
      recentInvoices: recentInvoices.rows,
      monthlyRevenue: revenue.rows,
      recentActivity: activity.rows,
      lowStockProducts: lowStock.rows,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
