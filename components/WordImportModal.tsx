import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  X, 
  ArrowDownToLine, 
  ArrowUpToLine, 
  ListPlus, 
  Table as TableIcon, 
  ListTree, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { FormItem } from '@/lib/db';

interface WordImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parsedItems: FormItem[];
  existingItems: FormItem[];
  onConfirm: (options: {
    startFrom: number;
    placement: 'start' | 'end' | 'after';
    afterItemId?: string;
  }) => void;
  fileName?: string;
}

function getPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function WordImportModal({
  isOpen,
  onClose,
  parsedItems,
  existingItems,
  onConfirm,
  fileName
}: WordImportModalProps) {
  const totalParsed = parsedItems.length;
  const [startFrom, setStartFrom] = useState<number>(1);
  const [placement, setPlacement] = useState<'start' | 'end' | 'after'>('end');
  const [afterItemId, setAfterItemId] = useState<string>(
    existingItems[0]?.id || ''
  );

  // Modal her açıldığında varsayılanları sıfırla
  useEffect(() => {
    if (isOpen) {
      setStartFrom(1);
      setPlacement('end');
      if (existingItems.length > 0) {
        setAfterItemId(existingItems[existingItems.length - 1].id);
      }
    }
  }, [isOpen, existingItems]);

  // Kaç adet madde aktarılacak
  const itemsToImportCount = useMemo(() => {
    if (startFrom < 1 || startFrom > totalParsed) return 0;
    return totalParsed - (startFrom - 1);
  }, [startFrom, totalParsed]);

  // Önizleme listesi (başlangıç noktasından itibaren ilk 4 madde)
  const previewItems = useMemo(() => {
    if (startFrom < 1 || startFrom > totalParsed) return [];
    const startIndex = startFrom - 1;
    return parsedItems.slice(startIndex, startIndex + 4).map((item, idx) => ({
      item,
      docIndex: startIndex + idx + 1
    }));
  }, [parsedItems, startFrom, totalParsed]);

  if (!isOpen) return null;

  const handleStartFromChange = (val: number) => {
    if (isNaN(val)) return;
    const clamped = Math.max(1, Math.min(totalParsed, val));
    setStartFrom(clamped);
  };

  const handleConfirm = () => {
    if (itemsToImportCount <= 0) return;
    onConfirm({
      startFrom,
      placement,
      afterItemId: placement === 'after' ? afterItemId : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-import-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-blue-50/70 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="word-import-title" className="text-base font-bold text-slate-800 flex items-center gap-2">
                Word Belgesinden İçe Aktar
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {totalParsed} Madde Bulundu
                </span>
              </h2>
              <p className="text-xs text-slate-500 line-clamp-1">
                {fileName ? `Dosya: ${fileName}` : 'Gündem maddeleri ayıklandı'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 p-2 rounded-xl transition-colors"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
          {/* Bölüm 1: Başlangıç Sırası */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Kaçıncı Sıradan İtibaren Aktarılsın?
              </label>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                {itemsToImportCount} madde eklenecek
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleStartFromChange(startFrom - 1)}
                  disabled={startFrom <= 1}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-sm font-bold border-r border-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  max={totalParsed}
                  value={startFrom}
                  onChange={(e) => handleStartFromChange(parseInt(e.target.value, 10))}
                  className="w-16 text-center text-sm font-bold text-slate-800 py-2 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleStartFromChange(startFrom + 1)}
                  disabled={startFrom >= totalParsed}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-sm font-bold border-l border-slate-200"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                / Toplam {totalParsed} madde
              </span>

              {/* Hızlı butonlar */}
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => setStartFrom(1)}
                  className={`text-xs px-2.5 py-1.5 rounded-md font-semibold transition-colors ${
                    startFrom === 1
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Tümünü Al (1&apos;den)
                </button>
                {totalParsed > 5 && (
                  <button
                    type="button"
                    onClick={() => setStartFrom(totalParsed - 4)}
                    className="text-xs px-2.5 py-1.5 rounded-md font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    Son 5 Madde
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bölüm 2: Aktarım Yeri (Konum) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Aktarım Yeri (Nereye Eklensin?)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Sona Ekle */}
              <button
                type="button"
                onClick={() => setPlacement('end')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative ${
                  placement === 'end'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {placement === 'end' && (
                  <span className="absolute top-2 right-2 text-blue-600">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className={`w-4 h-4 ${placement === 'end' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800">Sona Ekle</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Mevcut maddelerin sonuna ilave edilir (Varsayılan).
                </span>
              </button>

              {/* Başa Ekle */}
              <button
                type="button"
                onClick={() => setPlacement('start')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative ${
                  placement === 'start'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {placement === 'start' && (
                  <span className="absolute top-2 right-2 text-blue-600">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <ArrowUpToLine className={`w-4 h-4 ${placement === 'start' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800">Başa Ekle</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  Formun en başına, 1. madde olarak eklenir.
                </span>
              </button>

              {/* Belirli Maddeden Sonra */}
              <button
                type="button"
                disabled={existingItems.length === 0}
                onClick={() => setPlacement('after')}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 relative ${
                  existingItems.length === 0
                    ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50'
                    : placement === 'after'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {placement === 'after' && (
                  <span className="absolute top-2 right-2 text-blue-600">
                    <Check className="w-4 h-4" />
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <ListPlus className={`w-4 h-4 ${placement === 'after' ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-800">Araya Ekle</span>
                </div>
                <span className="text-[11px] text-slate-500 leading-tight">
                  {existingItems.length === 0 
                    ? 'Formda henüz madde yok' 
                    : 'Seçilen bir maddenin hemen ardına ekler'}
                </span>
              </button>
            </div>

            {/* Araya ekleme seçildiyse: Madde Seçim Dropdown'ı */}
            {placement === 'after' && existingItems.length > 0 && (
              <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                  Hangi Maddeden Sonra Eklensin?
                </label>
                <select
                  value={afterItemId}
                  onChange={(e) => setAfterItemId(e.target.value)}
                  className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden shadow-xs"
                >
                  {existingItems.map((item, idx) => {
                    const snippet = getPlainText(item.text) || '(Metin yok)';
                    return (
                      <option key={item.id} value={item.id}>
                        {idx + 1}. Madde: {snippet.length > 70 ? snippet.slice(0, 70) + '...' : snippet}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          {/* Bölüm 3: Hafif Liste Önizlemesi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                Maddeler Önizleme ({startFrom}. Maddeden İtibaren)
              </label>
              <span className="text-[11px] text-slate-500">
                İlk {previewItems.length} madde gösteriliyor
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white max-h-56 overflow-y-auto">
              {previewItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Önizlenecek madde bulunamadı.
                </div>
              ) : (
                previewItems.map(({ item, docIndex }) => {
                  const plainText = getPlainText(item.text);
                  return (
                    <div key={item.id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-start gap-2.5">
                      <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        #{docIndex}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed">
                          {plainText || <span className="italic text-slate-400">Boş madde veya yalnızca tablo</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          {item.hasTable && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <TableIcon className="w-3 h-3" />
                              Tablo ({item.table?.rows?.length || 0} satır)
                            </span>
                          )}
                          {item.subItems && item.subItems.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              <ListTree className="w-3 h-3" />
                              {item.subItems.length} alt madde
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {itemsToImportCount > previewItems.length && (
              <p className="text-[11px] text-slate-500 italic text-right px-1">
                ... ve {itemsToImportCount - previewItems.length} madde daha aktarılacak.
              </p>
            )}
          </div>

          {/* Bilgi Kutusu: Veri Güvenliği */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
            <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span className="leading-relaxed">
              Mevcut formunuzdaki <strong>{existingItems.length} adet</strong> gündem maddesi aynen korunacaktır. Yeni maddeler seçtiğiniz konuma güvenle ilave edilecektir.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Vazgeç
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={itemsToImportCount <= 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:active:scale-100 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {itemsToImportCount} Maddeyi İçe Aktar
          </button>
        </div>
      </div>
    </div>
  );
}

