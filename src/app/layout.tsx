import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "Paranoid — Agenda Cultural Alternativa",
  description:
    "Eventos, espaços, artistas e cultura alternativa na zona centro.",
  manifest: "/manifest.webmanifest",
  applicationName: "Paranoid",
  appleWebApp: {
    capable: true,
    title: "Paranoid",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0b" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" data-theme="dark" data-theme-preference="dark" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <PwaRegister />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <DesktopHeader />
              <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
              <MobileBottomNav />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
