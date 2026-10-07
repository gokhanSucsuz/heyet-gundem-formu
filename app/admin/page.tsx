'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Shield, Lock, Loader2, LogOut, Users, FileText, Key, Database, ChevronRight, Power } from 'lucide-react';
import { db, useLiveQuery } from '@/lib/db';

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [changeError, setChangeError] = useState('');

  // Settings
  const settingsArray = useLiveQuery(() => db.settings.toArray());
  const globalSettings = settingsArray?.[0] || { id: 'global', isGoogleLoginEnabled: false };

  const toggleGoogleAuth = async () => {
    try {
      await db.settings.put({
        ...globalSettings,
        id: globalSettings.id || 'global',
        isGoogleLoginEnabled: !globalSettings.isGoogleLoginEnabled
      });
    } catch (e) {
      console.error("Failed to toggle Google auth:", e);
    }
  };

  useEffect(() => {
    // Check session storage for admin auth
    const adminAuth = sessionStorage.getItem('admin-authenticated');
    if (adminAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Verify it's the super admin email
  if (session?.user?.email !== 'gokhansucsuz@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center text-white">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-bold mb-2">Erişim Reddedildi</h1>
          <p className="text-slate-400 text-sm mb-4">Bu sayfa sadece süper admin için erişilebilir.</p>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Giriş başarısız');
        return;
      }

      if (data.mustChangePassword) {
        setMustChangePassword(true);
        setCurrentPassword(password);
      } else {
        sessionStorage.setItem('admin-authenticated', 'true');
        setAuthenticated(true);
      }
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setChangeError('Şifreler eşleşmiyor');
      return;
    }
    if (newPassword.length < 6) {
      setChangeError('Yeni şifre en az 6 karakter olmalı');
      return;
    }

    setChangingPassword(true);
    setChangeError('');

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setChangeError(data.error || 'Şifre değiştirilemedi');
        return;
      }

      setMustChangePassword(false);
      sessionStorage.setItem('admin-authenticated', 'true');
      setAuthenticated(true);
    } catch {
      setChangeError('Bağlantı hatası');
    } finally {
      setChangingPassword(false);
    }
  };

  // Force password change screen
  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Şifre Değiştirme Zorunlu</h1>
            <p className="text-slate-400 text-sm mt-2">İlk giriş şifrenizi değiştirmeniz gerekmektedir.</p>
          </div>

          <form onSubmit={handleChangePassword} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Yeni Şifre</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Yeni şifrenizi girin (min. 6 karakter)"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Şifre Tekrar</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Yeni şifrenizi tekrar girin"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete="new-password"
              />
            </div>

            {changeError && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold border border-red-500/30">
                {changeError}
              </div>
            )}

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Şifreyi Değiştir
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Süper Admin Paneli</h1>
            <p className="text-slate-400 text-sm mt-2">Yönetim paneline erişmek için şifrenizi girin.</p>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">
              Google Doğrulandı: {session?.user?.email}
            </span>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Admin Şifresi</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Şifrenizi girin"
                  className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 text-red-400 p-3 rounded-xl text-xs font-bold border border-red-500/30">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Giriş Yap
            </button>
          </form>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full mt-4 text-slate-500 hover:text-red-400 text-xs font-bold flex items-center justify-center gap-1 py-2 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Google Hesabından Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-tight">Süper Admin Paneli</h1>
              <span className="text-[10px] text-slate-500 font-bold uppercase">{session?.user?.email}</span>
            </div>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin-authenticated');
              signOut({ callbackUrl: '/login' });
            }}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-xs font-bold px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Personnel Management */}
          <button
            onClick={() => router.push('/admin/personnel')}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-left hover:border-blue-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">Personel Yönetimi</h3>
            <p className="text-slate-400 text-sm">Personel ekle, düzenle, şifre değiştir.</p>
            <div className="flex items-center gap-1 text-blue-400 text-xs font-bold mt-4">
              <span>Yönet</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Audit Logs */}
          <button
            onClick={() => router.push('/admin/logs')}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-left hover:border-emerald-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">Log Kayıtları</h3>
            <p className="text-slate-400 text-sm">Tüm sistem aktivitelerini görüntüle.</p>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold mt-4">
              <span>Görüntüle</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* Data Migration */}
          <button
            onClick={() => router.push('/admin/migrate')}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 text-left hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
          >
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Database className="w-6 h-6 text-amber-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">Veri Migrasyonu</h3>
            <p className="text-slate-400 text-sm">Şifreleme formatını güncelle.</p>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold mt-4">
              <span>Başlat</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </button>

          {/* System Settings (Google Auth Toggle) */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Power className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-bold text-lg mb-1">Sistem Ayarları</h3>
              <p className="text-slate-400 text-sm mb-4">
                Google ile giriş (Dış Ağ) sistemini açıp kapatın. 
                Kapalıyken sistem sadece yerel ağdan şifre ile erişime izin verir.
              </p>
            </div>
            
            <button
              onClick={toggleGoogleAuth}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-colors ${
                globalSettings.isGoogleLoginEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
              }`}
            >
              <span>Google Girişi (Dış Ağ)</span>
              <span className={`px-2 py-1 rounded text-xs ${globalSettings.isGoogleLoginEnabled ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                {globalSettings.isGoogleLoginEnabled ? 'AÇIK' : 'KAPALI'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
