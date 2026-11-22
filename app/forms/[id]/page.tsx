'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db, useLiveQuery, OfficialForm, FormItem, Member, MemberSnapshot } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import { useParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { WordImportModal } from '@/components/WordImportModal';
import { 
  ExcelTableImportModal, 
  isOverLimitRow, 
  isStringIncomeRow, 
  findIncomeColumnIndex, 
  sortAndProcessTableByIncome, 
  sortTableRowsByColumn,
  isTableMuhtaclikActive,
  isSiraColumn
} from '@/components/ExcelTableImportModal';
import { 
  Save, Printer, ArrowLeft, Plus, Trash2, 
  Table as TableIcon, ListOrdered, Minus, Lock, Unlock,
  CheckCircle, ArrowUp, ArrowDown, ChevronUp, ChevronDown,
  FileText, Users, Eye, Edit3, Loader2, FileUp, FileDown,
  ArrowUpDown, GripVertical, X, Scale, Sparkles,
  Bold, Italic, Underline as UnderlineIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, Undo, Redo, Eraser, Settings2, Calendar, Clock, Hash, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { RichTextEditor, Editor } from '@/components/RichTextEditor';
import { DebouncedInput } from '@/components/DebouncedInput';
import { usePersonnel } from '@/components/PersonnelProvider';

function PrintPreview({ form, members, settings }: { form: OfficialForm, members: Member[], settings: any }) {
  const activeLayout = { ...(form.layout || {}), ...(settings?.layout || {}) };
  const selectedMembers = members.filter(m => form.signatureMembers.includes(m.id));
  
  const tablePaddings = {
    tight: 'p-0.5 px-1',
    normal: 'p-1.5',
    relaxed: 'p-3'
  };
  const spacing = activeLayout?.lineSpacing || 'normal';
  const itemGap = activeLayout?.itemSpacing !== undefined ? `${activeLayout.itemSpacing}px` : (spacing === 'tight' ? '8px' : spacing === 'relaxed' ? '24px' : '16px');

  const paddingKey = (activeLayout?.tablePadding || 'normal') as keyof typeof tablePaddings;
  const tablePad = tablePaddings[paddingKey];

  const marginX = activeLayout?.marginX ?? 10;
  const marginY = activeLayout?.marginY ?? 10;
  const signatureSpacing = activeLayout?.signatureSpacing ?? 1; 

  const finalSigners = form.signatureSnapshots && form.signatureSnapshots.length > 0
    ? form.signatureSnapshots
    : selectedMembers;

  const topSigners = finalSigners.slice(0, 1); 
  const otherSigners = finalSigners.slice(1);

  const formatMemberTitle = (m: Member | MemberSnapshot) => {
    let title = m.title;
    if (m.isProxy && m.proxyTitle) title = m.proxyTitle;
    return title;
  };

  const formatMemberName = (m: Member | MemberSnapshot) => {
    if (m.isProxy && m.proxyName) {
      return `${m.proxyName}\n(${m.name} Vekili)`;
    }
    return m.name;
  };

  const renderItem = (item: FormItem, index: number) => {
    const numbering = item.type === 'numbered' ? `${index + 1}.` : '•';
    return (
      <div key={item.id} className="flex flex-col gap-2">
        <div className="flex text-left items-baseline">
          <span className="font-bold mr-2 whitespace-nowrap min-w-[20px]" style={{ lineHeight: '1.5' }}>{numbering}</span>
          <div className="flex-1 w-full overflow-hidden leading-tight">
            <div 
              className="rich-text-preview dotted-leader" 
              dangerouslySetInnerHTML={{ 
                __html: (item.text || '') 
              }} 
            />
          </div>
        </div>
        
        {item.hasTable && item.table && (
          <div className="ml-8 mt-2 w-[calc(100%-2rem)]">
            <table className="w-full border-collapse border border-black table-fixed break-words">
              <thead>
                <tr>
                  {item.table.columns.map((col, i) => {
                    const isSira = isSiraColumn(col);
                    return (
                      <th 
                        key={i} 
                        className={`border border-black bg-slate-50 font-bold text-[10px] uppercase ${tablePad} ${isSira ? 'w-[50px] text-center' : ''}`}
                      >
                        {col}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {item.table.rows.map((row, ri) => {
                  const isMuhtaclik = isTableMuhtaclikActive(item.table);
                  const targetIncomeCol = item.table?.incomeColumnIndex !== undefined && item.table.incomeColumnIndex >= 0
                    ? item.table.incomeColumnIndex
                    : -1;
                  const isOver = isMuhtaclik && targetIncomeCol >= 0 && isOverLimitRow(row);
                  const isStringRow = isMuhtaclik && targetIncomeCol >= 0 && !isOver && isStringIncomeRow(row, targetIncomeCol);
                  const isHighlight = isOver || isStringRow;
                  return (
                    <tr key={ri} className={isHighlight ? 'bg-slate-100 font-bold' : ''}>
                      {row.map((cell, ci) => {
                        const isSira = isSiraColumn(item.table!.columns[ci]);
                        return (
                          <td 
                            key={ci} 
                            className={`border border-black text-[10px] ${tablePad} ${isSira ? 'text-center font-bold' : ''} ${isHighlight ? 'font-bold bg-slate-100' : ''}`}
                          >
                            {isSira ? (ri + 1) : cell}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {item.subItems && item.subItems.length > 0 && (
          <div className="ml-8 mt-2 flex flex-col gap-2">
            {item.subItems.map((sub, si) => (
              <div key={sub.id} className="flex text-left items-baseline">
                <span className="font-bold mr-2 whitespace-nowrap min-w-[20px]" style={{ lineHeight: '1.5' }}>{sub.type === 'numbered' ? `${index + 1}.${si + 1}.` : '•'}</span>
                <div className="flex-1 w-full overflow-hidden leading-tight">
                  <div 
                    className="rich-text-preview dotted-leader" 
                    dangerouslySetInnerHTML={{ __html: sub.text }} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`w-full max-w-[210mm] mx-auto bg-white min-h-[297mm] mb-8 print:mb-0 print:shadow-none print:border-none text-black relative flex flex-col items-stretch ${spacing === 'tight' ? 'leading-tight' : spacing === 'relaxed' ? 'leading-loose' : 'leading-snug'}`}
      style={{
        paddingTop: `${marginY}mm`,
        paddingBottom: `${marginY}mm`,
        paddingLeft: `${marginX}mm`,
        paddingRight: `${marginX}mm`,
        boxShadow: 'none', 
        fontFamily: activeLayout?.fontFamily || 'Verdana, sans-serif',
      }}
    >
      {(activeLayout?.watermarkText || activeLayout?.watermarkText2) && (
        <div 
          className="watermark-overlay fixed inset-0 pointer-events-none flex justify-center items-center overflow-hidden"
          style={{ zIndex: 0, position: 'fixed' }}
        >
          <div 
            className="font-bold text-center flex flex-col"
            style={{ 
               transform: `rotate(${activeLayout?.watermarkAngle ?? -45}deg)`,
               fontSize: activeLayout?.watermarkSize ? `${activeLayout?.watermarkSize}px` : '36px',
               color: 'black',
               opacity: (activeLayout?.watermarkOpacity ?? 5) / 100,
               lineHeight: 1.2,
               width: '200%', 
               maxWidth: 'none',
               whiteSpace: 'nowrap'
            }}
          >
            {activeLayout.watermarkText && <div>{activeLayout.watermarkText}</div>}
            {activeLayout.watermarkText2 && <div>{activeLayout.watermarkText2}</div>}
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-1 h-full">
        <div className="flex justify-between items-start mb-8 text-center font-bold">
          {settings?.leftLogoBase64 ? (
            <img src={settings.leftLogoBase64} alt="Left Logo" className="h-[25mm] w-[25mm] object-contain shrink-0" style={{ opacity: (activeLayout?.logoOpacity ?? 100) / 100 }} />
          ) : <div className="h-[25mm] w-[25mm] shrink-0" />}
          
          <div className="flex-1 px-4 mt-2" style={{ 
            fontSize: activeLayout?.fontSizeTitle ? `${activeLayout?.fontSizeTitle}px` : '12px',
            lineHeight: form.layout?.headerLineSpacing || activeLayout?.headerLineSpacing || 'normal'
          }}>
            {form.headerTop.includes('<') ? (
               <div className="rich-text-preview header-rich-text" dangerouslySetInnerHTML={{ __html: form.headerTop }} />
            ) : (
               <div className="whitespace-pre-wrap">{form.headerTop}</div>
            )}
          </div>
          
          {settings?.rightLogoBase64 ? (
            <img src={settings.rightLogoBase64} alt="Right Logo" className="h-[25mm] w-[25mm] object-contain shrink-0" style={{ opacity: (activeLayout?.logoOpacity ?? 100) / 100 }} />
          ) : <div className="h-[25mm] w-[25mm] shrink-0" />}
        </div>

        <div className="flex justify-between items-start font-bold mb-8 text-[14px] border-b border-black pb-4">
          <div className="flex flex-col gap-1" style={{ fontSize: form.layout?.fontSizeHeaderInfo ? `${form.layout?.fontSizeHeaderInfo}px` : 'inherit' }}>
            <div className="flex gap-2">
              <span className="min-w-[100px]">KARAR TARİHİ</span>
              <span>: {form.decisionDate ? new Date(form.decisionDate).toLocaleDateString('tr-TR') : '.../.../20...'}</span>
            </div>
            <div className="flex gap-2">
              <span className="min-w-[100px]">KARAR NO</span>
              <span>: {form.decisionNo || '...'}</span>
            </div>
            {form.isPostponed && (
              <div className="text-red-600 text-[10px] uppercase tracking-widest mt-1">
                ** TOPLANTI ERTELENMİŞTİR **
              </div>
            )}
          </div>
        </div>

        <div 
          className="flex flex-col flex-1" 
          style={{ 
            fontSize: activeLayout?.fontSizeContent ? `${activeLayout?.fontSizeContent}px` : '11px',
            gap: itemGap,
            lineHeight: activeLayout?.itemLineHeight || 1.5,
            paddingLeft: activeLayout?.itemIndent ? `${activeLayout.itemIndent}px` : '0px'
          }}
        >
          {form.items?.map((item, index) => renderItem(item, index))}
        </div>

        <div className="break-inside-avoid mt-8">
          <div className="font-bold text-center text-[14px]" style={{ fontSize: activeLayout?.fontSizeContent ? `${activeLayout?.fontSizeContent}px` : '11px' }}>
            {form.footerText.includes('<') ? (
              <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: form.footerText }} />
            ) : (
              <div>{form.footerText}</div>
            )}
          </div>

          <div className="mt-12 w-full" style={{ 
              opacity: (form.layout?.signatureOpacity ?? 100) / 100,
              fontFamily: form.layout?.signatureFontFamily || 'inherit'
          }}>
            {topSigners.length > 0 && (
              <div className="flex justify-center w-full mb-12 text-center">
                {topSigners.map(m => (
                  <div key={m.id} className="flex flex-col items-center w-full">
                    <div className="font-bold" style={{ 
                      fontSize: activeLayout?.signatureFontSize ? `${activeLayout?.signatureFontSize}px` : '12px',
                      lineHeight: 1.1
                    }}>{formatMemberName(m)}</div>
                    <div style={{ height: `${signatureSpacing}px` }}></div>
                    <div className="font-bold whitespace-pre-wrap" style={{ 
                      fontSize: activeLayout?.signatureFontSize ? `${activeLayout?.signatureFontSize}px` : '12px',
                      lineHeight: 1.1
                    }}>{formatMemberTitle(m)}</div>
                  </div>
                ))}
              </div>
            )}

            {otherSigners.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-8 text-center w-full">
                {otherSigners.map((m) => (
                  <div key={m.id} className="flex flex-col items-center w-[22%] min-w-[120px]">
                    <div className="font-bold" style={{ 
                      fontSize: activeLayout?.signatureFontSize ? `${activeLayout?.signatureFontSize}px` : '12px',
                      lineHeight: 1.1
                    }}>{formatMemberName(m)}</div>
                    <div style={{ height: `${signatureSpacing}px` }}></div>
                    <div className="font-bold whitespace-pre-wrap" style={{ 
                      fontSize: activeLayout?.signatureFontSize ? `${activeLayout?.signatureFontSize}px` : '12px',
                      lineHeight: 1.1
                    }}>{formatMemberTitle(m)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .dotted-leader p { 
           position: relative;
           overflow: hidden;
           margin-bottom: 0px !important;
           line-height: 1.5;
        }
        .dotted-leader p::after {
           content: "";
           display: inline-block;
           width: 3000px;
           margin-right: -3000px;
           border-bottom: 1.5pt dotted black;
           margin-left: 8px;
           vertical-align: 0.08em;
        }
        .rich-text-preview p { margin-top: 0px !important; margin-bottom: 0.5rem; }
        .rich-text-preview p:last-child { margin-bottom: 0; }
        
        .header-rich-text p { margin-bottom: 0px; text-align: center; }

        @page { 
          size: A4; 
          margin: ${marginY}mm ${marginX}mm; 
          ${activeLayout?.showPageNumbers !== false ? `
          @bottom-center {
            content: "Sayfa " counter(page);
            font-family: sans-serif;
            font-size: 12px;
          }
          ` : ''}
        }
        @media print {
          body { -webkit-print-color-adjust: exact; background: transparent; }
          .shadow-2xl { box-shadow: none !important; }
          .break-inside-avoid { page-break-inside: avoid; break-inside: avoid; }
        }
        
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          margin: 0 auto;
          background: white;
          box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.08);
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid #cbd5e1;
          border-radius: 2px;
        }

        .a4-page::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(to bottom, transparent 296.5mm, #cbd5e1 296.5mm, #cbd5e1 297mm, transparent 297mm);
          background-size: 100% 297mm;
          z-index: 5;
          pointer-events: none;
        }

        @media print {
          .a4-page {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          .watermark-overlay {
            position: fixed !important;
            display: flex !important;
            height: 100% !important;
            width: 100% !important;
            top: 0;
            left: 0;
          }
        }
      `}} />
    </div>
  );
}

export default function FormEditorPage() {
  const params = useParams();
  const id = params.id as string;
  const form = useLiveQuery(() => db.forms.get(id));
  const allMembers = useLiveQuery(() => db.members.orderBy('order').toArray());
  const settings = useLiveQuery(() => db.settings.get('default'));
  
  const { personnel } = usePersonnel();
  const isAdmin = personnel?.isAdmin || false;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [localForm, setLocalForm] = useState<OfficialForm | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Word Canvas Interactive States
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [, setEditorTick] = useState(0);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [openTablePanelId, setOpenTablePanelId] = useState<string | null>(null);
  const [isSignerPickerOpen, setIsSignerPickerOpen] = useState(false);
  const [isHeaderEditOpen, setIsHeaderEditOpen] = useState(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState(false);

  // Drag & Drop State for Live Canvas Blocks + Modal
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);

  // Preview Age/Gender Auto-Sort
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [genderPriority, setGenderPriority] = useState<'female' | 'male'>('female');

  // Modals
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });
  const [wordImportState, setWordImportState] = useState<{
    isOpen: boolean;
    parsedItems: FormItem[];
    fileName: string;
  }>({
    isOpen: false,
    parsedItems: [],
    fileName: ''
  });
  const [excelImportState, setExcelImportState] = useState<{
    isOpen: boolean;
    itemId: string;
    fileName: string;
    rawColumns: string[];
    rawRows: string[][];
  }>({
    isOpen: false,
    itemId: '',
    fileName: '',
    rawColumns: [],
    rawRows: []
  });

  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync active Tiptap editor selection/transaction changes to re-render Word Ribbon active states
  useEffect(() => {
    if (!activeEditor) return;
    const handleTransaction = () => setEditorTick(t => t + 1);
    activeEditor.on('transaction', handleTransaction);
    activeEditor.on('selectionUpdate', handleTransaction);
    return () => {
      activeEditor.off('transaction', handleTransaction);
      activeEditor.off('selectionUpdate', handleTransaction);
    };
  }, [activeEditor]);

  // Auto-save flush on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      db.forms.flushQueueBeacon();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        db.forms.flushQueueBeacon();
      }
    };
    const handleSaveSuccess = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === id) {
        setIsDirty(false);
        localStorage.removeItem(`draft_form_${id}`);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('db-save-success-forms', handleSaveSuccess);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('db-save-success-forms', handleSaveSuccess);
    };
  }, [id]);

  useEffect(() => {
    if (form) {
      const draft = localStorage.getItem(`draft_form_${id}`);
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          if (draftData.updatedAt > (form.updatedAt || 0)) {
            setLocalForm(prev => {
              if (prev && prev.id === id && prev.updatedAt >= draftData.updatedAt) return prev;
              return draftData;
            });
            setIsDirty(true);
            return;
          }
        } catch (e) {}
      }
      setLocalForm(prev => {
        if (prev && prev.id === form.id && (prev.updatedAt || 0) >= (form.updatedAt || 0)) {
          return prev;
        }
        return form;
      });
    }
  }, [form, id]);

  useEffect(() => {
    if (!localForm || isSaving) return;
    
    const formattedDate = localForm.decisionDate ? new Date(localForm.decisionDate).toLocaleDateString('tr-TR') : '.../.../20...';
    const newHeader = `${formattedDate} - Karar No: ${localForm.decisionNo || '...'}`;
    
    if (newHeader && localForm.headerLine4 !== newHeader && !localForm.isLocked) {
      const updated = { ...localForm, headerLine4: newHeader, updatedAt: Date.now() };
      setLocalForm(updated);
      setIsDirty(true);
      localStorage.setItem(`draft_form_${id}`, JSON.stringify(updated));
    }
  }, [localForm?.decisionDate, localForm?.decisionNo, id]);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: localForm?.title || 'Karar Formu' });

  if (!localForm || !allMembers) {
    return (
      <AppLayout fullWidth>
        <div className="flex items-center justify-center h-96 gap-2 text-slate-500 font-bold text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
          <span>Belge yükleniyor...</span>
        </div>
      </AppLayout>
    );
  }

  const canUnlock = () => {
    if (!localForm.decisionDate) return true;
    const decisionDate = new Date(localForm.decisionDate);
    const now = new Date();
    const diffTime = now.getTime() - decisionDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= 2;
  };

  const canEditForm = !isSaving && (!localForm.isLocked || localForm.isPostponed) && (localForm.isActive !== false || isAdmin);

  const updateForm = (updates: Partial<OfficialForm>) => {
    if (!canEditForm) return;
    const updated = { ...localForm, ...updates, updatedAt: Date.now() };
    setLocalForm(updated);
    setIsDirty(true);
    localStorage.setItem(`draft_form_${id}`, JSON.stringify(updated));
    db.forms.queueSave(updated);
  };

  const saveToCloud = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      await db.forms.put(localForm);
      setIsDirty(false);
      localStorage.removeItem(`draft_form_${id}`);
      toast.success('Belge buluta kaydedildi.');
    } catch (e) {
      toast.error('Hata: Buluta kayıt yapılamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (type: 'numbered' | 'bullet' = 'numbered') => {
    const newItem: FormItem = { id: uuidv4(), type, text: '' };
    updateForm({ items: [...(localForm.items || []), newItem] });
    setActiveBlockId(newItem.id);
  };

  const addItemAt = (index: number, type: 'numbered' | 'bullet' = 'numbered') => {
    const newItem: FormItem = { id: uuidv4(), type, text: '' };
    const newItems = [...(localForm.items || [])];
    newItems.splice(index, 0, newItem);
    updateForm({ items: newItems });
    setActiveBlockId(newItem.id);
  };

  const moveItem = (itemId: string, newIndex: number, parentId: string | null = null) => {
    if (parentId) {
      const parent = localForm.items?.find(i => i.id === parentId);
      if (!parent || !parent.subItems) return;
      const subItems = [...parent.subItems];
      const oldIndex = subItems.findIndex(s => s.id === itemId);
      if (oldIndex === -1) return;
      const item = subItems.splice(oldIndex, 1)[0];
      subItems.splice(Math.max(0, Math.min(newIndex, subItems.length)), 0, item);
      updateItem(parentId, { subItems });
    } else {
      const items = [...(localForm.items || [])];
      const oldIndex = items.findIndex(i => i.id === itemId);
      if (oldIndex === -1) return;
      const item = items.splice(oldIndex, 1)[0];
      items.splice(Math.max(0, Math.min(newIndex, items.length)), 0, item);
      updateForm({ items });
    }
  };

  const updateItem = (itemId: string, updates: Partial<FormItem>) => {
    const newItems = localForm.items?.map(item => item.id === itemId ? { ...item, ...updates } : item);
    updateForm({ items: newItems });
  };

  const removeItem = (itemId: string) => {
    const newItems = localForm.items?.filter(item => item.id !== itemId);
    updateForm({ items: newItems });
  };

  const importWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await file.arrayBuffer();
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const html = htmlResult.value;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const newItems: FormItem[] = [];
      let currentItem: FormItem | null = null;

      const parseTable = (tableNode: HTMLTableElement) => {
        const rows: string[][] = [];
        Array.from(tableNode.querySelectorAll('tr')).forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
          rows.push(cells);
        });
        if (rows.length === 0) return undefined;
        return {
          columns: rows[0],
          rows: rows.slice(1)
        };
      };

      const ensureParagraph = (htmlStr: string) => {
        let trimmed = htmlStr.trim();
        trimmed = trimmed.replace(/\.+(?=(\s*<\/[^>]+>)*\s*$)/g, '');
        if (!trimmed.startsWith('<p>') && !trimmed.startsWith('<h')) {
          return `<p>${trimmed}</p>`;
        }
        return trimmed;
      };

      const processElement = (node: Element) => {
        if (node.tagName === 'OL' || node.tagName === 'UL') {
          Array.from(node.children).forEach(li => {
            if (li.tagName === 'LI') {
               const tableNode = li.querySelector('table');
               const clonedLi = li.cloneNode(true) as Element;
               const innerTable = clonedLi.querySelector('table');
               if (innerTable) innerTable.remove();
               
               let textHtml = clonedLi.innerHTML.trim();
               textHtml = ensureParagraph(textHtml);
               
               currentItem = { id: uuidv4(), type: node.tagName === 'OL' ? 'numbered' : 'bullet', text: textHtml };
               
               if (tableNode) {
                  currentItem.table = parseTable(tableNode as HTMLTableElement);
                  currentItem.hasTable = true;
               }
               newItems.push(currentItem);
            }
          });
        } else if (node.tagName === 'P') {
          const text = node.textContent?.trim() || '';
          if (/^\d+[\.\)\-]\s/.test(text)) {
             let textHtml = node.innerHTML.trim();
             textHtml = textHtml.replace(/^\d+[\.\)\-]\s*/, '');
             textHtml = ensureParagraph(textHtml);
             currentItem = { id: uuidv4(), type: 'numbered', text: textHtml };
             newItems.push(currentItem);
          } else if (/^\-/.test(text)) {
             let textHtml = node.innerHTML.trim();
             textHtml = textHtml.replace(/^\-[\s]*/, '');
             textHtml = ensureParagraph(textHtml);
             if (currentItem) {
               if (!currentItem.subItems) currentItem.subItems = [];
               currentItem.subItems.push({ id: uuidv4(), type: 'bullet', text: textHtml });
             } else {
               currentItem = { id: uuidv4(), type: 'bullet', text: textHtml };
               newItems.push(currentItem);
             }
          }
        } else if (node.tagName === 'TABLE') {
          if (currentItem) {
             currentItem.table = parseTable(node as HTMLTableElement);
             currentItem.hasTable = true;
          }
        } else {
          Array.from(node.children).forEach(processElement);
        }
      };

      Array.from(doc.body.children).forEach(processElement);

      if (newItems.length > 0) {
        setWordImportState({
          isOpen: true,
          parsedItems: newItems,
          fileName: file.name
        });
      } else {
        toast.error('Formda geçerli bir gündem maddesi (numaralı liste) bulunamadı.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Word dosyası okunurken hata oluştu.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmWordImport = ({
    startFrom,
    placement,
    afterItemId
  }: {
    startFrom: number;
    placement: 'start' | 'end' | 'after';
    afterItemId?: string;
  }) => {
    const startIndex = Math.max(0, startFrom - 1);
    const itemsToAdd = wordImportState.parsedItems.slice(startIndex);
    if (itemsToAdd.length === 0) return;

    const currentItems = localForm?.items || [];
    let finalItems: FormItem[] = [];

    if (placement === 'start') {
      finalItems = [...itemsToAdd, ...currentItems];
    } else if (placement === 'after' && afterItemId) {
      const targetIndex = currentItems.findIndex(i => i.id === afterItemId);
      if (targetIndex !== -1) {
        finalItems = [
          ...currentItems.slice(0, targetIndex + 1),
          ...itemsToAdd,
          ...currentItems.slice(targetIndex + 1)
        ];
      } else {
        finalItems = [...currentItems, ...itemsToAdd];
      }
    } else {
      finalItems = [...currentItems, ...itemsToAdd];
    }

    updateForm({ items: finalItems });
    toast.success(`Word belgesindeki ${startFrom}. maddeden itibaren ${itemsToAdd.length} gündem maddesi başarıyla eklendi.`);
    setWordImportState({ isOpen: false, parsedItems: [], fileName: '' });
  };

  const importExcelToTable = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const XLSX = await import('xlsx');
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
      
      if (json.length === 0) {
        toast.error('Excel dosyası boş.');
        return;
      }

      const nonEmptyRows = json.filter(row => Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && cell.toString().trim() !== ''));
      
      if (nonEmptyRows.length < 2) {
        toast.error('Excel dosyasında tablo verisi bulunamadı (en az başlık ve 1 satır olmalı).');
        return;
      }

      const columns = nonEmptyRows[0].map(c => c !== undefined && c !== null ? c.toString().trim() : '');
      const rows = nonEmptyRows.slice(1).map(row => {
        const paddedRow = [];
        for (let i = 0; i < columns.length; i++) {
           const cell = row[i];
           paddedRow.push(cell !== undefined && cell !== null ? cell.toString().trim() : '');
        }
        return paddedRow;
      });

      setExcelImportState({
        isOpen: true,
        itemId,
        fileName: file.name,
        rawColumns: columns,
        rawRows: rows
      });
    } catch (err) {
      console.error(err);
      toast.error('Excel dosyası okunurken hata oluştu.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmExcelImport = (table: { 
    columns: string[]; 
    rows: string[][]; 
    enableMuhtaclikCheck?: boolean;
    incomeColumnIndex?: number;
    sortColumnIndex?: number;
    sortDirection?: 'asc' | 'desc';
  }) => {
    if (!excelImportState.itemId) return;
    const currentTable = localForm?.items.find(i => i.id === excelImportState.itemId)?.table;
    const isMuhtaclik = table.enableMuhtaclikCheck ?? (currentTable ? isTableMuhtaclikActive(currentTable) : false);

    updateItem(excelImportState.itemId, { 
      table: { 
        ...currentTable,
        columns: table.columns, 
        rows: table.rows,
        enableMuhtaclikCheck: isMuhtaclik,
        incomeColumnIndex: table.incomeColumnIndex ?? currentTable?.incomeColumnIndex,
        sortColumnIndex: table.sortColumnIndex,
        sortDirection: table.sortDirection
      } 
    });
    toast.success(`Excel tablosu ${table.rows.length} satır ile başarıyla yüklendi.`);
    setExcelImportState({ isOpen: false, itemId: '', fileName: '', rawColumns: [], rawRows: [] });
  };

  const handleCellBlurOrSubmit = (
    itemId: string,
    table: NonNullable<FormItem['table']>,
    rI: number,
    cI: number,
    val: string
  ) => {
    if (!isTableMuhtaclikActive(table)) {
      return;
    }

    const targetIncomeCol = table.incomeColumnIndex !== undefined && table.incomeColumnIndex >= 0
      ? table.incomeColumnIndex
      : -1;

    if (targetIncomeCol < 0 || cI !== targetIncomeCol) {
      return;
    }

    const muhtaclikLimit = settings?.muhtaclikSiniri ?? 9358.50;
    const activeColIdx = targetIncomeCol !== -1 ? targetIncomeCol : cI;
    const latestRows = table.rows.map(r => [...r]);
    if (latestRows[rI]) {
      latestRows[rI][cI] = val;
    }
    const result = sortAndProcessTableByIncome(
      table.columns,
      latestRows,
      muhtaclikLimit,
      activeColIdx
    );
    updateItem(itemId, {
      table: {
        ...table,
        columns: result.columns,
        rows: result.rows,
        incomeColumnIndex: activeColIdx
      }
    });
  };

  const addTableToItem = (itemId: string) => {
    updateItem(itemId, { 
      hasTable: true, 
      table: { 
        columns: ['SIRA NO', 'ADI SOYADI', 'T.C', 'TALEBİ', 'KARAR'], 
        rows: [['1', '', '', '', '']],
        enableMuhtaclikCheck: false
      } 
    });
    setOpenTablePanelId(itemId);
  };

  const removeTableFromItem = (itemId: string) => {
    updateItem(itemId, { hasTable: false, table: undefined });
    if (openTablePanelId === itemId) setOpenTablePanelId(null);
  };

  const handleSortTableByColumn = (
    itemId: string,
    table: NonNullable<FormItem['table']>,
    colIdx: number,
    explicitDirection?: 'asc' | 'desc'
  ) => {
    if (colIdx < 0 || colIdx >= table.columns.length) return;
    const nextDir: 'asc' | 'desc' = explicitDirection
      ? explicitDirection
      : table.sortColumnIndex === colIdx && table.sortDirection === 'asc'
      ? 'desc'
      : 'asc';

    const keepOverAtBottom = isTableMuhtaclikActive(table);
    const sortedRows = sortTableRowsByColumn(table.columns, table.rows, colIdx, nextDir, keepOverAtBottom);

    updateItem(itemId, {
      table: {
        ...table,
        rows: sortedRows,
        sortColumnIndex: colIdx,
        sortDirection: nextDir,
      }
    });

    const colName = table.columns[colIdx] || `Sütun ${colIdx + 1}`;
    toast.success(`Tablo "${colName}" sütununa göre ${nextDir === 'asc' ? 'ARTAN (A→Z / Küçükten Büyüğe)' : 'AZALAN (Z→A / Büyükten Küçüğe)'} sıralandı.`);
  };

  const exportExcelFromTable = async (table: NonNullable<FormItem['table']>, itemIndex: number) => {
    try {
      const XLSX = await import('xlsx');
      const wsData = [
        table.columns,
        ...table.rows
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tablo");
      XLSX.writeFile(wb, `madde-${itemIndex + 1}-tablo.xlsx`);
      toast.success('Tablo Excel olarak indirildi.');
    } catch (err) {
      console.error(err);
      toast.error('Excel dosyası oluşturulurken hata oluştu.');
    }
  };

  // Document visual settings for the live Word canvas
  const activeLayout = { ...(localForm.layout || {}), ...(settings?.layout || {}) };
  const docFontFamily = activeLayout?.fontFamily || 'Verdana, sans-serif';
  const docFontSizeContent = activeLayout?.fontSizeContent ? `${activeLayout.fontSizeContent}px` : '11px';
  const docFontSizeTitle = activeLayout?.fontSizeTitle ? `${activeLayout.fontSizeTitle}px` : '12px';
  const selectedMembers = allMembers.filter(m => localForm.signatureMembers.includes(m.id));
  const finalSigners = localForm.signatureSnapshots && localForm.signatureSnapshots.length > 0
    ? localForm.signatureSnapshots
    : selectedMembers;
  const topSigners = finalSigners.slice(0, 1);
  const otherSigners = finalSigners.slice(1);

  const formatMemberTitle = (m: Member | MemberSnapshot) => {
    let title = m.title;
    if (m.isProxy && m.proxyTitle) title = m.proxyTitle;
    return title;
  };

  const formatMemberName = (m: Member | MemberSnapshot) => {
    if (m.isProxy && m.proxyName) {
      return `${m.proxyName}\n(${m.name} Vekili)`;
    }
    return m.name;
  };

  const ribbonBtn = "p-1.5 rounded text-slate-700 hover:bg-slate-200/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors";
  const ribbonBtnActive = "p-1.5 rounded bg-blue-100 text-blue-800 font-bold shadow-2xs transition-colors";

  return (
    <AppLayout fullWidth>
      <div className="flex flex-col h-[calc(100vh-1rem)] sm:h-[calc(100vh-1.5rem)]">
        {/* ==================== WORD RIBBON COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white border border-slate-300 shadow-sm rounded-xl mb-3 shrink-0 overflow-visible">
          {/* Top Bar: Document Title, Status, Mode Switch, Primary Actions */}
          <div className="px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white rounded-t-xl">
            {/* Left: Back + Doc Title + Save Badge */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link 
                href="/" 
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0" 
                title="Karar Listesine Dön"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-2 min-w-0 flex-1 max-w-md">
                <FileText className="w-4 h-4 text-blue-400 shrink-0 hidden sm:block" />
                <DebouncedInput 
                  type="text" 
                  value={localForm.title} 
                  disabled={!canEditForm}
                  onChange={(val) => updateForm({ title: val })}
                  className={`text-xs sm:text-sm font-bold bg-slate-800/90 border border-slate-700 hover:border-slate-600 focus:border-blue-400 focus:bg-slate-800 rounded-lg px-2.5 py-1 text-white placeholder-slate-400 uppercase outline-none truncate w-full transition-all ${!canEditForm ? 'cursor-not-allowed opacity-70' : ''}`}
                  placeholder="BELGE BAŞLIĞI..."
                />
              </div>

              {/* Save Status Pill */}
              <div className="shrink-0">
                {isSaving ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden md:inline">Kaydediliyor</span>
                  </span>
                ) : isDirty ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="hidden md:inline">Taslak (Kaydedilmedi)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                    <CheckCircle className="w-3 h-3" />
                    <span className="hidden md:inline">Kaydedildi</span>
                  </span>
                )}
              </div>
            </div>

            {/* Center: Mode Switcher (Word Sayfası / Baskı Önizleme) */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 rounded-md ${
                  activeTab === 'editor' 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Word Düzeni</span>
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold uppercase transition-all flex items-center gap-1.5 rounded-md ${
                    activeTab === 'preview' 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Baskı / Sırala</span>
                </button>
              )}
            </div>

            {/* Right: Save, Lock & Print */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={saveToCloud}
                disabled={isSaving || !isDirty || !canEditForm}
                className={`px-2.5 sm:px-3 py-1 text-[11px] font-bold uppercase rounded-lg flex items-center gap-1.5 transition-all ${
                  isDirty && !isSaving && canEditForm
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
                title="Buluta Kaydet"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Kaydet</span>
              </button>

              {isAdmin && !localForm.isLocked && (
                <button 
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      message: 'Kararı kesinleştirmek istiyor musunuz? Bu işlemden sonra sadece toplantı ertelenirse değişiklik yapılabilir.',
                      onConfirm: async () => {
                        const snapshots = allMembers
                          .filter(m => localForm.signatureMembers.includes(m.id))
                          .map(m => ({
                            id: m.id,
                            name: m.name,
                            title: m.title,
                            isProxy: m.isProxy,
                            proxyName: m.proxyName,
                            proxyTitle: m.proxyTitle,
                            order: m.order
                          }));
                        await updateForm({ isLocked: true, signatureSnapshots: snapshots });
                        toast.success('Belge kesinleştirildi.');
                      }
                    });
                  }}
                  disabled={isSaving}
                  className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase transition-all"
                  title="Kararı Kesinleştir ve İmzaları Sabitle"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Kesinleştir</span>
                </button>
              )}

              {isAdmin && localForm.isLocked && !localForm.isPostponed && (
                <button 
                  type="button"
                  onClick={() => {
                    if (!canUnlock()) {
                      toast.error('Toplantı tarihinden itibaren 2 gün geçtiği için bu formun kilidi açılamaz.');
                      return;
                    }
                    updateForm({ isLocked: false });
                  }}
                  disabled={isSaving || !canUnlock()}
                  title={!canUnlock() ? 'Toplantı tarihinden 2 gün geçtiği için kilit açılamaz' : 'Kilidi Aç'}
                  className={`flex items-center gap-1 ${!canUnlock() ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-500 text-white'} px-2.5 py-1 rounded-lg font-bold text-[11px] uppercase transition-all`}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Kilidi Aç</span>
                </button>
              )}

              {isAdmin && (
                <button 
                  type="button"
                  onClick={() => handlePrint()}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2.5 sm:px-3 py-1 rounded-lg font-bold text-[11px] uppercase transition-all shadow-xs"
                  title="A4 Yazdır / PDF Kaydet"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Yazdır</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Bar: Word Formatting Ribbon & Block Tools (Visible in Word Editor Mode) */}
          {activeTab === 'editor' && (
            <div className="px-2.5 py-1.5 bg-slate-50 flex flex-wrap items-center justify-between gap-2 rounded-b-xl text-xs">
              {/* Formatting Controls bound to activeEditor */}
              <div className="flex items-center gap-0.5 flex-wrap">
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().toggleBold().run()}
                  className={activeEditor?.isActive('bold') ? ribbonBtnActive : ribbonBtn}
                  title="Kalın (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().toggleItalic().run()}
                  className={activeEditor?.isActive('italic') ? ribbonBtnActive : ribbonBtn}
                  title="İtalik (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().toggleUnderline().run()}
                  className={activeEditor?.isActive('underline') ? ribbonBtnActive : ribbonBtn}
                  title="Altı Çizili (Ctrl+U)"
                >
                  <UnderlineIcon className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1" />

                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().setTextAlign('left').run()}
                  className={activeEditor?.isActive({ textAlign: 'left' }) ? ribbonBtnActive : ribbonBtn}
                  title="Sola Hizala"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().setTextAlign('center').run()}
                  className={activeEditor?.isActive({ textAlign: 'center' }) ? ribbonBtnActive : ribbonBtn}
                  title="Ortala"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().setTextAlign('right').run()}
                  className={activeEditor?.isActive({ textAlign: 'right' }) ? ribbonBtnActive : ribbonBtn}
                  title="Sağa Hizala"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().setTextAlign('justify').run()}
                  className={activeEditor?.isActive({ textAlign: 'justify' }) ? ribbonBtnActive : ribbonBtn}
                  title="İki Yana Yasla"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-4 bg-slate-300 mx-1 hidden sm:block" />

                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().toggleBulletList().run()}
                  className={`${activeEditor?.isActive('bulletList') ? ribbonBtnActive : ribbonBtn} hidden sm:inline-flex`}
                  title="Madde İşaretli Liste"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().undo().run()}
                  className={`${ribbonBtn} hidden sm:inline-flex`}
                  title="Geri Al"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().redo().run()}
                  className={`${ribbonBtn} hidden sm:inline-flex`}
                  title="İleri Al"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={!activeEditor || !canEditForm}
                  onClick={() => activeEditor?.chain().focus().unsetAllMarks().clearNodes().run()}
                  className={`${ribbonBtn} hidden sm:inline-flex`}
                  title="Biçimlendirmeyi Temizle"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>

                {isAdmin && (
                  <>
                    <div className="w-px h-4 bg-slate-300 mx-1" />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsPageSetupOpen(!isPageSetupOpen)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                          isPageSetupOpen
                            ? 'bg-blue-50 border-blue-300 text-blue-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Sayfa ve Yazı Boyutu Ayarları"
                      >
                        <Settings2 className="w-3.5 h-3.5 text-blue-700" />
                        <span className="hidden md:inline">Sayfa Düzeni</span>
                      </button>

                      {isPageSetupOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span className="text-[11px] font-bold text-slate-800 uppercase">Belge Görünüm Ayarları</span>
                            <button type="button" onClick={() => setIsPageSetupOpen(false)} className="text-slate-400 hover:text-slate-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                            <div>
                              <label className="font-bold text-slate-500 block mb-1">Antet Satır Aralığı</label>
                              <select
                                value={localForm.layout?.headerLineSpacing || 'normal'}
                                disabled={!canEditForm}
                                onChange={(e) => updateForm({ layout: { ...(localForm.layout || {}), headerLineSpacing: e.target.value } })}
                                className="w-full border border-slate-300 rounded-lg p-1.5 bg-white font-semibold text-slate-800"
                              >
                                <option value="0.8">Çok Dar (0.8)</option>
                                <option value="1">Dar (1.0)</option>
                                <option value="normal">Normal</option>
                                <option value="1.5">Geniş (1.5)</option>
                              </select>
                            </div>
                            <div>
                              <label className="font-bold text-slate-500 block mb-1">Sayfa Numarası</label>
                              <select
                                value={localForm.layout?.showPageNumbers !== false ? 'true' : 'false'}
                                disabled={!canEditForm}
                                onChange={(e) => updateForm({ layout: { ...(localForm.layout || {}), showPageNumbers: e.target.value === 'true' } })}
                                className="w-full border border-slate-300 rounded-lg p-1.5 bg-white font-semibold text-slate-800"
                              >
                                <option value="true">Göster</option>
                                <option value="false">Gizle</option>
                              </select>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            * Genel yazı tipi ve kenar boşluğu varsayılanları Genel Ayarlar sayfasından yönetilir.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Right Ribbon: Document Block Operations */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={importWord} 
                  accept=".docx" 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!canEditForm}
                  className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Word (.docx) Dosyasından Gündem Maddeleri Aktar"
                >
                  <FileUp className="w-3.5 h-3.5 text-blue-700" />
                  <span>Word&apos;den Aktar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReorderModalOpen(true)}
                  disabled={!canEditForm || !localForm.items?.length}
                  className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center gap-1 transition-all disabled:opacity-50"
                  title="Tüm Maddeleri Tek Listede Sürükle-Bırak Sırala"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
                  <span>Toplu Sırala ({localForm.items?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => addItem('numbered')}
                  disabled={!canEditForm}
                  className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 shadow-2xs transition-all disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Yeni Madde</span>
                </button>
              </div>
            </div>
          )}
        </header>

        {/* ==================== MAIN WORKSPACE AREA ==================== */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20 px-1 sm:px-4" id="main-scroll-container">
          {/* Passive Form Notice for Non-Admins */}
          {localForm.isActive === false && !isAdmin && (
            <div className="max-w-[210mm] mx-auto mb-3">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2.5 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <p className="text-xs text-amber-900 font-semibold">
                  Bu karar formu geçmiş tarihli olduğu için pasif durumdadır. Salt-okunur modda görüntülüyorsunuz.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'editor' ? (
            /* ==================== LIVE WORD A4 CANVAS ==================== */
            <div className="w-full flex flex-col items-center">
              <div
                className="w-full max-w-6xl 2xl:max-w-7xl bg-white text-black shadow-xl border border-slate-300 rounded-md min-h-[297mm] relative flex flex-col transition-all px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10"
                style={{
                  fontFamily: docFontFamily,
                }}
              >
                {/* Watermark Preview on Canvas */}
                {(activeLayout?.watermarkText || activeLayout?.watermarkText2) && (
                  <div className="inset-0 absolute pointer-events-none flex justify-center items-center overflow-hidden z-0">
                    <div
                      className="font-bold text-center flex flex-col select-none"
                      style={{
                        transform: `rotate(${activeLayout?.watermarkAngle ?? -45}deg)`,
                        fontSize: activeLayout?.watermarkSize ? `${activeLayout?.watermarkSize}px` : '36px',
                        color: 'black',
                        opacity: (activeLayout?.watermarkOpacity ?? 5) / 100,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeLayout.watermarkText && <div>{activeLayout.watermarkText}</div>}
                      {activeLayout.watermarkText2 && <div>{activeLayout.watermarkText2}</div>}
                    </div>
                  </div>
                )}

                <div className="relative z-10 flex flex-col flex-1">
                  {/* 1. DOCUMENT HEADER (LOGOS & INSTITUTION TITLE) */}
                  <div className="flex items-start justify-between gap-2 sm:gap-4 mb-6 text-center font-bold group/docheader relative">
                    {settings?.leftLogoBase64 ? (
                      <img
                        src={settings.leftLogoBase64}
                        alt="Sol Logo"
                        className="h-14 w-14 sm:h-[24mm] sm:w-[24mm] object-contain shrink-0"
                        style={{ opacity: (activeLayout?.logoOpacity ?? 100) / 100 }}
                      />
                    ) : (
                      <div className="h-14 w-14 sm:h-[24mm] sm:w-[24mm] shrink-0 hidden sm:block" />
                    )}

                    <div
                      className="flex-1 mt-1"
                      style={{
                        fontSize: docFontSizeTitle,
                        lineHeight: localForm.layout?.headerLineSpacing || activeLayout?.headerLineSpacing || 'normal'
                      }}
                    >
                      {isAdmin && canEditForm ? (
                        <div className="relative">
                          {isHeaderEditOpen ? (
                            <div className="bg-slate-50 border border-blue-300 rounded-xl p-2.5 text-left shadow-sm">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-blue-800 uppercase">Kurum Başlığı Düzenle</span>
                                <button
                                  type="button"
                                  onClick={() => setIsHeaderEditOpen(false)}
                                  className="text-[10px] font-bold bg-blue-700 text-white px-2 py-0.5 rounded"
                                >
                                  Tamam
                                </button>
                              </div>
                              <RichTextEditor
                                variant="inline"
                                value={localForm.headerTop}
                                disabled={!canEditForm}
                                onEditorFocus={setActiveEditor}
                                onChange={(val) => updateForm({ headerTop: val })}
                                placeholder="T.C. ... VALİLİĞİ / KAYMAKAMLIĞI"
                                className="text-center font-bold"
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => setIsHeaderEditOpen(true)}
                              className="cursor-pointer rounded-lg p-1.5 -m-1.5 hover:bg-blue-50/50 hover:ring-1 hover:ring-blue-300 transition-all relative group/htitle"
                              title="Kurum başlığını düzenlemek için tıklayın"
                            >
                              {localForm.headerTop.includes('<') ? (
                                <div className="rich-text-preview header-rich-text" dangerouslySetInnerHTML={{ __html: localForm.headerTop }} />
                              ) : (
                                <div className="whitespace-pre-wrap">{localForm.headerTop}</div>
                              )}
                              <span className="opacity-0 group-hover/htitle:opacity-100 absolute -top-2 right-1 bg-blue-700 text-white text-[9px] font-sans font-bold px-1.5 py-0.5 rounded shadow-xs transition-opacity">
                                Başlığı Düzenle
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        localForm.headerTop.includes('<') ? (
                          <div className="rich-text-preview header-rich-text" dangerouslySetInnerHTML={{ __html: localForm.headerTop }} />
                        ) : (
                          <div className="whitespace-pre-wrap">{localForm.headerTop}</div>
                        )
                      )}
                    </div>

                    {settings?.rightLogoBase64 ? (
                      <img
                        src={settings.rightLogoBase64}
                        alt="Sağ Logo"
                        className="h-14 w-14 sm:h-[24mm] sm:w-[24mm] object-contain shrink-0"
                        style={{ opacity: (activeLayout?.logoOpacity ?? 100) / 100 }}
                      />
                    ) : (
                      <div className="h-14 w-14 sm:h-[24mm] sm:w-[24mm] shrink-0 hidden sm:block" />
                    )}
                  </div>

                  {/* 2. DECISION DATE / NO / POSTPONED BAR (DIRECTLY ON PAPER) */}
                  <div className="border-b-2 border-black pb-3 mb-5 font-bold text-xs sm:text-[13px] flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="space-y-1.5">
                      {/* KARAR TARİHİ */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="min-w-[105px] inline-block">KARAR TARİHİ</span>
                        <span>:</span>
                        {isAdmin && canEditForm && localForm.isPostponed ? (
                          <input
                            type="date"
                            value={localForm.decisionDate || ''}
                            onChange={(e) => {
                              const newDate = e.target.value;
                              const formattedDate = newDate ? new Date(newDate).toLocaleDateString('tr-TR') : '.../.../20...';
                              const newTitle = `${formattedDate} - Karar No: ${localForm.decisionNo || '...'}`;
                              updateForm({
                                decisionDate: newDate,
                                headerLine4: newTitle,
                                title: newTitle
                              });
                            }}
                            className="font-sans text-xs font-bold bg-amber-50 border border-amber-300 rounded px-2 py-0.5 text-slate-900 focus:ring-1 focus:ring-blue-600 outline-none"
                          />
                        ) : (
                          <span>
                            {localForm.decisionDate ? new Date(localForm.decisionDate).toLocaleDateString('tr-TR') : '.../.../20...'}
                          </span>
                        )}

                        {isAdmin && canEditForm && localForm.isPostponed && (
                          <span className="inline-flex items-center gap-1 ml-2 font-sans text-[11px] text-slate-600">
                            <Clock className="w-3 h-3" />
                            <input
                              type="time"
                              value={localForm.decisionTime || ''}
                              onChange={(e) => updateForm({ decisionTime: e.target.value })}
                              className="bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 text-xs font-bold text-slate-900"
                            />
                          </span>
                        )}
                      </div>

                      {/* KARAR NO */}
                      <div className="flex items-center gap-2">
                        <span className="min-w-[105px] inline-block">KARAR NO</span>
                        <span>:</span>
                        {isAdmin && canEditForm && localForm.isPostponed ? (
                          <DebouncedInput
                            type="text"
                            value={localForm.decisionNo || ''}
                            onChange={(val) => {
                              const formattedDate = localForm.decisionDate ? new Date(localForm.decisionDate).toLocaleDateString('tr-TR') : '.../.../20...';
                              const newTitle = `${formattedDate} - Karar No: ${val || '...'}`;
                              updateForm({
                                decisionNo: val,
                                headerLine4: newTitle,
                                title: newTitle
                              });
                            }}
                            placeholder="2026 / ..."
                            className="font-sans text-xs font-bold bg-amber-50 border border-amber-300 rounded px-2 py-0.5 text-slate-900 w-36 focus:ring-1 focus:ring-blue-600 outline-none"
                          />
                        ) : (
                          <span>{localForm.decisionNo || '...'}</span>
                        )}
                      </div>

                      {localForm.isPostponed && (
                        <div className="text-red-600 text-[10px] uppercase tracking-widest pt-0.5">
                          ** TOPLANTI ERTELENMİŞTİR **
                        </div>
                      )}
                    </div>

                    {/* Admin Postpone Toggle right on the paper header */}
                    {isAdmin && canEditForm && (
                      <div className="flex items-center gap-2 self-start sm:self-end font-sans">
                        <label
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer select-none transition-all ${
                            localForm.isPostponed
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Tarih ve Karar No alanlarını değiştirebilmek için Toplantı Ertelendi seçeneğini işaretleyin"
                        >
                          <input
                            type="checkbox"
                            checked={localForm.isPostponed || false}
                            onChange={(e) => updateForm({ isPostponed: e.target.checked })}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>Toplantı Ertelendi (Tarih/No Düzenle)</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* 3. AGENDA ITEMS AS DRAGGABLE WORD DOCUMENT OBJECTS */}
                  <div
                    className="flex flex-col flex-1"
                    style={{
                      fontSize: docFontSizeContent,
                      lineHeight: activeLayout?.itemLineHeight || 1.5,
                    }}
                  >
                    {/* Top Quick Insert Line */}
                    {canEditForm && (localForm.items?.length || 0) > 0 && (
                      <div className="group/ins relative h-5 flex items-center my-0.5">
                        <div className="w-full h-px bg-transparent group-hover/ins:bg-blue-400/70 transition-colors" />
                        <button
                          type="button"
                          onClick={() => addItemAt(0, 'numbered')}
                          className="opacity-0 group-hover/ins:opacity-100 absolute left-2 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-all cursor-pointer z-10"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>En Başa Madde Ekle</span>
                        </button>
                      </div>
                    )}

                    {localForm.items?.map((item, index) => {
                      const isBlockActive = activeBlockId === item.id;
                      const isDragging = draggedIndex === index;
                      const isDragOver = dragOverIndex === index;
                      const maxLen = localForm.items?.length || 1;
                      const isTableConfigOpen = openTablePanelId === item.id;

                      return (
                        <React.Fragment key={item.id}>
                          <div
                            onClick={() => setActiveBlockId(item.id)}
                            onDragOver={(e) => {
                              if (!canEditForm) return;
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              if (dragOverIndex !== index) setDragOverIndex(index);
                            }}
                            onDragLeave={() => {
                              if (dragOverIndex === index) setDragOverIndex(null);
                            }}
                            onDrop={(e) => {
                              if (!canEditForm) return;
                              e.preventDefault();
                              if (draggedIndex !== null && draggedIndex !== index) {
                                moveItem(localForm.items[draggedIndex].id, index);
                                toast.success(`${draggedIndex + 1}. madde ${index + 1}. sıraya taşındı.`);
                              }
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            className={`group/block relative rounded-xl transition-all duration-150 p-2 sm:p-2.5 -mx-2 border ${
                              isDragging
                                ? 'opacity-35 bg-slate-100 border-dashed border-slate-400'
                                : isDragOver
                                ? 'bg-blue-50/70 border-blue-600 shadow-sm'
                                : isBlockActive
                                ? 'bg-blue-50/20 border-blue-300/90 shadow-2xs'
                                : 'border-transparent hover:border-slate-200/90 hover:bg-slate-50/70'
                            }`}
                          >
                            {/* DEDICATED BLOCK HEADER BAR (NO OVERLAP WITH INSERT LINE OR TEXT) */}
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-2">
                              {/* MAIN AGENDA ITEM LINE: DRAG HANDLE + NUMBER + INLINE WORD EDITOR */}
                              <div className="flex items-baseline text-left flex-1 min-w-0">
                                {/* Drag Handle + Number */}
                                <div
                                  draggable={canEditForm}
                                  onDragStart={(e) => {
                                    if (!canEditForm) return;
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', index.toString());
                                    setDraggedIndex(index);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedIndex(null);
                                    setDragOverIndex(null);
                                  }}
                                  className={`flex items-center mr-2 select-none shrink-0 ${
                                    canEditForm ? 'cursor-grab active:cursor-grabbing' : ''
                                  }`}
                                  title={canEditForm ? 'Maddeyi (tablo ve alt maddeleriyle birlikte) sürükleyip taşımak için tutun' : ''}
                                >
                                  {canEditForm && (
                                    <GripVertical className="w-4 h-4 text-slate-300 group-hover/block:text-slate-500 -ml-1 mr-1 shrink-0 transition-colors" />
                                  )}
                                  <span className="font-bold whitespace-nowrap min-w-[20px]">
                                    {item.type === 'numbered' ? `${index + 1}.` : '•'}
                                  </span>
                                </div>

                                {/* Inline Rich Text Content */}
                                <div className="flex-1 min-w-0">
                                  <RichTextEditor
                                    variant="inline"
                                    value={item.text}
                                    disabled={!canEditForm}
                                    onEditorFocus={(ed) => {
                                      setActiveEditor(ed);
                                      setActiveBlockId(item.id);
                                    }}
                                    onChange={(val) => updateItem(item.id, { text: val })}
                                    placeholder={`${index + 1}. gündem maddesi metnini doğrudan buraya yazın...`}
                                  />
                                </div>
                              </div>

                              {/* INLINE DOCKED ACTION BAR (RIGHT SIDE OF THE ITEM - ZERO COLLISION) */}
                              {canEditForm && (
                                <div
                                  className={`font-sans flex flex-wrap items-center gap-1 self-end xl:self-start shrink-0 bg-white border border-slate-200/90 shadow-2xs rounded-lg px-1.5 py-1 transition-opacity ${
                                    isBlockActive
                                      ? 'opacity-100'
                                      : 'opacity-100 xl:opacity-0 xl:group-hover/block:opacity-100'
                                  }`}
                                >
                                  {/* Move Up / Position Input / Move Down */}
                                  <div className="flex items-center bg-slate-100 rounded px-1 py-0.5">
                                    <button
                                      type="button"
                                      disabled={index === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveItem(item.id, index - 1);
                                      }}
                                      className="text-slate-600 hover:text-blue-700 disabled:opacity-25 p-0.5 cursor-pointer"
                                      title="Bir Üste Taşı"
                                    >
                                      <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={maxLen}
                                      defaultValue={index + 1}
                                      key={`blk-pos-${item.id}-${index}`}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          const val = parseInt((e.target as HTMLInputElement).value, 10);
                                          if (!isNaN(val) && val >= 1 && val <= maxLen && val !== index + 1) {
                                            moveItem(item.id, val - 1);
                                          }
                                        }
                                      }}
                                      onBlur={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        if (!isNaN(val) && val >= 1 && val <= maxLen && val !== index + 1) {
                                          moveItem(item.id, val - 1);
                                        } else {
                                          e.target.value = (index + 1).toString();
                                        }
                                      }}
                                      className="w-8 text-center text-[11px] font-bold bg-white border border-slate-300 rounded mx-0.5 py-0 outline-none focus:ring-1 focus:ring-blue-600"
                                      title="Sıra numarasını yazıp Enter'a basın"
                                    />
                                    <button
                                      type="button"
                                      disabled={index === maxLen - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        moveItem(item.id, index + 1);
                                      }}
                                      className="text-slate-600 hover:text-blue-700 disabled:opacity-25 p-0.5 cursor-pointer"
                                      title="Bir Alta Taşı"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Numbered vs Bullet Toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateItem(item.id, { type: item.type === 'numbered' ? 'bullet' : 'numbered' });
                                    }}
                                    className="text-[10px] font-bold text-slate-700 hover:bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 cursor-pointer"
                                    title="Madde Tipini Değiştir (Numaralı / Noktalı)"
                                  >
                                    {item.type === 'numbered' ? `${index + 1}.` : '•'}
                                  </button>

                                  {/* Sub-item Add */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newSubItems = [...(item.subItems || []), { id: uuidv4(), type: 'bullet' as const, text: '' }];
                                      updateItem(item.id, { subItems: newSubItems });
                                    }}
                                    className="text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                                    title="Alt Madde Ekle"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                    <span>Alt Madde</span>
                                  </button>

                                  {/* Table Add or Toggle Settings */}
                                  {!item.hasTable ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addTableToItem(item.id);
                                      }}
                                      className="text-[10px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-0.5 cursor-pointer"
                                      title="Bu Maddeye Tablo Ekle"
                                    >
                                      <TableIcon className="w-2.5 h-2.5" />
                                      <span>+ Tablo</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenTablePanelId(isTableConfigOpen ? null : item.id);
                                      }}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5 border cursor-pointer ${
                                        isTableConfigOpen
                                          ? 'bg-blue-700 text-white border-blue-700'
                                          : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                      }`}
                                      title="Tablo Araçlarını ve Muhtaçlık Kontrolünü Aç/Kapat"
                                    >
                                      <TableIcon className="w-2.5 h-2.5" />
                                      <span>Tablo Ayarı</span>
                                    </button>
                                  )}

                                  {/* Age & Gender Compact Inputs */}
                                  <input
                                    type="text"
                                    value={item.age || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => updateItem(item.id, { age: e.target.value })}
                                    placeholder="Yaş"
                                    className="w-10 text-[10px] font-semibold border border-slate-200 rounded px-1 py-0.5 text-center bg-slate-50 focus:bg-white outline-none"
                                    title="Yaş (Baskı sıralaması için opsiyonel)"
                                  />
                                  <select
                                    value={item.gender || ''}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const g = e.target.value as 'male' | 'female' | '';
                                      updateItem(item.id, { gender: g || undefined });
                                    }}
                                    className="text-[10px] font-semibold border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:bg-white outline-none cursor-pointer"
                                    title="Cinsiyet (Baskı sıralaması için opsiyonel)"
                                  >
                                    <option value="">Cins.</option>
                                    <option value="female">K</option>
                                    <option value="male">E</option>
                                  </select>

                                  {/* Delete Block */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeItem(item.id);
                                    }}
                                    className="text-red-600 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                                    title="Maddeyi (Tablosu ve Alt Maddeleriyle Birlikte) Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* ATTACHED TABLE OBJECT (MOVES TOGETHER WITH THE AGENDA ITEM) */}
                            {item.hasTable && item.table && (
                              <div className="ml-4 sm:ml-7 mt-2.5">
                                {/* Collapsible Table Action Bar */}
                                {canEditForm && (
                                  <div className="font-sans mb-1.5 flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 border border-slate-300 rounded-t-lg px-2.5 py-1.5 text-[11px]">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Muhtaçlık Toggle */}
                                      <label className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-bold cursor-pointer transition-colors ${
                                        isTableMuhtaclikActive(item.table)
                                          ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                      }`}>
                                        <input
                                          type="checkbox"
                                          checked={isTableMuhtaclikActive(item.table)}
                                          onChange={(e) => {
                                            const active = e.target.checked;
                                            const currentTable = item.table!;
                                            if (active) {
                                              const muhtaclikLimit = settings?.muhtaclikSiniri ?? 9358.50;
                                              const targetCol = currentTable.incomeColumnIndex !== undefined && currentTable.incomeColumnIndex >= 0
                                                ? currentTable.incomeColumnIndex
                                                : findIncomeColumnIndex(currentTable.columns, currentTable.rows);

                                              if (targetCol >= 0) {
                                                const result = sortAndProcessTableByIncome(currentTable.columns, currentTable.rows, muhtaclikLimit, targetCol);
                                                updateItem(item.id, {
                                                  table: {
                                                    ...currentTable,
                                                    columns: result.columns,
                                                    rows: result.rows,
                                                    enableMuhtaclikCheck: true,
                                                    incomeColumnIndex: targetCol
                                                  }
                                                });
                                                toast.success(`Muhtaçlık kontrolü aktif (${currentTable.columns[targetCol] || `Sütun ${targetCol + 1}`}).`);
                                              } else {
                                                updateItem(item.id, {
                                                  table: {
                                                    ...currentTable,
                                                    enableMuhtaclikCheck: true,
                                                    incomeColumnIndex: -1
                                                  }
                                                });
                                                toast.info('Muhtaçlık kontrolü açıldı. Lütfen gelir sütununu seçin.');
                                              }
                                            } else {
                                              updateItem(item.id, {
                                                table: {
                                                  ...currentTable,
                                                  enableMuhtaclikCheck: false
                                                }
                                              });
                                            }
                                          }}
                                          className="w-3 h-3 text-emerald-700 rounded"
                                        />
                                        <Scale className="w-3 h-3 text-emerald-700" />
                                        <span>Muhtaçlık Kontrolü</span>
                                      </label>

                                      {isTableMuhtaclikActive(item.table) && (
                                        <select
                                          value={
                                            item.table.incomeColumnIndex !== undefined && item.table.incomeColumnIndex >= 0 && item.table.incomeColumnIndex < item.table.columns.length
                                              ? item.table.incomeColumnIndex
                                              : -1
                                          }
                                          onChange={(e) => {
                                            const newColIdx = Number(e.target.value);
                                            const muhtaclikLimit = settings?.muhtaclikSiniri ?? 9358.50;
                                            const currentTable = item.table!;
                                            if (newColIdx >= 0) {
                                              const result = sortAndProcessTableByIncome(currentTable.columns, currentTable.rows, muhtaclikLimit, newColIdx);
                                              updateItem(item.id, {
                                                table: {
                                                  ...currentTable,
                                                  columns: result.columns,
                                                  rows: result.rows,
                                                  incomeColumnIndex: newColIdx,
                                                  sortColumnIndex: newColIdx,
                                                  sortDirection: 'asc'
                                                }
                                              });
                                              toast.success(`Gelir sütunu: ${currentTable.columns[newColIdx] || `Sütun ${newColIdx + 1}`}`);
                                            } else {
                                              updateItem(item.id, {
                                                table: {
                                                  ...currentTable,
                                                  incomeColumnIndex: -1
                                                }
                                              });
                                            }
                                          }}
                                          className="text-[11px] font-bold rounded px-1.5 py-0.5 bg-white border border-emerald-400 text-slate-800 outline-none"
                                        >
                                          <option value={-1}>-- Gelir Sütunu Seç --</option>
                                          {item.table.columns.map((col, cIdx) => (
                                            <option key={cIdx} value={cIdx}>
                                              Sütun {cIdx + 1}: {col || '(İsimsiz)'}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {/* Sütuna Göre Sıralama Kontrolü (Artan / Azalan) */}
                                      <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded px-1.5 py-0.5">
                                        <ArrowUpDown className="w-3 h-3 text-blue-700 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-500 uppercase hidden sm:inline">Sırala:</span>
                                        <select
                                          value={
                                            item.table.sortColumnIndex !== undefined &&
                                            item.table.sortColumnIndex >= 0 &&
                                            item.table.sortColumnIndex < item.table.columns.length
                                              ? item.table.sortColumnIndex
                                              : -1
                                          }
                                          onChange={(e) => {
                                            const colIdx = Number(e.target.value);
                                            if (colIdx >= 0) {
                                              handleSortTableByColumn(item.id, item.table!, colIdx, item.table?.sortDirection || 'asc');
                                            }
                                          }}
                                          className="text-[11px] font-bold text-slate-800 bg-transparent outline-none max-w-[150px]"
                                          title="Sıralanacak Sütunu Seçin"
                                        >
                                          <option value={-1}>-- Sütun Seç --</option>
                                          {item.table.columns.map((col, cIdx) => {
                                            if (isSiraColumn(col)) return null;
                                            return (
                                              <option key={cIdx} value={cIdx}>
                                                {col || `Sütun ${cIdx + 1}`}
                                              </option>
                                            );
                                          })}
                                        </select>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const firstSortable = item.table!.columns.findIndex(c => !isSiraColumn(c));
                                            const targetCol =
                                              item.table?.sortColumnIndex !== undefined && item.table.sortColumnIndex >= 0
                                                ? item.table.sortColumnIndex
                                                : firstSortable >= 0 ? firstSortable : 0;
                                            handleSortTableByColumn(item.id, item.table!, targetCol, 'asc');
                                          }}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors ${
                                            item.table.sortDirection === 'asc' && item.table.sortColumnIndex !== undefined && item.table.sortColumnIndex >= 0
                                              ? 'bg-blue-700 text-white'
                                              : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                          }`}
                                          title="Seçili sütuna göre Artan (A→Z / Küçükten Büyüğe) sırala"
                                        >
                                          <ArrowUp className="w-2.5 h-2.5" />
                                          <span>Artan</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const firstSortable = item.table!.columns.findIndex(c => !isSiraColumn(c));
                                            const targetCol =
                                              item.table?.sortColumnIndex !== undefined && item.table.sortColumnIndex >= 0
                                                ? item.table.sortColumnIndex
                                                : firstSortable >= 0 ? firstSortable : 0;
                                            handleSortTableByColumn(item.id, item.table!, targetCol, 'desc');
                                          }}
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition-colors ${
                                            item.table.sortDirection === 'desc' && item.table.sortColumnIndex !== undefined && item.table.sortColumnIndex >= 0
                                              ? 'bg-blue-700 text-white'
                                              : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                          }`}
                                          title="Seçili sütuna göre Azalan (Z→A / Büyükten Küçüğe) sırala"
                                        >
                                          <ArrowDown className="w-2.5 h-2.5" />
                                          <span>Azalan</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newCols = [...item.table!.columns, 'YENİ SÜTUN'];
                                          const newRows = item.table!.rows.map(r => [...r, '']);
                                          updateItem(item.id, { table: { ...item.table!, columns: newCols, rows: newRows } });
                                        }}
                                        className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-bold text-slate-700"
                                      >
                                        + Sütun
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newRow = Array(item.table!.columns.length).fill('');
                                          const newRows = [...item.table!.rows.map(r => [...r]), newRow];
                                          const siraIdx = item.table!.columns.findIndex(c => isSiraColumn(c));
                                          if (siraIdx >= 0) {
                                            newRows.forEach((r, idx) => { r[siraIdx] = (idx + 1).toString(); });
                                          }
                                          updateItem(item.id, { table: { ...item.table!, rows: newRows } });
                                        }}
                                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold text-blue-800"
                                      >
                                        + Satır
                                      </button>
                                      <label className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded font-bold text-emerald-800 cursor-pointer flex items-center gap-1">
                                        <FileUp className="w-3 h-3" />
                                        <span>Excel Yükle</span>
                                        <input
                                          type="file"
                                          accept=".xlsx,.xls,.csv"
                                          className="hidden"
                                          onChange={(e) => importExcelToTable(item.id, e)}
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() => exportExcelFromTable(item.table!, index)}
                                        className="px-2 py-0.5 bg-white hover:bg-slate-50 border border-slate-300 rounded font-bold text-slate-700 flex items-center gap-1"
                                        title="Tabloyu Excel Olarak İndir"
                                      >
                                        <FileDown className="w-3 h-3" />
                                        <span className="hidden sm:inline">İndir</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeTableFromItem(item.id)}
                                        className="px-2 py-0.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded font-bold text-red-700"
                                        title="Tabloyu Kaldır"
                                      >
                                        Tabloyu Sil
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Real Word-Style Bordered Table on Canvas */}
                                <div className="overflow-x-auto">
                                  <table className="w-full border-collapse border border-black text-[10px] sm:text-[11px]">
                                    <thead>
                                      <tr>
                                        {item.table.columns.map((col, cI) => {
                                          const isSira = isSiraColumn(col);
                                          const isIncomeCol = isTableMuhtaclikActive(item.table) && item.table?.incomeColumnIndex === cI;
                                          const isSortedCol = item.table?.sortColumnIndex === cI;
                                          const sortDir = item.table?.sortDirection;
                                          return (
                                            <th
                                              key={cI}
                                              className={`border border-black bg-slate-100 font-bold uppercase p-1 relative group/th ${
                                                isSira ? 'w-12 text-center' : 'min-w-[95px]'
                                              } ${isIncomeCol ? 'bg-emerald-50/90' : ''} ${isSortedCol ? 'bg-blue-50/80' : ''}`}
                                            >
                                              <div className="flex items-center gap-0.5">
                                                <input
                                                  type="text"
                                                  disabled={!canEditForm}
                                                  value={col}
                                                  onChange={(e) => {
                                                    const newCols = [...item.table!.columns];
                                                    newCols[cI] = e.target.value;
                                                    updateItem(item.id, { table: { ...item.table!, columns: newCols } });
                                                  }}
                                                  className={`w-full bg-transparent font-bold uppercase outline-none focus:bg-white px-1 rounded ${
                                                    isSira ? 'text-center' : 'text-left'
                                                  }`}
                                                  placeholder={`SÜTUN ${cI + 1}`}
                                                />
                                                {canEditForm && !isSira && (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleSortTableByColumn(item.id, item.table!, cI)}
                                                    className={`p-0.5 rounded shrink-0 transition-colors ${
                                                      isSortedCol
                                                        ? 'bg-blue-700 text-white'
                                                        : 'text-slate-400 hover:text-blue-700 hover:bg-blue-100/70'
                                                    }`}
                                                    title={`"${col || `Sütun ${cI + 1}`}" sütununa göre ${
                                                      isSortedCol && sortDir === 'asc' ? 'Azalan (Z→A / Büyükten Küçüğe)' : 'Artan (A→Z / Küçükten Büyüğe)'
                                                    } sırala`}
                                                  >
                                                    {isSortedCol ? (
                                                      sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                    ) : (
                                                      <ArrowUpDown className="w-3 h-3" />
                                                    )}
                                                  </button>
                                                )}
                                              </div>
                                              {canEditForm && item.table!.columns.length > 1 && (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const currentTable = item.table!;
                                                    const newCols = currentTable.columns.filter((_, i) => i !== cI);
                                                    const newRows = currentTable.rows.map(r => r.filter((_, i) => i !== cI));
                                                    let newIncomeCol = currentTable.incomeColumnIndex;
                                                    if (newIncomeCol !== undefined && newIncomeCol >= 0) {
                                                      if (newIncomeCol === cI) newIncomeCol = -1;
                                                      else if (newIncomeCol > cI) newIncomeCol = newIncomeCol - 1;
                                                    }
                                                    let newSortCol = currentTable.sortColumnIndex;
                                                    if (newSortCol !== undefined && newSortCol >= 0) {
                                                      if (newSortCol === cI) newSortCol = undefined;
                                                      else if (newSortCol > cI) newSortCol = newSortCol - 1;
                                                    }
                                                    updateItem(item.id, {
                                                      table: { ...currentTable, columns: newCols, rows: newRows, incomeColumnIndex: newIncomeCol, sortColumnIndex: newSortCol }
                                                    });
                                                  }}
                                                  className="opacity-0 group-hover/th:opacity-100 absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-xs transition-opacity"
                                                  title="Bu Sütunu Sil"
                                                >
                                                  <X className="w-2.5 h-2.5" />
                                                </button>
                                              )}
                                            </th>
                                          );
                                        })}
                                        {canEditForm && (
                                          <th className="border border-black bg-slate-100 w-14 text-center font-sans text-[9px] text-slate-500">
                                            İşlem
                                          </th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {item.table.rows.map((row, rI) => {
                                        const isMuhtaclik = isTableMuhtaclikActive(item.table);
                                        const targetIncomeCol = item.table?.incomeColumnIndex !== undefined && item.table.incomeColumnIndex >= 0
                                          ? item.table.incomeColumnIndex
                                          : -1;
                                        const isOver = isMuhtaclik && targetIncomeCol >= 0 && isOverLimitRow(row);
                                        const isStringRow = isMuhtaclik && targetIncomeCol >= 0 && !isOver && isStringIncomeRow(row, targetIncomeCol);
                                        const isHighlight = isOver || isStringRow;

                                        return (
                                          <tr
                                            key={rI}
                                            className={`group/tr ${isHighlight ? 'bg-slate-200/80 font-bold' : 'hover:bg-blue-50/30'}`}
                                          >
                                            {row.map((cell, cI) => {
                                              const isSira = isSiraColumn(item.table!.columns[cI]);
                                              const isCellLimitOver = isMuhtaclik && isOverLimitRow([cell]);
                                              return (
                                                <td
                                                  key={cI}
                                                  className={`border border-black p-0.5 ${isSira ? 'text-center font-bold bg-slate-50/80' : ''}`}
                                                >
                                                  <input
                                                    type="text"
                                                    data-table-cell={`${item.id}-${rI}-${cI}`}
                                                    readOnly={isSira || !canEditForm}
                                                    value={isSira ? (rI + 1).toString() : cell}
                                                    onFocus={(e) => {
                                                      if (isCellLimitOver) e.target.select();
                                                    }}
                                                    onChange={(e) => {
                                                      if (isSira) return;
                                                      const newRows = [...item.table!.rows];
                                                      newRows[rI] = [...newRows[rI]];
                                                      newRows[rI][cI] = e.target.value;
                                                      updateItem(item.id, { table: { ...item.table!, rows: newRows } });
                                                    }}
                                                    onBlur={(e) => {
                                                      if (!isSira) {
                                                        handleCellBlurOrSubmit(item.id, item.table!, rI, cI, e.target.value);
                                                      }
                                                    }}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleCellBlurOrSubmit(item.id, item.table!, rI, cI, e.currentTarget.value);
                                                        if (rI < item.table!.rows.length - 1) {
                                                          const nextInput = document.querySelector<HTMLInputElement>(`input[data-table-cell="${item.id}-${rI + 1}-${cI}"]`);
                                                          if (nextInput) {
                                                            nextInput.focus();
                                                            nextInput.select();
                                                          }
                                                        } else if (canEditForm) {
                                                          const newRow = Array(item.table!.columns.length).fill('');
                                                          const newRows = [...item.table!.rows.map(r => [...r]), newRow];
                                                          const siraIdx = item.table!.columns.findIndex(c => isSiraColumn(c));
                                                          if (siraIdx >= 0) {
                                                            newRows.forEach((r, idx) => { r[siraIdx] = (idx + 1).toString(); });
                                                          }
                                                          updateItem(item.id, { table: { ...item.table!, rows: newRows } });
                                                          setTimeout(() => {
                                                            const nextInput = document.querySelector<HTMLInputElement>(`input[data-table-cell="${item.id}-${rI + 1}-${cI}"]`);
                                                            if (nextInput) {
                                                              nextInput.focus();
                                                              nextInput.select();
                                                            }
                                                          }, 50);
                                                        }
                                                      }
                                                    }}
                                                    className={`w-full bg-transparent px-1 py-0.5 outline-none focus:bg-white focus:ring-1 focus:ring-blue-600 rounded ${
                                                      isSira ? 'text-center font-bold' : ''
                                                    } ${isHighlight ? 'font-bold' : ''} ${
                                                      isCellLimitOver ? 'text-red-700 font-black' : ''
                                                    }`}
                                                  />
                                                </td>
                                              );
                                            })}
                                            {canEditForm && (
                                              <td className="border border-black p-0.5 text-center font-sans whitespace-nowrap">
                                                <div className="inline-flex items-center gap-0.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const newRow = Array(item.table!.columns.length).fill('');
                                                      const newRows = item.table!.rows.map(r => [...r]);
                                                      newRows.splice(rI + 1, 0, newRow);
                                                      const siraIdx = item.table!.columns.findIndex(c => isSiraColumn(c));
                                                      if (siraIdx >= 0) {
                                                        newRows.forEach((r, idx) => { r[siraIdx] = (idx + 1).toString(); });
                                                      }
                                                      updateItem(item.id, { table: { ...item.table!, rows: newRows } });
                                                    }}
                                                    className="text-blue-700 hover:bg-blue-100 p-0.5 rounded"
                                                    title="Altına Satır Ekle"
                                                  >
                                                    <Plus className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const newRows = item.table!.rows.filter((_, i) => i !== rI).map(r => [...r]);
                                                      const siraIdx = item.table!.columns.findIndex(c => isSiraColumn(c));
                                                      if (siraIdx >= 0) {
                                                        newRows.forEach((r, idx) => { r[siraIdx] = (idx + 1).toString(); });
                                                      }
                                                      updateItem(item.id, { table: { ...item.table!, rows: newRows } });
                                                    }}
                                                    className="text-red-600 hover:bg-red-100 p-0.5 rounded"
                                                    title="Satırı Sil"
                                                  >
                                                    <Trash2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* ATTACHED SUB-ITEMS (MOVE TOGETHER WITH THE AGENDA ITEM) */}
                            {item.subItems && item.subItems.length > 0 && (
                              <div className="ml-6 sm:ml-8 mt-1.5 space-y-1">
                                {item.subItems.map((sub, sIdx) => (
                                  <div key={sub.id} className="flex items-baseline gap-1.5 group/sub">
                                    <span className="font-bold whitespace-nowrap min-w-[22px]">
                                      {sub.type === 'numbered' ? `${index + 1}.${sIdx + 1}.` : '•'}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <RichTextEditor
                                        variant="inline"
                                        value={sub.text}
                                        disabled={!canEditForm}
                                        onEditorFocus={(ed) => {
                                          setActiveEditor(ed);
                                          setActiveBlockId(item.id);
                                        }}
                                        onChange={(val) => {
                                          const newSubs = item.subItems!.map(s => s.id === sub.id ? { ...s, text: val } : s);
                                          updateItem(item.id, { subItems: newSubs });
                                        }}
                                        placeholder="Alt madde metni..."
                                      />
                                    </div>
                                    {canEditForm && (
                                      <div className="font-sans flex items-center gap-0.5 opacity-80 sm:opacity-0 group-hover/sub:opacity-100 transition-opacity shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSubs = item.subItems!.map(s => s.id === sub.id ? { ...s, type: (s.type === 'numbered' ? 'bullet' : 'numbered') as 'numbered' | 'bullet' } : s);
                                            updateItem(item.id, { subItems: newSubs });
                                          }}
                                          className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                                          title="Alt Madde Tipini Değiştir"
                                        >
                                          {sub.type === 'numbered' ? '1.1' : '•'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSubs = item.subItems!.filter(s => s.id !== sub.id);
                                            updateItem(item.id, { subItems: newSubs });
                                          }}
                                          className="text-red-500 hover:bg-red-50 p-0.5 rounded"
                                          title="Alt Maddeyi Sil"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* In-between Hover Line to Insert New Block Here (Left-Aligned so it never collides with Right Action Bar) */}
                          {canEditForm && (
                            <div className="group/ins relative h-5 flex items-center my-0.5">
                              <div className="w-full h-px bg-transparent group-hover/ins:bg-blue-400/70 transition-colors" />
                              <button
                                type="button"
                                onClick={() => addItemAt(index + 1, 'numbered')}
                                className="opacity-0 group-hover/ins:opacity-100 absolute left-2 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-sans font-bold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 transition-all cursor-pointer z-10"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>{index + 2}. Madde Olarak Araya Ekle</span>
                              </button>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {/* Empty State or Bottom Quick Add Bar on the Paper */}
                    {canEditForm && (
                      <div className="mt-4 pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-center gap-2 font-sans print:hidden">
                        <button
                          type="button"
                          onClick={() => addItem('numbered')}
                          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Yeni Gündem Maddesi Ekle ({(localForm.items?.length || 0) + 1}. Madde)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addItem('bullet')}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>Noktalı / Çizgili Satır Ekle</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 4. FOOTER DECISION NOTE & BOARD SIGNATURES DIRECTLY ON THE A4 CANVAS */}
                  <div className="mt-10 pt-4 border-t border-slate-200">
                    {/* Decision Footer Note */}
                    <div
                      className="font-bold text-center mb-8"
                      style={{ fontSize: docFontSizeContent }}
                    >
                      {isAdmin && canEditForm ? (
                        <RichTextEditor
                          variant="inline"
                          value={localForm.footerText}
                          disabled={!canEditForm}
                          onEditorFocus={setActiveEditor}
                          onChange={(val) => updateForm({ footerText: val })}
                          placeholder="Karar sonuç metnini girin..."
                          className="text-center font-bold"
                        />
                      ) : localForm.footerText.includes('<') ? (
                        <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: localForm.footerText }} />
                      ) : (
                        <div>{localForm.footerText}</div>
                      )}
                    </div>

                    {/* Signatures Block with Admin Popover Picker */}
                    <div className="relative group/sig">
                      {isAdmin && canEditForm && (
                        <div className="flex justify-center mb-4 font-sans print:hidden">
                          <button
                            type="button"
                            onClick={() => setIsSignerPickerOpen(!isSignerPickerOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                              isSignerPickerOpen
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5 text-blue-700" />
                            <span>Heyet İmzacılarını Seç ({localForm.signatureMembers.length} / {allMembers.length} Üye)</span>
                            {isSignerPickerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {/* Inline Signer Selection Drawer */}
                      {isAdmin && canEditForm && isSignerPickerOpen && (
                        <div className="font-sans mb-6 p-4 bg-slate-50 border border-slate-300 rounded-xl shadow-inner space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 uppercase">Toplantıya Katılan İmzacı Üyeler</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateForm({ signatureMembers: allMembers.map(m => m.id) })}
                                className="text-[11px] font-bold text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded"
                              >
                                Tümünü Seç
                              </button>
                              <button
                                type="button"
                                onClick={() => updateForm({ signatureMembers: [] })}
                                className="text-[11px] font-bold text-red-600 hover:bg-red-100 px-2 py-0.5 rounded"
                              >
                                Tümünü Kaldır
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsSignerPickerOpen(false)}
                                className="text-[11px] font-bold bg-slate-800 text-white px-2.5 py-0.5 rounded"
                              >
                                Kapat
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {allMembers.map((member) => {
                              const checked = localForm.signatureMembers.includes(member.id);
                              return (
                                <label
                                  key={member.id}
                                  className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                                    checked
                                      ? 'bg-blue-50/90 border-blue-400 text-slate-900 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const newSignatures = e.target.checked
                                        ? [...localForm.signatureMembers, member.id]
                                        : localForm.signatureMembers.filter(mId => mId !== member.id);
                                      updateForm({ signatureMembers: newSignatures });
                                    }}
                                    className="rounded text-blue-700 focus:ring-blue-600 w-3.5 h-3.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-bold uppercase text-[11px]">{member.name}</div>
                                    <div className="truncate text-[10px] text-slate-500 uppercase">{member.title}</div>
                                    {member.isProxy && (
                                      <div className="truncate text-[9px] text-amber-700 font-bold uppercase">
                                        Vekil: {member.proxyName}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Live Signature Layout Preview on Canvas */}
                      {finalSigners.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 font-sans text-xs italic border border-dashed border-slate-200 rounded-lg">
                          Henüz imzacı heyet üyesi seçilmedi.
                        </div>
                      ) : (
                        <div className="w-full pt-2">
                          {topSigners.length > 0 && (
                            <div className="flex justify-center w-full mb-10 text-center">
                              {topSigners.map(m => (
                                <div key={m.id} className="flex flex-col items-center">
                                  <div className="font-bold whitespace-pre-wrap text-xs" style={{ lineHeight: 1.15 }}>
                                    {formatMemberName(m)}
                                  </div>
                                  <div className="font-bold whitespace-pre-wrap text-xs mt-1" style={{ lineHeight: 1.15 }}>
                                    {formatMemberTitle(m)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {otherSigners.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-8 text-center w-full">
                              {otherSigners.map((m) => (
                                <div key={m.id} className="flex flex-col items-center">
                                  <div className="font-bold whitespace-pre-wrap text-xs" style={{ lineHeight: 1.15 }}>
                                    {formatMemberName(m)}
                                  </div>
                                  <div className="font-bold whitespace-pre-wrap text-xs mt-1" style={{ lineHeight: 1.15 }}>
                                    {formatMemberTitle(m)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ==================== PRINT PREVIEW & AGE/GENDER AUTO-SORT TAB ==================== */
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-[210mm] mb-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-300 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Baskı Öncesi Otomatik Sıralama (Yaş / Cinsiyet)</span>
                    <button
                      type="button"
                      onClick={() => setSortOrder('none')}
                      className="text-[11px] font-bold text-red-600 hover:underline uppercase"
                    >
                      Sıralamayı Sıfırla
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">1. Cinsiyet Önceliği</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => setGenderPriority('female')}
                          className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${genderPriority === 'female' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          ÖNCE KADINLAR
                        </button>
                        <button 
                          type="button"
                          onClick={() => setGenderPriority('male')}
                          className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${genderPriority === 'male' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          ÖNCE ERKEKLER
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">2. Yaş Sıralaması</span>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                          type="button"
                          onClick={() => setSortOrder('asc')}
                          className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${sortOrder === 'asc' ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          KÜÇÜKTEN BÜYÜĞE
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSortOrder('desc')}
                          className={`flex-1 px-2.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${sortOrder === 'desc' ? 'bg-blue-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          BÜYÜKTEN KÜÇÜĞE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full overflow-x-auto flex justify-center pb-10">
                <div ref={printRef} className="a4-page shrink-0">
                  <PrintPreview 
                    form={(() => {
                      const sortItems = (items: any[]): any[] => {
                        if (!items || items.length === 0) return items;
                        const itemsWithSortedSubs = items.map(item => ({
                          ...item,
                          subItems: item.subItems ? sortItems(item.subItems) : item.subItems
                        }));

                        if (sortOrder === 'none') return itemsWithSortedSubs;

                        const result = [...itemsWithSortedSubs];
                        const sortableIndices: number[] = [];
                        const sortableItems: any[] = [];
                        
                        result.forEach((item, index) => {
                          if (item.age || item.gender) {
                            sortableIndices.push(index);
                            sortableItems.push(item);
                          }
                        });

                        if (sortableItems.length === 0) return result;

                        sortableItems.sort((a, b) => {
                          if (a.gender !== b.gender) {
                             if (a.gender === genderPriority) return -1;
                             if (b.gender === genderPriority) return 1;
                          }
                          const ageA = parseInt(a.age || '0') || 0;
                          const ageB = parseInt(b.age || '0') || 0;
                          if (ageA !== ageB) return sortOrder === 'asc' ? ageA - ageB : ageB - ageA;
                          return 0;
                        });

                        sortableIndices.forEach((originalIndex, i) => {
                          result[originalIndex] = sortableItems[i];
                        });
                        
                        return result;
                      };

                      return {
                        ...localForm,
                        items: sortItems(localForm.items)
                      };
                    })()} 
                    members={allMembers} 
                    settings={settings} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Scroll Top/Bottom Helper */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-1.5 z-40 print:hidden">
        <button 
          type="button"
          onClick={() => {
            const container = document.getElementById('main-scroll-container');
            container?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-9 h-9 bg-slate-900/90 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          title="Sayfa Başına Git"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <button 
          type="button"
          onClick={() => {
            const container = document.getElementById('main-scroll-container');
            container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }}
          className="w-9 h-9 bg-slate-900/90 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
          title="Sayfa Sonuna Git"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>

      {/* Bulk Drag-and-Drop Reorder Modal */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    Toplu Madde Sıralama
                    <span className="text-[11px] font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                      {localForm.items?.length || 0} Madde
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Her maddeyi sürükleyip bırakarak veya yeni sıra numarasını yazarak taşıyabilirsiniz. Tablo ve alt maddeler maddeyle birlikte taşınır.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsReorderModalOpen(false);
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-slate-100">
              {(!localForm.items || localForm.items.length === 0) ? (
                <div className="text-center py-12 text-slate-400 text-xs italic">
                  Sıralanacak madde bulunmuyor.
                </div>
              ) : (
                localForm.items.map((item, index) => {
                  const plainText = (item.text || '')
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={item.id}
                      draggable={canEditForm}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());
                        setDraggedIndex(index);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== index) setDragOverIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverIndex === index) setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          moveItem(localForm.items[draggedIndex].id, index);
                        }
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggedIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all ${
                        isDragging
                          ? 'opacity-30 bg-slate-100 border-dashed border-slate-400'
                          : isDragOver
                          ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 shrink-0">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400">#</span>
                        <input
                          type="number"
                          min={1}
                          max={localForm.items.length}
                          defaultValue={index + 1}
                          key={`pos-${item.id}-${index}`}
                          disabled={!canEditForm}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value, 10);
                              if (!isNaN(val) && val >= 1 && val <= localForm.items.length && val !== index + 1) {
                                moveItem(item.id, val - 1);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= localForm.items.length && val !== index + 1) {
                              moveItem(item.id, val - 1);
                            } else {
                              e.target.value = (index + 1).toString();
                            }
                          }}
                          className="w-11 text-center text-xs font-bold border border-slate-300 rounded px-1 py-1 focus:ring-1 focus:ring-blue-600 bg-white"
                        />
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-xs text-slate-800 font-medium truncate">
                          {plainText || <span className="text-slate-400 italic">(Metin girilmemiş)</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {item.type === 'numbered' ? 'Numaralı' : 'Noktalı'}
                          </span>
                          {item.hasTable && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 rounded font-semibold">
                              Tablo ({item.table?.rows.length || 0} satır)
                            </span>
                          )}
                          {item.subItems && item.subItems.length > 0 && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 rounded font-semibold">
                              +{item.subItems.length} Alt Madde
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={index === 0 || !canEditForm}
                          onClick={() => moveItem(item.id, index - 1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-20"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={index === localForm.items.length - 1 || !canEditForm}
                          onClick={() => moveItem(item.id, index + 1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-20"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500">
                Sıralama anında belgeye uygulanır.
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsReorderModalOpen(false);
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg"
              >
                Tamamla
              </button>
            </div>
          </div>
        </div>
      )}

      <WordImportModal
        isOpen={wordImportState.isOpen}
        onClose={() => setWordImportState({ isOpen: false, parsedItems: [], fileName: '' })}
        parsedItems={wordImportState.parsedItems}
        existingItems={localForm?.items || []}
        onConfirm={handleConfirmWordImport}
        fileName={wordImportState.fileName}
      />

      <ExcelTableImportModal
        isOpen={excelImportState.isOpen}
        onClose={() => setExcelImportState({ isOpen: false, itemId: '', fileName: '', rawColumns: [], rawRows: [] })}
        fileName={excelImportState.fileName}
        rawColumns={excelImportState.rawColumns}
        rawRows={excelImportState.rawRows}
        defaultMuhtaclikSiniri={settings?.muhtaclikSiniri || 9358.50}
        initialEnableLimitCheck={
          excelImportState.itemId
            ? isTableMuhtaclikActive(localForm?.items.find(i => i.id === excelImportState.itemId)?.table)
            : false
        }
        initialIncomeColumnIndex={
          excelImportState.itemId
            ? localForm?.items.find(i => i.id === excelImportState.itemId)?.table?.incomeColumnIndex
            : undefined
        }
        onConfirm={handleConfirmExcelImport}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        variant="warning"
      />
    </AppLayout>
  );
}
