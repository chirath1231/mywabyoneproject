import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import { ClipboardList } from "lucide-react";
import toast from "react-hot-toast";

export default function ActivityLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/activity-log")
      .then((res) => setEntries(res.data.entries))
      .catch(() => toast.error("Failed to load activity log"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header title="Activity Log" />
      <div className="page-content">
        <div className="page-header">
          <h1>Activity Log</h1>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : entries.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={64} />
              <h3>No activity yet</h3>
              <p>Actions like sales, returns, and permission changes will show up here</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 13 }}>{new Date(e.created_at).toLocaleString()}</td>
                      <td>{e.first_name ? `${e.first_name} ${e.last_name || ""}` : e.email || "System"}</td>
                      <td>{e.action}</td>
                      <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {e.entity_type ? `${e.entity_type}${e.entity_id ? ` #${String(e.entity_id).slice(0, 8)}` : ""}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
