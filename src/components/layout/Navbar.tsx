"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navItems } from "@/config/nav";
import { CartButton } from "@/components/CartButton";
import AdminButtonClient from "@/components/AdminButton";

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export default function Navbar() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={["sticky top-0 z-50 border-b border-black/5 bg-white", scrolled ? "shadow-sm" : ""].join(" ")}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 rounded bg-white px-3 py-2 text-sm font-semibold text-[#222] shadow">
        Aller au contenu
      </a>

      <nav aria-label="Navigation principale">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="relative h-16 flex items-center">
            {/* GAUCHE */}
            <div className="flex items-center md:flex-1 min-w-0">
              {/* Logo MOBILE */}
              <div className="md:hidden">
                <Link
                  href="/"
                  aria-label="RecoPhone, retour à l’accueil"
                  className="flex items-center gap-2 font-extrabold text-[#222]"
                >
                  <span className="inline-block rounded-md bg-[#54b435] px-2 py-1 text-xs font-black leading-none text-white">RECO</span>
                  <span className="tracking-tight">Phone</span>
                </Link>
              </div>
              {/* Slot promo DESKTOP (vide pour l’instant) */}
              <div className="hidden md:flex items-center text-sm text-gray-600">
                {/* ex: <span className="rounded-lg bg-[#edfbe2] px-3 py-1">-10% avec le code RECO10</span> */}
              </div>
            </div>

            {/* CENTRE — nav absolument centrée */}
            <ul className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-max max-w-[min(60vw,calc(100%-340px))] gap-6 z-10">
              {navItems.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href} className="truncate">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "px-1 py-2 text-sm font-semibold tracking-wide transition",
                        "motion-reduce:transition-none",
                        active
                          ? "text-[#54b435] underline decoration-2 underline-offset-8 decoration-[#54b435]"
                          : "text-[#222] hover:text-[#54b435]",
                      ].join(" ")}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* DROITE — actions absolument à droite */}
            <div className="absolute inset-y-0 right-0 flex items-center gap-2 z-20">
              {/* Panier */}
              <span className="hidden md:inline-flex"><CartButton /></span>
              <span className="md:hidden"><CartButton /></span>

              {/* Admin (si connecté) */}
              <AdminButtonClient className="hidden md:inline-flex h-9 items-center justify-center rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#222] hover:bg-[#edfbe2] leading-none" />

              {/* CTA */}
              <Link
                href="/devis"
                className="hidden md:inline-flex h-9 items-center justify-center rounded-2xl bg-[#54b435] px-4 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#54b435] motion-reduce:transition-none leading-none"
              >
                Devis gratuit
              </Link>

              {/* Burger MOBILE */}
              <button
                type="button"
                aria-label="Ouvrir le menu"
                aria-expanded={open}
                aria-controls="mobile-drawer"
                onClick={() => setOpen(true)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 text-[#222] transition hover:bg-[#edfbe2] md:hidden"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

        </div>

        {/* Drawer mobile (inchangé) */}
        <div id="mobile-drawer" role="dialog" aria-modal="true" className={["fixed inset-0 z-50 md:hidden", open ? "pointer-events-auto" : "pointer-events-none"].join(" ")}>
          <div className={["absolute inset-0 bg-black/30 transition-opacity", open ? "opacity-100" : "opacity-0", "motion-reduce:transition-none"].join(" ")} onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className={["absolute right-0 top-0 h-full w-[85%] max-w-sm rounded-l-2xl border-l border-black/10 bg-white shadow-2xl", "transition-transform duration-300 ease-out", open ? "translate-x-0" : "translate-x-full", "motion-reduce:transition-none motion-reduce:transform-none"].join(" ")}>
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-4 bg-white">
              <span className="font-bold text-[#222]">Menu</span>
              <button type="button" aria-label="Fermer le menu" onClick={() => setOpen(false)} className="rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-[#222] transition hover:bg-[#edfbe2]">
                Fermer
              </button>
            </div>
            <div className="p-4 bg-white min-h-[calc(100%-56px)]">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={["block rounded-xl px-3 py-3 text-base font-semibold transition", active ? "bg-[#edfbe2] text-[#54b435]" : "text-[#222] hover:bg-[#edfbe2]"].join(" ")}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Link href="/panier" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-4 py-3 font-semibold text-[#222] hover:bg-[#edfbe2]">
                  Panier
                </Link>
                <Link href="/devis" onClick={() => setOpen(false)} className="inline-flex items-center justify-center rounded-2xl bg-[#54b435] px-4 py-3 font-semibold text-white shadow transition hover:opacity-90">
                  Devis gratuit
                </Link>
              </div>

              <div className="mt-3">
                <AdminButtonClient onClick={() => setOpen(false)} className="inline-flex w-full items-center justify-center h-10 rounded-2xl border border-black/10 bg-white px-4 font-semibold text-[#222] hover:bg-[#edfbe2] leading-none" />
              </div>
            </div>
          </aside>
        </div>
      </nav>
    </header>
  );
}
