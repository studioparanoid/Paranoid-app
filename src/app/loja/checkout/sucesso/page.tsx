import { CheckoutSuccessClient } from "@/components/shop/CheckoutSuccessClient";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-4 pb-28 text-foreground sm:px-6 lg:px-10 lg:py-8">
      <section className="mx-auto max-w-md">
        <CheckoutSuccessClient />
      </section>
    </main>
  );
}

