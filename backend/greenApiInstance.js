// services/geminiService.js
//
// Generates a reply for an inbound WhatsApp message, using the org's own
// system prompt plus recent chat history as context.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

if (!GEMINI_API_KEY) {
  console.warn("[geminiService] GEMINI_API_KEY is not set — AI replies will fail.");
}

/**
 * @param {string} systemPrompt - the org's custom instructions for the bot
 * @param {Array<{direction: 'in'|'out', body: string}>} history - recent messages, oldest first
 * @param {string} incomingText - the newest customer message to respond to
 */
async function generateReply(systemPrompt, history, incomingText) {
  const contents = [
    ...history.map((m) => ({
      role: m.direction === "in" ? "user" : "model",
      parts: [{ text: m.body || "" }],
    })),
    { role: "user", parts: [{ text: incomingText }] },
  ];

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini API error: ${JSON.stringify(data)}`);
  }

  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  if (!reply.trim()) {
    throw new Error("Gemini returned an empty reply");
  }
  return reply.trim();
}

module.exports = { generateReply };
