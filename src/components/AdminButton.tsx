'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEventHandler } from 'react';
import { usePathname } from 'next/navigation';

type Props = {
  className?: string;
  label?: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export default function AdminButtonClient({
  className,
  label = 'Admin',
  href = '/admin',
  onClick,
}: Props) {
  const [ok, setOk] = useState(false);
  const pathname = usePathname();

  const check = () => {
    fetch('/api/auth/status', { cache: 'no-store', credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setOk(!!d?.authenticated))
      .catch(() => setOk(false));
  };

  useEffect(() => {
    check();
    const onFocus = () => check();
    const onVis = () => document.visibilityState === 'visible' && check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { check(); /* re-check on navigation */ }, [pathname]);

  if (!ok) return null;

  // 🔑 Toujours centré verticalement grâce à inline-flex + items-center + h-9 + leading-none
  const base = 'inline-flex items-center justify-center h-9 leading-none';
  const finalClass = className
    ? `${base} ${className}`
    : `${base} rounded-2xl bg-[#222] text-white px-4 text-sm font-medium hover:opacity-90`;

  return (
    <Link href={href} onClick={onClick} className={finalClass}>
      {label}
    </Link>
  );
}
