import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  X, 
  Check, 
  Scale, 
  ArrowDownUp, 
  AlertCircle, 
  Sparkles,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export function parseTurkishCurrency(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  let s = String(val).trim();
  if (!s || s === '-' || /^(yok|gelir yok|belirtilmemiş|yoktur|bilinmiyor)$/i.test(s)) return null;

  // Clean currency symbols and suffixes like .-TL or TL
  s = s.replace(/[\s₺]|TL|tl|TRY/gi, '').replace(/\.-$/, '');

  if (s.includes('.') && s.includes(',')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // 9.358,50 -> 9358.50
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 9,358.50 -> 9358.50
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    // 9358,50 -> 9358.50
    s = s.replace(',', '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // 9.358 -> 9358
      s = s.replace('.', '');
    } else if (parts.length > 2) {
      s = s.replace(/\./g, '');
    }
  }

  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

export const normalizeTr = (s: string) => (s || '').toLocaleLowerCase('tr').replace(/[\u0300-\u036f]/g, '').trim();

export const isSiraColumn = (name: string) => {
  const n = normalizeTr(name);
  return n === 'sıra' || n === 'sıra no' || n === 'sira' || n === 'sira no' || n === 'no' || n === 's.no';
};

export const isOverLimitRow = (row: string[]) => {
  return row.some(cell => typeof cell === 'string' && cell.toUpperCase().includes('MUHTAÇLIK SINIRI ÜZERİNDE'));
};

export const findIncomeColumnIndex = (columns: string[], rows?: string[][]): number => {
  let idx = columns.findIndex(col => {
    const c = normalizeTr(col);
    return c.includes('gelir') || c.includes('aylık') || c.includes('aylik') || c.includes('kişi başı') || c.includes('kisi basi') || c.includes('ücret');
  });
  if (idx !== -1) return idx;

  if (rows && rows.length > 0) {
    for (let c = 0; c < columns.length; c++) {
      if (rows.some(r => typeof r[c] === 'string' && r[c].toUpperCase().includes('MUHTAÇLIK SINIRI ÜZERİNDE'))) {
        return c;
      }
    }
  }

  return -1;
};

export function sortAndProcessTableByIncome(
  columns: string[],
  rows: string[][],
  muhtaclikLimit: number,
  specifiedIncomeColIdx?: number
): { columns: string[]; rows: string[][]; incomeColIdx: number } {
  const incomeColIdx = specifiedIncomeColIdx !== undefined && specifiedIncomeColIdx >= 0
    ? specifiedIncomeColIdx
    : findIncomeColumnIndex(columns, rows);

  if (incomeColIdx < 0) {
    return { columns, rows, incomeColIdx: -1 };
  }

  const decisionColIdx = columns.findIndex(col => {
    const c = normalizeTr(col);
    return c === 'karar' || c.includes('karar') || c.includes('heyet kararı');
  });

  const acceptedList: { row: string[]; incomeVal: number }[] = [];
  const rejectedList: string[][] = [];

  rows.forEach(row => {
    const cloned = [...row];
    while (cloned.length < columns.length) {
      cloned.push('');
    }

    const cellVal = cloned[incomeColIdx];
    const parsedVal = parseTurkishCurrency(cellVal);

    if (
      (typeof cellVal === 'string' && cellVal.toUpperCase().includes('MUHTAÇLIK SINIRI ÜZERİNDE')) ||
      (parsedVal !== null && parsedVal > muhtaclikLimit)
    ) {
      cloned[incomeColIdx] = 'MUHTAÇLIK SINIRI ÜZERİNDE';
      if (decisionColIdx >= 0) {
        cloned[decisionColIdx] = ''; // Heyet için boş bırakılır
      }
      rejectedList.push(cloned);
    } else {
      if (decisionColIdx >= 0 && cloned[decisionColIdx] === undefined) {
        cloned[decisionColIdx] = '';
      }
      acceptedList.push({
        row: cloned,
        incomeVal: parsedVal ?? 0
      });
    }
  });

  // Artan sırada (küçükten büyüğe) sırala
  acceptedList.sort((a, b) => a.incomeVal - b.incomeVal);

  const finalRows = [...acceptedList.map(item => item.row), ...rejectedList];

  // SIRA NO sütununu 1..N olarak yeniden numaralandır
  const siraIdx = columns.findIndex(col => isSiraColumn(col));
  if (siraIdx >= 0) {
    finalRows.forEach((r, idx) => {
      r[siraIdx] = (idx + 1).toString();
    });
  }

  return { columns, rows: finalRows, incomeColIdx };
}

interface ExcelTableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  rawColumns: string[];
  rawRows: string[][];
  defaultMuhtaclikSiniri: number;
  onConfirm: (table: { columns: string[]; rows: string[][] }) => void;
}

export function ExcelTableImportModal({
  isOpen,
  onClose,
  fileName,
  rawColumns,
  rawRows,
  defaultMuhtaclikSiniri,
  onConfirm,
}: ExcelTableImportModalProps) {
  // Kontrol aktif mi?
  const [enableLimitCheck, setEnableLimitCheck] = useState<boolean>(true);
  
  // Güncel Muhtaçlık Sınırı (Kullanıcı o an değiştirebilir)
  const [muhtaclikSiniri, setMuhtaclikSiniri] = useState<number>(defaultMuhtaclikSiniri || 9358.50);

  // Gelir sütunu seçimi (otomatik tahmin)
  const [incomeColIndex, setIncomeColIndex] = useState<number>(-1);

  // Karar sütunu ekleme/temizleme
  const [manageDecisionCol, setManageDecisionCol] = useState<boolean>(true);

  // Otomatik tespit
  useEffect(() => {
    if (isOpen && rawColumns.length > 0) {
      setMuhtaclikSiniri(defaultMuhtaclikSiniri || 9358.50);
      setEnableLimitCheck(true);
      setManageDecisionCol(true);

      // Gelir sütununu tespit et
      let foundIdx = findIncomeColumnIndex(rawColumns, rawRows);

      if (foundIdx === -1) {
        // İkinci kontrol: satırlardaki değerlere bakarak parasal veri içeren sütunu bul
        const colScores = rawColumns.map((_, cIdx) => {
          let parseSuccess = 0;
          for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
            const val = rawRows[r]?.[cIdx];
            if (val && parseTurkishCurrency(val) !== null) parseSuccess++;
          }
          return parseSuccess;
        });
        const maxScore = Math.max(...colScores);
        if (maxScore > 0) {
          foundIdx = colScores.indexOf(maxScore);
        }
      }

      setIncomeColIndex(foundIdx >= 0 ? foundIdx : (rawColumns.length > 3 ? 3 : 0));
    }
  }, [isOpen, rawColumns, rawRows, defaultMuhtaclikSiniri]);

  // Karar sütunu var mı?
  const existingDecisionColIdx = useMemo(() => {
    return rawColumns.findIndex(col => {
      const c = normalizeTr(col);
      return c === 'karar' || c.includes('karar') || c.includes('heyet kararı');
    });
  }, [rawColumns]);

  // Tabloyu işle ve analiz et
  const processedData = useMemo(() => {
    if (!rawColumns.length || !rawRows.length) {
      return { columns: [], rows: [], acceptedCount: 0, rejectedCount: 0, previewRows: [] };
    }

    let finalColumns = [...rawColumns];
    let decisionColIdx = existingDecisionColIdx;

    if (manageDecisionCol) {
      if (decisionColIdx === -1) {
        finalColumns.push('KARAR');
        decisionColIdx = finalColumns.length - 1;
      }
    }

    const acceptedList: { row: string[]; incomeVal: number }[] = [];
    const rejectedList: string[][] = [];

    rawRows.forEach((row) => {
      const clonedRow = [...row];
      // Eğer sütun sayısı eksikse pad et
      while (clonedRow.length < finalColumns.length) {
        clonedRow.push('');
      }

      if (enableLimitCheck && incomeColIndex >= 0 && incomeColIndex < clonedRow.length) {
        const rawIncome = clonedRow[incomeColIndex];
        const parsedIncome = parseTurkishCurrency(rawIncome);

        if (parsedIncome !== null && parsedIncome > muhtaclikSiniri) {
          // Sınırı aşan kayıt
          clonedRow[incomeColIndex] = 'MUHTAÇLIK SINIRI ÜZERİNDE';
          if (decisionColIdx >= 0 && manageDecisionCol) {
            clonedRow[decisionColIdx] = ''; // Heyet için boş bırakılır
          }
          rejectedList.push(clonedRow);
          return;
        } else {
          if (decisionColIdx >= 0 && manageDecisionCol) {
            clonedRow[decisionColIdx] = ''; // Heyet için boş bırakılır
          }
          acceptedList.push({
            row: clonedRow,
            incomeVal: parsedIncome ?? 0
          });
          return;
        }
      }

      // Sınır altı veya kontrol kapalı
      if (decisionColIdx >= 0 && manageDecisionCol) {
        clonedRow[decisionColIdx] = ''; // Heyet için boş bırakılır
      }
      acceptedList.push({
        row: clonedRow,
        incomeVal: 0
      });
    });

    // Artan sırada (küçükten büyüğe) sırala
    if (enableLimitCheck) {
      acceptedList.sort((a, b) => a.incomeVal - b.incomeVal);
    }

    // Kabul edilenler üstte, reddedilenler (sınır üstü) altta
    const allRows = enableLimitCheck 
      ? [...acceptedList.map(item => item.row), ...rejectedList] 
      : acceptedList.map(item => item.row);

    // SIRA NO sütununu 1..N olarak yeniden numaralandır
    const siraIdx = finalColumns.findIndex(col => isSiraColumn(col));
    if (siraIdx >= 0) {
      allRows.forEach((r, idx) => {
        r[siraIdx] = (idx + 1).toString();
      });
    }

    return {
      columns: finalColumns,
      rows: allRows,
      acceptedCount: acceptedList.length,
      rejectedCount: rejectedList.length,
      previewRows: allRows.slice(0, 8)
    };
  }, [rawColumns, rawRows, enableLimitCheck, muhtaclikSiniri, incomeColIndex, manageDecisionCol, existingDecisionColIdx]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      columns: processedData.columns,
      rows: processedData.rows
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-linear-to-r from-emerald-50/50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                Excel Tablosu İçe Aktar
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Muhtaçlık Kontrollü
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium truncate max-w-md">
                {fileName || 'excel-tablosu.xlsx'} • Toplam {rawRows.length} satır
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Muhtaçlık Sınırı Kontrol Paneli */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">
                    Muhtaçlık Sınırı Kontrolü
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Kişi başı aylık gelire göre artan sıralama ve kabul/red ayrımı
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={enableLimitCheck} 
                  onChange={(e) => setEnableLimitCheck(e.target.checked)} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {enableLimitCheck && (
              <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Güncel Muhtaçlık Sınırı Girişi */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5 flex items-center gap-1.5">
                    Güncel Muhtaçlık Sınırı (TL)
                    <span className="text-[10px] text-emerald-600 font-semibold lowercase">
                      ({muhtaclikSiniri.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full text-sm font-bold text-slate-800 border border-slate-300 rounded-xl p-2.5 pr-12 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      value={muhtaclikSiniri}
                      onChange={(e) => setMuhtaclikSiniri(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                      TL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Varsayılan ayarlar sayfasından çekilir; tek seferlik değiştirebilirsiniz.
                  </p>
                </div>

                {/* Gelir Sütunu Seçimi */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1.5 flex items-center gap-1.5">
                    Kişi Başı Gelir Sütunu
                    <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  </label>
                  <select
                    className="w-full text-xs font-bold text-slate-800 border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={incomeColIndex}
                    onChange={(e) => setIncomeColIndex(Number(e.target.value))}
                  >
                    {rawColumns.map((col, idx) => (
                      <option key={idx} value={idx}>
                        Sütun {idx + 1}: {col || '(Başlıksız)'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Gelire göre artan sıralama ve kontrol bu sütuna göre yapılacaktır.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Heyet Karar Sütunu Ayarı */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-tight block">
                  Heyet Karar Sütunu
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {existingDecisionColIdx >= 0 
                    ? 'Excel\'deki "KARAR" sütunu hücreleri heyet için boş bırakılacaktır.'
                    : 'Tablonun sonuna heyetin karar vermesi için boş "KARAR" sütunu eklenecektir.'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={manageDecisionCol} 
                onChange={(e) => setManageDecisionCol(e.target.checked)} 
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* İstatistik Rozetleri */}
          {enableLimitCheck && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-950 uppercase">
                    Uygun Olanlar: {processedData.acceptedCount} Kişi
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">
                    Artan gelir sırasıyla listenin üstünde yer alacak
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-300 rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center shrink-0">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 uppercase">
                    Sınırı Aşanlar: {processedData.rejectedCount} Kişi
                  </div>
                  <div className="text-[10px] text-slate-600 font-medium">
                    En alta taşınacak • Gelir hücresi "MUHTAÇLIK SINIRI ÜZERİNDE"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tablo Canlı Önizleme */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
              <span className="flex items-center gap-1.5">
                <ArrowDownUp className="w-3.5 h-3.5" />
                Tablo Önizlemesi ({processedData.rows.length} Satır)
              </span>
              <span className="text-[10px] text-slate-400 font-normal lowercase">
                (Gelire göre artan sıralı; koyu ve kalın satırlar muhtaçlık sınırını aşanlardır)
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-x-auto overflow-y-auto bg-white shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    {processedData.columns.map((col, cIdx) => (
                      <th key={cIdx} className="p-2 font-bold text-slate-700 uppercase whitespace-nowrap text-[11px] border-r border-slate-200 last:border-r-0">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {processedData.previewRows.map((row, rIdx) => {
                    const isOver = isOverLimitRow(row);
                    return (
                      <tr 
                        key={rIdx} 
                        className={`transition-colors ${
                          isOver 
                            ? 'bg-slate-100 font-bold text-slate-900' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {row.map((cell, cIdx) => (
                          <td 
                            key={cIdx} 
                            className={`p-2 whitespace-nowrap text-[11px] border-r border-slate-200/60 last:border-r-0 ${
                              isOver ? 'font-bold' : ''
                            } ${
                              cIdx === incomeColIndex && isOver ? 'text-red-700 font-black' : ''
                            }`}
                          >
                            {cell || <span className="text-slate-300 italic">-</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {processedData.rows.length > 8 && (
              <p className="text-[10px] text-slate-400 text-center italic">
                ...ve {processedData.rows.length - 8} satır daha aktarılacaktır.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-500 font-medium">
            Toplam <strong className="text-slate-800">{processedData.rows.length}</strong> satır aktarılacak
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors uppercase tracking-wider"
            >
              Vazgeç
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-wider"
            >
              <Check className="w-4 h-4" />
              Tabloya Aktar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
