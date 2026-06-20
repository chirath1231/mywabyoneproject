// routes/notifications.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const greenApiInstance = require("../services/greenApiInstance");

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

// Send email notification (via n8n webhook) — unchanged
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

// Send WhatsApp notification — now goes directly through the org's own
// connected Green API instance instead of n8n. Optionally pass
// `instanceId` in the body to pick which connected number to send from;
// otherwise the org's first authorized instance is used.
router.post(
  "/send-whatsapp",
  auth,
  [
    body("recipient").trim().notEmpty(),
    body("body").trim().notEmpty(),
    body("instanceId").optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { recipient, body: messageBody, metadata, instanceId } = req.body;

      // Save notification record first (so we always have an audit trail,
      // even if sending fails)
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
      const notification = result.rows[0];

      // Find the org's connected WhatsApp instance to send from
      const instanceResult = instanceId
        ? await db(
            `SELECT id, id_instance, api_token_instance, api_url FROM whatsapp_instances
             WHERE id = $1 AND org_id = $2 AND status = 'authorized'`,
            [instanceId, req.user.orgId],
          )
        : await db(
            `SELECT id, id_instance, api_token_instance, api_url FROM whatsapp_instances
             WHERE org_id = $1 AND status = 'authorized'
             ORDER BY assigned_at ASC LIMIT 1`,
            [req.user.orgId],
          );

      if (!instanceResult.rows.length) {
        await db(
          `UPDATE wabyone_notifications SET status = 'failed' WHERE id = $1`,
          [notification.id],
        );
        return res.status(409).json({
          error: "No connected WhatsApp number found for this org. Connect one first.",
          notification: { ...notification, status: "failed" },
        });
      }

      const instance = instanceResult.rows[0];
      const chatId = greenApiInstance.toChatId(recipient);

      try {
        const sent = await greenApiInstance.sendMessage(
          instance.api_url,
          instance.id_instance,
          instance.api_token_instance,
          { chatId, message: messageBody },
        );

        await db(
          `UPDATE wabyone_notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [notification.id],
        );
        notification.status = "sent";

        // Log into whatsapp_messages too, so this shows up in the chat
        // history Gemini uses if the customer replies later
        await db(
          `INSERT INTO whatsapp_messages (instance_id, org_id, chat_id, direction, body, id_message, ai_generated)
           VALUES ($1, $2, $3, 'out', $4, $5, false)`,
          [instance.id, req.user.orgId, chatId, messageBody, sent.idMessage],
        );
      } catch (sendErr) {
        console.error("Green API send-whatsapp error:", sendErr.message);
        await db(
          `UPDATE wabyone_notifications SET status = 'failed' WHERE id = $1`,
          [notification.id],
        );
        notification.status = "failed";
      }

      res.status(201).json(notification);
    } catch (err) {
      console.error("Send whatsapp error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;