import { ReactNode } from 'react';
import { requireAdmin } from '@/lib/auth';
import AdminSidebar, { AdminMobileTrigger } from '@/components/AdminSidebar';

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();

  return (
    <div className="min-h-dvh bg-[#edfbe2] text-[#222]">
      {/* Header full-width */}
      <header className="h-14 border-b bg-white sticky top-0 z-40">
        <div className="mx-auto max-w-[1400px] px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AdminMobileTrigger />
            <span className="text-sm text-gray-600">
              Connecté : <span className="font-medium">{user.name ?? user.sub}</span>
            </span>
          </div>
          {/* Logout est déplacé dans la sidebar */}
        </div>
      </header>

      {/* Rangée full-bleed : sidebar collée à gauche */}
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1">
          <div className="mx-auto max-w-[1400px] px-4 py-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
