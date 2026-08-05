import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Truck,
  Phone,
  Mail,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function Suppliers() {
  const { organization } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadSuppliers = async () => {
    try {
      const res = await api.get("/suppliers", { params: { search } });
      setSuppliers(res.data.suppliers);
    } catch (err) {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadSuppliers(), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount || 0);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
  };

  const openEdit = (supplier) => {
    setEditing(supplier);
    setForm({
      name: supplier.name,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, form);
        toast.success("Supplier updated");
      } else {
        await api.post("/suppliers", form);
        toast.success("Supplier created");
      }
      setShowModal(false);
      resetForm();
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save supplier");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted");
      loadSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete supplier");
    }
  };

  return (
    <>
      <Header title="Suppliers" />
      <div className="page-content">
        <div className="page-header">
          <h1>Suppliers</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Add Supplier
          </button>
        </div>

        <div className="toolbar">
          <div className="search-input" style={{ position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="form-control"
              placeholder="Search suppliers..."
              style={{ paddingLeft: 40 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="empty-state">
              <Truck size={64} />
              <h3>No suppliers yet</h3>
              <p>Add your first supplier to get started</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus size={18} /> Add Supplier
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>Balance Due</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {s.name}
                        </div>
                        {s.contact_person && (
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {s.contact_person}
                          </div>
                        )}
                      </td>
                      <td>
                        {s.phone && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={14} /> {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Mail size={14} /> {s.email}
                          </div>
                        )}
                        {!s.phone && !s.email && "—"}
                      </td>
                      <td style={{ fontSize: 13 }}>{s.address || "—"}</td>
                      <td
                        style={{
                          color: parseFloat(s.balance_due) > 0 ? "var(--danger)" : "var(--text-muted)",
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(s.balance_due)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn-icon" onClick={() => openEdit(s)}>
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(s.id)}
                            style={{ color: "var(--danger)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <div className="modal-header">
                <h3>{editing ? "Edit Supplier" : "Add Supplier"}</h3>
                <button className="btn-icon" onClick={() => setShowModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.contact_person}
                      onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      className="form-control"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Update" : "Create"} Supplier
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
