'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePersonnel } from '@/components/PersonnelProvider';
import { Users, Lock, Loader2, LogOut, ShieldCheck } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface PersonnelItem {
  id: string;
  name: string;
}

export default function SelectPersonnelPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setPersonnel } = usePersonnel();
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If super admin, redirect to admin
    if (session?.user && (session.user as any).role === 'super-admin') {
      router.push('/admin');
      return;
    }

    fetch('/api/personnel/list')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPersonnelList(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !password) {
      setError('Personel ve şifre seçimi gerekli');
      return;
    }

    setAuthenticating(true);
    setError('');

    try {
      const res = await fetch('/api/auth/personnel-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personnelId: selectedId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş başarısız');
        return;
      }

      setPersonnel(data.personnel);
      router.push('/');
    } catch (err) {
      setError('Bağlantı hatası. Tekrar deneyin.');
    } finally {
      setAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-slate-100 overflow-hidden">
            <img src="/logo-sydv.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Personel Girişi</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Sisteme erişmek için personel hesabınızı seçin
          </p>
        </div>

        {/* Google Account Info */}
        {session?.user && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                Google Doğrulandı: {session.user.email}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Çıkış
            </button>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {personnelList.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-sm">Henüz personel tanımlanmamış</p>
              <p className="text-xs mt-1">Süper admin tarafından personel eklenmesi gerekiyor.</p>
            </div>
          ) : (
            <>
              {/* Personnel Select */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                  Personel Seçin
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={selectedId}
                    onChange={(e) => { setSelectedId(e.target.value); setError(''); }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option value="">— Personel seçin —</option>
                    {personnelList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Personel şifrenizi girin"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={authenticating || !selectedId || !password}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Doğrulanıyor...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Giriş Yap
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
