import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SplashBootstrapScript, SplashScreen } from "@/components/brand/SplashScreen";
import { HubOverlayProvider } from "@/components/hub/HubOverlayProvider";
import { MobileBottomNavigation } from "@/components/navigation/MobileBottomNavigation";
import { isMobileSimplificationEnabled } from "@/lib/mobile-simplification/flag";

export const metadata: Metadata = {
  metadataBase: new URL("https://paranoid.pt"),
  title: {
    default: "Paranoid — Agenda Cultural Alternativa",
    template: "%s — Paranoid",
  },
  description:
    "Eventos, espaços, artistas e cultura alternativa na zona centro.",
  openGraph: {
    siteName: "Paranoid",
    type: "website",
    locale: "pt_PT",
  },
  twitter: {
    card: "summary_large_image",
  },
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
  const mobileSimplificationEnabled = isMobileSimplificationEnabled();

  return (
    <html
      lang="pt"
      data-theme="dark"
      data-theme-preference="dark"
      data-mobile-simplification={mobileSimplificationEnabled ? "enabled" : undefined}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        {mobileSimplificationEnabled && <SplashBootstrapScript />}
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <PwaRegister />
        {mobileSimplificationEnabled && <SplashScreen />}
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {mobileSimplificationEnabled ? (
                <HubOverlayProvider>
                  <DesktopHeader />
                  <div className="pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
                  <MobileBottomNavigation />
                </HubOverlayProvider>
              ) : (
                <>
                  <DesktopHeader />
                  <div className="pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
                  <MobileBottomNav />
                </>
              )}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
