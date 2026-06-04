const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Get notifications
router.get("/", auth, async (req, res) => {
  try {
    const { channel, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    let sql = "SELECT * FROM wabyone_notifications WHERE org_id = $1";
    const params = [req.user.orgId];
    let paramIdx = 2;

    if (channel) {
      sql += ` AND channel = $${paramIdx}`;
      params.push(channel);
      paramIdx++;
    }
    if (status) {
      sql += ` AND status = $${paramIdx}`;
      params.push(status);
      paramIdx++;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db(sql, params);
    const countResult = await db(
      "SELECT COUNT(*) FROM wabyone_notifications WHERE org_id = $1",
      [req.user.orgId],
    );

    res.json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Send email notification (via n8n webhook)
router.post(
  "/send-email",
  auth,
  [
    body("recipient").isEmail(),
    body("subject").trim().notEmpty(),
    body("body").trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { recipient, subject, body: emailBody, metadata } = req.body;

      // Save notification record
      const result = await db(
        `INSERT INTO wabyone_notifications (org_id, type, recipient, subject, body, channel, metadata, status)
       VALUES ($1, 'email', $2, $3, $4, 'email', $5, 'pending') RETURNING *`,
        [
          req.user.orgId,
          recipient,
          subject,
          emailBody,
          JSON.stringify(metadata || {}),
        ],
      );

      // Trigger n8n webhook
      const n8nUrl = process.env.N8N_WEBHOOK_URL;
      if (n8nUrl) {
        try {
          const response = await fetch(`${n8nUrl}/email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipient,
              subject,
              body: emailBody,
              notification_id: result.rows[0].id,
              org_id: req.user.orgId,
            }),
          });

          if (response.ok) {
            await db(
              `UPDATE wabyone_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
              [result.rows[0].id],
            );
            result.rows[0].status = "sent";
          }
        } catch (webhookErr) {
          console.error("n8n webhook error:", webhookErr.message);
          // Keep as pending - can retry later
        }
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Send email error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// Send WhatsApp notification (via n8n webhook)
router.post(
  "/send-whatsapp",
  auth,
  [body("recipient").trim().notEmpty(), body("body").trim().notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { recipient, body: messageBody, metadata } = req.body;

      // Save notification record
      const result = await db(
        `INSERT INTO wabyone_notifications (org_id, type, recipient, body, channel, metadata, status)
       VALUES ($1, 'whatsapp', $2, $3, 'whatsapp', $4, 'pending') RETURNING *`,
        [
          req.user.orgId,
          recipient,
          messageBody,
          JSON.stringify(metadata || {}),
        ],
      );

      // Trigger n8n webhook
      const n8nUrl = process.env.N8N_WEBHOOK_URL;
      if (n8nUrl) {
        try {
          const response = await fetch(`${n8nUrl}/whatsapp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: recipient,
              message: messageBody,
              notification_id: result.rows[0].id,
              org_id: req.user.orgId,
            }),
          });

          if (response.ok) {
            await db(
              `UPDATE wabyone_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
              [result.rows[0].id],
            );
            result.rows[0].status = "sent";
          }
        } catch (webhookErr) {
          console.error("n8n webhook error:", webhookErr.message);
        }
      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Send whatsapp error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
