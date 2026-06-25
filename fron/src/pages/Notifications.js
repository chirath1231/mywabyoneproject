import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { Bell, Send, MessageSquare, Mail, Phone } from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Notifications() {
  const { t: tWs } = useWorkspace();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    recipient: "",
    subject: "",
    body: "",
  });
  const [whatsappForm, setWhatsappForm] = useState({ recipient: "", body: "" });

  useEffect(() => {
    loadNotifications();
  }, [channel]);

  const loadNotifications = async () => {
    try {
      const res = await api.get("/notifications", { params: { channel } });
      setNotifications(res.data.notifications);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    try {
      await api.post("/notifications/send-email", emailForm);
      toast.success("Email sent");
      setShowEmailModal(false);
      setEmailForm({ recipient: "", subject: "", body: "" });
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send email");
    }
  };

  const sendWhatsapp = async (e) => {
    e.preventDefault();
    try {
      await api.post("/notifications/send-whatsapp", whatsappForm);
      toast.success("WhatsApp message sent");
      setShowWhatsappModal(false);
      setWhatsappForm({ recipient: "", body: "" });
      loadNotifications();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send message");
    }
  };

  return (
    <>
      <Header title={tWs("notifications", "Notifications")} />
      <div className="page-content">
        <div className="page-header">
          <h1>Notifications</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowEmailModal(true)}
            >
              <Mail size={18} /> Send Email
            </button>
            <button
              className="btn btn-success"
              onClick={() => setShowWhatsappModal(true)}
            >
              <MessageSquare size={18} /> Send WhatsApp
            </button>
          </div>
        </div>

        <div className="toolbar">
          <select
            className="form-control"
            style={{ width: 160 }}
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="">All Channels</option>
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={64} />
              <h3>No notifications yet</h3>
              <p>Send your first email or WhatsApp message</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <span
                          className={`badge ${n.channel === "email" ? "badge-info" : "badge-success"}`}
                        >
                          {n.channel === "email" ? (
                            <Mail size={12} style={{ marginRight: 4 }} />
                          ) : (
                            <Phone size={12} style={{ marginRight: 4 }} />
                          )}
                          {n.channel}
                        </span>
                      </td>
                      <td>{n.recipient}</td>
                      <td>{n.subject || n.body?.substring(0, 50)}</td>
                      <td>
                        <span
                          className={`badge ${n.status === "sent" ? "badge-success" : n.status === "failed" ? "badge-danger" : "badge-warning"}`}
                        >
                          {n.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {new Date(n.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 20, padding: 20 }}>
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            n8n Integration
          </h3>
          <p
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.8,
            }}
          >
            Email and WhatsApp messages are sent via n8n webhooks. Configure
            your n8n workflow to handle:
          </p>
          <ul
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 2,
              paddingLeft: 20,
            }}
          >
            <li>
              <code
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                POST /webhook/email
              </code>{" "}
              - Email notifications
            </li>
            <li>
              <code
                style={{
                  background: "var(--bg-tertiary)",
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                POST /webhook/whatsapp
              </code>{" "}
              - WhatsApp messages
            </li>
          </ul>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
            Set <code>N8N_WEBHOOK_URL</code> in your backend environment to
            connect.
          </p>
        </div>

        {/* Email Modal */}
        {showEmailModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowEmailModal(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Send Email</h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowEmailModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={sendEmail}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Recipient Email *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={emailForm.recipient}
                      onChange={(e) =>
                        setEmailForm({
                          ...emailForm,
                          recipient: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Subject *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={emailForm.subject}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, subject: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Message *</label>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={emailForm.body}
                      onChange={(e) =>
                        setEmailForm({ ...emailForm, body: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowEmailModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Send size={16} /> Send Email
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* WhatsApp Modal */}
        {showWhatsappModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowWhatsappModal(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Send WhatsApp Message</h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowWhatsappModal(false)}
                >
                  ×
                </button>
              </div>
              <form onSubmit={sendWhatsapp}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Recipient Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={whatsappForm.recipient}
                      onChange={(e) =>
                        setWhatsappForm({
                          ...whatsappForm,
                          recipient: e.target.value,
                        })
                      }
                      placeholder="+1234567890"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Message *</label>
                    <textarea
                      className="form-control"
                      rows={6}
                      value={whatsappForm.body}
                      onChange={(e) =>
                        setWhatsappForm({
                          ...whatsappForm,
                          body: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowWhatsappModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    <MessageSquare size={16} /> Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
