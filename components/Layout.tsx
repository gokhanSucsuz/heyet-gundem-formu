'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Users, Settings, Menu, X, LogOut, User, Key, PanelLeftClose, PanelLeftOpen, Activity, Landmark } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { usePersonnel } from '@/components/PersonnelProvider';
import { db } from '@/lib/db';

export function AppLayout({ children, fullWidth }: { children: React.ReactNode; fullWidth?: boolean }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { personnel, logout } = usePersonnel();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sydv_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    } catch { /* ignore */ }
  }, []);

  const toggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    try {
      localStorage.setItem('sydv_sidebar_collapsed', String(collapsed));
    } catch { /* ignore */ }
  };

  const navItems = [
    { href: '/', label: 'Gündem ve Kararlar', icon: FileText },
    ...(personnel?.isAdmin ? [
      { href: '/members', label: 'Mütevelli Heyet Üyeleri', icon: Users },
      { href: '/settings', label: 'Belge & Sistem Ayarları', icon: Settings },
      { href: '/logs', label: 'Denetim Logları', icon: Activity },
    ] : []),
  ];

  const handleLogout = async () => {
    try {
      await db.forms.flushQueue();
      await db.members.flushQueue();
      await db.settings.flushQueue();
    } catch { /* best effort */ }

    await logout();
  };

  const handleGoogleLogout = async () => {
    try {
      await db.forms.flushQueue();
      await db.members.flushQueue();
      await db.settings.flushQueue();
    } catch { /* best effort */ }

    if (personnel) {
      await fetch('/api/auth/personnel-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnelId: personnel.id,
          personnelName: personnel.name,
        }),
      }).catch(() => {});
    }

    try {
      const { signOut } = await import('next-auth/react');
      await signOut({ redirect: false });
    } catch { /* best effort */ }

    sessionStorage.removeItem('personnel');
    const panelUrl = process.env.NEXT_PUBLIC_PANEL_URL || 'https://www.vakifyonetim.space';
    window.close();
    window.location.href = panelUrl;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-200/80 text-slate-800 font-sans">
      {/* Desktop Sidebar - Compact Official GovTech Dark Slate & Navy Accent */}
      <aside className={`w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex-col hidden lg:flex shadow-xl z-20 shrink-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? '-ml-64' : ''}`}>
        {/* Brand Header */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-sydv.jpg" alt="SYDV Logo" className="w-9 h-9 rounded-lg object-cover ring-2 ring-amber-500/40 shrink-0" />
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold tracking-tight text-xs uppercase text-white leading-tight truncate">T.C. SYDV</h1>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider truncate">Mütevelli Heyeti</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => toggleSidebar(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Menüyü Daralt"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Personnel Badge */}
        {personnel && (
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                {personnel.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">{personnel.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                  {personnel.isAdmin ? 'Yönetici Personel' : 'Yetkili Personel'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-2.5 py-1 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Modüller
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-150 text-xs font-bold uppercase tracking-tight ${
                  isActive
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 flex flex-col gap-1">
          <Link 
            href="/profile"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-tight ${
              pathname === '/profile'
                ? 'bg-blue-700 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Key className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Şifremi Değiştir</span>
          </Link>
          <button 
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-tight text-amber-400 hover:bg-amber-500/10 w-full text-left"
          >
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Personel Değiştir</span>
          </button>
          <button 
            type="button"
            onClick={handleGoogleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-xs font-bold uppercase tracking-tight text-red-400 hover:bg-red-500/10 w-full text-left"
          >
            <LogOut className="w-4 h-4 text-red-400 shrink-0" />
            <span>Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transition-transform duration-250 lg:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
             <img src="/logo-sydv.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover ring-1 ring-amber-400/50" />
             <div className="flex flex-col">
               <span className="font-bold text-xs uppercase text-white">T.C. SYDV</span>
               <span className="text-[10px] font-bold text-amber-400 uppercase">Mütevelli Heyeti</span>
             </div>
          </div>
          <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {personnel && (
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/60">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-md flex items-center justify-center text-[10px] font-bold">
                {personnel.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{personnel.name}</span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">{personnel.isAdmin ? 'Yönetici' : 'Personel'}</span>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-bold uppercase ${
                  isActive ? 'bg-blue-700 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase text-slate-300 hover:bg-slate-800 w-full"
          >
            <Key className="w-4 h-4" />
            <span>Şifremi Değiştir</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase text-amber-400 hover:bg-amber-500/10 w-full text-left"
          >
            <User className="w-4 h-4" />
            <span>Personel Değiştir</span>
          </button>
          <button
            type="button"
            onClick={handleGoogleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold uppercase text-red-400 hover:bg-red-500/10 w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Güvenli Çıkış</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Compact Mobile Top Header */}
        <header className="lg:hidden h-12 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-3 shrink-0 shadow-xs relative z-10">
          <button type="button" onClick={() => setIsMobileMenuOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-800">
            <Menu className="w-5 h-5 text-slate-200" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo-sydv.jpg" alt="Logo" className="w-6 h-6 rounded object-cover" />
            <span className="font-bold text-xs uppercase tracking-wider text-white">Mütevelli Heyeti</span>
          </div>
          <div className="w-8 flex justify-end">
            {personnel && (
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                {personnel.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </header>

        {/* Desktop Sidebar Expand Pill (when collapsed) */}
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={() => toggleSidebar(false)}
            className="hidden lg:flex fixed bottom-4 left-4 z-40 px-3 py-2 bg-slate-900 hover:bg-blue-700 text-white rounded-xl shadow-lg border border-slate-700 items-center gap-2 text-xs font-bold transition-all"
            title="Sol Menüyü Aç"
          >
            <PanelLeftOpen className="w-4 h-4 text-amber-400" />
            <span>Menü</span>
          </button>
        )}

        <div className={`flex-1 overflow-y-auto relative ${fullWidth ? 'p-1.5 sm:p-3' : 'p-3 sm:p-5 lg:p-6'}`}>
          <div className={`mx-auto ${fullWidth ? 'w-full max-w-none' : 'max-w-6xl'}`}>
            {children}
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
