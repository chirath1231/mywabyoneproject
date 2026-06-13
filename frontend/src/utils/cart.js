/* ─── Storefront cart, persisted per-store in localStorage ──────────────
   Cart item shape:
   { key, type, id, name, price, image_url, unit, maxQty, quantity }
   - key   : `${type}-${id}`
   - maxQty: available stock for products, undefined/null = unlimited (services)
─────────────────────────────────────────────────────────────────────── */

const PREFIX = "wabyone_cart_";
export const CART_EVENT = "wabyone-cart-updated";

function read(slug) {
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(slug, cart) {
  localStorage.setItem(PREFIX + slug, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_EVENT));
  return cart;
}

export function getCart(slug) {
  return read(slug);
}

export function addToCart(slug, item, qty = 1) {
  const cart  = read(slug);
  const cap   = item.maxQty != null ? item.maxQty : Infinity;
  const existing = cart.find(c => c.key === item.key);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, cap);
  } else {
    cart.push({ ...item, quantity: Math.min(Math.max(qty, 1), cap) });
  }
  return write(slug, cart);
}

export function updateCartQty(slug, key, qty) {
  const cart = read(slug).map(c => {
    if (c.key !== key) return c;
    const cap = c.maxQty != null ? c.maxQty : Infinity;
    return { ...c, quantity: Math.max(1, Math.min(qty, cap)) };
  });
  return write(slug, cart);
}

export function removeFromCart(slug, key) {
  return write(slug, read(slug).filter(c => c.key !== key));
}

export function clearCart(slug) {
  return write(slug, []);
}
