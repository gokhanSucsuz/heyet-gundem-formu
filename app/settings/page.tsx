'use client';

import { useState, useEffect, useRef } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import { usePersonnel } from '@/components/PersonnelProvider';
import { 
  ImagePlus, Trash2, Save, Loader2, Scale, Type, LayoutTemplate, 
  Stamp, PenTool, ShieldAlert, Eye, RotateCcw, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { personnel } = usePersonnel();
  const settings = useLiveQuery(() => db.settings.get('default'));
  const [localSettings, setLocalSettings] = useState<any>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const leftLogoRef = useRef<HTMLInputElement>(null);
  const rightLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      const draft = localStorage.getItem('draft_settings');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          setLocalSettings({ ...draftData, muhtaclikSiniri: draftData.muhtaclikSiniri ?? settings.muhtaclikSiniri ?? 9358.50 });
          setIsDirty(true);
          return;
        } catch (e) { console.error('Settings draft error', e); }
      }
      setLocalSettings((prev: any) => {
        if (prev && isDirty) return prev;
        return { ...settings, muhtaclikSiniri: settings.muhtaclikSiniri ?? 9358.50 };
      });
    } else {
      setLocalSettings({
        id: 'default',
        muhtaclikSiniri: 9358.50,
        layout: {
          fontFamily: 'Verdana, sans-serif',
          fontSizeTitle: 12,
          fontSizeContent: 11,
          lineSpacing: 'normal',
          marginX: 10,
          marginY: 10,
          watermarkText: '',
          watermarkText2: '',
          watermarkOpacity: 5,
          watermarkAngle: -45,
          watermarkSize: 36,
          signatureFontFamily: 'Verdana, sans-serif',
          signatureFontSize: 12,
          signatureSpacing: 1,
          showPageNumbers: true,
          itemSpacing: 24,
          itemLineHeight: 1.5,
          itemIndent: 0
        }
      });
    }
  }, [settings, isDirty]);

  const updateSettings = (updates: any) => {
    if (!localSettings) return;
    const updated = { ...localSettings, ...updates, updatedAt: Date.now() };
    if (updates.layout) {
      updated.layout = { ...localSettings.layout, ...updates.layout };
    }
    setLocalSettings(updated);
    setIsDirty(true);
    localStorage.setItem('draft_settings', JSON.stringify(updated));
  };

  const saveToCloud = async () => {
    if (!localSettings || isSaving) return;
    setIsSaving(true);
    try {
      await db.settings.put(localSettings);
      setIsDirty(false);
      localStorage.removeItem('draft_settings');
      toast.success('Belge ve sistem ayarları başarıyla kaydedildi.');
    } catch (e) {
      toast.error('Hata: Ayarlar kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (side: 'left' | 'right') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (side === 'left') {
        updateSettings({ leftLogoBase64: base64 });
      } else {
        updateSettings({ rightLogoBase64: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (side: 'left' | 'right') => {
    if (side === 'left') {
      updateSettings({ leftLogoBase64: undefined });
    } else {
      updateSettings({ rightLogoBase64: undefined });
    }
  };

  if (!localSettings || !personnel) {
    return (
      <AppLayout fullWidth>
        <div className="p-12 text-center text-slate-500 font-bold flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
          <span>Ayarlar yükleniyor...</span>
        </div>
      </AppLayout>
    );
  }

  if (!personnel.isAdmin) {
    return (
      <AppLayout fullWidth>
        <div className="p-8 text-center text-red-600 font-bold uppercase tracking-widest mt-16 bg-white rounded-xl shadow-sm max-w-md mx-auto border border-red-200 flex flex-col items-center gap-3">
          <ShieldAlert className="w-10 h-10 text-red-500" />
          <span>Yetkisiz Erişim. Yalnızca yöneticiler bu sayfayı görüntüleyebilir.</span>
        </div>
      </AppLayout>
    );
  }

  const lay = localSettings.layout || {};

  return (
    <AppLayout fullWidth>
      <div className={`w-full px-1 sm:px-3 pb-16 space-y-4 transition-opacity ${isSaving ? 'opacity-60 pointer-events-none' : ''}`}>
        {/* ==================== STICKY COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 sm:px-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Belge Mizanpaj & Sistem Kriterleri
                </h1>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    Kaydedilmemiş Değişiklikler
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    Güncel
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Kurum logoları, A4 kağıt kenar boşlukları, yazı tipi, filigran ve sosyal yardım muhtaçlık sınırı ayarları.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveToCloud}
              disabled={isSaving || !isDirty}
              className={`flex items-center justify-center gap-1.5 w-full sm:w-auto px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                isDirty && !isSaving
                  ? 'bg-blue-700 hover:bg-blue-800 text-white ring-2 ring-blue-400/40'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Ayarları Buluta Kaydet</span>
            </button>
          </div>
        </header>

        {/* ==================== MAIN 12-COLUMN COMPACT DASHBOARD GRID ==================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          {/* LEFT 7 COLUMNS: COMPACT CONFIGURATION CARDS */}
          <div className="xl:col-span-7 space-y-4">
            {/* ROW 1: KURUM LOGOLARI + MUHTAÇLIK SINIRI KRİTERİ */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Kurum Logoları (7 cols) */}
              <div className="md:col-span-7 bg-white p-4 rounded-xl border border-slate-300 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <ImagePlus className="w-4 h-4 text-blue-700" />
                    <span>Resmi Belge Logoları</span>
                  </h3>
                  <span className="text-[10px] font-semibold text-slate-400">A4 Üst Antet</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Left Logo */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Sol Üst Logo (Kurum 1)</span>
                    <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-2.5 flex flex-col items-center justify-center h-28 bg-slate-50/70 relative group transition-colors">
                      {localSettings.leftLogoBase64 ? (
                        <>
                          <img src={localSettings.leftLogoBase64} alt="Sol Logo" className="max-h-20 object-contain" />
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => leftLogoRef.current?.click()}
                              className="bg-white/90 hover:bg-blue-50 text-blue-700 border border-slate-200 p-1 rounded-md shadow-2xs text-[10px] font-bold"
                              title="Logoyu Değiştir"
                            >
                              Değiştir
                            </button>
                            <button 
                              type="button"
                              onClick={() => removeImage('left')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1 rounded-md shadow-2xs"
                              title="Logoyu Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => leftLogoRef.current?.click()}
                          className="text-blue-700 flex flex-col items-center gap-1 hover:text-blue-800"
                        >
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-[11px] font-bold uppercase">Logo Seç</span>
                        </button>
                      )}
                      <input 
                        ref={leftLogoRef} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload('left')}
                      />
                    </div>
                  </div>

                  {/* Right Logo */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">Sağ Üst Logo (Kurum 2)</span>
                    <div className="border border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-2.5 flex flex-col items-center justify-center h-28 bg-slate-50/70 relative group transition-colors">
                      {localSettings.rightLogoBase64 ? (
                        <>
                          <img src={localSettings.rightLogoBase64} alt="Sağ Logo" className="max-h-20 object-contain" />
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button
                              type="button"
                              onClick={() => rightLogoRef.current?.click()}
                              className="bg-white/90 hover:bg-blue-50 text-blue-700 border border-slate-200 p-1 rounded-md shadow-2xs text-[10px] font-bold"
                              title="Logoyu Değiştir"
                            >
                              Değiştir
                            </button>
                            <button 
                              type="button"
                              onClick={() => removeImage('right')}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-1 rounded-md shadow-2xs"
                              title="Logoyu Kaldır"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => rightLogoRef.current?.click()}
                          className="text-blue-700 flex flex-col items-center gap-1 hover:text-blue-800"
                        >
                          <ImagePlus className="w-6 h-6" />
                          <span className="text-[11px] font-bold uppercase">Logo Seç</span>
                        </button>
                      )}
                      <input 
                        ref={rightLogoRef} 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload('right')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Muhtaçlık Sınırı Kriteri (5 cols) */}
              <div className="md:col-span-5 bg-white p-4 rounded-xl border border-slate-300 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-emerald-600" />
                      <span>Muhtaçlık Sınırı Kriteri</span>
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                      {(Number(localSettings.muhtaclikSiniri ?? 9358.50)).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                    </span>
                  </div>

                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Kişi Başı Aylık Gelir Üst Sınırı (TL)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg px-3 py-2 pr-10 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 outline-none bg-slate-50 focus:bg-white"
                      value={localSettings.muhtaclikSiniri ?? 9358.50}
                      onChange={(e) => updateSettings({ muhtaclikSiniri: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      TL
                    </span>
                  </div>
                </div>

                <p className="mt-2.5 p-2 bg-amber-50/80 rounded-lg border border-amber-200 text-[10px] text-amber-950 leading-snug font-medium">
                  Excel tablolarında bu tutarı aşan başvurular otomatik olarak listenin en altına taşınır ve <strong>&quot;MUHTAÇLIK SINIRI ÜZERİNDE&quot;</strong> olarak işaretlenir.
                </p>
              </div>
            </div>

            {/* ROW 2: YAZI TİPİ, SAYFA KENAR BOŞLUKLARI VE GÜNDEM ARALIKLARI */}
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-blue-700" />
                  <span>Tipografi, A4 Kenar Boşlukları & Madde Düzeni</span>
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">Tüm Formlar İçin Varsayılan</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Yazı Tipi (Font)</label>
                  <select
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.fontFamily || 'Verdana, sans-serif'}
                    onChange={(e) => updateSettings({ layout: { fontFamily: e.target.value } })}
                  >
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Başlık Punto (px)</label>
                  <input
                    type="number"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.fontSizeTitle || 12}
                    onChange={(e) => updateSettings({ layout: { fontSizeTitle: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Metin Punto (px)</label>
                  <input
                    type="number"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.fontSizeContent || 11}
                    onChange={(e) => updateSettings({ layout: { fontSizeContent: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Satır Aralığı (Oran)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.itemLineHeight ?? 1.5}
                    onChange={(e) => updateSettings({ layout: { itemLineHeight: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sağ/Sol Kenar (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.marginX ?? 10}
                    onChange={(e) => updateSettings({ layout: { marginX: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Alt/Üst Kenar (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.marginY ?? 10}
                    onChange={(e) => updateSettings({ layout: { marginY: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Maddeler Arası (px)</label>
                  <input
                    type="number"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.itemSpacing ?? 24}
                    onChange={(e) => updateSettings({ layout: { itemSpacing: Number(e.target.value) } })}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Madde Girintisi (px)</label>
                  <input
                    type="number"
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                    value={lay.itemIndent ?? 0}
                    onChange={(e) => updateSettings({ layout: { itemIndent: Number(e.target.value) } })}
                  />
                </div>
              </div>
            </div>

            {/* ROW 3: FİLİGRAN (WATERMARK) & İMZA ALANI AYARLARI */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Filigran Ayarları (8 cols) */}
              <div className="md:col-span-8 bg-white p-4 rounded-xl border border-slate-300 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                    <Stamp className="w-4 h-4 text-blue-700" />
                    <span>Arka Plan Filigran (Watermark)</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">Çok Sayfalı Baskı</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filigran Satır 1</label>
                    <input
                      type="text"
                      placeholder="Örn: T.C. EDİRNE SYDV"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      value={lay.watermarkText || ''}
                      onChange={(e) => updateSettings({ layout: { watermarkText: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Filigran Satır 2</label>
                    <input
                      type="text"
                      placeholder="Örn: MÜTEVELLİ HEYETİ"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      value={lay.watermarkText2 || ''}
                      onChange={(e) => updateSettings({ layout: { watermarkText2: e.target.value } })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Opaklık (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      value={lay.watermarkOpacity ?? 5}
                      onChange={(e) => updateSettings({ layout: { watermarkOpacity: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Açı (Derece °)</label>
                    <input
                      type="number"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      value={lay.watermarkAngle ?? -45}
                      onChange={(e) => updateSettings({ layout: { watermarkAngle: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Boyut (px)</label>
                    <input
                      type="number"
                      className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                      value={lay.watermarkSize ?? 36}
                      onChange={(e) => updateSettings({ layout: { watermarkSize: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>

              {/* İmza Alanı Ayarları (4 cols) */}
              <div className="md:col-span-4 bg-white p-4 rounded-xl border border-slate-300 shadow-2xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <PenTool className="w-4 h-4 text-blue-700" />
                      <span>İmza Bloğu</span>
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">İmza Yazı Punto (px)</label>
                      <input
                        type="number"
                        className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                        value={lay.signatureFontSize || 12}
                        onChange={(e) => updateSettings({ layout: { signatureFontSize: Number(e.target.value) } })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">İsim-Ünvan Arası Boşluk (px)</label>
                      <input
                        type="number"
                        className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                        value={lay.signatureSpacing ?? 1}
                        onChange={(e) => updateSettings({ layout: { signatureSpacing: Number(e.target.value) } })}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-tight border-t border-slate-100 pt-2">
                  Heyet imzaları son sayfada karar metniyle bölünmeden (`break-inside-avoid`) basılır.
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: LIVE INTERACTIVE A4 MINIATURE PREVIEW */}
          <div className="xl:col-span-5 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-lg text-white sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Canlı A4 Mizanpaj Önizlemesi</span>
              </div>
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {lay.fontFamily?.split(',')[0] || 'Verdana'} • {lay.marginX ?? 10}mm × {lay.marginY ?? 10}mm
              </span>
            </div>

            {/* Scaled Miniature A4 Sheet */}
            <div className="bg-white text-black rounded shadow-inner mx-auto w-full aspect-[210/270] relative overflow-hidden flex flex-col justify-between border border-slate-300"
              style={{
                paddingTop: `${Math.max(8, (lay.marginY ?? 10) * 1.3)}px`,
                paddingBottom: `${Math.max(8, (lay.marginY ?? 10) * 1.3)}px`,
                paddingLeft: `${Math.max(10, (lay.marginX ?? 10) * 1.4)}px`,
                paddingRight: `${Math.max(10, (lay.marginX ?? 10) * 1.4)}px`,
                fontFamily: lay.fontFamily || 'Verdana, sans-serif'
              }}
            >
              {/* Watermark Live Preview */}
              {(lay.watermarkText || lay.watermarkText2) && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0">
                  <div
                    className="font-bold text-center whitespace-nowrap select-none"
                    style={{
                      transform: `rotate(${lay.watermarkAngle ?? -45}deg)`,
                      fontSize: `${Math.max(10, Math.round((lay.watermarkSize ?? 36) * 0.45))}px`,
                      opacity: Math.max(0.03, (lay.watermarkOpacity ?? 5) / 100),
                      lineHeight: 1.2,
                    }}
                  >
                    {lay.watermarkText && <div>{lay.watermarkText}</div>}
                    {lay.watermarkText2 && <div>{lay.watermarkText2}</div>}
                  </div>
                </div>
              )}

              {/* Top Section: Header + Decision Info */}
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-2 mb-3 text-center font-bold">
                  {localSettings.leftLogoBase64 ? (
                    <img src={localSettings.leftLogoBase64} alt="Sol Logo" className="w-10 h-10 object-contain shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-slate-300 flex items-center justify-center text-[8px] text-slate-400 shrink-0">
                      Logo 1
                    </div>
                  )}

                  <div
                    className="flex-1 leading-tight"
                    style={{ fontSize: `${Math.max(8, Math.round((lay.fontSizeTitle || 12) * 0.72))}px` }}
                  >
                    <div>T.C.</div>
                    <div>EDİRNE VALİLİĞİ</div>
                    <div>SOSYAL YARDIMLAŞMA VE DAYANIŞMA VAKFI BAŞKANLIĞI</div>
                  </div>

                  {localSettings.rightLogoBase64 ? (
                    <img src={localSettings.rightLogoBase64} alt="Sağ Logo" className="w-10 h-10 object-contain shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-slate-300 flex items-center justify-center text-[8px] text-slate-400 shrink-0">
                      Logo 2
                    </div>
                  )}
                </div>

                <div className="border-b border-black pb-1.5 mb-2.5 text-[8px] font-bold space-y-0.5">
                  <div>KARAR TARİHİ : {new Date().toLocaleDateString('tr-TR')}</div>
                  <div>KARAR NO &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {new Date().getFullYear()} / 23</div>
                </div>

                {/* Simulated Agenda Items */}
                <div
                  className="flex flex-col"
                  style={{
                    fontSize: `${Math.max(7, Math.round((lay.fontSizeContent || 11) * 0.72))}px`,
                    gap: `${Math.max(4, Math.round((lay.itemSpacing ?? 24) * 0.4))}px`,
                    lineHeight: lay.itemLineHeight || 1.5,
                    paddingLeft: `${Math.round((lay.itemIndent ?? 0) * 0.5)}px`
                  }}
                >
                  <div>
                    <strong>1.</strong> Maddi yardım talebinde bulunan vatandaşların durumlarının Sosyal İnceleme Puanlama Sistemi kriterlerine göre değerlendirilmesi...
                    <table className="w-full border-collapse border border-black mt-1 text-[7px]">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-black px-1 py-0.5">SIRA</th>
                          <th className="border border-black px-1 py-0.5">ADI SOYADI</th>
                          <th className="border border-black px-1 py-0.5">GELİR</th>
                          <th className="border border-black px-1 py-0.5">KARAR</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black px-1 py-0.5 text-center font-bold">1</td>
                          <td className="border border-black px-1 py-0.5">Fatma YER...</td>
                          <td className="border border-black px-1 py-0.5">5.000,00 TL</td>
                          <td className="border border-black px-1 py-0.5">Kabul</td>
                        </tr>
                        <tr className="bg-slate-200 font-bold">
                          <td className="border border-black px-1 py-0.5 text-center">2</td>
                          <td className="border border-black px-1 py-0.5">Bayram ARS...</td>
                          <td className="border border-black px-1 py-0.5 text-red-700">MUHTAÇLIK SINIRI ÜZERİNDE</td>
                          <td className="border border-black px-1 py-0.5">Red</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <strong>2.</strong> Vakfımızda dosyası bulunan katılım payı yardımına başvuruda bulunan müracaatçımızın ödemesinin değerlendirilmesi...
                  </div>
                  <div>
                    <strong>3.</strong> Ulaşım giderleri destek programına başvuruda bulunan öğrencilerimizin taleplerinin görüşülmesi...
                  </div>
                </div>
              </div>

              {/* Bottom Section: Decision Note & Signatures */}
              <div className="relative z-10 pt-2 border-t border-slate-200 text-center">
                <div
                  className="font-bold mb-2.5"
                  style={{ fontSize: `${Math.max(7, Math.round((lay.fontSizeContent || 11) * 0.7))}px` }}
                >
                  Yukarıda maddeler halinde belirtilen yardım talepleri görüşülmüş olup verilen kararlar oy birliği ile alınmıştır.
                </div>

                {/* President */}
                <div
                  className="font-bold mb-2 leading-tight"
                  style={{ fontSize: `${Math.max(7, Math.round((lay.signatureFontSize || 12) * 0.68))}px` }}
                >
                  <div>VALİ YARDIMCISI</div>
                  <div style={{ height: `${Math.max(1, Math.round((lay.signatureSpacing ?? 1) * 0.4))}px` }} />
                  <div className="text-slate-600">VAKIF BAŞKAN VEKİLİ</div>
                </div>

                {/* Members Row */}
                <div
                  className="grid grid-cols-4 gap-1 font-bold leading-tight"
                  style={{ fontSize: `${Math.max(6, Math.round((lay.signatureFontSize || 12) * 0.6))}px` }}
                >
                  <div>
                    <div>ÜYE 1</div>
                    <div className="text-slate-500">DEFTERDAR</div>
                  </div>
                  <div>
                    <div>ÜYE 2</div>
                    <div className="text-slate-500">İL MİLLİ EĞİTİM</div>
                  </div>
                  <div>
                    <div>ÜYE 3</div>
                    <div className="text-slate-500">İL SAĞLIK MD.</div>
                  </div>
                  <div>
                    <div>ÜYE 4</div>
                    <div className="text-slate-500">HAYIRSEVER</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
