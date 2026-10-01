'use client';

import { AppLayout } from '@/components/Layout';
import { usePersonnel } from '@/components/PersonnelProvider';
import { useState } from 'react';
import { toast } from 'sonner';
import { Key, Save, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { personnel } = usePersonnel();
  const router = useRouter();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Lütfen mevcut şifrenizi girin.');
      return;
    }
    if (!password) {
      toast.error('Lütfen yeni bir şifre girin.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Yeni şifreler uyuşmuyor.');
      return;
    }
    if (password.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsSaving(true);
    try {
      const pId = personnel?.id || JSON.parse(sessionStorage.getItem('personnel') || '{}')?.id;
      const pName = personnel?.name || JSON.parse(sessionStorage.getItem('personnel') || '{}')?.name;

      const res = await fetch('/api/personnel/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-personnel-id': pId || '',
          'x-personnel-name': pName ? encodeURIComponent(pName) : '',
        },
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Şifre güncellenirken hata oluştu.');
      } else {
        toast.success('Şifreniz başarıyla güncellendi.');
        setCurrentPassword('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!personnel) {
    return (
      <AppLayout>
        <div className="text-center py-12 text-slate-500">Giriş yapılmamış.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto mt-10">
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
              {personnel.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Profilim</h1>
              <p className="text-sm text-slate-500">{personnel.name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mevcut Şifre</label>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mevcut şifreniz"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Yeni Şifre</label>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="En az 6 karakter"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Yeni Şifre (Tekrar)</label>
              <div className="relative">
                <Key className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Şifreyi tekrar girin"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              ŞİFREYİ GÜNCELLE
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
