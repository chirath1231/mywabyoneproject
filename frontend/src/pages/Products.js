import React, { useState, useEffect, useRef, useCallback } from "react";
import Header from "../components/Layout/Header";
import api from "../api/api";
import {
  Plus, Search, Edit2, Trash2, Package, X,
  ShieldCheck, Hash, ChevronLeft, ChevronRight,
  Upload, Image as ImageIcon, Link2, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { useWorkspace } from "../context/WorkspaceContext";

const EMPTY_FORM = {
  name:           "",
  description:    "",
  sku:            "",
  barcode:        "",
  serial_number:  "",
  price:          "",
  cost_price:     "",
  quantity:       "",
  min_stock:      "",
  unit:           "pcs",
  category_id:    "",
  image_url:      "",
  has_warranty:   false,
  warranty_months: "",
};

/* ── Image Upload Zone ─────────────────────────────────────── */
function ImageUploadZone({ value, onChange }) {
  const [dragging,    setDragging]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [urlMode,     setUrlMode]     = useState(!!value && !value.startsWith("blob:"));
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
    <div className="pr-img-root">
      {/* Toggle tabs */}
      <div className="pr-img-tabs">
        <button
          type="button"
          className={`pr-img-tab${!urlMode ? " active" : ""}`}
          onClick={() => setUrlMode(false)}
        >
          <Upload size={12} /> Upload
        </button>
        <button
          type="button"
          className={`pr-img-tab${urlMode ? " active" : ""}`}
          onClick={() => setUrlMode(true)}
        >
          <Link2 size={12} /> URL
        </button>
      </div>

      {urlMode ? (
        /* URL input */
        <div className="pr-img-url-wrap">
          <input
            className="pr-input"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
          {value && (
            <div className="pr-img-preview-sm">
              <img src={value} alt="preview" onError={(e) => e.target.style.display = "none"} />
            </div>
          )}
        </div>
      ) : (
        /* Drag-and-drop zone */
        <div
          className={`pr-img-dropzone${dragging ? " dragging" : ""}${uploading ? " uploading" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onFileInput}
          />

          {uploading ? (
            <div className="pr-img-uploading">
              <Loader2 size={28} className="spin" />
              <span>Uploading to Oracle Cloud…</span>
            </div>
          ) : value ? (
            /* Uploaded preview */
            <div className="pr-img-has-photo">
              <img src={value} alt="product" className="pr-img-thumb" />
              <div className="pr-img-overlay">
                <Upload size={18} />
                <span>Replace</span>
              </div>
              <button
                type="button"
                className="pr-img-remove"
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            /* Empty state */
            <div className="pr-img-empty">
              <div className="pr-img-icon">
                <ImageIcon size={26} />
              </div>
              <div className="pr-img-label">
                {dragging ? "Drop to upload" : "Drag & drop an image here"}
              </div>
              <div className="pr-img-sub">or click to browse · JPG, PNG, WebP up to 10 MB</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Products() {
  const { t: tWs } = useWorkspace();
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  /* ── data ── */
  const loadProducts = async (q = search) => {
    try {
      const res = await api.get("/products", { params: { search: q } });
      setProducts(res.data.products);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const t = setTimeout(() => { loadProducts(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const paginated  = products.slice((page - 1) * pageSize, page * pageSize);

  /* ── form helpers ── */
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };
  const openAdd  = () => { resetForm(); setShowModal(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name:            p.name,
      description:     p.description     || "",
      sku:             p.sku             || "",
      barcode:         p.barcode         || "",
      serial_number:   p.serial_number   || "",
      price:           p.price,
      cost_price:      p.cost_price      || "",
      quantity:        p.quantity,
      min_stock:       p.min_stock       || "",
      unit:            p.unit            || "pcs",
      category_id:     p.category_id     || "",
      image_url:       p.image_url       || "",
      has_warranty:    !!p.has_warranty,
      warranty_months: p.warranty_months != null ? String(p.warranty_months) : "",
    });
    setShowModal(true);
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.has_warranty) {
      const wm = parseInt(form.warranty_months);
      if (!form.warranty_months || isNaN(wm) || wm <= 0) {
        toast.error("Please enter a valid warranty duration in months");
        return;
      }
    }

    const payload = {
      name:            form.name,
      description:     form.description,
      sku:             form.sku,
      barcode:         form.barcode,
      serial_number:   form.serial_number || null,
      price:           parseFloat(form.price),
      cost_price:      parseFloat(form.cost_price) || 0,
      quantity:        parseInt(form.quantity)      || 0,
      min_stock:       parseInt(form.min_stock)     || 0,
      unit:            form.unit,
      category_id:     form.category_id || undefined,
      image_url:       form.image_url   || undefined,
      has_warranty:    form.has_warranty,
      warranty_months: form.has_warranty && form.warranty_months
        ? parseInt(form.warranty_months)
        : null,
    };

    try {
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      setShowModal(false);
      resetForm();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save product");
    }
  };

  /* ── delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      loadProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  /* ── warranty display helper ── */
  const warrantyLabel = (months) => {
    if (!months || months <= 0) return null;
    if (months % 12 === 0) {
      const yrs = months / 12;
      return `${yrs} ${yrs === 1 ? "year" : "years"}`;
    }
    return `${months} ${months === 1 ? "month" : "months"}`;
  };

  return (
    <>
      <Header title={tWs("products", "Products")} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

        .pr-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;}
        .pr-title{font-family:'Syne',sans-serif;font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--text-primary);}
        .pr-subtitle{font-size:13px;color:var(--text-secondary);margin-top:2px;}

        .pr-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
        .pr-search{position:relative;flex:1;max-width:360px;}
        .pr-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);}
        .pr-search input{width:100%;padding:10px 12px 10px 38px;border-radius:11px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;outline:none;transition:.18s;}
        .pr-search input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.18);}

        .pr-add-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:11px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-family:'Syne',sans-serif;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 8px 20px rgba(99,102,241,.3);transition:filter .2s,transform .15s;white-space:nowrap;}
        .pr-add-btn:hover{filter:brightness(1.08);transform:translateY(-1px);}

        .pr-card{border:1px solid var(--border);border-radius:18px;background:var(--bg-secondary);overflow:hidden;}

        .pr-table{width:100%;border-collapse:collapse;}
        .pr-table thead tr{border-bottom:1px solid var(--border);}
        .pr-table th{padding:12px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);white-space:nowrap;}
        .pr-table tbody tr{border-bottom:1px solid var(--border);transition:background .15s;}
        .pr-table tbody tr:last-child{border-bottom:none;}
        .pr-table tbody tr:hover{background:rgba(255,255,255,.03);}
        .pr-table td{padding:13px 16px;font-size:13.5px;vertical-align:middle;}

        .pr-prod-name{font-weight:700;color:var(--text-primary);}
        .pr-prod-desc{font-size:11.5px;color:var(--text-muted);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;}
        .pr-serial{font-size:11px;color:var(--text-muted);margin-top:3px;display:flex;align-items:center;gap:3px;}

        .pr-sku{background:var(--bg-primary);border:1px solid var(--border);padding:2px 8px;border-radius:6px;font-size:11.5px;font-family:monospace;color:var(--text-secondary);}

        .pr-price{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:var(--text-primary);}
        .pr-cost{font-size:12.5px;color:var(--text-muted);}

        .pr-qty-num{font-size:14px;font-weight:700;color:var(--text-primary);}
        .pr-qty-num.low{color:#b45309;}
        .pr-qty-num.zero{color:#ef4444;}
        .pr-qty-unit{font-size:11px;color:var(--text-muted);margin-top:2px;}

        .pr-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;border:1px solid transparent;}
        .pr-badge-active{color:#34d399;background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.25);}
        .pr-badge-inactive{color:var(--text-muted);background:var(--bg-primary);border-color:var(--border);}

        .pr-warranty{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#818cf8;}

        .pr-action-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .pr-action-btn:hover{background:var(--bg-primary);color:var(--text-primary);}
        .pr-action-btn.danger:hover{background:rgba(239,68,68,.1);color:#ef4444;border-color:rgba(239,68,68,.3);}

        /* ── product thumbnail in table ── */
        .pr-thumb{width:36px;height:36px;border-radius:8px;object-fit:cover;border:1px solid var(--border);flex-shrink:0;}
        .pr-thumb-placeholder{width:36px;height:36px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);display:grid;place-items:center;color:var(--text-muted);flex-shrink:0;}
        .pr-name-cell{display:flex;align-items:center;gap:10px;}

        .pr-empty{padding:64px 24px;text-align:center;}
        .pr-empty-icon{width:60px;height:60px;border-radius:16px;margin:0 auto 16px;display:grid;place-items:center;color:#a78bfa;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);}
        .pr-empty h3{margin:0 0 6px;font-size:18px;font-weight:700;}
        .pr-empty p{margin:0 0 18px;color:var(--text-secondary);font-size:13.5px;}

        .pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;}
        .pr-modal{background:var(--bg-secondary);border:1px solid var(--border);border-radius:20px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.4);}
        .pr-modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--border);}
        .pr-modal-title{font-family:'Syne',sans-serif;font-size:17px;font-weight:800;color:var(--text-primary);}
        .pr-modal-close{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .pr-modal-close:hover{background:var(--bg-primary);}
        .pr-modal-body{padding:20px 22px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:14px;}
        .pr-modal-foot{padding:16px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px;}

        .pr-form-row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
        .pr-form-group{display:flex;flex-direction:column;gap:6px;}
        .pr-label{font-size:12px;font-weight:700;color:var(--text-secondary);letter-spacing:.03em;}
        .pr-label span{color:#ef4444;margin-left:2px;}
        .pr-input{padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none;transition:.18s;width:100%;box-sizing:border-box;}
        .pr-input:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.18);}
        textarea.pr-input{resize:vertical;min-height:72px;}

        .pr-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;border:1px solid var(--border);background:var(--bg-primary);}
        .pr-toggle-label{font-size:13px;font-weight:600;color:var(--text-primary);}
        .pr-toggle-sub{font-size:11.5px;color:var(--text-muted);margin-top:2px;}
        .pr-switch{position:relative;width:42px;height:24px;flex-shrink:0;}
        .pr-switch input{opacity:0;width:0;height:0;}
        .pr-slider{position:absolute;inset:0;background:var(--border);border-radius:999px;cursor:pointer;transition:.25s;}
        .pr-slider::before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.25s;}
        .pr-switch input:checked + .pr-slider{background:#8b5cf6;}
        .pr-switch input:checked + .pr-slider::before{transform:translateX(18px);}

        .pr-warranty-expanded{margin-top:10px;display:flex;flex-direction:column;gap:6px;animation:fadeIn .18s ease;}
        .pr-warranty-hint{font-size:11px;color:var(--text-muted);margin-top:3px;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}

        .pr-section-label{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--text-muted);display:flex;align-items:center;gap:8px;}
        .pr-section-label::after{content:"";flex:1;height:1px;background:var(--border);}

        .pr-btn{padding:10px 18px;border-radius:10px;border:1px solid var(--border);background:transparent;color:var(--text-primary);font-size:13px;font-weight:600;cursor:pointer;transition:.18s;}
        .pr-btn:hover{background:var(--bg-primary);}
        .pr-btn-primary{border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 16px rgba(99,102,241,.28);}
        .pr-btn-primary:hover{filter:brightness(1.08);}

        .pr-pagination{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-top:1px solid var(--border);flex-wrap:wrap;gap:10px;}
        .pr-page-info{font-size:12.5px;color:var(--text-secondary);}
        .pr-page-info strong{color:var(--text-primary);}
        .pr-page-controls{display:flex;align-items:center;gap:6px;}
        .pr-page-btn{width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:transparent;cursor:pointer;display:grid;place-items:center;color:var(--text-secondary);transition:.18s;}
        .pr-page-btn:hover:not(:disabled){background:var(--bg-primary);color:var(--text-primary);}
        .pr-page-btn:disabled{opacity:.35;cursor:default;}
        .pr-page-num{min-width:32px;height:32px;border-radius:9px;border:1px solid transparent;background:transparent;cursor:pointer;display:grid;place-items:center;font-size:12.5px;font-weight:600;color:var(--text-secondary);transition:.18s;padding:0 6px;}
        .pr-page-num:hover{background:var(--bg-primary);color:var(--text-primary);}
        .pr-page-num.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-color:transparent;}
        .pr-page-size{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--text-secondary);}
        .pr-page-size select{padding:5px 8px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);font-size:12px;outline:none;cursor:pointer;}

        /* ── Image Upload Zone ────────────────────────────────── */
        .pr-img-root{display:flex;flex-direction:column;gap:8px;}
        .pr-img-tabs{display:flex;gap:4px;background:var(--bg-primary);border:1px solid var(--border);border-radius:10px;padding:3px;}
        .pr-img-tab{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:6px 10px;border-radius:7px;border:none;background:transparent;color:var(--text-muted);font-size:12px;font-weight:600;cursor:pointer;transition:.18s;}
        .pr-img-tab.active{background:var(--bg-secondary);color:var(--text-primary);box-shadow:0 1px 4px rgba(0,0,0,.15);}
        .pr-img-tab:hover:not(.active){color:var(--text-primary);}

        .pr-img-url-wrap{display:flex;flex-direction:column;gap:8px;}
        .pr-img-preview-sm{border-radius:10px;overflow:hidden;border:1px solid var(--border);max-height:140px;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);}
        .pr-img-preview-sm img{max-width:100%;max-height:140px;object-fit:contain;}

        .pr-img-dropzone{border:2px dashed var(--border);border-radius:14px;min-height:140px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:.2s;background:var(--bg-primary);position:relative;overflow:hidden;}
        .pr-img-dropzone:hover{border-color:#8b5cf6;background:rgba(139,92,246,.04);}
        .pr-img-dropzone.dragging{border-color:#8b5cf6;background:rgba(139,92,246,.08);transform:scale(1.01);}
        .pr-img-dropzone.uploading{cursor:default;pointer-events:none;}

        .pr-img-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px;}
        .pr-img-icon{width:52px;height:52px;border-radius:14px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.22);display:grid;place-items:center;color:#a78bfa;}
        .pr-img-label{font-size:13px;font-weight:600;color:var(--text-primary);}
        .pr-img-sub{font-size:11.5px;color:var(--text-muted);text-align:center;}

        .pr-img-uploading{display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-secondary);font-size:13px;}
        .spin{animation:spin .8s linear infinite;}
        @keyframes spin{to{transform:rotate(360deg)}}

        .pr-img-has-photo{width:100%;height:100%;min-height:140px;position:relative;display:flex;align-items:center;justify-content:center;}
        .pr-img-thumb{max-width:100%;max-height:160px;object-fit:contain;border-radius:10px;}
        .pr-img-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#fff;font-size:12.5px;font-weight:600;opacity:0;transition:.2s;}
        .pr-img-has-photo:hover .pr-img-overlay{opacity:1;}
        .pr-img-remove{position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.6);border:none;cursor:pointer;display:grid;place-items:center;color:#fff;z-index:2;}
        .pr-img-remove:hover{background:rgba(239,68,68,.85);}
      `}</style>

      <div className="page-content">

        {/* Header */}
        <div className="pr-header">
          <div>
            <div className="pr-title">Products</div>
            <div className="pr-subtitle">Manage your product inventory and pricing.</div>
          </div>
          <button className="pr-add-btn" onClick={openAdd}>
            <Plus size={15} /> Add Product
          </button>
        </div>

        {/* Toolbar */}
        <div className="pr-toolbar">
          <div className="pr-search">
            <Search size={15} />
            <input
              placeholder="Search by name, SKU or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table card */}
        <div className="pr-card">
          {loading ? (
            <div className="loading-spinner"><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="pr-empty">
              <div className="pr-empty-icon"><Package size={28} /></div>
              <h3>No products yet</h3>
              <p>Add your first product to get started.</p>
              <button className="pr-add-btn" onClick={openAdd}>
                <Plus size={15} /> Add Product
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="pr-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Cost</th>
                    <th>Stock</th>
                    <th>Warranty</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p) => {
                    const qty      = p.quantity || 0;
                    const minStock = p.min_stock || 0;
                    const isLow    = qty <= minStock;
                    const isZero   = qty === 0;
                    const wLabel   = p.has_warranty ? warrantyLabel(p.warranty_months) : null;

                    return (
                      <tr key={p.id}>
                        {/* Name + thumbnail + desc + serial */}
                        <td>
                          <div className="pr-name-cell">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="pr-thumb" />
                            ) : (
                              <div className="pr-thumb-placeholder">
                                <ImageIcon size={15} />
                              </div>
                            )}
                            <div>
                              <div className="pr-prod-name">{p.name}</div>
                              {p.description && (
                                <div className="pr-prod-desc">{p.description}</div>
                              )}
                              {p.serial_number && (
                                <div className="pr-serial">
                                  <Hash size={10} /> {p.serial_number}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SKU */}
                        <td><span className="pr-sku">{p.sku || "—"}</span></td>

                        {/* Price */}
                        <td>
                          <span className="pr-price">
                            LKR {parseFloat(p.price).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Cost */}
                        <td>
                          <span className="pr-cost">
                            LKR {parseFloat(p.cost_price || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </span>
                        </td>

                        {/* Stock */}
                        <td>
                          <div className={`pr-qty-num ${isZero ? "zero" : isLow ? "low" : ""}`}>{qty}</div>
                          <div className="pr-qty-unit">{p.unit || "pcs"}</div>
                        </td>

                        {/* Warranty */}
                        <td>
                          {wLabel ? (
                            <span className="pr-warranty"><ShieldCheck size={13} /> {wLabel}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`pr-badge ${p.is_active ? "pr-badge-active" : "pr-badge-inactive"}`}>
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="pr-action-btn" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                            <button className="pr-action-btn danger" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && products.length > 0 && (
            <div className="pr-pagination">
              <div className="pr-page-info">
                Showing <strong>{Math.min((page - 1) * pageSize + 1, products.length)}</strong>–<strong>{Math.min(page * pageSize, products.length)}</strong> of <strong>{products.length}</strong> products
              </div>
              <div className="pr-page-controls">
                <button className="pr-page-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce((acc, n, idx, arr) => {
                    if (idx > 0 && n - arr[idx - 1] > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} style={{ fontSize: 12, color: "var(--text-muted)", padding: "0 4px" }}>…</span>
                    ) : (
                      <button key={item} className={`pr-page-num${page === item ? " active" : ""}`} onClick={() => setPage(item)}>
                        {item}
                      </button>
                    )
                  )}
                <button className="pr-page-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight size={14} />
                </button>
              </div>
              <div className="pr-page-size">
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

        {/* ═══ MODAL ═══════════════════════════════════════════ */}
        {showModal && (
          <div className="pr-overlay" onClick={() => setShowModal(false)}>
            <div className="pr-modal" onClick={(e) => e.stopPropagation()}>

              <div className="pr-modal-head">
                <div className="pr-modal-title">{editing ? "Edit Product" : "Add Product"}</div>
                <button className="pr-modal-close" onClick={() => setShowModal(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="pr-modal-body">

                <div className="pr-section-label">Basic Info</div>

                <div className="pr-form-group">
                  <label className="pr-label">Product Name <span>*</span></label>
                  <input className="pr-input" value={form.name}
                    onChange={(e) => set("name", e.target.value)} required />
                </div>

                <div className="pr-form-group">
                  <label className="pr-label">Description</label>
                  <textarea className="pr-input" value={form.description}
                    onChange={(e) => set("description", e.target.value)} />
                </div>

                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label className="pr-label">SKU</label>
                    <input className="pr-input" value={form.sku}
                      onChange={(e) => set("sku", e.target.value)} />
                  </div>
                  <div className="pr-form-group">
                    <label className="pr-label">Barcode</label>
                    <input className="pr-input" value={form.barcode}
                      onChange={(e) => set("barcode", e.target.value)} />
                  </div>
                </div>

                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label className="pr-label">Serial Number</label>
                    <input className="pr-input" placeholder="e.g. SN-00123"
                      value={form.serial_number}
                      onChange={(e) => set("serial_number", e.target.value)} />
                  </div>
                  <div className="pr-form-group">
                    <label className="pr-label">Unit</label>
                    <select className="pr-input" value={form.unit}
                      onChange={(e) => set("unit", e.target.value)}>
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="lbs">Pounds</option>
                      <option value="m">Meters</option>
                      <option value="l">Liters</option>
                      <option value="box">Box</option>
                    </select>
                  </div>
                </div>

                {/* ── Product Image ── */}
                <div className="pr-section-label">Product Image</div>
                <div className="pr-form-group">
                  <ImageUploadZone
                    value={form.image_url}
                    onChange={(url) => set("image_url", url)}
                  />
                </div>

                <div className="pr-section-label">Pricing</div>

                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label className="pr-label">Selling Price <span>*</span></label>
                    <input className="pr-input" type="number" step="0.01" min="0"
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)} required />
                  </div>
                  <div className="pr-form-group">
                    <label className="pr-label">Cost Price</label>
                    <input className="pr-input" type="number" step="0.01" min="0"
                      value={form.cost_price}
                      onChange={(e) => set("cost_price", e.target.value)} />
                  </div>
                </div>

                <div className="pr-section-label">Inventory</div>

                <div className="pr-form-row">
                  <div className="pr-form-group">
                    <label className="pr-label">Quantity in Stock</label>
                    <input className="pr-input" type="number" min="0"
                      value={form.quantity}
                      onChange={(e) => set("quantity", e.target.value)} />
                  </div>
                  <div className="pr-form-group">
                    <label className="pr-label">Min Stock Alert</label>
                    <input className="pr-input" type="number" min="0"
                      value={form.min_stock}
                      onChange={(e) => set("min_stock", e.target.value)} />
                  </div>
                </div>

                <div className="pr-section-label">Warranty</div>

                <div className="pr-toggle-row">
                  <div>
                    <div className="pr-toggle-label">Has Warranty</div>
                    <div className="pr-toggle-sub">Toggle on to set a warranty duration</div>
                  </div>
                  <label className="pr-switch">
                    <input
                      type="checkbox"
                      checked={form.has_warranty}
                      onChange={(e) => {
                        set("has_warranty", e.target.checked);
                        if (!e.target.checked) set("warranty_months", "");
                      }}
                    />
                    <span className="pr-slider" />
                  </label>
                </div>

                {form.has_warranty && (
                  <div className="pr-warranty-expanded">
                    <label className="pr-label">Warranty Duration (months) <span>*</span></label>
                    <input
                      className="pr-input"
                      type="number"
                      min="1"
                      placeholder="e.g. 12 for 1 year, 24 for 2 years"
                      value={form.warranty_months}
                      onChange={(e) => set("warranty_months", e.target.value)}
                    />
                    {form.warranty_months && parseInt(form.warranty_months) > 0 && (
                      <div className="pr-warranty-hint">
                        → {warrantyLabel(parseInt(form.warranty_months))} warranty
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div className="pr-modal-foot">
                <button className="pr-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="pr-btn pr-btn-primary" onClick={handleSubmit}>
                  {editing ? "Update Product" : "Create Product"}
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}