// routes/whatsapp.js
const express = require("express");
const crypto = require("crypto");
const { body, validationResult } = require("express-validator");
const { query: db } = require("../config/db");
const { auth } = require("../middleware/auth");
const greenApiInstance = require("../services/greenApiInstance");
const gemini = require("../services/geminiService");

const router = express.Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genWebhookToken() {
  return crypto.randomBytes(24).toString("hex");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Random human-like delay before sending an AI reply, so messages don't go
// out instantly and read as bot traffic. Defaults to 0-10s, configurable
// via env without a code change.
const AI_REPLY_DELAY_MIN_MS = Number(process.env.AI_REPLY_DELAY_MIN_MS ?? 0);
const AI_REPLY_DELAY_MAX_MS = Number(process.env.AI_REPLY_DELAY_MAX_MS ?? 10000);

function randomReplyDelay() {
  const min = Math.min(AI_REPLY_DELAY_MIN_MS, AI_REPLY_DELAY_MAX_MS);
  const max = Math.max(AI_REPLY_DELAY_MIN_MS, AI_REPLY_DELAY_MAX_MS);
  return Math.floor(min + Math.random() * (max - min));
}

/**
 * Polls Green API after instance creation:
 *   1. getStateInstance every 5s until it stops being "creating"
 *   2. once "notAuthorized", fetch the QR every 2s and cache it
 *   3. stop once "authorized" (or after a timeout / terminal error state)
 *
 * NOTE: this runs in-process with setTimeout. Fine for moderate volume.
 * At higher scale, move this into a proper job queue (BullMQ, etc.) keyed
 * by instance id so it survives server restarts.
 */
async function pollInstanceUntilReady(instanceId, apiUrl, idInstance, apiTokenInstance) {
  const maxAttempts = 90; // ~ covers creation + several minutes of QR refresh
  let attempts = 0;

  const tick = async () => {
    attempts++;
    try {
      const state = await greenApiInstance.getStateInstance(apiUrl, idInstance, apiTokenInstance);
      const stateInstance = state?.stateInstance || "creating";

      if (stateInstance === "authorized") {
        await db(
          `UPDATE whatsapp_instances
           SET status = 'authorized', last_qr_code = NULL, updated_at = NOW()
           WHERE id = $1`,
          [instanceId],
        );
        return; // done
      }

      if (stateInstance === "notAuthorized" || stateInstance === "starting") {
        const qr = await greenApiInstance.getQr(apiUrl, idInstance, apiTokenInstance);
        if (qr?.type === "qrCode" && qr.message) {
          await db(
            `UPDATE whatsapp_instances
             SET status = 'qr_ready', last_qr_code = $2, updated_at = NOW()
             WHERE id = $1`,
            [instanceId, qr.message],
          );
        } else if (qr?.type === "alreadyLogged") {
          await db(
            `UPDATE whatsapp_instances
             SET status = 'authorized', last_qr_code = NULL, updated_at = NOW()
             WHERE id = $1`,
            [instanceId],
          );
          return; // done
        }
        if (attempts < maxAttempts) setTimeout(tick, 2000);
        return;
      }

      if (stateInstance === "blocked") {
        await db(
          `UPDATE whatsapp_instances SET status = 'blocked', updated_at = NOW() WHERE id = $1`,
          [instanceId],
        );
        return;
      }

      // still "creating" / booting
      await db(
        `UPDATE whatsapp_instances SET status = 'creating', updated_at = NOW() WHERE id = $1`,
        [instanceId],
      );
      if (attempts < maxAttempts) setTimeout(tick, 5000);
    } catch (err) {
      console.error("pollInstanceUntilReady error:", err.message);
      if (attempts < maxAttempts) setTimeout(tick, 5000);
      else
        await db(
          `UPDATE whatsapp_instances SET status = 'error', last_error = $2, updated_at = NOW() WHERE id = $1`,
          [instanceId, err.message],
        );
    }
  };

  tick();
}

// ---------------------------------------------------------------------------
// List all WhatsApp instances for the logged-in org
// ---------------------------------------------------------------------------
router.get("/", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT id, name, phone_number, status, system_prompt, ai_enabled, created_at
       FROM whatsapp_instances WHERE org_id = $1 ORDER BY created_at DESC`,
      [req.user.orgId],
    );
    res.json({ instances: result.rows });
  } catch (err) {
    console.error("List instances error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Claim a free instance from the pool and connect it to this org
// (kicks off QR flow). Fails with 409 if the pool is empty — that's your
// signal to provision more instances via the admin routes.
// ---------------------------------------------------------------------------
router.post(
  "/connect",
  auth,
  [body("name").trim().notEmpty().withMessage("name is required")],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name } = req.body;
      const webhookToken = genWebhookToken();

      // Atomically claim one free row from the pool (SKIP LOCKED avoids two
      // simultaneous signups racing for the same instance).
      const claimed = await db(
        `UPDATE whatsapp_instances
         SET org_id = $1, name = $2, webhook_token = $3, status = 'creating',
             assigned_at = NOW(), updated_at = NOW(),
             system_prompt = 'You are a helpful customer support assistant. Be concise and friendly.',
             ai_enabled = true, phone_number = NULL, last_qr_code = NULL, last_error = NULL
         WHERE id = (
           SELECT id FROM whatsapp_instances
           WHERE org_id IS NULL AND status = 'available'
           ORDER BY id LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, name, id_instance, api_token_instance, api_url, status, created_at`,
        [req.user.orgId, name, webhookToken],
      );

      if (!claimed.rows.length) {
        return res
          .status(409)
          .json({ error: "No WhatsApp instances available right now — contact support." });
      }

      const row = claimed.rows[0];

      // Repoint this instance's webhook at this org's fresh token
      await greenApiInstance.setSettings(row.api_url, row.id_instance, row.api_token_instance, {
        webhookUrl: `${process.env.PUBLIC_WEBHOOK_BASE}/${webhookToken}`,
        webhookUrlToken: webhookToken,
      });

      // Kick off background polling for QR / auth status
      pollInstanceUntilReady(row.id, row.api_url, row.id_instance, row.api_token_instance);

      res.status(201).json({ id: row.id, name: row.name, status: row.status, createdAt: row.created_at });
    } catch (err) {
      console.error("Connect WhatsApp error:", err);
      res.status(500).json({ error: "Failed to connect a WhatsApp instance" });
    }
  },
);

// ---------------------------------------------------------------------------
// Poll for QR code / connection status (frontend calls this every ~2s
// while showing the scan screen)
// ---------------------------------------------------------------------------
router.get("/:id/status", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT id, status, phone_number, last_qr_code, last_error
       FROM whatsapp_instances WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });

    const row = result.rows[0];
    res.json({
      id: row.id,
      status: row.status,
      phoneNumber: row.phone_number,
      qrCode: row.status === "qr_ready" ? row.last_qr_code : null, // base64 PNG
      error: row.last_error,
    });
  } catch (err) {
    console.error("Get status error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Re-point this instance's webhook at the CURRENT PUBLIC_WEBHOOK_BASE.
// Mainly for local dev: every time you restart ngrok (or similar), the old
// webhook URL Green API has on file goes dead. Call this after updating
// .env / restarting your tunnel instead of disconnecting and reconnecting.
// ---------------------------------------------------------------------------
router.post("/:id/refresh-webhook", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT id_instance, api_token_instance, api_url, webhook_token
       FROM whatsapp_instances WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });

    const instance = result.rows[0];

    if (!instance.webhook_token) {
      return res.status(400).json({ error: "This instance has no webhook token yet — connect it first." });
    }
    if (!process.env.PUBLIC_WEBHOOK_BASE) {
      return res.status(500).json({ error: "PUBLIC_WEBHOOK_BASE is not set on the server." });
    }

    const webhookUrl = `${process.env.PUBLIC_WEBHOOK_BASE}/${instance.webhook_token}`;

    await greenApiInstance.setSettings(instance.api_url, instance.id_instance, instance.api_token_instance, {
      webhookUrl,
      webhookUrlToken: instance.webhook_token,
    });

    res.json({ success: true, webhookUrl });
  } catch (err) {
    console.error("Refresh webhook error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Update the system prompt for an org's chatbot (per WhatsApp number)
// ---------------------------------------------------------------------------
router.put(
  "/:id/system-prompt",
  auth,
  [body("systemPrompt").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await db(
        `UPDATE whatsapp_instances
         SET system_prompt = $3, updated_at = NOW()
         WHERE id = $1 AND org_id = $2
         RETURNING id, system_prompt`,
        [req.params.id, req.user.orgId, req.body.systemPrompt],
      );
      if (!result.rows.length) return res.status(404).json({ error: "Not found" });
      res.json(result.rows[0]);
    } catch (err) {
      console.error("Update system prompt error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Toggle AI auto-reply on/off for an instance
// ---------------------------------------------------------------------------
router.put("/:id/ai-enabled", auth, [body("aiEnabled").isBoolean()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await db(
      `UPDATE whatsapp_instances SET ai_enabled = $3, updated_at = NOW()
       WHERE id = $1 AND org_id = $2 RETURNING id, ai_enabled`,
      [req.params.id, req.user.orgId, req.body.aiEnabled],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Toggle AI error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Disconnect — logs the instance out of WhatsApp and returns it to the pool
// (org_id wiped) so another user can claim it later. Doesn't delete the
// instance from Green API itself, since it's reusable.
// ---------------------------------------------------------------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const result = await db(
      `SELECT id_instance, api_token_instance, api_url FROM whatsapp_instances
       WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });

    const { id_instance, api_token_instance, api_url } = result.rows[0];

    try {
      await greenApiInstance.logout(api_url, id_instance, api_token_instance);
    } catch (e) {
      console.warn("Green API logout warning:", e.message);
      // continue releasing the row even if logout call had an issue
    }

    await db(
      `UPDATE whatsapp_instances
       SET org_id = NULL, name = NULL, webhook_token = NULL, phone_number = NULL,
           status = 'available', last_qr_code = NULL, last_error = NULL,
           assigned_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Disconnect error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// Manual send (e.g. agent replying from your dashboard instead of the bot)
// ---------------------------------------------------------------------------
router.post(
  "/:id/send",
  auth,
  [body("chatId").trim().notEmpty(), body("message").trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await db(
        `SELECT id_instance, api_token_instance, api_url FROM whatsapp_instances
         WHERE id = $1 AND org_id = $2 AND status = 'authorized'`,
        [req.params.id, req.user.orgId],
      );
      if (!result.rows.length)
        return res.status(404).json({ error: "Instance not found or not connected" });

      const { id_instance, api_token_instance, api_url } = result.rows[0];
      const { chatId, message } = req.body;

      const sent = await greenApiInstance.sendMessage(api_url, id_instance, api_token_instance, {
        chatId,
        message,
      });

      await db(
        `INSERT INTO whatsapp_messages (instance_id, org_id, chat_id, direction, body, id_message, ai_generated)
         VALUES ($1, $2, $3, 'out', $4, $5, false)`,
        [req.params.id, req.user.orgId, chatId, message, sent.idMessage],
      );

      res.status(201).json({ success: true, idMessage: sent.idMessage });
    } catch (err) {
      console.error("Manual send error:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// ---------------------------------------------------------------------------
// Green API webhook receiver — one URL per instance, verified by webhookToken
// in the path. This is PUBLIC (no `auth` middleware — Green API can't send
// your session cookies/JWT), so the webhookToken IS the authentication.
// ---------------------------------------------------------------------------
router.post("/webhook/:webhookToken", async (req, res) => {
  // ack immediately — Green API expects a fast 200, do the work after
  res.status(200).send("ok");

  try {
    const { webhookToken } = req.params;
    const payload = req.body;

    const result = await db(
      `SELECT * FROM whatsapp_instances WHERE webhook_token = $1`,
      [webhookToken],
    );
    if (!result.rows.length) {
      console.warn("Webhook with unknown token received, ignoring");
      return;
    }
    const instance = result.rows[0];

    // Extra sanity check: idInstance in payload should match our record
    if (
      payload?.instanceData?.idInstance &&
      String(payload.instanceData.idInstance) !== String(instance.id_instance)
    ) {
      console.warn("Webhook idInstance mismatch, ignoring");
      return;
    }

    if (payload.typeWebhook === "stateInstanceChanged") {
      const newState = payload.stateInstance; // e.g. authorized, notAuthorized, blocked
      await db(`UPDATE whatsapp_instances SET status = $2, updated_at = NOW() WHERE id = $1`, [
        instance.id,
        newState,
      ]);
      return;
    }

    if (payload.typeWebhook === "incomingMessageReceived") {
      const chatId = payload?.senderData?.chatId;
      const text =
        payload?.messageData?.textMessageData?.textMessage ||
        payload?.messageData?.extendedTextMessageData?.text;

      if (!chatId || !text) return; // skip non-text messages (images, stickers, etc.) for now

      await db(
        `INSERT INTO whatsapp_messages
           (instance_id, org_id, chat_id, direction, body, id_message, raw_payload)
         VALUES ($1, $2, $3, 'in', $4, $5, $6)`,
        [instance.id, instance.org_id, chatId, text, payload.idMessage, JSON.stringify(payload)],
      );

      if (!instance.ai_enabled || instance.status !== "authorized") return;

      // Pull last ~10 messages in this chat as context for Gemini
      const historyResult = await db(
        `SELECT direction, body FROM whatsapp_messages
         WHERE instance_id = $1 AND chat_id = $2
         ORDER BY created_at DESC LIMIT 10`,
        [instance.id, chatId],
      );
      const history = historyResult.rows.reverse().slice(0, -1); // drop the message we just inserted

      const replyText = await gemini.generateReply(instance.system_prompt, history, text);

      // Wait a random 0-10s before sending — an instant reply every time is
      // an easy bot signal, this makes the timing look human.
      await sleep(randomReplyDelay());

      const sent = await greenApiInstance.sendMessage(
        instance.api_url,
        instance.id_instance,
        instance.api_token_instance,
        { chatId, message: replyText },
      );

      await db(
        `INSERT INTO whatsapp_messages
           (instance_id, org_id, chat_id, direction, body, id_message, ai_generated)
         VALUES ($1, $2, $3, 'out', $4, $5, true)`,
        [instance.id, instance.org_id, chatId, replyText, sent.idMessage],
      );
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }
});

// ---------------------------------------------------------------------------
// Conversation history for a chat (for your dashboard's chat view)
// ---------------------------------------------------------------------------
router.get("/:id/chats/:chatId/messages", auth, async (req, res) => {
  try {
    const owns = await db(
      `SELECT id FROM whatsapp_instances WHERE id = $1 AND org_id = $2`,
      [req.params.id, req.user.orgId],
    );
    if (!owns.rows.length) return res.status(404).json({ error: "Not found" });

    const result = await db(
      `SELECT direction, body, ai_generated, created_at FROM whatsapp_messages
       WHERE instance_id = $1 AND chat_id = $2 ORDER BY created_at ASC`,
      [req.params.id, req.params.chatId],
    );
    res.json({ messages: result.rows });
  } catch (err) {
    console.error("Get chat messages error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;