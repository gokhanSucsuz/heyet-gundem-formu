'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="max-w-md w-full">
      {/* Main Login Card */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mb-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-slate-100 overflow-hidden">
          <img src="/logo-sydv.jpg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sisteme Giriş</h1>
        <p className="text-slate-500 mb-6 text-sm px-4">
          Bu sisteme yalnızca yetkilendirilmiş Google hesabı ile giriş yapılabilir.
        </p>

        {error === 'AccessDenied' && (
          <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
            <strong>Erişim Reddedildi!</strong> Bu hesap ile sisteme giriş yapma yetkiniz bulunmuyor.
          </div>
        )}

        <button
          onClick={() => signIn('google', { callbackUrl: '/select-personnel' })}
          className="w-full flex items-center justify-center gap-3 bg-blue-700 hover:bg-blue-800 text-white px-4 py-3 rounded-xl font-semibold transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Personel Girişi (Google ile)
        </button>
      </div>

      {/* Super Admin Card */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 text-center">
        <p className="text-slate-400 text-xs mb-3 font-medium">Yönetici mi? Süper admin paneline erişin.</p>
        <button
          onClick={() => signIn('google', { callbackUrl: '/admin' })}
          className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Süper Admin Girişi
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
      <Suspense fallback={<div className="text-slate-500">Yükleniyor...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
