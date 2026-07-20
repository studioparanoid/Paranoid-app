"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getShopCartCount, readShopCart } from "@/lib/shop/cart";

export function ShopCartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function syncCart() {
      setCount(getShopCartCount(readShopCart()));
    }

    syncCart();
    window.addEventListener("paranoid-shop-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);

    return () => {
      window.removeEventListener("paranoid-shop-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  return (
    <Link
      href="/loja/carrinho"
      aria-label="Abrir carrinho"
      className="pressable focus-ring relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:border-border-strong"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 6h15l-2 8H8L6 3H3" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>

      {count > 0 && (
        <span key={count} className="scale-in absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-black text-white" aria-live="polite">
          {count}
        </span>
      )}
    </Link>
  );
}
