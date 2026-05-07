'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-md border border-slate-100 overflow-hidden">
        <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Sisteme Giriş</h1>
      <p className="text-slate-500 mb-6 text-sm px-4">
        Bu sisteme yalnızca yetkilendirilmiş Google hesabı (edirnesydv@gmail.com) ile giriş yapılabilir.
      </p>

      {error === 'AccessDenied' && (
        <div className="mb-6 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
          <strong>Erişim Reddedildi!</strong> Bu hesap ile sisteme giriş yapma yetkiniz bulunmuyor.
        </div>
      )}

      <button
        onClick={() => signIn('google', { callbackUrl: '/' })}
        className="w-full flex items-center justify-center gap-3 bg-blue-700 hover:bg-blue-800 text-white px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm"
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
        Google ile Giriş Yap
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Suspense fallback={<div className="text-slate-500">Yükleniyor...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
