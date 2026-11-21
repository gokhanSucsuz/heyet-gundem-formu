'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { 
  Loader2, ShieldCheck, Lock, Users, Shield, ArrowRight, 
  FileCheck2, AlertTriangle, Landmark, CheckCircle2, FileSpreadsheet, Printer
} from 'lucide-react';

function LoginContent({ isGoogleLoginEnabled }: { isGoogleLoginEnabled: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [loadingType, setLoadingType] = useState<string | null>(null);

  const handleBypassSignIn = async (type: 'personnel' | 'admin', callbackUrl: string) => {
    setLoadingType(type);
    await signIn('credentials', { type, callbackUrl });
  };

  return (
    <div className="w-full max-w-5xl relative z-10">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-800/30 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* LEFT 5 COLUMNS: OFFICIAL INSTITUTION BRANDING & CAPABILITIES */}
        <div className="lg:col-span-5 bg-slate-950 text-white p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="space-y-6">
            {/* Logo & Institution Name */}
            <div className="flex items-center gap-3.5">
              <img
                src="/logo-sydv.jpg"
                alt="T.C. SYDV Logo"
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-amber-400/60 shadow-lg shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  T.C. Valilik / Kaymakamlık
                </span>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white uppercase leading-snug">
                  Sosyal Yardımlaşma ve Dayanışma Vakfı
                </h1>
              </div>
            </div>

            {/* Official Description */}
            <div className="pt-4 border-t border-slate-800/90 space-y-2.5">
              <div className="inline-flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase px-2.5 py-1 rounded-md tracking-wider">
                <Landmark className="w-3.5 h-3.5 text-amber-400" />
                <span>Mütevelli Heyeti Karar Yönetim Sistemi</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Mütevelli Heyeti toplantı gündemlerinin hazırlanması, sosyal yardım başvuru listelerinin değerlendirilmesi ve resmi karar tutanaklarının oluşturulması için yetkilendirilmiş kurumsal çalışma alanı.
              </p>
            </div>

            {/* Key System Capabilities List */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Canlı Word Sayfa Düzeni:</strong> Gündem maddelerini ve tabloları doğrudan A4 resmi belge üzerinde hazırlama.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Muhtaçlık Sınırı Kontrolü:</strong> Excel başvuru listelerini kişi başı gelire göre otomatik analiz ve sıralama.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-300">
                <Printer className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Heyet İmzalı Resmi Çıktı:</strong> Asil ve vekil üye imzalarıyla standartlara tam uyumlu A4 karar baskısı.</span>
              </div>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-8 pt-4 border-t border-slate-800/90 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              AES-256-GCM Şifreli Veri
            </span>
            <span>•</span>
            <span>Kayıtlı Denetim İzi</span>
          </div>
        </div>

        {/* RIGHT 7 COLUMNS: CLEAN PROFESSIONAL ACCESS PORTAL */}
        <div className="lg:col-span-7 p-6 sm:p-8 bg-white flex flex-col justify-between space-y-6">
          <div>
            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
                  Kurumsal Oturum Açma
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Gündem ve karar işlemlerine devam etmek için yetkili giriş kanalını seçiniz.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 uppercase">
                <Lock className="w-3 h-3 text-blue-700" />
                Yetkili Erişim
              </span>
            </div>

            {error === 'AccessDenied' && (
              <div className="mb-5 bg-red-50 text-red-800 p-3.5 rounded-xl text-xs font-bold border border-red-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="uppercase">Yetkisiz Hesap</div>
                  <div className="font-medium text-red-700 mt-0.5">Seçtiğiniz hesap bu sisteme erişim için yetkilendirilmemiştir. Lütfen kurum hesabınızı kullanın.</div>
                </div>
              </div>
            )}

            {error && error !== 'AccessDenied' && (
              <div className="mb-5 bg-red-50 text-red-800 p-3.5 rounded-xl text-xs font-bold border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Oturum Hatası: {error}</span>
              </div>
            )}

            {/* Primary Personnel Access Card */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase">Vakıf Personeli Girişi</h3>
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase">
                      Gündem & Karar İşlemleri
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Toplantı gündem maddelerini oluşturmak, Word/Excel listelerini aktarmak ve karar formlarını düzenlemek için personel hesabınızla giriş yapın.
                  </p>
                </div>
              </div>

              {isGoogleLoginEnabled ? (
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/select-personnel' })}
                  className="w-full flex items-center justify-center gap-2.5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Personel Girişi (Kurumsal Hesap İle Devam Et)</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBypassSignIn('personnel', '/select-personnel')}
                  disabled={loadingType !== null}
                  className="w-full flex items-center justify-center gap-2.5 bg-blue-700 hover:bg-blue-800 text-white px-5 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm disabled:opacity-50"
                >
                  {loadingType === 'personnel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  <span>Personel Girişi (Hesap Seçimine Geç)</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-500 font-medium">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Personel bazlı yetkilendirme
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Otomatik taslak koruma
                </span>
              </div>
            </div>
          </div>

          {/* Secondary Super Admin Access Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0 border border-slate-700">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Süper Admin Yönetim Paneli</h4>
                <p className="text-[11px] text-slate-400">Personel hesapları, yetki tanımları ve sistem güvenlik yapılandırması</p>
              </div>
            </div>

            {isGoogleLoginEnabled ? (
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/admin' })}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-4 py-2 rounded-lg font-bold text-xs uppercase whitespace-nowrap transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Yönetici Girişi</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleBypassSignIn('admin', '/admin')}
                disabled={loadingType !== null}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 px-4 py-2 rounded-lg font-bold text-xs uppercase whitespace-nowrap transition-colors disabled:opacity-50"
              >
                {loadingType === 'admin' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>Yönetici Girişi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient({ isGoogleLoginEnabled }: { isGoogleLoginEnabled: boolean }) {
  return (
    <Suspense fallback={<div className="text-slate-300 text-xs font-bold uppercase">Yükleniyor...</div>}>
      <LoginContent isGoogleLoginEnabled={isGoogleLoginEnabled} />
    </Suspense>
  );
}
