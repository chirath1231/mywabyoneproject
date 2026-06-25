// services/greenApiInstance.js
//
// Wraps the standard (non-partner) Green API endpoints that operate on a
// single already-created instance: QR code, auth state, sending messages,
// logout.
//
// IMPORTANT: Green API now assigns each instance its own host, shown in
// their console as "apiUrl" (e.g. https://7107.api.greenapi.com — the
// subdomain is the first 4 digits of idInstance). The old shared host
// (https://api.green-api.com) does NOT reliably work for instances created
// this way. Every function here takes that instance's own `apiUrl` — pull
// it from the `whatsapp_instances.api_url` column, which you should store
// at insert/creation time alongside idInstance and apiTokenInstance.
//
// Docs: https://green-api.com/en/docs/api/

/**
 * Best-effort fallback if api_url wasn't stored for some row: Green API's
 * convention is host = first 4 digits of idInstance. Prefer passing the
 * real apiUrl from their console/API response instead of relying on this.
 */
function deriveApiUrl(idInstance) {
  const prefix = String(idInstance).slice(0, 4);
  return `https://${prefix}.api.greenapi.com`;
}

function instanceUrl(apiUrl, idInstance, method, apiTokenInstance) {
  const host = apiUrl || deriveApiUrl(idInstance);
  return `${host}/waInstance${idInstance}/${method}/${apiTokenInstance}`;
}

/**
 * "creating" -> null body -> still booting
 * "notAuthorized" -> ready, needs QR scan
 * "authorized" -> connected and usable
 * "blocked" / "sleepMode" -> needs attention
 */
async function getStateInstance(apiUrl, idInstance, apiTokenInstance) {
  const res = await fetch(instanceUrl(apiUrl, idInstance, "getStateInstance", apiTokenInstance));
  if (res.status === 204) return { stateInstance: "creating" };
  const data = await res.json();
  return data; // { stateInstance: "..." }
}

/**
 * Returns { type: "qrCode", message: "<base64 png>" } when ready,
 * or { type: "alreadyLogged" } if already authorized.
 */
async function getQr(apiUrl, idInstance, apiTokenInstance) {
  const res = await fetch(instanceUrl(apiUrl, idInstance, "qr", apiTokenInstance));
  const data = await res.json();
  return data;
}

async function sendMessage(apiUrl, idInstance, apiTokenInstance, { chatId, message }) {
  const res = await fetch(instanceUrl(apiUrl, idInstance, "sendMessage", apiTokenInstance), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Green API sendMessage failed: ${JSON.stringify(data)}`);
  return data; // { idMessage }
}

async function logout(apiUrl, idInstance, apiTokenInstance) {
  const res = await fetch(instanceUrl(apiUrl, idInstance, "logout", apiTokenInstance), {
    method: "GET",
  });
  return res.ok;
}

/**
 * Re-points an already-existing instance's webhook. Used in the pool model:
 * every time a free instance gets claimed by a new org, we repoint its
 * webhookUrl/webhookUrlToken to that org's freshly generated secret so
 * incoming messages route correctly and old tokens stop working.
 */
async function setSettings(apiUrl, idInstance, apiTokenInstance, { webhookUrl, webhookUrlToken }) {
  const res = await fetch(instanceUrl(apiUrl, idInstance, "setSettings", apiTokenInstance), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhookUrl,
      webhookUrlToken,
      incomingWebhook: "yes",
      stateWebhook: "yes",
      outgoingWebhook: "no",
      outgoingMessageWebhook: "no",
      outgoingAPIMessageWebhook: "no",
      pollMessageWebhook: "no",
      incomingCallWebhook: "no",
      markIncomingMessagesReaded: "no",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Green API setSettings failed: ${JSON.stringify(data)}`);
  return data;
}

/**
 * Normalizes a recipient phone number into a Green API chatId.
 * Accepts "+94771234567", "0094771234567", "94771234567", or an
 * already-formed chatId ("94771234567@c.us") and returns the latter.
 */
function toChatId(recipient) {
  if (!recipient) return recipient;
  const trimmed = recipient.trim();
  if (trimmed.endsWith("@c.us") || trimmed.endsWith("@g.us")) return trimmed;
  const digits = trimmed.replace(/[^\d]/g, "");
  return `${digits}@c.us`;
}

module.exports = {
  getStateInstance,
  getQr,
  sendMessage,
  logout,
  setSettings,
  toChatId,
  deriveApiUrl,
};