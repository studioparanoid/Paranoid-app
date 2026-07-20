"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatMoney,
  type ShopCartItem,
  type ShopProduct,
} from "@/lib/shop";
import { readShopCart, writeShopCart } from "@/lib/shop/cart";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type ProductDetailClientProps = {
  product: ShopProduct;
};

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedImage, setSelectedImage] = useState(product.images[0] || "");
  const [variant, setVariant] = useState(
    product.variants[0]
      ? `${product.variants[0].name}: ${product.variants[0].value}`
      : ""
  );
  const [added, setAdded] = useState(false);
  const { toast } = useToast();

  const canBuy = product.stockQuantity > 0 && product.status === "active";
  const variantOptions = useMemo(
    () =>
      product.variants.map((item) => `${item.name}: ${item.value}`),
    [product.variants]
  );

  function addToCart() {
    if (!canBuy) {
      return;
    }

    const cart = readShopCart();
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.variant === variant
    );
    const item: ShopCartItem = {
      productId: product.id,
      sellerId: product.sellerId,
      slug: product.slug,
      name: product.name,
      sellerName: product.sellerName,
      imageUrl: product.images[0] || null,
      category: product.category,
      quantity: 1,
      basePriceCents: product.basePriceCents,
      commissionCents: product.commissionCents,
      finalPriceCents: product.finalPriceCents,
      ownershipModel: product.ownershipModel,
      partnerPayoutType: product.partnerPayoutType,
      partnerPayoutCents: product.partnerPayoutCents,
      partnerPayoutRate: product.partnerPayoutRate,
      productionCostCents: product.productionCostCents,
      vatRate: product.vatRate,
      stockQuantity: product.stockQuantity,
      variant: variant || undefined,
    };

    if (existingIndex >= 0) {
      if (cart[existingIndex].quantity >= product.stockQuantity) {
        setAdded(true);
        toast({ message: "Já atingiste o stock disponível.", tone: "error" });
        return;
      }

      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity: cart[existingIndex].quantity + 1,
      };
    } else {
      cart.push(item);
    }

    writeShopCart(cart);
    setAdded(true);
    toast({ message: "Adicionado ao carrinho.", tone: "success" });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
      <div className="space-y-3">
        <div
          className="interactive aspect-square rounded-2xl border border-border bg-surface-secondary bg-cover bg-center"
          style={{
            backgroundImage: selectedImage
              ? `url(${selectedImage})`
              : "linear-gradient(135deg,var(--surface-secondary),var(--surface))",
          }}
        />

        {product.images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {product.images.map((image) => (
              <button
                type="button"
                key={image}
                onClick={() => setSelectedImage(image)}
                aria-pressed={selectedImage === image}
                className={`pressable focus-ring h-20 w-20 shrink-0 rounded-xl border bg-cover bg-center ${selectedImage === image ? "border-accent" : "border-border"}`}
                style={{ backgroundImage: `url(${image})` }}
                aria-label="Ver imagem"
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 rounded-2xl border border-border bg-surface p-5 lg:p-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
            {product.category}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-2 text-sm font-bold text-foreground-muted">
            por {product.sellerName}
          </p>
        </div>

        <p className="text-2xl font-black text-foreground">
          {formatMoney(product.finalPriceCents)}
        </p>
        <p className="-mt-4 text-sm font-bold text-foreground-muted">
          IVA incluído · Merch oficial gerido pela Paranoid
        </p>

        <p className="leading-relaxed text-foreground-secondary">{product.description}</p>

        {variantOptions.length > 0 && (
          <label className="block space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground-muted">
              Variação
            </span>
            <select
              value={variant}
              onChange={(event) => setVariant(event.target.value)}
              className="focus-ring w-full rounded-full border border-input-border bg-input px-4 py-3 font-bold text-foreground outline-none"
            >
              {variantOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-border bg-background-subtle px-4 py-3 text-sm">
          <span className="text-foreground-muted">Stock</span>
          <span className="font-black text-foreground">
            {product.stockQuantity > 0 ? `${product.stockQuantity} un.` : "Esgotado"}
          </span>
        </div>

        <div className="sticky bottom-[calc(5.4rem+env(safe-area-inset-bottom))] z-10 -mx-2 bg-surface/95 p-2 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
        <Button
          onClick={addToCart}
          disabled={!canBuy}
          size="lg"
          className="w-full"
        >
          {canBuy ? "Adicionar ao carrinho" : "Indisponível"}
        </Button>
        </div>

        {added && (
          <div className="subtle-enter grid gap-3 rounded-2xl border border-success/35 bg-success/10 p-4">
            <p className="font-bold text-success">Produto adicionado.</p>
            <Link
              href="/loja/carrinho"
              className="pressable focus-ring rounded-full border border-success/50 px-4 py-3 text-center text-sm font-black text-success"
            >
              Ver carrinho
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
