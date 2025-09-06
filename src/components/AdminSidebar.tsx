'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Folder, FileText, ShoppingCart, BarChart3, Settings, Menu,
} from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/documents', label: 'Documents', icon: Folder },
  { href: '/admin/commandes', label: 'Commandes', icon: ShoppingCart },
  { href: '/admin/abonnements', label: 'Abonnements', icon: FileText },
  { href: '/admin/visites', label: 'Visites', icon: BarChart3 },
  { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
] as const;

const isActive = (href: string, pathname: string) =>
  href === '/admin'
    ? pathname === '/admin'                    // <-- Dashboard UNIQUEMENT sur /admin
    : pathname === href || pathname.startsWith(href + '/');

export function AdminMobileTrigger({
  className = 'md:hidden inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-[#222]',
  label = 'Menu',
}: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('rp:admin-menu-open'))}
      className={className}
      aria-label="Ouvrir le menu admin"
    >
      <Menu className="h-4 w-4" />
      {label}
    </button>
  );
}

function Item({
  href, label, Icon, active, onClick, collapsed,
}: any) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={[
        'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm select-none',
        active
          ? 'bg-[#edfbe2] text-[#222] border border-[#d6f2c7] hover:bg-[#e6f5d6]' // hover UNIQUEMENT si actif
          : 'text-gray-700',
      ].join(' ')}
    >
      <Icon className="h-4 w-4 text-[#54b435] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {active && <span className="ml-auto h-4 w-1 rounded-full bg-[#54b435]" />}
    </Link>
  );
}

/** Sidebar desktop FULL-BLEED à gauche + drawer mobile intégré */
export default function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMobile, setOpenMobile] = useState(false);

  // Ouvre le drawer depuis le bouton du header (même fichier)
  useEffect(() => {
    const fn = () => setOpenMobile(true);
    window.addEventListener('rp:admin-menu-open', fn as any);
    return () => window.removeEventListener('rp:admin-menu-open', fn as any);
  }, []);

  // Lock scroll en mobile
  useEffect(() => {
    document.body.style.overflow = openMobile ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [openMobile]);

  const NavList = ({ onClickItem }: { onClickItem?: () => void }) => (
    <ul className="px-2 py-2 space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <li key={href}>
            <Item
              href={href}
              label={label}
              Icon={Icon}
              active={active}
              onClick={onClickItem}
              collapsed={collapsed}
            />
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* DESKTOP: FULL-BLEED collée à gauche (pas de container autour) */}
      <aside
        className={[
          'sticky top-14 h-[calc(100dvh-56px)] bg-white border-r shadow-sm',
          collapsed ? 'w-16' : 'w-64',
          'transition-[width] duration-200 shrink-0 hidden md:flex flex-col',
        ].join(' ')}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#54b435]" />
            {!collapsed && <span className="font-semibold text-sm text-[#222] truncate">RecoPhone — Admin</span>}
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
            aria-label={collapsed ? 'Déplier' : 'Replier'}
            title={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          <NavList />
        </nav>

        {/* Logout dans la sidebar (gain de place) */}
        <div className="px-3 pb-3 pt-2 border-t">
          <LogoutButton />
        </div>
      </aside>

      {/* MOBILE DRAWER */}
      <div
        className={[
          'fixed inset-0 z-50 md:hidden',
          openMobile ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
        aria-hidden={!openMobile}
      >
        <div
          className={[
            'absolute inset-0 bg-black/30 transition-opacity',
            openMobile ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          onClick={() => setOpenMobile(false)}
        />
        <aside
          className={[
            'absolute left-0 top-0 h-full w-[80%] max-w-xs bg-white border-r shadow-2xl transition-transform',
            openMobile ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <div className="h-14 flex items-center justify-between px-3 border-b">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[#54b435]" />
              <span className="font-semibold text-sm text-[#222]">RecoPhone — Admin</span>
            </div>
            <button
              onClick={() => setOpenMobile(false)}
              className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
            >
              Fermer
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto">
            <ul className="px-2 py-2 space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href, pathname);
                return (
                  <li key={href}>
                    <Item
                      href={href}
                      label={label}
                      Icon={Icon}
                      active={active}
                      collapsed={false}
                      onClick={() => setOpenMobile(false)}
                    />
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="px-3 pb-4 pt-2 border-t">
            <LogoutButton />
          </div>
        </aside>
      </div>
    </>
  );
}
