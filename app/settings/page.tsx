'use client';

import { useState, useEffect, useRef } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import { ImagePlus, Trash2, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
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
          setLocalSettings(draftData);
          setIsDirty(true);
          return;
        } catch (e) { console.error('Settings draft error', e); }
      }
      setLocalSettings(settings);
    } else {
      // Initialize with requested defaults
      setLocalSettings({
        id: 'default',
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
  }, [settings]);

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
      toast.success('Ayarlar başarıyla kaydedildi.');
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

  if (!localSettings) return <div className="p-8 text-center text-slate-500 italic uppercase font-bold">Yükleniyor...</div>;

  return (
    <AppLayout>
      <div className={`max-w-5xl mx-auto transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Ayarlar</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Logo, sayfa düzeni ve mizanpaj ayarları.</p>
          </div>
          {isDirty && (
            <button
              onClick={saveToCloud}
              disabled={isSaving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 uppercase tracking-wider disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              AYARLARI BULUTA KAYDET
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded border border-slate-300 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-2">Belge Logoları</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* Left Logo */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Sol Üst Logo (Kurum 1)</label>
                  <div className="border border-slate-300 rounded p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50 relative group">
                    {localSettings.leftLogoBase64 ? (
                      <>
                        <img src={localSettings.leftLogoBase64} alt="Left Logo" className="max-h-24 object-contain" />
                        <button 
                          onClick={() => removeImage('left')}
                          className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <button 
                          onClick={() => leftLogoRef.current?.click()}
                          className="text-blue-700 flex flex-col items-center gap-2 hover:text-blue-800 font-medium"
                        >
                          <ImagePlus className="w-8 h-8" />
                          <span className="text-sm font-bold uppercase">Logo Yükle</span>
                        </button>
                        <input 
                          ref={leftLogoRef} 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload('left')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Logo */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Sağ Üst Logo (Kurum 2)</label>
                  <div className="border border-slate-300 rounded p-4 flex flex-col items-center justify-center min-h-[160px] bg-slate-50 relative group">
                    {localSettings.rightLogoBase64 ? (
                      <>
                        <img src={localSettings.rightLogoBase64} alt="Right Logo" className="max-h-24 object-contain" />
                        <button 
                          onClick={() => removeImage('right')}
                          className="absolute top-2 right-2 bg-red-100 text-red-600 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center">
                        <button 
                          onClick={() => rightLogoRef.current?.click()}
                          className="text-blue-700 flex flex-col items-center gap-2 hover:text-blue-800 font-medium"
                        >
                          <ImagePlus className="w-8 h-8" />
                          <span className="text-sm font-bold uppercase">Logo Yükle</span>
                        </button>
                        <input 
                          ref={rightLogoRef} 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageUpload('right')}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="bg-white p-6 rounded border border-slate-300 shadow-sm space-y-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-2">Görünüm Ayarları (Global)</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Yazı Tipi (Font)</label>
                  <select
                    className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={localSettings.layout?.fontFamily || 'Verdana, sans-serif'}
                    onChange={(e) => updateSettings({ layout: { fontFamily: e.target.value } })}
                  >
                    <option value="Times New Roman, serif">Times New Roman</option>
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Başlık Boyutu</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.fontSizeTitle || 12}
                      onChange={(e) => updateSettings({ layout: { fontSizeTitle: Number(e.target.value) } })}
                    />
                    <span className="text-xs text-slate-500 font-bold">px</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Metin Boyutu</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.fontSizeContent || 11}
                      onChange={(e) => updateSettings({ layout: { fontSizeContent: Number(e.target.value) } })}
                    />
                    <span className="text-xs text-slate-500 font-bold">px</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sayfa Kenar (X)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.marginX || 10}
                      onChange={(e) => updateSettings({ layout: { marginX: Number(e.target.value) } })}
                    />
                    <span className="text-xs text-slate-500 font-bold">mm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Sayfa Alt/Üst (Y)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.marginY || 10}
                      onChange={(e) => updateSettings({ layout: { marginY: Number(e.target.value) } })}
                    />
                    <span className="text-xs text-slate-500 font-bold">mm</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Filigran Ayarları</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="col-span-2 space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filigran Metni (Satır 1)</label>
                      <input
                        type="text"
                        placeholder="Örn: MÜTEVELLİ HEYETİ"
                        className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={localSettings.layout?.watermarkText || ''}
                        onChange={(e) => updateSettings({ layout: { watermarkText: e.target.value } })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Filigran Metni (Satır 2)</label>
                      <input
                        type="text"
                        placeholder="Örn: SOSYAL YARDIMLAŞMA"
                        className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={localSettings.layout?.watermarkText2 || ''}
                        onChange={(e) => updateSettings({ layout: { watermarkText2: e.target.value } })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Opaklık (%)</label>
                    <input
                      type="number" min="0" max="100"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.watermarkOpacity ?? 5}
                      onChange={(e) => updateSettings({ layout: { watermarkOpacity: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Döndürme (°)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.watermarkAngle ?? -45}
                      onChange={(e) => updateSettings({ layout: { watermarkAngle: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Boyut (px)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.watermarkSize ?? 36}
                      onChange={(e) => updateSettings({ layout: { watermarkSize: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">Gündem Maddesi Ayarları</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Maddeler Arası Boşluk (px)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.itemSpacing ?? 24}
                      onChange={(e) => updateSettings({ layout: { itemSpacing: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Metin Satır Aralığı</label>
                    <input
                      type="number" step="0.1"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.itemLineHeight ?? 1.5}
                      onChange={(e) => updateSettings({ layout: { itemLineHeight: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Madde Girinti (px)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.itemIndent ?? 0}
                      onChange={(e) => updateSettings({ layout: { itemIndent: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4">İmza Alanı Ayarları</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">İmza Boyutu (px)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.signatureFontSize || 12}
                      onChange={(e) => updateSettings({ layout: { signatureFontSize: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">İmza Boşluğu (px)</label>
                    <input
                      type="number"
                      className="w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={localSettings.layout?.signatureSpacing || 1}
                      onChange={(e) => updateSettings({ layout: { signatureSpacing: Number(e.target.value) } })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
              <h4 className="text-xs font-bold text-blue-900 uppercase mb-3">Bilgi Paneli</h4>
              <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                Burada yapılan ayarlar tüm belgeler için geçerli olan varsayılan değerlerdir. 
                Değişikliklerin kaydedilmesi için "Ayarları Buluta Kaydet" butonuna basmanız gerekmektedir.
                Kaydedilmeyen değişiklikler tarayıcıda taslak olarak tutulur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
