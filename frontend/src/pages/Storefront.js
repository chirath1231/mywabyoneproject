import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";
import { Globe, Mail, Phone, Search, ShoppingBag, Sparkles, Wrench, Zap } from "lucide-react";

/* ─── Animated shopkeeper mascot ─────────────────────────────────────── */
function StoreMascot({ primary, accent, second }) {
  return (
    <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
      {/* Character wrapper — bobs up and down */}
      <div style={{ animation: "mascotBob 3.2s ease-in-out infinite", display: "inline-block" }}>
        <svg width="160" height="210" viewBox="0 0 160 210" fill="none" xmlns="http://www.w3.org/2000/svg">

          {/* ── Ground shadow ── */}
          <ellipse cx="80" cy="205" rx="42" ry="8"
            fill="rgba(0,0,0,0.18)"
            style={{ animation: "shadowPulse 3.2s ease-in-out infinite" }} />

          {/* ── Shoes ── */}
          <ellipse cx="57" cy="198" rx="18" ry="8" fill="#1e293b"/>
          <ellipse cx="103" cy="198" rx="18" ry="8" fill="#1e293b"/>

          {/* ── Legs ── */}
          <rect x="46" y="168" width="22" height="32" rx="8" fill={second}
            style={{ transformOrigin:"57px 168px", animation:"walkLegs 1.8s ease-in-out infinite" }}/>
          <rect x="92" y="168" width="22" height="32" rx="8" fill={second}
            style={{ transformOrigin:"103px 168px", animation:"walkLegs 1.8s 0.9s ease-in-out infinite" }}/>

          {/* ── Suit body ── */}
          <rect x="38" y="104" width="84" height="72" rx="14" fill={second}/>

          {/* Suit lapels */}
          <path d="M 80 104 L 60 124 L 80 116 Z" fill={primary} opacity="0.9"/>
          <path d="M 80 104 L 100 124 L 80 116 Z" fill={primary} opacity="0.9"/>

          {/* Shirt strip */}
          <rect x="72" y="104" width="16" height="72" rx="4" fill="white" opacity="0.95"/>

          {/* Buttons */}
          <circle cx="80" cy="126" r="3" fill={primary}/>
          <circle cx="80" cy="138" r="3" fill={primary}/>
          <circle cx="80" cy="150" r="3" fill={primary}/>

          {/* Bow tie */}
          <polygon points="72,113 80,118 72,123" fill={accent}/>
          <polygon points="88,113 80,118 88,123" fill={accent}/>
          <circle cx="80" cy="118" r="3.5" fill={accent}/>

          {/* ── Left arm holding shopping bag ── */}
          <g style={{ transformBox:"fill-box", transformOrigin:"left center" }}>
            <rect x="10" y="108" width="30" height="16" rx="8" fill={second}/>
            {/* Hand */}
            <circle cx="14" cy="116" r="12" fill="#fbbf24"/>
            {/* Bag */}
            <rect x="-6" y="122" width="30" height="28" rx="6" fill={accent}/>
            <path d="M -1 122 Q -1 114 9 114 Q 19 114 19 122"
              stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <text x="7" y="140" fontSize="13" fill="white" fontWeight="800">🛍</text>
          </g>

          {/* ── Right arm waving ── */}
          <g style={{
            transformBox: "fill-box",
            transformOrigin: "0% 50%",
            animation: "waveArm 1.4s ease-in-out infinite",
          }}>
            <rect x="120" y="108" width="34" height="16" rx="8" fill={second}/>
            {/* Hand with fingers */}
            <circle cx="151" cy="116" r="13" fill="#fbbf24"/>
            {/* Finger hints */}
            <rect x="147" y="103" width="6" height="11" rx="3" fill="#fbbf24"/>
            <rect x="155" y="101" width="6" height="13" rx="3" fill="#fbbf24"/>
            <rect x="139" y="104" width="6" height="10" rx="3" fill="#fbbf24"/>
          </g>

          {/* ── Neck ── */}
          <rect x="65" y="90" width="30" height="18" rx="8" fill="#fbbf24"/>

          {/* ── Head ── */}
          <circle cx="80" cy="68" r="44" fill="#fbbf24"/>

          {/* ── Hat ── */}
          {/* Brim */}
          <rect x="30" y="32" width="100" height="11" rx="5" fill={primary}/>
          {/* Crown */}
          <rect x="44" y="6" width="72" height="32" rx="10" fill={primary}/>
          {/* Hat band */}
          <rect x="44" y="32" width="72" height="8" fill={accent}/>
          {/* Hat shine */}
          <rect x="52" y="10" width="10" height="24" rx="5" fill="rgba(255,255,255,0.15)"
            style={{ animation: "suitShine 3s 1s ease-in-out infinite" }}/>

          {/* ── Eyes ── */}
          {/* Left eye white */}
          <ellipse cx="64" cy="67" rx="11" ry="12" fill="white"/>
          {/* Left pupil — blinks */}
          <g style={{ transformBox:"fill-box", transformOrigin:"center", animation:"eyeBlink 5s ease-in-out infinite" }}>
            <circle cx="64" cy="68" r="8" fill={second}/>
            <circle cx="67" cy="64" r="3" fill="white"/>
          </g>

          {/* Right eye white */}
          <ellipse cx="96" cy="67" rx="11" ry="12" fill="white"/>
          {/* Right pupil — blinks offset */}
          <g style={{ transformBox:"fill-box", transformOrigin:"center", animation:"eyeBlink 5s 0.3s ease-in-out infinite" }}>
            <circle cx="96" cy="68" r="8" fill={second}/>
            <circle cx="99" cy="64" r="3" fill="white"/>
          </g>

          {/* ── Eyebrows ── */}
          <path d="M 54 55 Q 64 50 74 55" stroke={second} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <path d="M 86 55 Q 96 50 106 55" stroke={second} strokeWidth="3.5" fill="none" strokeLinecap="round"/>

          {/* ── Smile ── */}
          <path d="M 62 83 Q 80 97 98 83"
            stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round"/>

          {/* ── Cheeks ── */}
          <ellipse cx="49" cy="79" rx="10" ry="7" fill="#f87171" opacity="0.45"/>
          <ellipse cx="111" cy="79" rx="10" ry="7" fill="#f87171" opacity="0.45"/>

          {/* ── Sparkles around character ── */}
          <text x="4" y="50" fontSize="14"
            style={{ animation:"sparkle 2.4s ease-in-out infinite" }}>✨</text>
          <text x="135" y="80" fontSize="12"
            style={{ animation:"sparkle 2.4s 0.8s ease-in-out infinite" }}>⭐</text>
          <text x="10" y="160" fontSize="12"
            style={{ animation:"sparkle 2.4s 1.6s ease-in-out infinite" }}>💫</text>
        </svg>
      </div>

      {/* ── Speech bubble ── */}
      <div style={{
        position: "absolute", top: 0, right: -10,
        background: "white", borderRadius: "18px 18px 18px 4px",
        padding: "10px 16px", fontSize: 13, fontWeight: 800,
        color: primary, boxShadow: "0 6px 24px rgba(0,0,0,0.18)",
        whiteSpace: "nowrap", lineHeight: 1.4,
        animation: "bubbleFloat 2.8s ease-in-out infinite",
        border: `2px solid ${accent}44`,
      }}>
        Welcome! 👋
        <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginTop: 2 }}>
          Shop the best deals
        </div>
      </div>
    </div>
  );
}

/* ─── Floating emoji helper ──────────────────────────────────────────── */
function FloatingEmoji({ emoji, style }) {
  return (
    <div style={{
      position: "absolute", fontSize: 28, userSelect: "none", pointerEvents: "none",
      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.2))",
      animation: "floatEmoji 4s ease-in-out infinite",
      ...style,
    }}>
      {emoji}
    </div>
  );
}

/* ─── Tag price character ─────────────────────────────────────────────── */
function PriceTagCharacter({ primary, accent }) {
  return (
    <div style={{
      display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4,
      animation: "floatEmoji 3.5s ease-in-out infinite",
    }}>
      <div style={{ fontSize: 48, animation: "tagSwing 2s ease-in-out infinite", transformOrigin: "top center" }}>🏷️</div>
      <div style={{
        background: `linear-gradient(135deg,${primary},${accent})`,
        color: "white", borderRadius: 999, padding: "4px 12px",
        fontSize: 11, fontWeight: 800,
      }}>HOT DEALS</div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function getFallback(type) {
  const label = type === "product" ? "Product" : "Service";
  const bg    = type === "product" ? "6366f1" : "8b5cf6";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'>
      <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop offset='0%' stop-color='#${bg}'/><stop offset='100%' stop-color='#1e1b4b'/>
      </linearGradient></defs>
      <rect width='100%' height='100%' fill='url(#g)'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
        fill='rgba(255,255,255,0.9)' font-family='Arial,sans-serif' font-size='38' font-weight='800'>${label}</text>
    </svg>`,
  )}`;
}

/* ─── Main component ─────────────────────────────────────────────────── */
export default function Storefront() {
  const { slug }  = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    api.get(`/store/${slug}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || "Store not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  const theme   = data?.organization?.theme_config || {};
  const primary = theme.primaryColor   || "#6366f1";
  const second  = theme.secondaryColor || "#8b5cf6";
  const accent  = theme.accentColor    || "#06b6d4";
  const hdr     = theme.sidebarColor   || "#1e1b4b";

  const items = useMemo(() => {
    if (!data) return [];
    const products = (data.products || []).map(p => ({ ...p, itemType: "product" }));
    const services = (data.services || []).map(s => ({ ...s, itemType: "service" }));
    return [...products, ...services].filter(item => {
      const tMatch = filter === "all" || item.itemType === filter;
      const sMatch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return tMatch && sMatch;
    });
  }, [data, filter, search]);

  const font = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",fontFamily:font,
      background:`linear-gradient(135deg,${hdr},#312e81)`,
      backgroundSize:"400% 400%",animation:"gradShift 6s ease infinite" }}>
      <div style={{ fontSize:64, animation:"mascotBob 1.2s ease-in-out infinite" }}>🏪</div>
      <p style={{ color:"rgba(255,255,255,0.85)",fontSize:17,fontWeight:700,marginTop:16 }}>
        Loading store…
      </p>
    </div>
  );

  if (error) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      minHeight:"100vh",fontFamily:font,background:"linear-gradient(135deg,#1e1b4b,#312e81)",
      textAlign:"center",padding:24 }}>
      <div style={{ fontSize:72, animation:"mascotBob 3s ease-in-out infinite" }}>🏪</div>
      <h2 style={{ color:"white",marginBottom:8,fontSize:24,marginTop:16 }}>Store Not Found</h2>
      <p style={{ color:"rgba(255,255,255,0.6)" }}>{error}</p>
    </div>
  );

  const org      = data.organization;
  const currency = org.currency || "USD";
  const fmt      = p => new Intl.NumberFormat("en-US",{style:"currency",currency}).format(p);

  const FILTERS = [
    { val:"all",     label:"✨ All",       count:(data.products?.length||0)+(data.services?.length||0) },
    { val:"product", label:"📦 Products",  count:data.products?.length||0 },
    { val:"service", label:"⚡ Services",  count:data.services?.length||0 },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#f0f2ff", fontFamily:font }}>

      {/* ═══ ANIMATED HERO ═══ */}
      <header style={{ position:"relative", overflow:"hidden", paddingBottom:60,
        background:`linear-gradient(135deg,${hdr} 0%,${primary} 55%,${accent} 100%)`,
        backgroundSize:"300% 300%", animation:"gradShift 8s ease infinite" }}>

        {/* Floating background blobs */}
        <div style={{ position:"absolute",top:-60,right:"10%",width:300,height:300,borderRadius:"50%",
          background:`radial-gradient(circle,${accent}44,transparent 70%)`,
          animation:"floatEmoji 7s ease-in-out infinite",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-80,left:"5%",width:240,height:240,borderRadius:"50%",
          background:`radial-gradient(circle,${second}33,transparent 70%)`,
          animation:"floatEmoji 5s 1s ease-in-out infinite",pointerEvents:"none" }}/>

        {/* Floating emoji characters */}
        <FloatingEmoji emoji="🛍️" style={{ top:30, left:"12%", animationDelay:"0s", fontSize:32 }}/>
        <FloatingEmoji emoji="⭐" style={{ top:60, right:"18%", animationDelay:"0.7s", fontSize:24 }}/>
        <FloatingEmoji emoji="🎁" style={{ bottom:80, left:"22%", animationDelay:"1.4s", fontSize:28 }}/>
        <FloatingEmoji emoji="💳" style={{ top:100, left:"38%", animationDelay:"2.1s", fontSize:22 }}/>
        <FloatingEmoji emoji="✨" style={{ bottom:100, right:"25%", animationDelay:"2.8s", fontSize:20 }}/>

        <div style={{ maxWidth:1200, margin:"0 auto", padding:"48px 24px 0", position:"relative", zIndex:2 }}>

          {/* Two-column: org info LEFT, mascot RIGHT */}
          <div style={{ display:"flex", alignItems:"flex-end", gap:32, flexWrap:"wrap" }}>

            {/* LEFT — org identity */}
            <div style={{ flex:1, minWidth:280, animation:"fadeInUp 0.6s both" }}>
              <div style={{ display:"flex", alignItems:"center", gap:24, marginBottom:20 }}>
                {/* Logo */}
                <div style={{ position:"relative", flexShrink:0 }}>
                  <div style={{ position:"absolute",inset:-6,borderRadius:22,
                    background:`linear-gradient(135deg,${accent},${primary},${second})`,
                    animation:"gradShift 4s ease infinite",opacity:0.7 }}/>
                  {org.logo_url ? (
                    <img src={org.logo_url} alt={org.name}
                      style={{ position:"relative",width:80,height:80,borderRadius:18,
                        objectFit:"cover",border:"3px solid rgba(255,255,255,0.4)",zIndex:1 }}/>
                  ) : (
                    <div style={{ position:"relative",width:80,height:80,borderRadius:18,
                      background:`linear-gradient(135deg,${primary},${accent})`,zIndex:1,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:32,fontWeight:900,color:"white",
                      border:"3px solid rgba(255,255,255,0.3)",
                      boxShadow:`0 0 40px ${primary}88` }}>
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:4 }}>
                    <h1 style={{ margin:0,fontSize:34,fontWeight:900,color:"white",letterSpacing:"-0.03em",
                      textShadow:"0 2px 20px rgba(0,0,0,0.3)" }}>{org.name}</h1>
                    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"4px 12px",
                      borderRadius:999,background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",
                      color:"white",fontSize:11,fontWeight:800,border:"1px solid rgba(255,255,255,0.3)",
                      animation:"bounceIn 0.5s 0.4s both" }}>
                      <Sparkles size={10}/> OFFICIAL STORE
                    </span>
                  </div>
                  {org.description && (
                    <p style={{ margin:0,color:"rgba(255,255,255,0.85)",fontSize:15,maxWidth:500,lineHeight:1.65 }}>
                      {org.description}
                    </p>
                  )}
                  {org.industry && (
                    <span style={{ display:"inline-block",marginTop:10,padding:"5px 14px",borderRadius:999,
                      background:"rgba(255,255,255,0.15)",backdropFilter:"blur(8px)",
                      color:"white",fontSize:13,fontWeight:700,textTransform:"capitalize",
                      border:"1px solid rgba(255,255,255,0.25)" }}>
                      🏷️ {org.industry.replace(/_/g," ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Contact links */}
              {(org.phone||org.email||org.website) && (
                <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:20 }}>
                  {org.phone  && <a href={`tel:${org.phone}`} style={cLink}><Phone size={13}/>{org.phone}</a>}
                  {org.email  && <a href={`mailto:${org.email}`} style={cLink}><Mail size={13}/>{org.email}</a>}
                  {org.website && <a href={org.website} target="_blank" rel="noopener noreferrer" style={cLink}><Globe size={13}/>{org.website}</a>}
                </div>
              )}

              {/* Stats */}
              <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
                {[
                  { icon:"📦", val:data.products?.length||0,  lbl:"Products" },
                  { icon:"⚡", val:data.services?.length||0,  lbl:"Services" },
                  { icon:"⭐", val:"4.9",                     lbl:"Rating"   },
                  { icon:"🛡️", val:"Verified",               lbl:"Seller"   },
                ].map(s=>(
                  <div key={s.lbl} style={{ padding:"10px 18px",borderRadius:14,
                    background:"rgba(255,255,255,0.12)",backdropFilter:"blur(12px)",
                    border:"1px solid rgba(255,255,255,0.2)",textAlign:"center",minWidth:80,
                    animation:"bounceIn 0.5s both" }}>
                    <div style={{ fontSize:20 }}>{s.icon}</div>
                    <div style={{ fontSize:18,fontWeight:900,color:"white",lineHeight:1.1 }}>{s.val}</div>
                    <div style={{ fontSize:10,color:"rgba(255,255,255,0.7)",fontWeight:700,marginTop:1 }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — animated mascot character */}
            <div style={{ animation:"fadeInUp 0.7s 0.2s both", paddingBottom:10, flexShrink:0 }}>
              <StoreMascot primary={primary} accent={accent} second={second}/>
            </div>
          </div>
        </div>

        {/* Wave bottom */}
        <svg viewBox="0 0 1440 60" style={{ position:"absolute",bottom:-2,width:"100%",display:"block" }} preserveAspectRatio="none">
          <path d="M0,30 C400,60 1040,0 1440,30 L1440,60 L0,60 Z" fill="#f0f2ff"/>
        </svg>
      </header>

      {/* ═══ STICKY FILTER BAR ═══ */}
      <div style={{ position:"sticky",top:0,zIndex:30,
        background:"rgba(240,242,255,0.92)",backdropFilter:"blur(16px)",
        borderBottom:`2px solid ${primary}22`,boxShadow:"0 4px 24px rgba(99,102,241,0.1)" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",padding:"12px 24px",
          display:"flex",gap:12,alignItems:"center",flexWrap:"wrap" }}>

          <div style={{ position:"relative",flex:"1 1 220px" }}>
            <Search size={14} style={{ position:"absolute",left:14,top:"50%",
              transform:"translateY(-50%)",color:primary,pointerEvents:"none" }}/>
            <input type="text" placeholder="Search products & services…" value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ width:"100%",padding:"11px 14px 11px 40px",borderRadius:12,
                border:`2px solid ${primary}33`,fontSize:14,background:"white",
                color:"#0f172a",outline:"none",fontFamily:font,boxSizing:"border-box",
                transition:"box-shadow 0.2s,border-color 0.2s" }}
              onFocus={e=>{e.target.style.borderColor=primary;e.target.style.boxShadow=`0 0 0 4px ${primary}22`;}}
              onBlur={e=>{e.target.style.borderColor=`${primary}33`;e.target.style.boxShadow="none";}}/>
          </div>

          <div style={{ display:"flex",gap:6 }}>
            {FILTERS.map(f=>{
              const active = filter===f.val;
              return (
                <button key={f.val} onClick={()=>setFilter(f.val)}
                  style={{ padding:"9px 16px",borderRadius:12,border:"none",cursor:"pointer",
                    fontSize:13,fontWeight:700,fontFamily:font,transition:"all 0.22s",
                    background:active?`linear-gradient(135deg,${primary},${second})`:"white",
                    color:active?"white":"#64748b",
                    boxShadow:active?`0 4px 16px ${primary}44`:"0 2px 8px rgba(0,0,0,0.06)",
                    transform:active?"translateY(-1px)":"none" }}>
                  {f.label}
                  <span style={{ marginLeft:6,padding:"1px 7px",borderRadius:999,fontSize:11,
                    background:active?"rgba(255,255,255,0.25)":`${primary}18`,
                    color:active?"white":primary }}>{f.count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6,
            padding:"8px 14px",borderRadius:999,
            background:`linear-gradient(135deg,${primary}18,${accent}18)`,
            border:`1px solid ${primary}33` }}>
            <Zap size={13} style={{ color:primary }}/>
            <span style={{ fontSize:13,fontWeight:700,color:primary }}>{items.length} items</span>
          </div>
        </div>
      </div>

      {/* ═══ CATALOG GRID ═══ */}
      <main style={{ maxWidth:1200,margin:"0 auto",padding:"40px 24px 80px" }}>

        {/* Price tag character floats above grid */}
        {items.length > 0 && (
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:16,paddingRight:8 }}>
            <PriceTagCharacter primary={primary} accent={accent}/>
          </div>
        )}

        {items.length === 0 ? (
          <div style={{ textAlign:"center",padding:"80px 0",animation:"fadeInUp 0.5s both" }}>
            <div style={{ fontSize:80,marginBottom:12,display:"inline-block",
              animation:"mascotBob 2.5s ease-in-out infinite" }}>🔍</div>
            <h3 style={{ color:"#1e293b",fontSize:22,fontWeight:800,margin:"0 0 8px" }}>No items found</h3>
            <p style={{ color:"#64748b",fontSize:15 }}>Try a different search or category.</p>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))",gap:24 }}>
            {items.map((item,idx)=>{
              const isProduct = item.itemType==="product";
              const chipCol   = isProduct ? primary : second;
              const gradStart = isProduct ? primary : second;
              const gradEnd   = isProduct ? accent  : primary;

              return (
                <div key={`${item.itemType}-${item.id}`}
                  onClick={()=>navigate(`/store/${slug}/${item.itemType}/${item.id}`)}
                  style={{ borderRadius:20,overflow:"hidden",cursor:"pointer",position:"relative",
                    background:"white",border:`1px solid ${chipCol}22`,
                    boxShadow:`0 4px 24px rgba(99,102,241,0.1)`,
                    animation:`fadeInUp 0.45s ${idx*0.07}s both`,
                    transition:"transform 0.3s cubic-bezier(.4,0,.2,1),box-shadow 0.3s" }}
                  onMouseEnter={e=>{
                    e.currentTarget.style.transform="translateY(-8px) scale(1.01)";
                    e.currentTarget.style.boxShadow=`0 24px 50px ${chipCol}33`;
                  }}
                  onMouseLeave={e=>{
                    e.currentTarget.style.transform="";
                    e.currentTarget.style.boxShadow=`0 4px 24px rgba(99,102,241,0.1)`;
                  }}>

                  {/* Image */}
                  <div style={{ position:"relative",height:195,overflow:"hidden",
                    background:`linear-gradient(135deg,${gradStart}22,${gradEnd}22)` }}>
                    <img src={item.image_url||getFallback(item.itemType)} alt={item.name}
                      onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=getFallback(item.itemType);}}
                      style={{ width:"100%",height:"100%",objectFit:"cover",display:"block",
                        transition:"transform 0.45s cubic-bezier(.4,0,.2,1)" }}
                      onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.07)";}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="";}}/>
                    {/* gradient fade */}
                    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:60,
                      background:`linear-gradient(to top,${gradStart}cc,transparent)` }}/>
                    {/* Type badge */}
                    <span style={{ position:"absolute",top:12,right:12,
                      display:"inline-flex",alignItems:"center",gap:5,
                      padding:"5px 12px",borderRadius:999,fontSize:11,fontWeight:800,
                      textTransform:"uppercase",letterSpacing:"0.05em",
                      background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                      color:"white",boxShadow:`0 4px 12px ${chipCol}66`,
                      animation:"bounceIn 0.4s both" }}>
                      {isProduct?<ShoppingBag size={10}/>:<Wrench size={10}/>}
                      {item.itemType}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding:"16px 18px 20px" }}>
                    {item.category_name && (
                      <p style={{ margin:"0 0 5px",fontSize:11,fontWeight:700,
                        textTransform:"uppercase",letterSpacing:"0.08em",color:chipCol }}>
                        {item.category_name}
                      </p>
                    )}
                    <h3 style={{ margin:"0 0 8px",fontSize:17,fontWeight:800,color:"#0f172a",lineHeight:1.25 }}>
                      {item.name}
                    </h3>
                    {item.description && (
                      <p style={{ margin:"0 0 14px",fontSize:13,color:"#64748b",lineHeight:1.6,
                        display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>
                        {item.description}
                      </p>
                    )}
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",
                      paddingTop:12,borderTop:`1px dashed ${chipCol}33` }}>
                      <span style={{ fontSize:24,fontWeight:900,
                        background:`linear-gradient(135deg,${gradStart},${gradEnd})`,
                        WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text" }}>
                        {fmt(item.price)}
                      </span>
                      <span style={{ fontSize:11,color:"#94a3b8",fontWeight:600 }}>
                        {item.unit&&`/ ${item.unit}`}{item.duration_minutes&&`${item.duration_minutes} min`}
                      </span>
                    </div>
                    <div style={{ marginTop:12,padding:"9px 0",borderRadius:12,textAlign:"center",
                      background:`linear-gradient(135deg,${gradStart}18,${gradEnd}18)`,
                      border:`1px solid ${chipCol}33`,fontSize:13,fontWeight:700,color:chipCol }}>
                      View Details →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ background:`linear-gradient(135deg,${hdr},${primary})`,
        padding:"28px 24px",textAlign:"center",borderTop:`2px solid ${primary}44` }}>
        <div style={{ fontSize:28,marginBottom:6,animation:"mascotBob 3s ease-in-out infinite" }}>🏪</div>
        <p style={{ color:"rgba(255,255,255,0.75)",fontSize:14,margin:0 }}>
          <span style={{ fontWeight:800,color:"white" }}>{org.name}</span>
          {" "}· Powered by <span style={{ fontWeight:900,color:accent }}>WabyOne</span>
        </p>
      </footer>
    </div>
  );
}

const cLink = {
  display:"flex",alignItems:"center",gap:7,color:"rgba(255,255,255,0.88)",fontSize:13,fontWeight:600,
  textDecoration:"none",padding:"5px 12px",borderRadius:999,
  background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",
  backdropFilter:"blur(8px)",
};
