'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePersonnel } from '@/components/PersonnelProvider';
import { 
  Users, Lock, Loader2, LogOut, ShieldCheck, Search, Eye, EyeOff, 
  CheckCircle2, Award, ArrowRight, AlertCircle, UserCheck, KeyRound, Building2
} from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

interface PersonnelItem {
  id: string;
  name: string;
  isAdmin?: boolean;
}

export default function SelectPersonnelPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setPersonnel } = usePersonnel();
  const [personnelList, setPersonnelList] = useState<PersonnelItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState('');
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user && (session.user as any).role === 'super-admin') {
      router.push('/admin');
      return;
    }

    fetch('/api/personnel/list')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPersonnelList(data);
          // Remember last selected personnel for faster repeat login
          const lastId = localStorage.getItem('sydv_last_personnel_id');
          if (lastId && data.some((p: PersonnelItem) => p.id === lastId)) {
            setSelectedId(lastId);
          } else if (data.length === 1) {
            setSelectedId(data[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [session, router]);

  const selectedPerson = useMemo(
    () => personnelList.find(p => p.id === selectedId) || null,
    [personnelList, selectedId]
  );

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(p => {
      if (roleFilter === 'admin' && !p.isAdmin) return false;
      if (roleFilter === 'staff' && p.isAdmin) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr');
        return p.name.toLocaleLowerCase('tr').includes(q);
      }
      return true;
    });
  }, [personnelList, searchQuery, roleFilter]);

  const handleSelectCard = (id: string) => {
    setSelectedId(id);
    setError('');
    try {
      localStorage.setItem('sydv_last_personnel_id', id);
    } catch { /* ignore */ }
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 40);
  };

  const handleKeyEvents = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !password) {
      setError('Lütfen listeden personel hesabınızı seçip şifrenizi girin.');
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

      try {
        localStorage.setItem('sydv_last_personnel_id', selectedId);
      } catch { /* ignore */ }

      setPersonnel(data.personnel);
      router.push('/');
    } catch {
      setError('Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setAuthenticating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white gap-2.5 text-xs font-bold uppercase tracking-wider">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span>Kurum Personel Listesi Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 relative overflow-hidden">
      {/* Subtle GovTech Background Grid */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="w-full max-w-5xl relative z-10 space-y-3">
        {/* Top Bar: Institution Header & Session Indicator */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <img src="/logo-sydv.jpg" alt="SYDV Logo" className="w-10 h-10 rounded-lg object-cover ring-2 ring-amber-400/50" />
            <div>
              <h1 className="text-xs sm:text-sm font-bold uppercase tracking-tight text-white">
                T.C. Sosyal Yardımlaşma ve Dayanışma Vakfı
              </h1>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Mütevelli Heyeti Karar Sistemi • Personel Girişi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session?.user?.email && (
              <div className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{session.user.email}</span>
              </div>
            )}
            <button
              type="button"
              onClick={async () => {
                await signOut({ redirect: false }).catch(() => {});
                window.close();
                window.location.href = process.env.NEXT_PUBLIC_PANEL_URL || 'https://www.vakifyonetim.space';
              }}
              className="text-xs text-red-400 hover:text-white hover:bg-red-600/20 border border-slate-800 hover:border-red-500/40 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Oturumu Kapat</span>
            </button>
          </div>
        </div>

        {/* Main 12-Column Split Card: Left Personnel Grid + Right Password Entry */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* LEFT 7 COLUMNS: INTERACTIVE PERSONNEL DIRECTORY */}
          <div className="lg:col-span-7 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between bg-slate-50/70">
            <div className="space-y-3.5">
              {/* Step 1 Title & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-700" />
                    <span>1. Adım: Personel Seçimi</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    İsminizin bulunduğu karta tıklayarak devam edin.
                  </p>
                </div>

                {/* Role Filter Tabs */}
                <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-bold uppercase self-start sm:self-auto">
                  {[
                    { id: 'all', label: `Tümü (${personnelList.length})` },
                    { id: 'admin', label: 'Yönetici' },
                    { id: 'staff', label: 'Personel' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setRoleFilter(tab.id as any)}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        roleFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              {personnelList.length > 3 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Personel adına göre hızlı filtrele..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              )}

              {/* Personnel Cards Grid */}
              {personnelList.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold text-xs uppercase text-slate-600">Henüz Aktif Personel Tanımlanmamış</p>
                  <p className="text-[11px] mt-1">Süper Admin Yönetim Paneli üzerinden personel kaydı oluşturulmalıdır.</p>
                </div>
              ) : filteredPersonnel.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
                  Arama kriterine uygun personel bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[330px] overflow-y-auto pr-1">
                  {filteredPersonnel.map((p) => {
                    const isSelected = selectedId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectCard(p.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 relative ${
                          isSelected
                            ? 'bg-blue-700 text-white border-blue-800 shadow-md ring-2 ring-blue-400/50'
                            : 'bg-white hover:bg-blue-50/60 text-slate-800 border-slate-200 hover:border-blue-300 shadow-2xs'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : p.isAdmin
                            ? 'bg-slate-900 text-amber-400'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className={`font-bold text-xs truncate uppercase ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {p.name}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {p.isAdmin ? (
                              <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                                isSelected ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
                              }`}>
                                <Award className="w-2.5 h-2.5" />
                                Yönetici Yetkili
                              </span>
                            ) : (
                              <span className={`text-[10px] font-semibold ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                Vakıf Personeli
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>Aktif Personel: <strong>{personnelList.length}</strong></span>
              {selectedPerson && (
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  {selectedPerson.name}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: PASSWORD VERIFICATION WORKSPACE */}
          <div className="lg:col-span-5 p-5 sm:p-6 bg-white flex flex-col justify-between">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-700" />
                  <span>2. Adım: Şifre Doğrulama</span>
                </h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Kişisel personel şifrenizi girerek çalışma alanını açın.
                </p>
              </div>

              {/* Selected Personnel Highlight Card */}
              <div className={`p-3.5 rounded-xl border transition-all ${
                selectedPerson
                  ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
                  : 'bg-slate-50 border-slate-200 border-dashed'
              }`}>
                {selectedPerson ? (
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                      {selectedPerson.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          {selectedPerson.isAdmin ? 'Yönetici Personel' : 'Yetkili Personel'}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-white truncate uppercase mt-0.5">
                        {selectedPerson.name}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-medium py-2 text-center">
                    Lütfen sol taraftan personel hesabınızı seçiniz.
                  </div>
                )}
              </div>

              {/* Password Input with Show/Hide & CapsLock Warning */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Personel Şifresi
                  </label>
                  {capsLockOn && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded">
                      ⚠️ Caps Lock Açık
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={!selectedId}
                    onKeyUp={handleKeyEvents}
                    onKeyDown={handleKeyEvents}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder={selectedId ? 'Şifrenizi yazın...' : 'Önce personel seçin'}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:opacity-50"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={authenticating || !selectedId || !password}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {authenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kimlik Doğrulanıyor...</span>
                  </>
                ) : (
                  <>
                    <span>Gündem & Karar Sistemine Gir</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-3 border-t border-slate-100 text-[10px] text-slate-400 font-medium leading-relaxed">
              Güvenliğiniz için oturum açtıktan sonra sol menüdeki <strong>Şifremi Değiştir</strong> adımından kişisel şifrenizi güncelleyebilirsiniz.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
