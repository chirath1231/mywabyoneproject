import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  Receipt,
  Layers,
  X,
  Download,
  Wallet,
  Tag,
  FileStack,
  TrendingUp,
  Boxes,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { exportToCsv } from "../utils/csv";

const PERIODS = [
  { label: "Today", key: "today" },
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
  { label: "All", key: "all" },
  { label: "Custom", key: "custom" },
];

function getPeriodDates(key) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  switch (key) {
    case "today":
      return { start: today, end: today };
    case "week": {
      const s = new Date(now);
      s.setDate(s.getDate() - s.getDay());
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: s.toISOString().slice(0, 10), end: today };
    }
    case "all":
    default:
      return { start: "", end: "" };
  }
}

const PAYMENT_METHODS = ["cash", "card", "bank_transfer", "cheque", "other"];

const emptyForm = {
  title: "",
  amount: "",
  category_id: "",
  expense_date: new Date().toISOString().slice(0, 10),
  payment_method: "cash",
  notes: "",
};

export default function Expenses() {
  const { organization } = useAuth();
  const [tab, setTab] = useState("log");

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", color: "#6366f1" });

  const activeDates = period === "custom" ? { start: customStart, end: customEnd } : getPeriodDates(period);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: organization?.currency || "USD",
    }).format(amount || 0);

  const loadCategories = useCallback(async () => {
    try {
      const res = await api.get("/settings/categories", { params: { type: "expense" } });
      setCategories(res.data);
    } catch (err) {
      toast.error("Failed to load expense categories");
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, statsRes] = await Promise.all([
        api.get("/expenses", {
          params: {
            search,
            category_id: categoryFilter,
            startDate: activeDates.start || undefined,
            endDate: activeDates.end || undefined,
          },
        }),
        api.get("/expenses/stats", {
          params: {
            startDate: activeDates.start || undefined,
            endDate: activeDates.end || undefined,
          },
        }),
      ]);
      setExpenses(expRes.data.expenses);
      setStats(statsRes.data);
    } catch (err) {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, activeDates.start, activeDates.end]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => loadExpenses(), 250);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const openAddExpense = () => {
    setEditingExpense(null);
    setForm(emptyForm);
    setShowExpenseModal(true);
  };

  const openEditExpense = (exp) => {
    setEditingExpense(exp);
    setForm({
      title: exp.title,
      amount: exp.amount,
      category_id: exp.category_id || "",
      expense_date: exp.expense_date?.slice(0, 10) || "",
      payment_method: exp.payment_method || "cash",
      notes: exp.notes || "",
    });
    setShowExpenseModal(true);
  };

  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        category_id: form.category_id || null,
      };
      if (editingExpense) {
        await api.patch(`/expenses/${editingExpense.id}`, payload);
        toast.success("Expense updated");
      } else {
        await api.post("/expenses", payload);
        toast.success("Expense added");
      }
      setShowExpenseModal(false);
      loadExpenses();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save expense");
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Expense deleted");
      loadExpenses();
    } catch (err) {
      toast.error("Failed to delete expense");
    }
  };

  const handleExport = () => {
    if (expenses.length === 0) return;
    exportToCsv(
      "expenses.csv",
      expenses.map((e) => ({
        Title: e.title,
        Amount: e.amount,
        Category: e.category_name || "",
        Date: e.expense_date?.slice(0, 10) || "",
        "Payment Method": e.payment_method,
        Notes: e.notes || "",
      })),
    );
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post("/settings/categories", { ...categoryForm, type: "expense" });
      toast.success("Category added");
      setShowCategoryModal(false);
      setCategoryForm({ name: "", description: "", color: "#6366f1" });
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add category");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api.delete(`/settings/categories/${id}`);
      toast.success("Category deleted");
      loadCategories();
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()),
  );

  return (
    <>
      <Header title="Expenses" />
      <div className="page-content">
        <div className="page-header">
          <h1>Expenses</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
          <button
            onClick={() => setTab("log")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 14,
              color: tab === "log" ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: tab === "log" ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            <Receipt size={16} /> Expense Log
          </button>
          <button
            onClick={() => setTab("categories")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 14,
              color: tab === "categories" ? "var(--primary)" : "var(--text-secondary)",
              borderBottom: tab === "categories" ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            <Layers size={16} /> Expense Categories
          </button>
        </div>

        {tab === "log" ? (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon primary"><Wallet size={24} /></div>
                <div className="stat-info">
                  <h3>{formatCurrency(stats.totalExpenses)}</h3>
                  <p>Total Expenses</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon accent"><Tag size={24} /></div>
                <div className="stat-info">
                  <h3>{stats.topCategory || "—"}</h3>
                  <p>Top Expense Category</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon success"><FileStack size={24} /></div>
                <div className="stat-info">
                  <h3>{stats.totalBills || 0}</h3>
                  <p>Total Bills</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon warning"><TrendingUp size={24} /></div>
                <div className="stat-info">
                  <h3>{formatCurrency(stats.allTimeTotal)}</h3>
                  <p>All-Time Total Expenses</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon danger"><Boxes size={24} /></div>
                <div className="stat-info">
                  <h3>{stats.totalCategories || 0}</h3>
                  <p>Total Categories</p>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 20, padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                    Filter by period:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {PERIODS.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setPeriod(p.key)}
                        style={{
                          padding: "5px 13px",
                          borderRadius: 20,
                          border: "1.5px solid",
                          borderColor: period === p.key ? "var(--primary)" : "var(--border)",
                          background: period === p.key ? "var(--primary)" : "transparent",
                          color: period === p.key ? "#fff" : "var(--text-primary)",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {period === "custom" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="date"
                        className="form-control"
                        style={{ width: 150, fontSize: 13 }}
                        value={customStart}
                        max={customEnd || undefined}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                      <input
                        type="date"
                        className="form-control"
                        style={{ width: 150, fontSize: 13 }}
                        value={customEnd}
                        min={customStart || undefined}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" onClick={openAddExpense}>
                  <Plus size={18} /> Add Expense
                </button>
              </div>
            </div>

            <div className="toolbar">
              <div className="search-input" style={{ position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search expenses..."
                  style={{ paddingLeft: 40 }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="form-control"
                style={{ width: 180 }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn btn-secondary" onClick={handleExport}>
                <Download size={16} /> Export CSV
              </button>
            </div>

            <div className="card">
              {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
              ) : expenses.length === 0 ? (
                <div className="empty-state">
                  <Receipt size={64} />
                  <h3>No expenses found</h3>
                  <p>Add your first expense to get started</p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th>Payment</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp.id}>
                          <td style={{ fontWeight: 600 }}>{exp.title}</td>
                          <td>{exp.category_name || "—"}</td>
                          <td style={{ fontSize: 13 }}>{new Date(exp.expense_date).toLocaleDateString()}</td>
                          <td style={{ fontSize: 13, textTransform: "capitalize" }}>{exp.payment_method?.replace("_", " ")}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(exp.amount)}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn-icon" onClick={() => openEditExpense(exp)} title="Edit">
                                <Pencil size={16} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleDeleteExpense(exp.id)}
                                style={{ color: "var(--danger)" }}
                                title="Delete"
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
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {categories.length} categories configured
              </span>
              <button className="btn btn-primary" onClick={() => setShowCategoryModal(true)}>
                <Plus size={18} /> Add Category
              </button>
            </div>

            <div className="card">
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div className="search-input" style={{ position: "relative" }}>
                  <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search categories..."
                    style={{ paddingLeft: 40 }}
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="empty-state">
                  <Layers size={64} />
                  <h3>No records found</h3>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCategories.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>
                            <span style={{
                              display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                              background: c.color || "var(--primary)", marginRight: 8,
                            }} />
                            {c.name}
                          </td>
                          <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.description || "—"}</td>
                          <td>
                            <button
                              className="btn-icon"
                              onClick={() => handleDeleteCategory(c.id)}
                              style={{ color: "var(--danger)" }}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Add/Edit Expense Modal */}
        {showExpenseModal && (
          <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <h3>{editingExpense ? "Edit Expense" : "Add Expense"}</h3>
                <button className="btn-icon" onClick={() => setShowExpenseModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleSubmitExpense}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      className="form-control"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="form-control"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.expense_date}
                        onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Category</label>
                      <select
                        className="form-control"
                        value={form.category_id}
                        onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Payment Method</label>
                      <select
                        className="form-control"
                        value={form.payment_method}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m.replace("_", " ")}</option>
                        ))}
                      </select>
                    </div>
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
                  <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingExpense ? "Save Changes" : "Add Expense"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Category Modal */}
        {showCategoryModal && (
          <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-header">
                <h3>Add Category</h3>
                <button className="btn-icon" onClick={() => setShowCategoryModal(false)}><X size={18} /></button>
              </div>
              <form onSubmit={handleAddCategory}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      className="form-control"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      className="form-control"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="color"
                      className="form-control"
                      style={{ height: 40, padding: 4 }}
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCategoryModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add Category</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
