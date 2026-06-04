import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import { ArrowLeft, Clock, CreditCard, Package, ShoppingBag, Star, Tag, Wrench } from "lucide-react";
import toast from "react-hot-toast";

/* ─── Mini helper character beside buy button ────────────────────────── */
function HelperCharacter({ primary, accent }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6,
      animation:"mascotBob 2.8s ease-in-out infinite", flexShrink:0 }}>
      <svg width="72" height="90" viewBox="0 0 72 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="36" cy="87" rx="18" ry="5" fill="rgba(0,0,0,0.13)"
          style={{ animation:"shadowPulse 2.8s ease-in-out infinite" }}/>
        {/* Legs */}
        <rect x="22" y="64" width="10" height="20" rx="5" fill={primary}
          style={{ transformOrigin:"27px 64px", animation:"walkLegs 1.6s ease-in-out infinite" }}/>
        <rect x="40" y="64" width="10" height="20" rx="5" fill={primary}
          style={{ transformOrigin:"45px 64px", animation:"walkLegs 1.6s 0.8s ease-in-out infinite" }}/>
        {/* Shoes */}
        <ellipse cx="27" cy="84" rx="9" ry="4" fill="#1e293b"/>
        <ellipse cx="45" cy="84" rx="9" ry="4" fill="#1e293b"/>
        {/* Body */}
        <rect x="18" y="36" width="36" height="32" rx="9" fill={primary}/>
        {/* Shirt */}
        <rect x="30" y="36" width="12" height="32" rx="3" fill="white" opacity="0.9"/>
        {/* Star on chest */}
        <text x="31" y="57" fontSize="11" fill={accent}>⭐</text>
        {/* Left arm */}
        <rect x="4" y="39" width="16" height="9" rx="4.5" fill={primary}/>
        <circle cx="6" cy="43" r="7" fill="#fbbf24"/>
        {/* Right arm — waving */}
        <g style={{ transformBox:"fill-box",transformOrigin:"0% 50%",
          animation:"waveArm 1.3s ease-in-out infinite" }}>
          <rect x="52" y="39" width="16" height="9" rx="4.5" fill={primary}/>
          <circle cx="66" cy="43" r="7" fill="#fbbf24"/>
        </g>
        {/* Neck */}
        <rect x="29" y="28" width="14" height="11" rx="5" fill="#fbbf24"/>
        {/* Head */}
        <circle cx="36" cy="22" r="20" fill="#fbbf24"/>
        {/* Hair */}
        <ellipse cx="36" cy="6" rx="20" ry="9" fill={primary}/>
        {/* Eyes */}
        <ellipse cx="29" cy="21" rx="5" ry="5.5" fill="white"/>
        <g style={{ transformBox:"fill-box",transformOrigin:"center",
          animation:"eyeBlink 4.5s ease-in-out infinite" }}>
          <circle cx="29" cy="22" r="3.5" fill={primary}/>
          <circle cx="30.5" cy="20" r="1.2" fill="white"/>
        </g>
        <ellipse cx="43" cy="21" rx="5" ry="5.5" fill="white"/>
        <g style={{ transformBox:"fill-box",transformOrigin:"center",
          animation:"eyeBlink 4.5s 0.4s ease-in-out infinite" }}>
          <circle cx="43" cy="22" r="3.5" fill={primary}/>
          <circle cx="44.5" cy="20" r="1.2" fill="white"/>
        </g>
        {/* Smile */}
        <path d="M 28 28 Q 36 35 44 28" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Cheeks */}
        <ellipse cx="22" cy="26" rx="5" ry="3.5" fill="#f87171" opacity="0.45"/>
        <ellipse cx="50" cy="26" rx="5" ry="3.5" fill="#f87171" opacity="0.45"/>
        {/* Sparkles */}
        <text x="0" y="14" fontSize="8"
          style={{ animation:"sparkle 2s ease-in-out infinite" }}>✨</text>
        <text x="58" y="30" fontSize="7"
          style={{ animation:"sparkle 2s 1s ease-in-out infinite" }}>⭐</text>
      </svg>
      {/* Speech bubble */}
      <div style={{ background:"white", borderRadius:"12px 12px 12px 4px",
        padding:"5px 10px", fontSize:11, fontWeight:800, color:primary,
        boxShadow:"0 4px 14px rgba(0,0,0,0.15)", whiteSpace:"nowrap",
        border:`1.5px solid ${accent}44`,
        animation:"bubbleFloat 2.5s ease-in-out infinite" }}>
        Great choice! 🎉
      </div>
    </div>
  );
}

/* ─── Floating sparkle character ─────────────────────────────────────── */
function FloatingStar({ style }) {
  return (
    <div style={{ position:"absolute", fontSize:22, userSelect:"none", pointerEvents:"none",
      animation:"floatEmoji 4s ease-in-out infinite", ...style }}>
      ✨
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────────────── */
function formatLabel(key) {
  return key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}
function formatValue(val) {
  if(val===null||val===undefined||val==="") return "—";
  if(typeof val==="boolean") return val?"Yes":"No";
  if(typeof val==="object") return JSON.stringify(val);
  return String(val);
}
function getFallback(type) {
  const label = type==="product"?"Product":"Service";
  const bg    = type==="product"?"6366f1":"8b5cf6";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
      <defs>
        <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stop-color='#${bg}'/>
          <stop offset='100%' stop-color='#1e1b4b'/>
        </linearGradient>
      </defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        fill='rgba(255,255,255,0.9)' font-family='Arial,sans-serif' font-size='38' font-weight='800'>${label}</text>
    </svg>`,
  )}`;
}

const SKIP = new Set(["id","org_id","category_id","workspace_id","is_active","created_at","updated_at","image_url"]);

const DEFAULT_REVIEWS = [
  { id:1, name:"Ravin",   avatar:"R", rating:5, text:"Great quality and fast response. Highly recommend this seller!", color:"#6366f1" },
  { id:2, name:"Nimashi", avatar:"N", rating:4, text:"Value for money and very easy process from start to finish.", color:"#8b5cf6" },
  { id:3, name:"Akila",   avatar:"A", rating:5, text:"Absolutely professional. Will definitely buy again!", color:"#06b6d4" },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

@keyframes fadeInUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn     { from{opacity:0} to{opacity:1} }
@keyframes floatA     { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-20px) rotate(6deg)} }
@keyframes floatB     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
@keyframes gradShift  { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes pricePop   { 0%{transform:scale(0.8)} 70%{transform:scale(1.05)} 100%{transform:scale(1)} }
@keyframes badgePop   { 0%{transform:scale(0.7)} 70%{transform:scale(1.1)} 100%{transform:scale(1)} }
@keyframes pulseGlow  { 0%,100%{box-shadow:0 8px 30px rgba(99,102,241,0.5)} 50%{box-shadow:0 8px 50px rgba(99,102,241,0.85),0 0 60px rgba(6,182,212,0.35)} }
@keyframes rotateHue  { from{filter:hue-rotate(0deg)} to{filter:hue-rotate(360deg)} }
@keyframes starPop    { 0%{transform:scale(0)} 60%{transform:scale(1.3)} 100%{transform:scale(1)} }
@keyframes slideDown  { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
@keyframes imgZoom    { from{transform:scale(1)} to{transform:scale(1.04)} }
@keyframes modalIn    { from{opacity:0;transform:scale(0.93) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
@keyframes successPop { 0%{transform:scale(0.7)} 70%{transform:scale(1.08)} 100%{transform:scale(1)} }

.sfi-img-wrap:hover .sfi-img { animation: imgZoom 0.4s forwards; }
.sfi-pay-btn { animation: pulseGlow 2.5s ease-in-out infinite; }
.sfi-pay-btn:hover { animation: none; transform: translateY(-2px) scale(1.02); }
.sfi-star { animation: starPop 0.3s both; }

.sfi-detail-row { transition: background 0.2s; border-radius:10px; padding:8px 10px; }
.sfi-detail-row:hover { background: rgba(99,102,241,0.06); }

.sfi-input { width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid #e2e8f0;
  font-family:inherit; font-size:14px; outline:none; transition:border-color 0.2s,box-shadow 0.2s;
  box-sizing:border-box; }
.sfi-input:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.12); }

@media(max-width:760px){
  .sfi-grid { grid-template-columns:1fr!important; }
  .sfi-hero-h1 { font-size:28px!important; }
}
`;

export default function StorefrontItemDetail() {
  const { slug, type, id } = useParams();
  const navigate = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [injected,   setInjected]   = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successInv, setSuccessInv] = useState(null);
  const [form,       setForm]       = useState({ name:"", email:"", phone:"" });

  useEffect(()=>{
    if(!injected){
      const s=document.createElement("style");
      s.textContent=CSS;
      document.head.appendChild(s);
      setInjected(true);
    }
  },[injected]);

  useEffect(()=>{
    api.get(`/store/${slug}/${type}/${id}`)
      .then(r=>setData(r.data))
      .catch(e=>setError(e.response?.data?.error||"Item not found"))
      .finally(()=>setLoading(false));
  },[slug,type,id]);

  const theme   = data?.organization?.theme_config || {};
  const primary = theme.primaryColor   || "#6366f1";
  const second  = theme.secondaryColor || "#8b5cf6";
  const accent  = theme.accentColor    || "#06b6d4";
  const hdr     = theme.sidebarColor   || "#1e1b4b";

  const item     = data?.item;
  const org      = data?.organization;
  const currency = org?.currency || "USD";
  const price    = useMemo(()=>Number(item?.price)||0,[item]);
  const fmt      = a=>new Intl.NumberFormat("en-US",{style:"currency",currency}).format(a);

  const handlePlaceOrder = async ()=>{
    if(!form.name.trim()){ toast.error("Please enter your name"); return; }
    setSubmitting(true);
    try {
      const res = await api.post(`/store/${slug}/order`,{
        type, item_id:id,
        customer_name:  form.name.trim(),
        customer_email: form.email.trim()||undefined,
        customer_phone: form.phone.trim()||undefined,
      });
      setSuccessInv(res.data.invoice_number);
    } catch(e){
      toast.error(e.response?.data?.error||"Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const font = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  /* ── Loading ── */
  if(loading) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",fontFamily:font,
      background:`linear-gradient(135deg,${hdr},#1e1b4b,#312e81)`,
      backgroundSize:"400% 400%",animation:"gradShift 6s ease infinite" }}>
      <div style={{ width:64,height:64,borderRadius:"50%",
        border:"4px solid rgba(255,255,255,0.15)",borderTopColor:"white",
        animation:"rotateHue 1s linear infinite",marginBottom:20 }} />
      <p style={{ color:"rgba(255,255,255,0.8)",fontSize:16,fontWeight:600 }}>Loading…</p>
    </div>
  );

  /* ── Error ── */
  if(error||!item) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",fontFamily:font,
      background:`linear-gradient(135deg,${hdr},${primary})`,textAlign:"center",padding:24 }}>
      <div style={{ fontSize:72,marginBottom:16,animation:"floatA 3s ease-in-out infinite" }}>📦</div>
      <h2 style={{ color:"white",marginBottom:8,fontSize:26 }}>Item Not Found</h2>
      <p style={{ color:"rgba(255,255,255,0.65)",marginBottom:28 }}>{error}</p>
      <button onClick={()=>navigate(`/store/${slug}`)}
        style={{ padding:"12px 28px",borderRadius:14,border:"none",fontFamily:font,
          background:`linear-gradient(135deg,${primary},${accent})`,color:"white",
          fontWeight:700,cursor:"pointer",fontSize:15,boxShadow:`0 8px 24px ${primary}55` }}>
        ← Back to Store
      </button>
    </div>
  );

  const isProduct    = type==="product";
  const chipCol      = isProduct ? primary : second;
  const gradStart    = isProduct ? primary : second;
  const gradEnd      = isProduct ? accent  : primary;
  const detailEntries= Object.entries(item).filter(([k])=>!SKIP.has(k));

  return (
    <div style={{ minHeight:"100vh",background:"#f0f2ff",fontFamily:font }}>

      {/* ═══ ANIMATED TOP NAV ═══ */}
      <nav style={{ background:`linear-gradient(135deg,${hdr},${primary})`,
        backgroundSize:"300% 300%",animation:"gradShift 8s ease infinite slideDown 0.4s both",
        padding:"0 24px",position:"sticky",top:0,zIndex:40,
        boxShadow:`0 4px 24px ${primary}55`,backdropFilter:"blur(12px)" }}>
        <div style={{ maxWidth:1100,margin:"0 auto",height:60,display:"flex",alignItems:"center",gap:16 }}>
          <button onClick={()=>navigate(`/store/${slug}`)}
            style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 18px",borderRadius:12,
              border:"1px solid rgba(255,255,255,0.25)",background:"rgba(255,255,255,0.12)",
              backdropFilter:"blur(8px)",color:"white",fontWeight:700,cursor:"pointer",fontSize:14,
              fontFamily:font,transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.22)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.12)";}}>
            <ArrowLeft size={15}/> {org.name}
          </button>

          <div style={{ display:"flex",alignItems:"center",gap:6,flex:1 }}>
            {/* breadcrumb dots */}
            <span style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>·</span>
            <span style={{ color:"rgba(255,255,255,0.7)",fontSize:13,fontWeight:600 }}>
              {isProduct?"Products":"Services"}
            </span>
            <span style={{ color:"rgba(255,255,255,0.4)",fontSize:13 }}>·</span>
            <span style={{ color:"white",fontSize:13,fontWeight:700 }}>{item.name}</span>
          </div>

          {org.industry && (
            <span style={{ padding:"4px 12px",borderRadius:999,
              background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",
              color:"rgba(255,255,255,0.85)",fontSize:11,fontWeight:700,textTransform:"capitalize" }}>
              {org.industry.replace(/_/g," ")}
            </span>
          )}
        </div>
      </nav>

      {/* ═══ HERO BAND ═══ */}
      <div style={{ position:"relative",overflow:"hidden",
        background:`linear-gradient(135deg,${gradStart}dd,${gradEnd}dd)`,
        backgroundSize:"300% 300%",animation:"gradShift 8s ease infinite",
        padding:"48px 24px 80px" }}>

        {/* floating blobs */}
        <div style={{ position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",
          background:`radial-gradient(circle,${accent}66,transparent 70%)`,
          animation:"floatEmoji 6s ease-in-out infinite",pointerEvents:"none" }} />
        <div style={{ position:"absolute",bottom:-60,left:-30,width:180,height:180,borderRadius:"50%",
          background:`radial-gradient(circle,${second}44,transparent 70%)`,
          animation:"floatEmoji 5s 1s ease-in-out infinite",pointerEvents:"none" }} />

        {/* Floating character emojis */}
        <FloatingStar style={{ top:18, left:"14%", animationDelay:"0s" }}/>
        <FloatingStar style={{ top:36, right:"22%", animationDelay:"1s", fontSize:16 }}/>
        <FloatingStar style={{ bottom:65, left:"42%", animationDelay:"2s", fontSize:18 }}/>
        <div style={{ position:"absolute",top:28,right:"32%",fontSize:22,userSelect:"none",
          pointerEvents:"none",animation:"floatEmoji 5s 1.5s ease-in-out infinite" }}>🛍️</div>
        <div style={{ position:"absolute",bottom:55,right:"16%",fontSize:18,userSelect:"none",
          pointerEvents:"none",animation:"floatEmoji 4s 0.5s ease-in-out infinite" }}>⭐</div>

        <div style={{ maxWidth:1100,margin:"0 auto",position:"relative",zIndex:2,
          display:"flex",alignItems:"center",gap:20,flexWrap:"wrap" }}>
          <span style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"7px 16px",borderRadius:999,
            background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",
            border:"1px solid rgba(255,255,255,0.3)",
            color:"white",fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.05em",
            animation:"badgePop 0.4s both" }}>
            {isProduct?<ShoppingBag size={13}/>:<Wrench size={13}/>}
            {type}
          </span>

          <h1 className="sfi-hero-h1"
            style={{ margin:0,fontSize:38,fontWeight:900,color:"white",letterSpacing:"-0.02em",
              textShadow:"0 2px 20px rgba(0,0,0,0.25)",flex:1,minWidth:0,
              animation:"fadeInUp 0.5s 0.1s both" }}>
            {item.name}
          </h1>

          <div style={{ display:"flex",alignItems:"center",gap:6,
            padding:"10px 20px",borderRadius:16,
            background:"rgba(255,255,255,0.15)",backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,0.3)",animation:"pricePop 0.5s 0.2s both" }}>
            <span style={{ fontSize:30,fontWeight:900,color:"white" }}>{fmt(price)}</span>
          </div>
        </div>

        {/* Wave */}
        <svg viewBox="0 0 1440 56" style={{ position:"absolute",bottom:-2,width:"100%",display:"block" }} preserveAspectRatio="none">
          <path d="M0,32 C360,56 1080,0 1440,32 L1440,56 L0,56 Z" fill="#f0f2ff"/>
        </svg>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"32px 24px 80px" }}>
        <div className="sfi-grid" style={{ display:"grid",gridTemplateColumns:"1.15fr 1fr",gap:24,alignItems:"start" }}>

          {/* ── LEFT: image + purchase ── */}
          <div style={{ display:"grid",gap:20 }}>

            {/* Image card */}
            <div className="sfi-img-wrap" style={{ borderRadius:24,overflow:"hidden",
              boxShadow:`0 20px 60px ${chipCol}33`,border:`2px solid ${chipCol}33`,
              animation:"fadeInUp 0.55s both",cursor:"zoom-in",position:"relative" }}>
              <img className="sfi-img"
                src={item.image_url||getFallback(type)} alt={item.name}
                onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=getFallback(type);}}
                style={{ width:"100%",height:340,objectFit:"cover",display:"block",transition:"transform 0.4s ease" }} />
              {/* Shine overlay */}
              <div style={{ position:"absolute",inset:0,background:`linear-gradient(135deg,rgba(255,255,255,0.05),transparent,rgba(255,255,255,0.05))`,
                pointerEvents:"none" }} />
            </div>

            {/* Purchase card */}
            <div style={{ borderRadius:24,background:"white",padding:"28px 28px 32px",
              boxShadow:`0 8px 40px rgba(0,0,0,0.08)`,border:`2px solid ${chipCol}22`,
              animation:"fadeInUp 0.55s 0.1s both" }}>

              {/* Meta chips */}
              <div style={{ display:"flex",gap:10,flexWrap:"wrap",marginBottom:18 }}>
                {item.category_name && (
                  <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 14px",borderRadius:999,
                    background:`${chipCol}15`,border:`1px solid ${chipCol}33`,
                    color:chipCol,fontSize:12,fontWeight:700 }}>
                    <Tag size={11}/>{item.category_name}
                  </span>
                )}
                {item.unit && (
                  <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 14px",borderRadius:999,
                    background:`${accent}15`,border:`1px solid ${accent}33`,color:accent,fontSize:12,fontWeight:700 }}>
                    <Package size={11}/> per {item.unit}
                  </span>
                )}
                {item.duration_minutes && (
                  <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 14px",borderRadius:999,
                    background:`${second}15`,border:`1px solid ${second}33`,color:second,fontSize:12,fontWeight:700 }}>
                    <Clock size={11}/>{item.duration_minutes} min
                  </span>
                )}
              </div>

              {/* Price display */}
              <div style={{ marginBottom:16,padding:"16px 20px",borderRadius:16,
                background:`linear-gradient(135deg,${gradStart}12,${gradEnd}12)`,
                border:`1px dashed ${chipCol}44` }}>
                <p style={{ margin:"0 0 4px",fontSize:11,fontWeight:700,textTransform:"uppercase",
                  letterSpacing:"0.08em",color:chipCol }}>Total Price</p>
                <div style={{ fontSize:40,fontWeight:900,lineHeight:1,
                  background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                  WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                  {fmt(price)}
                </div>
              </div>

              {item.description && (
                <p style={{ color:"#475569",fontSize:15,lineHeight:1.7,marginBottom:20 }}>
                  {item.description}
                </p>
              )}

              {/* Order button row with helper character */}
              <div style={{ display:"flex", alignItems:"flex-end", gap:16 }}>
                <div style={{ flex:1 }}>
                  <button className="sfi-pay-btn" onClick={()=>setShowModal(true)}
                    style={{ width:"100%",padding:"16px 0",borderRadius:16,border:"none",fontFamily:font,
                      background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                      color:"white",fontWeight:800,fontSize:17,cursor:"pointer",
                      display:"flex",alignItems:"center",justifyContent:"center",gap:10,
                      transition:"transform 0.2s,box-shadow 0.2s",letterSpacing:"-0.01em" }}>
                    <CreditCard size={18} style={{ filter:"drop-shadow(0 0 6px rgba(255,255,255,0.8))" }}/>
                    Place Order
                  </button>
                  <p style={{ textAlign:"center",fontSize:12,color:"#94a3b8",marginTop:8,marginBottom:0 }}>
                    Bank transfer · We will contact you shortly
                  </p>
                </div>
                <HelperCharacter primary={primary} accent={accent}/>
              </div>
            </div>
          </div>

          {/* ── RIGHT: details + reviews ── */}
          <div style={{ display:"grid",gap:20 }}>

            {/* Item details card */}
            <div style={{ borderRadius:24,background:"white",padding:"24px 26px",
              boxShadow:"0 8px 40px rgba(0,0,0,0.08)",border:`2px solid ${chipCol}22`,
              animation:"fadeInUp 0.55s 0.15s both" }}>

              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                <div style={{ width:36,height:36,borderRadius:12,
                  background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <ShoppingBag size={16} color="white"/>
                </div>
                <h3 style={{ margin:0,fontSize:17,fontWeight:800,color:"#0f172a" }}>Item Details</h3>
              </div>

              <div style={{ display:"grid",gap:2 }}>
                {detailEntries.map(([key,val],i)=>(
                  <div key={key} className="sfi-detail-row"
                    style={{ display:"grid",gridTemplateColumns:"120px minmax(0,1fr)",gap:8,
                      fontSize:13,alignItems:"start",
                      animation:`fadeIn 0.3s ${i*0.04}s both` }}>
                    <span style={{ color:"#94a3b8",fontWeight:700,fontSize:12,
                      textTransform:"uppercase",letterSpacing:"0.04em",paddingTop:2 }}>
                      {formatLabel(key)}
                    </span>
                    <span style={{ color:"#1e293b",fontWeight:500,overflowWrap:"anywhere" }}>
                      {formatValue(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews card */}
            <div style={{ borderRadius:24,background:"white",padding:"24px 26px",
              boxShadow:"0 8px 40px rgba(0,0,0,0.08)",border:`2px solid ${chipCol}22`,
              animation:"fadeInUp 0.55s 0.25s both" }}>

              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:18 }}>
                <div style={{ width:36,height:36,borderRadius:12,
                  background:"linear-gradient(135deg,#f59e0b,#ef4444)",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <Star size={16} color="white"/>
                </div>
                <div>
                  <h3 style={{ margin:0,fontSize:17,fontWeight:800,color:"#0f172a" }}>Customer Reviews</h3>
                  <p style={{ margin:0,fontSize:12,color:"#94a3b8" }}>What people are saying</p>
                </div>
                <div style={{ marginLeft:"auto",padding:"4px 12px",borderRadius:999,
                  background:"linear-gradient(135deg,#f59e0b,#ef4444)",color:"white",fontSize:13,fontWeight:800 }}>
                  ⭐ 4.9
                </div>
              </div>

              <div style={{ display:"grid",gap:14 }}>
                {DEFAULT_REVIEWS.map((r,i)=>(
                  <div key={r.id}
                    style={{ borderRadius:16,padding:"14px 16px",animation:`fadeInUp 0.4s ${0.3+i*0.1}s both`,
                      background:`linear-gradient(135deg,${r.color}08,${r.color}04)`,
                      border:`1px solid ${r.color}22` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
                      <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,
                        background:`linear-gradient(135deg,${r.color},${r.color}88)`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:16,fontWeight:900,color:"white",
                        boxShadow:`0 4px 12px ${r.color}44` }}>
                        {r.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight:800,fontSize:14,color:"#0f172a" }}>{r.name}</div>
                        <div style={{ display:"flex",gap:2,marginTop:2 }}>
                          {[1,2,3,4,5].map(s=>(
                            <span key={s} className="sfi-star"
                              style={{ fontSize:13,color: s<=r.rating?"#f59e0b":"#e2e8f0",
                                animationDelay:`${0.3+i*0.1+s*0.05}s` }}>★</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p style={{ margin:0,fontSize:13,color:"#475569",lineHeight:1.6 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Store badge */}
            <div style={{ borderRadius:20,padding:"18px 22px",
              background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
              backgroundSize:"300% 300%",animation:"gradShift 6s ease infinite",
              display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.2)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
                🏪
              </div>
              <div>
                <p style={{ margin:0,fontWeight:800,color:"white",fontSize:15 }}>{org.name}</p>
                <p style={{ margin:"2px 0 0",color:"rgba(255,255,255,0.75)",fontSize:12 }}>
                  Verified seller · Powered by WabyOne
                </p>
              </div>
              <button onClick={()=>navigate(`/store/${slug}`)}
                style={{ marginLeft:"auto",padding:"8px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.3)",
                  background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",color:"white",
                  fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:font,flexShrink:0,
                  transition:"background 0.2s" }}
                onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.25)";}}
                onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.15)";}}>
                View Store →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background:`linear-gradient(135deg,${hdr},${primary})`,padding:"24px",textAlign:"center",
        borderTop:`2px solid ${primary}44` }}>
        <p style={{ color:"rgba(255,255,255,0.65)",fontSize:14,margin:0 }}>
          <span style={{ fontWeight:800,color:"white" }}>{org.name}</span>
          {" "}· Powered by{" "}
          <span style={{ fontWeight:900,color:accent }}>WabyOne</span>
        </p>
      </footer>

      {/* ═══ ORDER MODAL ═══ */}
      {showModal && (
        <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(15,23,42,0.65)",backdropFilter:"blur(6px)",padding:16 }}
          onClick={e=>{ if(e.target===e.currentTarget&&!submitting){ setShowModal(false); setSuccessInv(null); setForm({name:"",email:"",phone:""}); } }}>

          <div style={{ background:"white",borderRadius:24,padding:"32px 28px",maxWidth:440,width:"100%",
            boxShadow:"0 32px 80px rgba(0,0,0,0.25)",animation:"modalIn 0.25s both",position:"relative" }}>

            {/* Close */}
            {!submitting && (
              <button onClick={()=>{ setShowModal(false); setSuccessInv(null); setForm({name:"",email:"",phone:""}); }}
                style={{ position:"absolute",top:16,right:16,background:"#f1f5f9",border:"none",
                  borderRadius:999,width:32,height:32,cursor:"pointer",fontSize:18,
                  display:"flex",alignItems:"center",justifyContent:"center",color:"#64748b" }}>
                ×
              </button>
            )}

            {successInv ? (
              /* ── Success screen ── */
              <div style={{ textAlign:"center",padding:"8px 0" }}>
                <div style={{ fontSize:64,marginBottom:12,animation:"successPop 0.5s both" }}>🎉</div>
                <h3 style={{ margin:"0 0 8px",fontSize:22,fontWeight:900,color:"#0f172a" }}>
                  Order Placed!
                </h3>
                <p style={{ margin:"0 0 16px",color:"#475569",fontSize:14,lineHeight:1.6 }}>
                  Your order <strong style={{ color:primary }}>{successInv}</strong> has been created as a draft.
                </p>

                {/* Bank transfer highlight */}
                <div style={{ borderRadius:16,padding:"18px 20px",marginBottom:20,
                  background:`linear-gradient(135deg,${gradStart}12,${gradEnd}12)`,
                  border:`2px solid ${chipCol}33`,textAlign:"left" }}>
                  <p style={{ margin:"0 0 6px",fontWeight:800,fontSize:15,color:"#0f172a" }}>
                    Please make payment via bank transfer
                  </p>
                  <p style={{ margin:0,fontSize:13,color:"#64748b",lineHeight:1.6 }}>
                    Our team will contact you shortly with the bank account details to complete your payment.
                  </p>
                </div>

                <button onClick={()=>{ setShowModal(false); setSuccessInv(null); setForm({name:"",email:"",phone:""}); }}
                  style={{ width:"100%",padding:"13px 0",borderRadius:14,border:"none",fontFamily:font,
                    background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                    color:"white",fontWeight:800,fontSize:15,cursor:"pointer" }}>
                  Done
                </button>
              </div>
            ) : (
              /* ── Order form ── */
              <>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:22 }}>
                  <div style={{ width:44,height:44,borderRadius:14,flexShrink:0,
                    background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                    display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <ShoppingBag size={20} color="white"/>
                  </div>
                  <div>
                    <h3 style={{ margin:0,fontSize:18,fontWeight:900,color:"#0f172a" }}>Place Order</h3>
                    <p style={{ margin:0,fontSize:13,color:"#94a3b8" }}>{item.name} · {fmt(price)}</p>
                  </div>
                </div>

                <div style={{ display:"grid",gap:12,marginBottom:20 }}>
                  <div>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#475569",
                      textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5 }}>
                      Full Name *
                    </label>
                    <input className="sfi-input" placeholder="e.g. Kamal Perera"
                      value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#475569",
                      textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5 }}>
                      Email <span style={{ color:"#94a3b8",fontWeight:500,textTransform:"none" }}>(optional)</span>
                    </label>
                    <input className="sfi-input" type="email" placeholder="you@example.com"
                      value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                  </div>
                  <div>
                    <label style={{ display:"block",fontSize:12,fontWeight:700,color:"#475569",
                      textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:5 }}>
                      Phone <span style={{ color:"#94a3b8",fontWeight:500,textTransform:"none" }}>(optional)</span>
                    </label>
                    <input className="sfi-input" type="tel" placeholder="077 123 4567"
                      value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
                  </div>
                </div>

                <button onClick={handlePlaceOrder} disabled={submitting}
                  style={{ width:"100%",padding:"14px 0",borderRadius:14,border:"none",fontFamily:font,
                    background:submitting?"#cbd5e1":`linear-gradient(135deg,${gradStart},${gradEnd})`,
                    color:"white",fontWeight:800,fontSize:16,cursor:submitting?"not-allowed":"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                    transition:"opacity 0.2s" }}>
                  {submitting ? "Placing Order…" : (
                    <><CreditCard size={17}/> Confirm Order</>
                  )}
                </button>
                <p style={{ textAlign:"center",fontSize:12,color:"#94a3b8",marginTop:10,marginBottom:0 }}>
                  Payment via bank transfer · Our team will reach out
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
