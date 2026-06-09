import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { LangProvider } from "@/lib/lang-context";
import { translations, type Lang } from "@/lib/translations";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Outfit — Your Digital Wardrobe",
  description: "Manage your wardrobe, plan outfits, and share your style.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  const lang: Lang = cookieLang === "en" ? "en" : "he";
  const dir = translations[lang].dir;

  return (
    <html lang={lang} dir={dir} className="h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-gray-50 text-gray-900`}>
        <LangProvider initialLang={lang}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LangProvider>
      </body>
    </html>
  );
}
