// src/components/whatsapp/StatusBadge.js
import "./whatsapp.css";

const STATUS_CONFIG = {
  available: { label: "Available", tone: "neutral" },
  creating: { label: "Setting up…", tone: "neutral" },
  notAuthorized: { label: "Waiting to scan", tone: "warning" },
  qr_ready: { label: "Scan to connect", tone: "warning" },
  authorized: { label: "Connected", tone: "success" },
  blocked: { label: "Blocked", tone: "danger" },
  sleepMode: { label: "Asleep", tone: "neutral" },
  error: { label: "Error", tone: "danger" },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, tone: "neutral" };
  return (
    <span className={`wa-badge wa-badge--${config.tone}`}>
      <span className="wa-badge__dot" />
      {config.label}
    </span>
  );
}
