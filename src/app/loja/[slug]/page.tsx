import Link from "next/link";
import { notFound } from "next/navigation";
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
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-8 pb-28 text-[#f2f1ec] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-7xl">
        <Link
          href="/loja"
          className="mb-6 inline-block text-sm font-black text-zinc-500"
        >
          Voltar à loja
        </Link>

        <ProductDetailClient product={product} />
      </section>
    </main>
  );
}

