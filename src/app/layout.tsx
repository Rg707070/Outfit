import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { LangProvider } from "@/lib/lang-context";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Outfit — Your Digital Wardrobe",
  description: "Manage your wardrobe, plan outfits, and share your style.",
  applicationName: "Outfit",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Outfit",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#111827",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-gray-50 text-gray-900`}>
        <LangProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LangProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
