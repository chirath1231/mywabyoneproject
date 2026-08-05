import React, { useState, useEffect } from "react";
import api from "../../api/api";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

// Shared by the standalone /users route (pages/Users.js) and the
// "Team Members" sub-tab of AccessControlStudio, so membership/role
// management lives in one place instead of two copies. Granular
// permission grants (role baselines + per-member overrides) live in the
// separate PermissionMatrix sub-tab, not here.
export default function AccessControlPanel() {
  const { hasRole } = useAuth();
  const isOwner = hasRole("owner");

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("staff");

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/org/members");
      setMembers(res.data.members);
    } catch (err) {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const addMember = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    try {
      await api.post("/org/members", { email: newEmail.trim(), role: newRole });
      toast.success("Member added");
      setNewEmail("");
      setNewRole("staff");
      loadMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add member");
    }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/org/members/${id}`, { role });
      toast.success("Role updated");
      loadMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update role");
    }
  };

  const removeMember = async (id) => {
    if (!window.confirm("Remove this member from the organization?")) return;
    try {
      await api.delete(`/org/members/${id}`);
      toast.success("Member removed");
      loadMembers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove member");
    }
  };

  return (
    <>
      {isOwner && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Add Team Member</h3>
          </div>
          <form onSubmit={addMember}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="teammate@example.com"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Role</label>
                <select className="form-control" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: 42 }}>
                <Plus size={16} /> Add
              </button>
            </div>
          </form>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            The person must already have a WabyOne account with this email.
          </p>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <UsersIcon size={64} />
            <p>No members found</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  {isOwner && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td>{m.first_name} {m.last_name}</td>
                    <td>{m.email}</td>
                    <td>
                      {isOwner ? (
                        <select
                          className="form-control"
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          style={{ width: 130 }}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span className="badge badge-primary">{m.role}</span>
                      )}
                    </td>
                    {isOwner && (
                      <td>
                        <button
                          className="btn-icon"
                          onClick={() => removeMember(m.id)}
                          style={{ color: "var(--danger)" }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
