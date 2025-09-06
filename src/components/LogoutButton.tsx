'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    try {
      setLoading(true);
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store', credentials: 'include' });
      router.replace('/admin/login');
      router.refresh(); 
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="rounded-xl px-3 py-2 text-sm font-medium bg-[#222] text-white hover:opacity-90 disabled:opacity-60"
    >
      {loading ? 'Déconnexion…' : 'Déconnexion'}
    </button>
  );
}
