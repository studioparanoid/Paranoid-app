import { ShopClient } from "@/components/shop/ShopClient";
import { getActiveShopProducts } from "@/lib/shop";

export default async function ShopPage() {
  const products = await getActiveShopProducts();

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <ShopClient products={products} />
      </section>
    </main>
  );
}
