import { CheckoutClient } from "@/components/shop/CheckoutClient";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md lg:max-w-5xl">
        <CheckoutClient />
      </section>
    </main>
  );
}
