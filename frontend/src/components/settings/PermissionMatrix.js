import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/api";
import toast from "react-hot-toast";
import { Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Role-level baseline (By Role) + per-member override (By User) editor for
// the two grantable permission keys (process_returns, void_sales — see
// backend/utils/permissions.js). Both owner and admin can view this
// (GET /org/permissions/matrix allows either); only owner can save
// changes (PUT is owner-only server-side too — this component just avoids
// showing controls a non-owner's request would 403 on anyway).
export default function PermissionMatrix() {
  const { hasRole } = useAuth();
  const isOwner = hasRole("owner");

  const [matrix, setMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("role"); // "role" | "user"
  const [savingCell, setSavingCell] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [localOverrides, setLocalOverrides] = useState({});
  const [savingMatrix, setSavingMatrix] = useState(false);

  const loadMatrix = async () => {
    setLoading(true);
    try {
      const res = await api.get("/org/permissions/matrix");
      setMatrix(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load permission matrix");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, []);

  const isChecked = (permissionKey, kind, target) => {
    if (!matrix) return false;
    if (kind === "role") {
      return !!matrix.role_grants[target]?.[permissionKey];
    }
    const override = matrix.user_overrides[target]?.[permissionKey];
    if (override !== undefined) return override;
    const user = matrix.users.find((u) => u.id === target);
    return !!matrix.role_grants[user?.role]?.[permissionKey];
  };

  const toggleRoleCell = async (role, permissionKey, nextValue) => {
    const cellId = `role:${role}:${permissionKey}`;
    setSavingCell(cellId);
    try {
      await api.put("/org/permissions/matrix", {
        changes: [{ scope: "role", target: role, permission_key: permissionKey, is_granted: nextValue }],
      });
      await loadMatrix();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update permission");
    } finally {
      setSavingCell(null);
    }
  };

  // Re-sync the draft whenever the selected user or the live matrix
  // changes — covers both "switched user" and "just saved" in one effect.
  useEffect(() => {
    if (!matrix || !selectedUserId) {
      setLocalOverrides({});
      return;
    }
    const initial = {};
    matrix.permissions.forEach((p) => {
      initial[p.key] = isChecked(p.key, "user", selectedUserId);
    });
    setLocalOverrides(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, matrix]);

  const isDirty = useMemo(() => {
    if (!matrix || !selectedUserId) return false;
    return matrix.permissions.some(
      (p) => localOverrides[p.key] !== isChecked(p.key, "user", selectedUserId),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, selectedUserId, localOverrides]);

  const toggleDraftCell = (permissionKey) => {
    setLocalOverrides((prev) => ({ ...prev, [permissionKey]: !prev[permissionKey] }));
  };

  const setAllDraftCells = (value) => {
    if (!matrix) return;
    setLocalOverrides(Object.fromEntries(matrix.permissions.map((p) => [p.key, value])));
  };

  const saveChanges = async () => {
    if (!matrix || !selectedUserId) return;
    const changes = matrix.permissions
      .filter((p) => localOverrides[p.key] !== isChecked(p.key, "user", selectedUserId))
      .map((p) => ({
        scope: "member",
        target: selectedUserId,
        permission_key: p.key,
        is_granted: localOverrides[p.key],
      }));
    if (changes.length === 0) return;

    setSavingMatrix(true);
    try {
      await api.put("/org/permissions/matrix", { changes });
      await loadMatrix();
      toast.success(`Saved ${changes.length} permission change${changes.length > 1 ? "s" : ""}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save changes");
    } finally {
      setSavingMatrix(false);
    }
  };

  const selectUser = (userId) => {
    if (isDirty && !window.confirm("You have unsaved permission changes for this user. Discard them?")) {
      return;
    }
    setSelectedUserId(userId);
    setUserSearch("");
  };

  if (loading || !matrix) {
    return (
      <div className="card">
        <div className="loading-spinner"><div className="spinner" /></div>
      </div>
    );
  }

  const filteredUsers = matrix.users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });
  const selectedUser = matrix.users.find((u) => u.id === selectedUserId) || null;

  return (
    <div className="card">
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 className="card-title">Permission Matrix</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn ${viewMode === "role" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("role")}
          >
            By Role
          </button>
          <button
            className={`btn ${viewMode === "user" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setViewMode("user")}
          >
            By User (overrides)
          </button>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {viewMode === "role" ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Permission</th>
                  {matrix.roles.map((role) => (
                    <th key={role} style={{ textAlign: "center", textTransform: "capitalize" }}>
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.permissions.map((perm) => (
                  <tr key={perm.key}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{perm.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{perm.key}</div>
                    </td>
                    {matrix.roles.map((role) => {
                      const checked = isChecked(perm.key, "role", role);
                      const cellId = `role:${role}:${perm.key}`;
                      return (
                        <td key={role} style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            disabled={!isOwner || savingCell === cellId}
                            onClick={() => toggleRoleCell(role, perm.key, !checked)}
                            className="btn-icon"
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              border: `2px solid ${checked ? "var(--primary, #007bff)" : "var(--border)"}`,
                              background: checked ? "var(--primary, #007bff)" : "transparent",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isOwner ? "pointer" : "not-allowed",
                            }}
                          >
                            {checked && <Check size={14} />}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div className="form-group" style={{ maxWidth: 360 }}>
              <label>Search team member</label>
              <input
                type="text"
                className="form-control"
                value={selectedUser ? `${selectedUser.name} (${selectedUser.role})` : userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  if (selectedUserId) selectUser(null);
                }}
                placeholder="Search by name or role..."
              />
              {!selectedUser && userSearch && (
                <div
                  style={{
                    marginTop: 4,
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    maxHeight: 220,
                    overflowY: "auto",
                  }}
                >
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>
                      No matching team members.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => selectUser(u.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span>{u.name}</span>
                        <span className="badge badge-primary">{u.role}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {!selectedUser ? (
              <div className="empty-state">
                <p>Search and select a team member to manage their permission overrides.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginTop: 16 }}>
                <div style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--bg-tertiary)",
                    }}
                  >
                    <span style={{ fontSize: 13 }}>
                      Overrides for <strong>{selectedUser.name}</strong>
                      {isDirty && (
                        <span
                          className="badge"
                          style={{ marginLeft: 8, background: "rgba(245,158,11,0.15)", color: "#b45309" }}
                        >
                          Unsaved changes
                        </span>
                      )}
                    </span>
                    <button className="btn-icon" onClick={() => selectUser(null)} style={{ fontSize: 12 }}>
                      Change user
                    </button>
                  </div>
                  {matrix.permissions.map((perm) => {
                    const checked = !!localOverrides[perm.key];
                    const inheritedFromRole = !!matrix.role_grants[selectedUser.role]?.[perm.key];
                    return (
                      <div
                        key={perm.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{perm.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{perm.key}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            className="badge"
                            style={
                              inheritedFromRole
                                ? { background: "var(--bg-tertiary)", color: "var(--text-secondary)" }
                                : { background: "rgba(245,158,11,0.15)", color: "#b45309" }
                            }
                          >
                            {inheritedFromRole ? "Inherited" : "Override"}
                          </span>
                          <button
                            type="button"
                            disabled={!isOwner}
                            onClick={() => toggleDraftCell(perm.key)}
                            className="btn-icon"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              border: `2px solid ${checked ? "var(--primary, #007bff)" : "var(--border)"}`,
                              background: checked ? "var(--primary, #007bff)" : "transparent",
                              color: "#fff",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: isOwner ? "pointer" : "not-allowed",
                            }}
                          >
                            {checked && <Check size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {isOwner && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        padding: "10px 14px",
                        background: "var(--bg-tertiary)",
                      }}
                    >
                      <button
                        className="btn btn-primary"
                        disabled={!isDirty || savingMatrix}
                        onClick={saveChanges}
                      >
                        {savingMatrix ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>

                {isOwner && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                      <div style={{ fontWeight: 600 }}>{selectedUser.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{selectedUser.email}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                        Overrides here apply only to this member — their role's own baseline
                        (the By Role tab) is never changed by anything on this screen.
                      </div>
                    </div>
                    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Quick Actions</div>
                      <button className="btn btn-secondary" onClick={() => setAllDraftCells(true)}>
                        Grant All Overrides
                      </button>
                      <button className="btn btn-secondary" onClick={() => setAllDraftCells(false)}>
                        Clear All Overrides
                      </button>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Neither shortcut saves immediately — click Save Changes to commit.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
