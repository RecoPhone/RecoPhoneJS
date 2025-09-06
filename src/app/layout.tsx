// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

// ✅ chemin canonique recommandé
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: "RecoPhone — Réparation & reconditionnement",
  description: "Prolongez la vie de vos appareils. Ecologie & économie circulaire.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh bg-[#edfbe2] text-[#222] antialiased">
        <CartProvider>
          <Navbar />
          <main id="main" className="mx-auto min-h-[60vh]">
            {children}
          </main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
