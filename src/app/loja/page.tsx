import { ShopCartLink } from "@/components/shop/ShopCartLink";
import { ShopClient } from "@/components/shop/ShopClient";
import { getActiveShopProducts } from "@/lib/shop";
import { PageHeader } from "@/components/PageHeader";

export default async function ShopPage() {
  const products = await getActiveShopProducts();

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <PageHeader eyebrow="Paranoid" title="Loja" description="Merch de artistas e parceiros." actions={<ShopCartLink />} />

        <div className="mt-6"><ShopClient products={products} /></div>
      </section>
    </main>
  );
}
