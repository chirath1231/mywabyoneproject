import React, { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users as UsersIcon,
  X,
  Phone,
  Mail,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";

export default function Customers() {
  const { t: tWs } = useWorkspace();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postal_code: "",
    notes: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const res = await api.get("/customers", { params: { search } });
      setCustomers(res.data.customers);
    } catch (err) {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => loadCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const resetForm = () => {
    setForm({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      whatsapp: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      notes: "",
    });
    setEditing(null);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      first_name: customer.first_name,
      last_name: customer.last_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      whatsapp: customer.whatsapp || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      country: customer.country || "",
      postal_code: customer.postal_code || "",
      notes: customer.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/customers/${editing.id}`, form);
        toast.success("Customer updated");
      } else {
        await api.post("/customers", form);
        toast.success("Customer created");
      }
      setShowModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save customer");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      loadCustomers();
    } catch (err) {
      toast.error("Failed to delete customer");
    }
  };

  return (
    <>
      <Header title={tWs("customers", "Customers")} />
      <div className="page-content">
        <div className="page-header">
          <h1>Customers</h1>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            <Plus size={18} /> Add Customer
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
              placeholder="Search customers..."
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
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <UsersIcon size={64} />
              <h3>No customers yet</h3>
              <p>Add your first customer to get started</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus size={18} /> Add Customer
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>WhatsApp</th>
                    <th>Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: "50%",
                              background: "var(--primary)",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 600,
                              fontSize: 14,
                              flexShrink: 0,
                            }}
                          >
                            {c.first_name[0]}
                            {c.last_name?.[0] || ""}
                          </div>
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: "var(--text-primary)",
                              }}
                            >
                              {c.first_name} {c.last_name}
                            </div>
                            {c.email && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {c.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.phone && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Phone size={14} /> {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Mail size={14} /> {c.email}
                          </div>
                        )}
                      </td>
                      <td>{c.whatsapp || "-"}</td>
                      <td style={{ fontSize: 13 }}>
                        {[c.city, c.country].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn-icon"
                            onClick={() => openEdit(c)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(c.id)}
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
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 640 }}
            >
              <div className="modal-header">
                <h3>{editing ? "Edit Customer" : "Add Customer"}</h3>
                <button
                  className="btn-icon"
                  onClick={() => setShowModal(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.first_name}
                        onChange={(e) =>
                          setForm({ ...form, first_name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.last_name}
                        onChange={(e) =>
                          setForm({ ...form, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>WhatsApp Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={form.whatsapp}
                      onChange={(e) =>
                        setForm({ ...form, whatsapp: e.target.value })
                      }
                      placeholder="+1234567890"
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea
                      className="form-control"
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.city}
                        onChange={(e) =>
                          setForm({ ...form, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.country}
                        onChange={(e) =>
                          setForm({ ...form, country: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea
                      className="form-control"
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Update" : "Create"} Customer
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
