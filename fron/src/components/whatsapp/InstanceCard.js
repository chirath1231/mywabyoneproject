// src/components/whatsapp/InstanceCard.js
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { updateSystemPrompt, setAiEnabled, disconnectInstance, refreshWebhook } from "../../api/whatsapp";
import "./whatsapp.css";

export default function InstanceCard({ instance, onChanged }) {
  const [prompt, setPrompt] = useState(instance.system_prompt || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isConnected = instance.status === "authorized";
  const promptDirty = prompt !== instance.system_prompt;

  async function handleSavePrompt() {
    setSaving(true);
    try {
      await updateSystemPrompt(instance.id, prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onChanged();
    } catch (err) {
      alert(`Couldn't save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAi() {
    setToggling(true);
    try {
      await setAiEnabled(instance.id, !instance.ai_enabled);
      onChanged();
    } catch (err) {
      alert(`Couldn't update: ${err.message}`);
    } finally {
      setToggling(false);
    }
  }

  async function handleRefreshWebhook() {
    setRefreshing(true);
    try {
      await refreshWebhook(instance.id);
      alert("Webhook refreshed — auto-reply should now work.");
    } catch (err) {
      alert(`Couldn't refresh webhook: ${err.message}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleDisconnect() {
    if (!window.confirm(`Disconnect "${instance.name}"? You'll need to scan a new QR code to reconnect.`)) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnectInstance(instance.id);
      onChanged();
    } catch (err) {
      alert(`Couldn't disconnect: ${err.message}`);
      setDisconnecting(false);
    }
  }

  return (
    <div className="wa-card">
      <div className="wa-card__header">
        <div>
          <h3 className="wa-card__title">{instance.name}</h3>
          {instance.phone_number && (
            <p className="wa-card__phone">{instance.phone_number}</p>
          )}
        </div>
        <StatusBadge status={instance.status} />
      </div>

      <div className="wa-card__row">
        <span className="wa-card__row-label">Auto-reply with AI</span>
        <button
          className={`wa-toggle ${instance.ai_enabled ? "wa-toggle--on" : ""}`}
          onClick={handleToggleAi}
          disabled={toggling || !isConnected}
          aria-pressed={instance.ai_enabled}
          aria-label="Toggle AI auto-reply"
        >
          <span className="wa-toggle__knob" />
        </button>
      </div>

      <button className="wa-card__expand" onClick={() => setExpanded((v) => !v)}>
        {expanded ? "Hide" : "Edit"} chatbot instructions
        <span className={`wa-card__chevron ${expanded ? "wa-card__chevron--up" : ""}`}>⌄</span>
      </button>

      {expanded && (
        <div className="wa-card__prompt-area">
          <label className="wa-card__prompt-label" htmlFor={`prompt-${instance.id}`}>
            What should this bot do when a customer messages this number?
          </label>
          <textarea
            id={`prompt-${instance.id}`}
            className="wa-textarea"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. You are a support assistant for Acme Co. Answer questions about orders and shipping. If you don't know something, say a team member will follow up."
          />
          <div className="wa-card__prompt-actions">
            <button
              className="wa-button wa-button--primary wa-button--small"
              onClick={handleSavePrompt}
              disabled={!promptDirty || saving}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save instructions"}
            </button>
          </div>
        </div>
      )}

      <div className="wa-card__footer">
        <button
          className="wa-button wa-button--secondary-text"
          onClick={handleRefreshWebhook}
          disabled={refreshing || !isConnected}
          title="Re-register the webhook URL with Green API (fixes auto-reply after server URL changes)"
        >
          {refreshing ? "Refreshing…" : "Refresh Webhook"}
        </button>
        <button
          className="wa-button wa-button--danger-text"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    </div>
  );
}
