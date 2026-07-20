import Link from "next/link";
import { notFound } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { ProductDetailClient } from "@/components/shop/ProductDetailClient";
import { getShopProductBySlug } from "@/lib/shop";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getShopProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link
          href="/loja"
          className="pressable focus-ring mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-foreground-muted hover:text-foreground"
        >
          <AppIcon name="chevron" className="h-3.5 w-3.5 rotate-180" />
          Loja
        </Link>

        <ProductDetailClient product={product} />
      </section>
    </main>
  );
}

