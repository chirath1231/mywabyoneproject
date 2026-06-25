// services/greenApiPartner.js
//
// Wraps the Green API *Partner* endpoints — the calls that create/destroy
// instances on your partner account. Requires a partner token from
// support@green-api.com (Account type must be "Partner" in their console).
//
// Docs: https://green-api.com/en/docs/partners/

const PARTNER_API_URL = process.env.GREEN_API_PARTNER_URL || "https://api.green-api.com";
const PARTNER_TOKEN = process.env.GREEN_API_PARTNER_TOKEN; // set in .env
const PUBLIC_WEBHOOK_BASE = process.env.PUBLIC_WEBHOOK_BASE; // e.g. https://yourapp.com/api/whatsapp/webhook

if (!PARTNER_TOKEN) {
  console.warn("[greenApiPartner] GREEN_API_PARTNER_TOKEN is not set — instance creation will fail.");
}

/**
 * Create a brand-new WhatsApp instance for one user/org.
 * webhookToken is a random secret you generate per instance and store in your DB —
 * Green API echoes it back in the `x-instance-token` style verification on each webhook
 * call (via webhookUrlToken), so you can confirm the request really came from Green API
 * for THIS instance before trusting the payload.
 */
async function createInstance({ name, webhookToken }) {
  const url = `${PARTNER_API_URL}/partner/createInstance/${PARTNER_TOKEN}`;

  const payload = {
    name,
    webhookUrl: `${PUBLIC_WEBHOOK_BASE}/${webhookToken}`,
    webhookUrlToken: webhookToken,
    incomingWebhook: "yes",
    stateWebhook: "yes",
    outgoingWebhook: "no",
    outgoingMessageWebhook: "no",
    outgoingAPIMessageWebhook: "no",
    pollMessageWebhook: "no",
    incomingCallWebhook: "no",
    markIncomingMessagesReaded: "no",
    delaySendMessagesMilliseconds: 1000,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Green API createInstance failed: ${JSON.stringify(data)}`);
  }

  // Response includes idInstance + apiTokenInstance
  return data; // { idInstance, apiTokenInstance, ... }
}

async function deleteInstance(idInstance) {
  const url = `${PARTNER_API_URL}/partner/deleteInstanceAccount/${PARTNER_TOKEN}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idInstance }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(`Green API deleteInstance failed: ${JSON.stringify(data)}`);
  }
  return true;
}

module.exports = { createInstance, deleteInstance };
