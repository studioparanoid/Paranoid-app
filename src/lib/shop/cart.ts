import { type ShopCartItem } from "@/lib/shop";

export const SHOP_CART_KEY = "paranoid-shop-cart";
export const SHOP_LAST_ORDER_KEY = "paranoid-shop-last-order";

export function readShopCart() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(SHOP_CART_KEY);
    return value ? (JSON.parse(value) as ShopCartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeShopCart(items: ShopCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SHOP_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("paranoid-shop-cart-updated"));
}

export function clearShopCart() {
  writeShopCart([]);
}

export function getShopCartCount(items: ShopCartItem[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function saveLastShopOrder(order: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SHOP_LAST_ORDER_KEY, JSON.stringify(order));
}

export function readLastShopOrder() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(SHOP_LAST_ORDER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

