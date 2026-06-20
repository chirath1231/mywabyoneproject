// src/api/whatsapp.js
//
// Uses the app's shared axios instance (src/api/api.js), which already
// attaches the Authorization header from localStorage["wabyone_token"] via
// its interceptor — same pattern as src/context/AuthContext.js's
// api.get("/auth/me"), api.post("/auth/login"), etc.
//
// Paths below do NOT include "/api" since that's already in api.js's baseURL.

import api from "./api";

function unwrapError(err) {
  const message =
    err.response?.data?.error ||
    err.response?.data?.errors?.[0]?.msg ||
    err.message ||
    "Request failed";
  const wrapped = new Error(message);
  wrapped.status = err.response?.status;
  wrapped.body = err.response?.data;
  return wrapped;
}

export async function listInstances() {
  try {
    const res = await api.get("/whatsapp");
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function connectInstance(name) {
  try {
    const res = await api.post("/whatsapp/connect", { name });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function getInstanceStatus(id) {
  try {
    const res = await api.get(`/whatsapp/${id}/status`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function updateSystemPrompt(id, systemPrompt) {
  try {
    const res = await api.put(`/whatsapp/${id}/system-prompt`, { systemPrompt });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function setAiEnabled(id, aiEnabled) {
  try {
    const res = await api.put(`/whatsapp/${id}/ai-enabled`, { aiEnabled });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function disconnectInstance(id) {
  try {
    const res = await api.delete(`/whatsapp/${id}`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function sendManualMessage(id, chatId, message) {
  try {
    const res = await api.post(`/whatsapp/${id}/send`, { chatId, message });
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function refreshWebhook(id) {
  try {
    const res = await api.post(`/whatsapp/${id}/refresh-webhook`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}

export async function getChatMessages(id, chatId) {
  try {
    const res = await api.get(`/whatsapp/${id}/chats/${chatId}/messages`);
    return res.data;
  } catch (err) {
    throw unwrapError(err);
  }
}