const express = require("express");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

router.get("/summary", auth, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const wsId  = req.user.workspaceId || null;

    // Date range — defaults to last 12 months if not provided
    const now      = new Date();
    const endDate  = req.query.endDate   ? new Date(req.query.endDate)   : now;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(new Date().setFullYear(now.getFullYear() - 1));

    const periodMs = endDate - startDate;

    // Equivalent previous period for growth comparison
    const prevEnd   = new Date(startDate);
    const prevStart = new Date(startDate - periodMs);

    const wsFilter = "AND (workspace_id = $2 OR ($2::uuid IS NULL AND workspace_id IS NULL))";
    // Invoices without a workspace_id (e.g. storefront orders) should count in every
    // workspace view, matching the permissive filter invoices.js already uses to list them.
    const invoiceWsFilter = "AND (workspace_id = $2 OR workspace_id IS NULL)";
    const invoiceWsFilterAlias = (a) => `AND (${a}.workspace_id = $2 OR ${a}.workspace_id IS NULL)`;

    const [
      invoiceStats,
      monthlyRevenue,
      topCustomers,
      topProducts,
      topServices,
      paymentMetrics,
      prevPeriodRevenue,
      invoiceList,
    ] = await Promise.all([

      // Invoice status breakdown within date range
      db(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'paid')      as paid,
           COUNT(*) FILTER (WHERE status = 'draft')     as draft,
           COUNT(*) FILTER (WHERE status = 'sent')      as sent,
           COUNT(*) FILTER (WHERE status = 'overdue')   as overdue,
           COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
           COALESCE(SUM(total), 0)                                     as total_billed,
           COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)      as total_collected,
           COALESCE(SUM(total) FILTER (WHERE status = 'overdue'), 0)   as total_overdue,
           COALESCE(SUM(total) FILTER (WHERE status = 'sent'), 0)      as total_outstanding,
           COALESCE(AVG(total) FILTER (WHERE status = 'paid'), 0)      as avg_invoice_value
         FROM wabyone_invoices
         WHERE org_id = $1 ${invoiceWsFilter}
           AND created_at >= $3 AND created_at <= $4`,
        [orgId, wsId, startDate, endDate]
      ),

      // Revenue grouped by month within date range
      db(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
           DATE_TRUNC('month', created_at)                    as month_date,
           COALESCE(SUM(total), 0)                            as revenue,
           COUNT(*)                                           as invoice_count
         FROM wabyone_invoices
         WHERE org_id = $1 AND status = 'paid' ${invoiceWsFilter}
           AND created_at >= $3 AND created_at <= $4
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month_date`,
        [orgId, wsId, startDate, endDate]
      ),

      // Top 5 customers by revenue in period
      db(
        `SELECT
           c.first_name, c.last_name,
           COUNT(i.id) as invoice_count,
           COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as total_paid,
           COALESCE(SUM(i.total), 0)                                   as total_billed
         FROM wabyone_customers c
         JOIN wabyone_invoices i ON i.customer_id = c.id
         WHERE c.org_id = $1
           AND (c.workspace_id = $2 OR ($2::uuid IS NULL AND c.workspace_id IS NULL))
           AND i.created_at >= $3 AND i.created_at <= $4
         GROUP BY c.id, c.first_name, c.last_name
         ORDER BY total_paid DESC
         LIMIT 5`,
        [orgId, wsId, startDate, endDate]
      ),

      // Top 5 products by revenue in period
      db(
        `SELECT
           p.name,
           SUM(ii.quantity)          as units_sold,
           COALESCE(SUM(ii.total), 0) as revenue
         FROM wabyone_invoice_items ii
         JOIN wabyone_products p  ON ii.product_id  = p.id
         JOIN wabyone_invoices i  ON ii.invoice_id  = i.id
         WHERE i.org_id = $1 AND i.status = 'paid'
           ${invoiceWsFilterAlias("i")}
           AND i.created_at >= $3 AND i.created_at <= $4
         GROUP BY p.id, p.name
         ORDER BY revenue DESC
         LIMIT 5`,
        [orgId, wsId, startDate, endDate]
      ),

      // Top 5 services by revenue in period
      db(
        `SELECT
           s.name,
           SUM(ii.quantity)          as units_sold,
           COALESCE(SUM(ii.total), 0) as revenue
         FROM wabyone_invoice_items ii
         JOIN wabyone_services s  ON ii.service_id = s.id
         JOIN wabyone_invoices i  ON ii.invoice_id = i.id
         WHERE i.org_id = $1 AND i.status = 'paid'
           ${invoiceWsFilterAlias("i")}
           AND i.created_at >= $3 AND i.created_at <= $4
         GROUP BY s.id, s.name
         ORDER BY revenue DESC
         LIMIT 5`,
        [orgId, wsId, startDate, endDate]
      ),

      // Payment metrics within period
      db(
        `SELECT
           COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - created_at)) / 86400), 0) as avg_days_to_pay,
           COUNT(*) FILTER (WHERE paid_at IS NOT NULL AND due_date IS NOT NULL AND paid_at <= due_date) as paid_on_time,
           COUNT(*) FILTER (WHERE paid_at IS NOT NULL) as total_paid_invoices
         FROM wabyone_invoices
         WHERE org_id = $1 AND status = 'paid' ${invoiceWsFilter}
           AND created_at >= $3 AND created_at <= $4`,
        [orgId, wsId, startDate, endDate]
      ),

      // Previous equivalent period revenue
      db(
        `SELECT COALESCE(SUM(total), 0) as revenue
         FROM wabyone_invoices
         WHERE org_id = $1 AND status = 'paid' ${invoiceWsFilter}
           AND created_at >= $3 AND created_at < $4`,
        [orgId, wsId, prevStart, prevEnd]
      ),

      // All invoices in period for PDF detail
      db(
        `SELECT
           i.invoice_number,
           i.created_at,
           i.total,
           i.status,
           c.first_name as customer_first_name,
           c.last_name  as customer_last_name
         FROM wabyone_invoices i
         LEFT JOIN wabyone_customers c ON i.customer_id = c.id
         WHERE i.org_id = $1
           ${invoiceWsFilterAlias("i")}
           AND i.created_at >= $3 AND i.created_at <= $4
         ORDER BY i.created_at DESC
         LIMIT 100`,
        [orgId, wsId, startDate, endDate]
      ),
    ]);

    const stats = invoiceStats.rows[0];
    const currentRevenue = monthlyRevenue.rows.reduce((s, r) => s + parseFloat(r.revenue), 0);
    const prevRevenue    = parseFloat(prevPeriodRevenue.rows[0]?.revenue || 0);
    const revenueGrowth  = prevRevenue > 0
      ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
      : null;

    const totalPaid     = parseInt(stats.paid);
    const totalInvoices = parseInt(stats.total);
    const collectionRate = totalInvoices > 0 ? (totalPaid / totalInvoices) * 100 : 0;

    const pm         = paymentMetrics.rows[0];
    const onTimeRate = parseInt(pm.total_paid_invoices) > 0
      ? (parseInt(pm.paid_on_time) / parseInt(pm.total_paid_invoices)) * 100
      : 0;

    res.json({
      period: {
        startDate: startDate.toISOString(),
        endDate:   endDate.toISOString(),
      },
      invoiceStats: {
        total:          totalInvoices,
        paid:           totalPaid,
        draft:          parseInt(stats.draft),
        sent:           parseInt(stats.sent),
        overdue:        parseInt(stats.overdue),
        cancelled:      parseInt(stats.cancelled),
        totalBilled:    parseFloat(stats.total_billed),
        totalCollected: parseFloat(stats.total_collected),
        totalOverdue:   parseFloat(stats.total_overdue),
        totalOutstanding: parseFloat(stats.total_outstanding),
        avgInvoiceValue: parseFloat(stats.avg_invoice_value),
        collectionRate: Math.round(collectionRate * 10) / 10,
      },
      monthlyRevenue: monthlyRevenue.rows.map(r => ({
        month:        r.month,
        revenue:      parseFloat(r.revenue),
        invoiceCount: parseInt(r.invoice_count),
      })),
      topCustomers: topCustomers.rows.map(c => ({
        name:         `${c.first_name} ${c.last_name}`,
        invoiceCount: parseInt(c.invoice_count),
        totalPaid:    parseFloat(c.total_paid),
        totalBilled:  parseFloat(c.total_billed),
      })),
      topProducts: topProducts.rows.map(p => ({
        name:      p.name,
        unitsSold: parseFloat(p.units_sold),
        revenue:   parseFloat(p.revenue),
      })),
      topServices: topServices.rows.map(s => ({
        name:      s.name,
        unitsSold: parseFloat(s.units_sold),
        revenue:   parseFloat(s.revenue),
      })),
      paymentMetrics: {
        avgDaysToPay: Math.round(parseFloat(pm.avg_days_to_pay) * 10) / 10,
        onTimeRate:   Math.round(onTimeRate * 10) / 10,
      },
      revenueGrowth,
      currentRevenue,
      prevRevenue,
      invoiceList: invoiceList.rows.map(i => ({
        invoiceNumber: i.invoice_number,
        date:          i.created_at,
        customer:      `${i.customer_first_name || ""} ${i.customer_last_name || ""}`.trim(),
        total:         parseFloat(i.total),
        status:        i.status,
      })),
    });
  } catch (err) {
    console.error("Reports summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
