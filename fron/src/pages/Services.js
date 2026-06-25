import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus, Search, Edit2, Trash2, Briefcase, X,
  Clock, Upload, Image as ImageIcon, Link2, Loader2,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";

const EMPTY_FORM = {
  name:             "",
  description:      "",
  price:            "",
  duration_minutes: "",
  image_url:        "",
};

/* ── Image Upload Zone (same as Products) ───────────────────── */
function ImageUploadZone({ value, onChange }) {
  const [dragging,  setDragging]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [urlMode,   setUrlMode]   = useState(!!value);
  const fileInputRef = useRef(null);

  const uploadFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please drop an image file");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/upload/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(res.data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const onFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="sv-img-root">
      <div className="sv-img-tabs">
        <button type="button" className={`sv-img-tab${!urlMode ? " active" : ""}`} onClick={() => setUrlMode(false)}>
          <Upload size={12} /> Upload
        </button>
        <button type="button" className={`sv-img-tab${urlMode ? " active" : ""}`} onClick={() => setUrlMode(true)}>
          <Link2 size={12} /> URL
        </button>
      </div>

      {urlMode ? (
        <div className="sv-img-url-wrap">
          <input
            className="sv-input"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <div className="sv-img-preview-sm">
              <img src={value} alt="preview" onError={(e) => e.target.style.display = "none"} />
            </div>
          )}
        </div>
      ) : (
        <div
          className={`sv-img-dropzone${dragging ? " dragging" : ""}${uploading ? " uploading" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileInput} />

          {uploading ? (
            <div className="sv-img-uploading">
              <Loader2 size={28} className="spin" />
              <span>Uploading to Oracle Cloud…</span>
            </div>
          ) : value ? (
            <div className="sv-img-has-photo">
              <img src={value} alt="service" className="sv-img-thumb" />
              <div className="sv-img-overlay"><Upload size={18} /><span>Replace</span></div>
              <button type="button" className="sv-img-remove"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}>
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="sv-img-empty">
              <div className="sv-img-icon"><ImageIcon size={26} /></div>
              <div className="sv-img-label">{dragging ? "Drop to upload" : "Drag & drop an image here"}</div>
              <div className="sv-img-sub">or click to browse · JPG, PNG, WebP up to 10 MB</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Services() {
  const { t: tWs } = useWorkspace();
  const [services,  setServices]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  const loadServices = async (q = search) => {
    try {
      const res = await api.get("/services", { params: { search: q } });
      setServices(res.data.services);
    } catch {
      toast.error("Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadServices(); }, []);
  useEffect(() => {
    const t = setTimeout(() => { loadServices(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(services.length / pageSize));
  const paginated  = services.slice((page - 1) * pageSize, page * pageSize);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      name:             s.name,
      description:      s.description      || "",
      price:            s.price,
      duration_minutes: s.duration_minutes || "",
      image_url:        s.image_url        || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price:            parseFloat(form.price),
        duration_minutes: parseInt(form.duration_minutes) || null,
        image_url:        form.image_url || undefined,
      };
      if (editing) {
        await api.put(`/services/${editing.id}`, payload);
        toast.success("Service updated");
      } else {
        await api.post("/services", payload);
        toast.success("Service created");
      }
      setShowModal(false);
      resetForm();
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save service");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this service?")) return;
    try {
      await api.delete(`/services/${id}`);
      toast.success("Service deleted");
      loadServices();
    } catch {
      toast.error("Failed to delete service");
    }
  };

  return (
    <>
      <Header title={tWs("services", "Services")} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

        .sv-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .sv-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--text-primary);}
        .sv-subtitle{font-size:13px;color:var(--text-secondary);margin-top:2px;}

        .sv-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
        .sv-search{position:relative;flex:1;max-width:360px;}
        .sv-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);}
        .sv-search input{width:100%;padding:10px 12px 10px 38px;border-radius:11px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;outline:none;transition:.18s;}
        .sv-search input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.18);}

        .sv-add-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:11px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(99,102,241,.3);transition:filter .2s,transform .15s;white-space:nowrap;}
        .sv-add-btn:hover{filter:brightness(1.08);transform:translateY(-1px);}

        .sv-card{border:1px solid var(--border);border-radius:18px;background:var(--bg-secondary);overflow:hidden;}

        .sv-table{width:100%;border-collapse:collapse;}
        .sv-table thead tr{border-bottom:1px solid var(--border);}
        .sv-table th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap;}
        .sv-table tbody tr{border-bottom:1px solid var(--border);transition:background .15s;}
        .sv-table tbody tr:last-child{border-bottom:none;}
        .sv-table tbody tr:hover{background:rgba(255,255,255,.03);}
        .sv-table td{padding:13px 16px;font-size:13.5px;vertical-align:middle;}

        .sv-name-cell{display:flex;align-items:center;gap:10px;}
        .sv-thumb{width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid var(--border);background:var(--bg-primary);flex-shrink:0;}
        .sv-thumb-placeholder{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);display:grid;place-items:center;color:var(--text-muted);flex-shrink:0;}
        .sv-svc-name{font-weight:700;color:var(--text-primary);}
        .sv-svc-desc{font-size:11.5px;color:var(--text-muted);margin-top:2px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

        .sv-price{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:var(--text-primary);}
        .sv-duration{display:inline-flex;align-items:center;gap:5px;font-size:13px;color:var(--text-secondary);}

        .sv-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;border:1px solid transparent;}
        .sv-badge-active{color:#34d399;background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25);}
        .sv-badge-inactive{color:var(--text-muted);background:var(--bg-primary);border-color:var(--border);}

        .sv-action-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .sv-action-btn:hover{background:var(--bg-primary);color:var(--text-primary);}
        .sv-action-btn.danger:hover{background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.3);}

        .sv-empty{padding:64px 24px;text-align:center;}
        .sv-empty-icon{width:60px;height:60px;border-radius:16px;margin:0 auto 16px;display:grid;place-items:center;color:#a78bfa;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);}
        .sv-empty h3{margin:0 0 6px;font-size:18px;font-weight:700;}
        .sv-empty p{margin:0 0 18px;color:var(--text-secondary);font-size:13.5px;}

        /* Modal */
        .sv-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}
        .sv-modal{background:var(--bg-secondary);border:1px solid var(--border);border-radius:20px;width:100%;max-width:560px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.4);}
        .sv-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);}
        .sv-modal-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:var(--text-primary);}
        .sv-modal-close{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .sv-modal-close:hover{background:var(--bg-primary);}
        .sv-modal-body{padding:20px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;}
        .sv-modal-foot{padding:16px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}

        .sv-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .sv-form-group{display:flex;flex-direction:column;gap:6px;}
        .sv-label{font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:.03em;}
        .sv-label span{color:#ef4444;margin-left:2px;}
        .sv-input{padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none;transition:.18s;width:100%;box-sizing:border-box;}
        .sv-input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.18);}
        textarea.sv-input{resize:vertical;min-height:72px;}

        .sv-section-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);display:flex;align-items:center;gap:8px;}
        .sv-section-label::after{content:"";flex:1;height:1px;background:var(--border);}

        .sv-btn{padding:10px 18px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;transition:.18s;}
        .sv-btn:hover{background:var(--bg-primary);}
        .sv-btn-primary{border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 16px rgba(99,102,241,.28);}
        .sv-btn-primary:hover{background:linear-gradient(135deg,#6366f1,#8b5cf6);filter:brightness(1.1);color:#fff;}

        /* Pagination */
        .sv-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px;}
        .sv-page-info{font-size:12.5px;color:var(--text-secondary);}
        .sv-page-info strong{color:var(--text-primary);}
        .sv-page-controls{display:flex;align-items:center;gap:6px;}
        .sv-page-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .sv-page-btn:hover:not(:disabled){background:var(--bg-primary);color:var(--text-primary);}
        .sv-page-btn:disabled{opacity:.35;cursor:default;}
        .sv-page-num{min-width:32px;height:32px;border-radius:9px;border:1px solid transparent;background:transparent;cursor:pointer;display:grid;place-items:center;font-size:12.5px;font-weight:600;color:var(--text-secondary);transition:.18s;padding:0 6px;}
        .sv-page-num:hover{background:var(--bg-primary);color:var(--text-primary);}
        .sv-page-num.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
        .sv-page-size{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-secondary);}
        .sv-page-size select{padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:12px;outline:none;cursor:pointer;}

        /* Image upload zone */
        .sv-img-root{display:flex;flex-direction:column;gap:8px;}
        .sv-img-tabs{display:flex;gap:4px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:3px;}
        .sv-img-tab{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:6px 10px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer;transition:.18s;}
        .sv-img-tab.active{background:var(--bg-secondary);color:var(--text-primary);box-shadow:0 1px 4px rgba(0,0,0,.15);}
        .sv-img-tab:hover:not(.active){color:var(--text-primary);}
        .sv-img-url-wrap{display:flex;flex-direction:column;gap:8px;}
        .sv-img-preview-sm{border-radius:10px;overflow:hidden;border:1px solid var(--border);max-height:140px;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);}
        .sv-img-preview-sm img{max-width:100%;max-height:140px;object-fit:contain;}
        .sv-img-dropzone{border:2px dashed var(--border);border-radius:14px;min-height:140px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;background:var(--bg-primary);position:relative;overflow:hidden;}
        .sv-img-dropzone:hover{border-color:#8b5cf6;background:rgba(139,92,246,.04);}
        .sv-img-dropzone.dragging{border-color:#8b5cf6;background:rgba(139,92,246,.08);transform:scale(1.01);}
        .sv-img-dropzone.uploading{cursor:default;pointer-events:none;}
        .sv-img-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;}
        .sv-img-icon{width:52px;height:52px;border-radius:14px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);display:grid;place-items:center;color:#a78bfa;}
        .sv-img-label{font-size:13px;font-weight:600;color:var(--text-primary);}
        .sv-img-sub{font-size:11.5px;color:var(--text-muted);text-align:center;}
        .sv-img-uploading{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-secondary);font-size:13px;}
        .spin{animation:spin .8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sv-img-has-photo{width:100%;min-height:140px;position:relative;display:flex;align-items:center;justify-content:center;}
        .sv-img-thumb{max-width:100%;max-height:160px;object-fit:contain;border-radius:10px;}
        .sv-img-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;font-size:12.5px;font-weight:600;opacity:0;transition:.2s;}
        .sv-img-has-photo:hover .sv-img-overlay{opacity:1;}
        .sv-img-remove{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);border:none;cursor:pointer;display:grid;place-items:center;color:#fff;z-index:2;}
        .sv-img-remove:hover{background:rgba(239,68,68,.85);}
      `}</style>

      <div className="page-content">

        {/* Header */}
        <div className="sv-header">
          <div>
            <div className="sv-title">Services</div>
            <div className="sv-subtitle">Manage your service offerings and pricing.</div>
          </div>
          <button className="sv-add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={15} /> Add Service
          </button>
        </div>

        {/* Toolbar */}
        <div className="sv-toolbar">
          <div className="sv-search">
            <Search size={15} />
            <input
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="sv-card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : services.length === 0 ? (
            <div className="sv-empty">
              <div className="sv-empty-icon"><Briefcase size={28} /></div>
              <h3>No services yet</h3>
              <p>Add your first service to get started.</p>
              <button className="sv-add-btn" onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus size={15} /> Add Service
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="sv-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="sv-name-cell">
                          <img
                            src={s.image_url || ""}
                            alt={s.name}
                            className="sv-thumb"
                            style={{ display: s.image_url ? "block" : "none" }}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling.style.display = "grid";
                            }}
                          />
                          <div
                            className="sv-thumb-placeholder"
                            style={{ display: s.image_url ? "none" : "grid" }}
                          >
                            <ImageIcon size={15} />
                          </div>
                          <div>
                            <div className="sv-svc-name">{s.name}</div>
                            {s.description && (
                              <div className="sv-svc-desc">{s.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="sv-price">
                          LKR {parseFloat(s.price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        {s.duration_minutes ? (
                          <span className="sv-duration">
                            <Clock size={13} /> {s.duration_minutes} min
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`sv-badge ${s.is_active ? "sv-badge-active" : "sv-badge-inactive"}`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="sv-action-btn" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                          <button className="sv-action-btn danger" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && services.length > 0 && (
            <div className="sv-pagination">
              <div className="sv-page-info">
                Showing <strong>{Math.min((page - 1) * pageSize + 1, services.length)}</strong>–<strong>{Math.min(page * pageSize, services.length)}</strong> of <strong>{services.length}</strong> services
              </div>
              <div className="sv-page-controls">
                <button className="sv-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`e-${idx}`} style={{ fontSize: 12, color: "var(--text-muted)", padding: "0 4px" }}>…</span>
                    ) : (
                      <button key={item} className={`sv-page-num${page === item ? " active" : ""}`} onClick={() => setPage(item)}>
                        {item}
                      </button>
                    )
                  )}
                <button className="sv-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="sv-page-size">
                Rows per page:
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ═══ MODAL ═══ */}
        {showModal && (
          <div className="sv-overlay" onClick={() => setShowModal(false)}>
            <div className="sv-modal" onClick={(e) => e.stopPropagation()}>

              <div className="sv-modal-head">
                <div className="sv-modal-title">{editing ? "Edit Service" : "Add Service"}</div>
                <button className="sv-modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
              </div>

              <div className="sv-modal-body">

                <div className="sv-section-label">Basic Info</div>

                <div className="sv-form-group">
                  <label className="sv-label">Service Name <span>*</span></label>
                  <input className="sv-input" value={form.name}
                    onChange={(e) => set("name", e.target.value)} required />
                </div>

                <div className="sv-form-group">
                  <label className="sv-label">Description</label>
                  <textarea className="sv-input" value={form.description}
                    onChange={(e) => set("description", e.target.value)} />
                </div>

                <div className="sv-form-row">
                  <div className="sv-form-group">
                    <label className="sv-label">Price (LKR) <span>*</span></label>
                    <input className="sv-input" type="number" step="0.01" min="0"
                      value={form.price} onChange={(e) => set("price", e.target.value)} required />
                  </div>
                  <div className="sv-form-group">
                    <label className="sv-label">Duration (minutes)</label>
                    <input className="sv-input" type="number" min="1"
                      placeholder="e.g. 60"
                      value={form.duration_minutes}
                      onChange={(e) => set("duration_minutes", e.target.value)} />
                  </div>
                </div>

                <div className="sv-section-label">Service Image</div>

                <div className="sv-form-group">
                  <ImageUploadZone
                    value={form.image_url}
                    onChange={(url) => set("image_url", url)}
                  />
                </div>

              </div>

              <div className="sv-modal-foot">
                <button className="sv-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="sv-btn sv-btn-primary" onClick={handleSubmit}>
                  {editing ? "Update Service" : "Create Service"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}