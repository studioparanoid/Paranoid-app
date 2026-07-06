import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { DesktopHeader } from "@/components/DesktopHeader";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    icon: "/paranoid-icon.svg",
    apple: "/paranoid-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  colorScheme: "dark",
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
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#0b0b0b]">
        <PwaRegister />
        <DesktopHeader />
        <div className="pb-20 lg:pb-0">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
