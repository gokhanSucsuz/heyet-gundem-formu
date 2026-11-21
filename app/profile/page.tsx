'use client';

import { AppLayout } from '@/components/Layout';
import { usePersonnel } from '@/components/PersonnelProvider';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Key, Save, Loader2, Eye, EyeOff, ShieldCheck, CheckCircle2, 
  User, Award, Lock, RefreshCw, ArrowLeft, Check, Shield
} from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { personnel, logout } = usePersonnel();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastUpdatedSuccess, setLastUpdatedSuccess] = useState(false);

  const passwordMetrics = useMemo(() => {
    const minLen = password.length >= 6;
    const strongLen = password.length >= 8;
    const hasNumberAndChar = /[0-9]/.test(password) && /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(password);
    const hasMatch = password.length > 0 && password === confirmPassword;
    const isDifferent = password.length > 0 && (!currentPassword || password !== currentPassword);

    let score = 0;
    if (minLen) score += 1;
    if (strongLen) score += 1;
    if (hasNumberAndChar) score += 1;
    if (hasMatch && isDifferent) score += 1;

    const strengthLabel =
      password.length === 0
        ? 'Şifre Girilmedi'
        : score <= 1
        ? 'Zayıf'
        : score === 2
        ? 'Orta'
        : score === 3
        ? 'Güçlü'
        : 'Çok Güçlü';

    const strengthColor =
      password.length === 0
        ? 'bg-slate-200'
        : score <= 1
        ? 'bg-red-500'
        : score === 2
        ? 'bg-amber-500'
        : 'bg-emerald-600';

    return { minLen, strongLen, hasNumberAndChar, hasMatch, isDifferent, score, strengthLabel, strengthColor };
  }, [password, confirmPassword, currentPassword]);

  const handleKeyEvents = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

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
    if (password.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }

    setIsSaving(true);
    setLastUpdatedSuccess(false);
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
        setLastUpdatedSuccess(true);
      }
    } catch {
      toast.error('Bağlantı hatası.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!personnel) {
    return (
      <AppLayout fullWidth>
        <div className="text-center py-12 text-slate-500 font-bold text-sm">Giriş yapılmamış.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth>
      <div className="w-full px-1 sm:px-3 pb-14 space-y-4">
        {/* ==================== STICKY COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 sm:px-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Karar Formlarına Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Personel Hesap & Şifre Yönetimi
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Aktif Oturum
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Kişisel personel şifrenizi güncelleyin ve aktif yetki kapsamınızı görüntüleyin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Personel Değiştir</span>
            </button>
          </div>
        </header>

        {/* ==================== 12-COLUMN SPLIT PROFILE & PASSWORD WORKSPACE ==================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT 5 COLUMNS: PERSONNEL IDENTITY CARD, PERMISSIONS & PASSWORD RULES */}
          <div className="lg:col-span-5 space-y-4">
            {/* Official Personnel Badge Card */}
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-md shrink-0 ring-2 ring-amber-400/40">
                  {personnel.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    T.C. SYDV Kurum Personeli
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white truncate uppercase mt-0.5">
                    {personnel.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-1">
                    {personnel.isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded uppercase">
                        <Award className="w-3 h-3" />
                        Yönetici Yetkili (Admin)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded uppercase">
                        <User className="w-3 h-3" />
                        Vakıf Personeli
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Permissions List */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Hesap Yetki Kapsamı
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-200 bg-slate-800/70 px-2.5 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gündem Maddesi Düzenleme</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-200 bg-slate-800/70 px-2.5 py-1.5 rounded-lg">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Word & Excel Tablo Aktarımı</span>
                  </div>
                  {personnel.isAdmin && (
                    <>
                      <div className="flex items-center gap-1.5 text-amber-200 bg-slate-800/70 px-2.5 py-1.5 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Karar Kesinleştirme & Baskı</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-200 bg-slate-800/70 px-2.5 py-1.5 rounded-lg">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Heyet Üyeleri & Mizanpaj</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Live Password Verification Criteria Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  <span>Canlı Şifre Doğrulama Kriterleri</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Seviye: <strong className="text-slate-800">{passwordMetrics.strengthLabel}</strong>
                </span>
              </div>

              {/* Strength Progress Bar */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex gap-1 p-0.5 border border-slate-200">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-full transition-all ${
                      passwordMetrics.score >= step ? passwordMetrics.strengthColor : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>

              <div className="space-y-2 text-xs pt-1">
                <div className={`flex items-center gap-2 font-semibold ${passwordMetrics.minLen ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${passwordMetrics.minLen ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>En az 6 karakter uzunluğunda (Zorunlu)</span>
                </div>
                <div className={`flex items-center gap-2 font-semibold ${passwordMetrics.isDifferent ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${passwordMetrics.isDifferent ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Mevcut şifrenizden farklı bir şifre</span>
                </div>
                <div className={`flex items-center gap-2 font-semibold ${passwordMetrics.hasMatch ? 'text-emerald-700' : 'text-slate-500'}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${passwordMetrics.hasMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Yeni şifre ve tekrarı birbiriyle aynı (Zorunlu)</span>
                </div>
                <div className={`flex items-center gap-2 font-semibold ${passwordMetrics.hasNumberAndChar ? 'text-emerald-700' : 'text-slate-400'}`}>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${passwordMetrics.hasNumberAndChar ? 'text-emerald-600' : 'text-slate-300'}`} />
                  <span>Harf ve rakam kombinasyonu (Önerilen)</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLUMNS: PASSWORD CHANGE FORM */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-300 shadow-2xs p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-700" />
                  <span>Personel Giriş Şifresini Değiştir</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Yeni şifreniz kaydedildiği anda aktif olur ve denetim kayıtlarına güvenli olarak işlenir.
                </p>
              </div>
              {capsLockOn && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">
                  ⚠️ Caps Lock Açık
                </span>
              )}
            </div>

            {lastUpdatedSuccess && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Şifreniz başarıyla değiştirildi. Bir sonraki girişinizde yeni şifrenizi kullanabilirsiniz.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                  1. Mevcut Şifreniz
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onKeyUp={handleKeyEvents}
                    onKeyDown={handleKeyEvents}
                    onChange={(e) => { setCurrentPassword(e.target.value); setLastUpdatedSuccess(false); }}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                    placeholder="Kullandığınız mevcut şifreyi girin"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={showCurrent ? 'Gizle' : 'Göster'}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    2. Yeni Şifre
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={password}
                      onKeyUp={handleKeyEvents}
                      onKeyDown={handleKeyEvents}
                      onChange={(e) => { setPassword(e.target.value); setLastUpdatedSuccess(false); }}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                      placeholder="En az 6 karakter"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title={showNew ? 'Gizle' : 'Göster'}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">
                    3. Yeni Şifre (Tekrar)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onKeyUp={handleKeyEvents}
                      onKeyDown={handleKeyEvents}
                      onChange={(e) => { setConfirmPassword(e.target.value); setLastUpdatedSuccess(false); }}
                      className={`w-full pl-9 pr-10 py-2.5 bg-slate-50 focus:bg-white border rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 ${
                        confirmPassword.length > 0 && !passwordMetrics.hasMatch
                          ? 'border-red-400 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-blue-600 focus:border-blue-600'
                      }`}
                      placeholder="Yeni şifreyi doğrulayın"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title={showConfirm ? 'Gizle' : 'Göster'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500 font-medium">
                  Tüm zorunlu kriterler sağlandığında güncelleme butonu aktif olur.
                </span>
                <button
                  type="submit"
                  disabled={isSaving || !currentPassword || !passwordMetrics.minLen || !passwordMetrics.hasMatch}
                  className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Şifremi Güncelle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
