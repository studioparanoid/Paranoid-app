import { AdminShopClient } from "@/components/shop/AdminShopClient";

export default function AdminShopPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-5 py-8 pb-28 text-[#f5f5f2] lg:px-10 lg:py-12">
      <section className="mx-auto max-w-md lg:max-w-6xl">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.35em] text-danger">
          Admin
        </p>
        <h1 className="mb-7 text-5xl font-black leading-none tracking-tight lg:text-7xl">
          Loja.
        </h1>

        <AdminShopClient />
      </section>
    </main>
  );
}

