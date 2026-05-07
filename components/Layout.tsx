'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Users, Settings, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Gündem ve Kararlar', icon: FileText },
    { href: '/members', label: 'Mütevelli Heyet Üyeleri', icon: Users },
    { href: '/settings', label: 'Genel Ayarlar', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-200 text-slate-800 font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-300 flex flex-col hidden lg:flex shadow-xl z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <img src="/logo-sydv.jpg" alt="Logo" className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-blue-200" />
          <div className="flex flex-col">
            <h1 className="font-bold tracking-tight text-sm uppercase text-slate-900 leading-none">Mütevelli Heyeti</h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gündem Aracı</span>
          </div>
        </div>
        <nav className="flex-1 p-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-tight ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-5 border-t border-slate-100 flex flex-col gap-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kurumsal Çözüm</p>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">Resmi yazışma ve kurul kararları yönetim sistemi.</p>
          </div>
          <button 
            onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 text-xs font-bold uppercase tracking-tight text-red-600 hover:bg-red-50 hover:text-red-700 w-full text-left"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-40 transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <img src="/logo-sydv.jpg" alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
             <span className="font-bold text-sm uppercase">Mütevelli Heyeti</span>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <button
            onClick={() => {
              import('next-auth/react').then(({ signOut }) => signOut({ callbackUrl: '/login' }));
            }}
            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold uppercase text-red-600 hover:bg-red-50 w-full text-left mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Navbar */}
        <header className="lg:hidden h-16 bg-white border-b border-slate-300 flex items-center justify-between px-4 shrink-0 shadow-sm relative z-10">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2">
            <Menu className="w-6 h-6 text-slate-600" />
          </button>
          <span className="font-bold text-sm uppercase tracking-wider text-slate-900">Mütevelli Heyeti</span>
          <div className="w-10 flex justify-end">
          </div>
        </header>

        <div id="main-scroll-container" className="flex-1 overflow-y-auto relative p-2 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
