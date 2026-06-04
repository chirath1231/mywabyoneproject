const express = require("express");
const { query: db } = require("../config/db");

const router = express.Router();

// GET /api/store/:slug — public storefront, no auth required
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const orgResult = await db(
      `SELECT id, name, slug, logo_url, description, phone, email, website,
              currency, theme_config, industry
       FROM wabyone_organizations
       WHERE slug = $1`,
      [slug]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "Store not found" });
    }

    const org = orgResult.rows[0];

    const productsResult = await db(
      `SELECT p.id, p.name, p.description, p.price, p.unit, p.image_url,
              c.name AS category_name
       FROM wabyone_products p
       LEFT JOIN wabyone_categories c ON p.category_id = c.id
       WHERE p.org_id = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [org.id]
    );

    const servicesResult = await db(
      `SELECT s.id, s.name, s.description, s.price, s.duration_minutes, s.image_url,
              c.name AS category_name
       FROM wabyone_services s
       LEFT JOIN wabyone_categories c ON s.category_id = c.id
       WHERE s.org_id = $1 AND s.is_active = true
       ORDER BY s.created_at DESC`,
      [org.id]
    );

    res.json({
      organization: {
        name:         org.name,
        slug:         org.slug,
        logo_url:     org.logo_url,
        description:  org.description,
        phone:        org.phone,
        email:        org.email,
        website:      org.website,
        currency:     org.currency,
        industry:     org.industry,
        theme_config: org.theme_config,
      },
      products: productsResult.rows,
      services: servicesResult.rows,
    });
  } catch (err) {
    console.error("Store route error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/store/:slug/:type/:id — public single-item detail
router.get("/:slug/:type/:id", async (req, res) => {
  const { slug, type, id } = req.params;

  if (!["product", "service"].includes(type)) {
    return res.status(400).json({ error: "Invalid item type" });
  }

  try {
    const orgResult = await db(
      `SELECT id, name, slug, logo_url, currency, theme_config, industry
       FROM wabyone_organizations WHERE slug = $1`,
      [slug]
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "Store not found" });
    }
    const org = orgResult.rows[0];

    let itemResult;
    if (type === "product") {
      itemResult = await db(
        `SELECT p.*, c.name AS category_name
         FROM wabyone_products p
         LEFT JOIN wabyone_categories c ON p.category_id = c.id
         WHERE p.id = $1 AND p.org_id = $2 AND p.is_active = true`,
        [id, org.id]
      );
    } else {
      itemResult = await db(
        `SELECT s.*, c.name AS category_name
         FROM wabyone_services s
         LEFT JOIN wabyone_categories c ON s.category_id = c.id
         WHERE s.id = $1 AND s.org_id = $2 AND s.is_active = true`,
        [id, org.id]
      );
    }

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({
      organization: {
        name:         org.name,
        slug:         org.slug,
        logo_url:     org.logo_url,
        currency:     org.currency,
        industry:     org.industry,
        theme_config: org.theme_config,
      },
      item: itemResult.rows[0],
      type,
    });
  } catch (err) {
    console.error("Store item detail error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/store/:slug/order — public storefront order (creates draft invoice)
router.post("/:slug/order", async (req, res) => {
  const { slug } = req.params;
  const { type, item_id, customer_name, customer_email, customer_phone } = req.body;

  if (!["product", "service"].includes(type)) {
    return res.status(400).json({ error: "Invalid item type" });
  }
  if (!item_id) {
    return res.status(400).json({ error: "item_id is required" });
  }

  try {
    const orgResult = await db(
      `SELECT id, currency, tax_rate FROM wabyone_organizations WHERE slug = $1`,
      [slug]
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "Store not found" });
    }
    const org = orgResult.rows[0];

    let itemResult;
    if (type === "product") {
      itemResult = await db(
        `SELECT id, name, price FROM wabyone_products WHERE id = $1 AND org_id = $2 AND is_active = true`,
        [item_id, org.id]
      );
    } else {
      itemResult = await db(
        `SELECT id, name, price FROM wabyone_services WHERE id = $1 AND org_id = $2 AND is_active = true`,
        [item_id, org.id]
      );
    }

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }
    const item = itemResult.rows[0];

    // Find or create customer when info is provided
    let customer_id = null;
    if (customer_name || customer_email) {
      const nameParts = (customer_name || "Guest").trim().split(" ");
      const firstName = nameParts[0];
      const lastName  = nameParts.slice(1).join(" ") || "";

      if (customer_email) {
        const existing = await db(
          `SELECT id FROM wabyone_customers WHERE org_id = $1 AND email = $2 LIMIT 1`,
          [org.id, customer_email]
        );
        if (existing.rows.length > 0) customer_id = existing.rows[0].id;
      }

      if (!customer_id) {
        const custResult = await db(
          `INSERT INTO wabyone_customers (org_id, first_name, last_name, email, phone)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [org.id, firstName, lastName, customer_email || null, customer_phone || null]
        );
        customer_id = custResult.rows[0].id;
      }
    }

    // Generate next invoice number
    const lastInv = await db(
      `SELECT invoice_number FROM wabyone_invoices WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [org.id]
    );
    let invoice_number = "INV-0001";
    if (lastInv.rows.length > 0) {
      const num = parseInt(lastInv.rows[0].invoice_number.replace(/\D/g, ""), 10) + 1;
      invoice_number = `INV-${String(num).padStart(4, "0")}`;
    }

    const price      = parseFloat(item.price);
    const taxRate    = parseFloat(org.tax_rate || 0);
    const subtotal   = price;
    const tax_amount = subtotal * (taxRate / 100);
    const total      = subtotal + tax_amount;

    const invoiceResult = await db(
      `INSERT INTO wabyone_invoices
         (org_id, customer_id, invoice_number, status, subtotal, tax_amount, discount_amount, total, notes, payment_method)
       VALUES ($1, $2, $3, 'draft', $4, $5, 0, $6, $7, 'bank_transfer') RETURNING id, invoice_number`,
      [
        org.id,
        customer_id,
        invoice_number,
        subtotal,
        tax_amount,
        total,
        `Storefront order — ${customer_name || "Guest"}`,
      ]
    );
    const invoice = invoiceResult.rows[0];

    const col = type === "product" ? "product_id" : "service_id";
    await db(
      `INSERT INTO wabyone_invoice_items (invoice_id, ${col}, description, quantity, unit_price, discount, total)
       VALUES ($1, $2, $3, 1, $4, 0, $5)`,
      [invoice.id, item.id, item.name, price, price]
    );

    res.json({ invoice_number: invoice.invoice_number });
  } catch (err) {
    console.error("Storefront order error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
