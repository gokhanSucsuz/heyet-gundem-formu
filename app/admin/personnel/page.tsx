'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Users, Loader2, Edit3, Eye, EyeOff, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';

interface PersonnelItem {
  id: string;
  name: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

export default function AdminPersonnelPage() {
  const router = useRouter();
  const [personnel, setPersonnel] = useState<PersonnelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchPersonnel = async () => {
    try {
      const res = await fetch('/api/admin/personnel');
      const data = await res.json();
      if (Array.isArray(data)) setPersonnel(data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    // Check admin auth
    if (sessionStorage.getItem('admin-authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    fetchPersonnel();
  }, [router]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPassword.trim()) {
      setError('İsim ve şifre gerekli');
      return;
    }
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/admin/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), password: newPassword.trim(), isAdmin: newIsAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ekleme başarısız');
        return;
      }
      setNewName('');
      setNewPassword('');
      setNewIsAdmin(false);
      setShowAddForm(false);
      fetchPersonnel();
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu personeli devre dışı bırakmak istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/personnel?id=${id}`, { method: 'DELETE' });
      fetchPersonnel();
    } catch { /* ignore */ }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch('/api/admin/personnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      fetchPersonnel();
    } catch { /* ignore */ }
  };

  const handleToggleAdmin = async (id: string, currentAdmin: boolean) => {
    try {
      await fetch('/api/admin/personnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isAdmin: !currentAdmin }),
      });
      fetchPersonnel();
    } catch { /* ignore */ }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const body: any = { id };
      if (editName.trim()) body.name = editName.trim();
      if (editPassword.trim()) body.password = editPassword.trim();

      await fetch('/api/admin/personnel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setEditingId(null);
      setEditName('');
      setEditPassword('');
      fetchPersonnel();
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-xs sm:text-sm uppercase tracking-tight truncate">Personel Yönetimi</h1>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold whitespace-nowrap">{personnel.length} personel</span>
            </div>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setError(''); }}
            className="flex items-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-colors shrink-0"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Personel Ekle
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Add Form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-slate-800/50 border border-blue-500/30 rounded-2xl p-6 mb-6 space-y-4">
            <h3 className="font-bold text-sm text-blue-400 uppercase">Yeni Personel Ekle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Personel Adı</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Şifre</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Personel şifresi"
                    className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="checkbox" 
                id="isAdmin" 
                checked={newIsAdmin} 
                onChange={(e) => setNewIsAdmin(e.target.checked)} 
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <label htmlFor="isAdmin" className="text-xs font-bold text-slate-300">Admin Yetkisi Ver (Form silebilir ve yeni form oluşturabilir)</label>
            </div>
            {error && <div className="text-red-400 text-xs font-bold">{error}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={adding}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Ekle
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-white px-4 py-2 rounded-xl text-xs font-bold"
              >
                İptal
              </button>
            </div>
          </form>
        )}

        {/* Personnel List */}
        <div className="space-y-3">
          {personnel.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="font-bold">Henüz personel eklenmemiş</p>
            </div>
          ) : (
            personnel.map(p => (
              <div key={p.id} className={`bg-slate-800/50 border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${p.isActive ? 'border-slate-700' : 'border-red-500/30 opacity-60'}`}>
                {editingId === p.id ? (
                  <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={p.name}
                      className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white outline-none flex-1"
                    />
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Yeni şifre (isteğe bağlı)"
                      className="px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white outline-none flex-1"
                    />
                    <button
                      onClick={() => handleUpdate(p.id)}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-slate-400 hover:text-white px-2 py-1.5 text-xs font-bold"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.isActive ? 'Aktif' : 'Devre Dışı'} • {p.isAdmin ? <span className="text-amber-400 font-bold">Admin Yetkili</span> : 'Normal Personel'} • {new Date(p.createdAt).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-700 sm:border-0 justify-end">
                      <button
                        onClick={() => router.push(`/admin/personnel/${p.id}`)}
                        className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-emerald-500/10 transition-colors"
                        title="İncele (Loglar & Şifre)"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name); setEditPassword(''); }}
                        className="text-slate-400 hover:text-blue-400 p-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                        title="Düzenle"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleAdmin(p.id, p.isAdmin)}
                        className={`p-1.5 rounded-lg transition-colors ${p.isAdmin ? 'text-amber-400 hover:bg-amber-500/10' : 'text-slate-500 hover:bg-slate-700'}`}
                        title={p.isAdmin ? 'Admin Yetkisini Al' : 'Admin Yetkisi Ver'}
                      >
                        <span className="text-[10px] font-bold mr-1">Admin</span>
                        {p.isAdmin ? <ToggleRight className="w-5 h-5 inline" /> : <ToggleLeft className="w-5 h-5 inline" />}
                      </button>
                      <button
                        onClick={() => handleToggleActive(p.id, p.isActive)}
                        className={`p-1.5 rounded-lg transition-colors ${p.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`}
                        title={p.isActive ? 'Devre Dışı Bırak' : 'Aktif Et'}
                      >
                        {p.isActive ? <ToggleRight className="w-5 h-5 inline" /> : <ToggleLeft className="w-5 h-5 inline" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
