import { useCallback, useEffect, useState } from "react";
import {
  getCart, addToCart, updateCartQty, removeFromCart, clearCart, CART_EVENT,
} from "../utils/cart";

export default function useCart(slug) {
  const [cart, setCart] = useState(() => getCart(slug));

  useEffect(() => {
    const sync = () => setCart(getCart(slug));
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [slug]);

  const add       = useCallback((item, qty = 1) => setCart(addToCart(slug, item, qty)), [slug]);
  const updateQty = useCallback((key, qty) => setCart(updateCartQty(slug, key, qty)), [slug]);
  const remove    = useCallback((key) => setCart(removeFromCart(slug, key)), [slug]);
  const clear     = useCallback(() => setCart(clearCart(slug)), [slug]);

  const totalCount = cart.reduce((s, c) => s + c.quantity, 0);
  const totalPrice = cart.reduce((s, c) => s + c.quantity * c.price, 0);

  return { cart, add, updateQty, remove, clear, totalCount, totalPrice };
}
