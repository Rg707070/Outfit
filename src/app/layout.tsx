import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Outfit — Your Digital Wardrobe",
  description: "Manage your wardrobe, plan outfits, and share your style.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={`${inter.className} min-h-full bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
