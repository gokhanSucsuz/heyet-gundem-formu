'use client';

import React, { useState, useRef, useEffect } from 'react';
import { db, useLiveQuery, OfficialForm, FormItem, Member, MemberSnapshot } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { 
  Save, Printer, ArrowLeft, Plus, Trash2, 
  Table as TableIcon, CheckSquare, ListOrdered, Minus, Lock, Unlock,
  CheckCircle, ArrowRight, ArrowUp, ArrowDown, ChevronUp, ChevronDown,
  FileText, MessageSquare, Users, Eye, Edit3, Loader2, FileUp, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { RichTextEditor } from '@/components/RichTextEditor';
import { DebouncedInput } from '@/components/DebouncedInput';

const isSiraColumn = (name: string) => {
  const n = name.toLowerCase().trim();
  return n === 'sıra' || n === 'sıra no' || n === 'sira' || n === 'sira no' || n === 'no';
};

function PrintPreview({ form, members, settings }: { form: OfficialForm, members: Member[], settings: any }) {
  const activeLayout = settings?.layout || form.layout;
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

  // Use snapshots if available, otherwise current members
  const finalSigners = form.signatureSnapshots && form.signatureSnapshots.length > 0
    ? form.signatureSnapshots
    : selectedMembers;

  // Split members into groups for professional signature layout
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
                {item.table.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      const isSira = isSiraColumn(item.table!.columns[ci]);
                      return (
                        <td 
                          key={ci} 
                          className={`border border-black text-[10px] ${tablePad} ${isSira ? 'text-center font-bold' : ''}`}
                        >
                          {isSira ? (ri + 1) : cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
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
      
      {/* Watermark - Using fixed position for multi-page print support */}
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

      {/* Content wrapper to stay above watermark */}
      <div className="relative z-10 flex flex-col flex-1 h-full">
        {/* Header Flex Layout to avoid overlap */}
        <div className="flex justify-between items-start mb-8 text-center font-bold">
          {settings?.leftLogoBase64 ? (
            <img src={settings.leftLogoBase64} alt="Left Logo" className="h-[25mm] w-[25mm] object-contain shrink-0" style={{ opacity: (activeLayout?.logoOpacity ?? 100) / 100 }} />
          ) : <div className="h-[25mm] w-[25mm] shrink-0" />}
          
          <div className="flex-1 px-4 mt-2" style={{ 
            fontSize: activeLayout?.fontSizeTitle ? `${activeLayout?.fontSizeTitle}px` : '12px',
            lineHeight: activeLayout?.headerLineSpacing || 'normal'
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

        {/* Items */}
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

        {/* Decision Note and Signatures - Kept together on same page */}
        <div className="break-inside-avoid mt-8">
          {/* Footer Text */}
          <div className="font-bold text-center text-[14px]" style={{ fontSize: activeLayout?.fontSizeContent ? `${activeLayout?.fontSizeContent}px` : '11px' }}>
            {form.footerText.includes('<') ? (
              <div className="rich-text-preview" dangerouslySetInnerHTML={{ __html: form.footerText }} />
            ) : (
              <div>{form.footerText}</div>
            )}
          </div>

          {/* Signatures */}
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
                    <div style={{ height: `${signatureSpacing}px` }}></div> {/* Signature Space */}
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
                    <div style={{ height: `${signatureSpacing}px` }}></div> {/* Signature Space */}
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
          ${form.layout?.showPageNumbers ? `
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
        
        /* A4 Page View Simulation */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 0;
          margin: 0 auto;
          background: white;
          box-shadow: none;
          position: relative;
          display: flex;
          flex-direction: column;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }

        .a4-page::after {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-image: linear-gradient(to bottom, transparent 296.5mm, #e2e8f0 296.5mm, #e2e8f0 297mm, transparent 297mm);
          background-size: 100% 297mm;
          z-index: 5;
          pointer-events: none;
        }

        .preview-container {
          background-color: #f1f5f9;
          padding: 40px 0;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        @media print {
          .a4-page {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
          }
          .preview-container {
            padding: 0 !important;
            background: transparent !important;
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
  
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [localForm, setLocalForm] = useState<OfficialForm | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const [genderPriority, setGenderPriority] = useState<'female' | 'male'>('female');
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });
  const printRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Listen for successful queue saves
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
            setLocalForm(draftData);
            setIsDirty(true);
            return;
          }
        } catch (e) {}
      }
      setLocalForm(form);
    }
  }, [form, id]);

  useEffect(() => {
    if (!localForm || isSaving) return;
    
    const formattedDate = localForm.decisionDate ? new Date(localForm.decisionDate).toLocaleDateString('tr-TR') : '';
    const newHeader = `${formattedDate}${formattedDate && localForm.decisionNo ? ' - ' : ''}${localForm.decisionNo || ''}`;
    
    if (newHeader && localForm.headerLine4 !== newHeader && !localForm.isLocked) {
      const updated = { ...localForm, headerLine4: newHeader, updatedAt: Date.now() };
      setLocalForm(updated);
      setIsDirty(true);
      localStorage.setItem(`draft_form_${id}`, JSON.stringify(updated));
    }
  }, [localForm?.decisionDate, localForm?.decisionNo, id]);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: localForm?.title || 'Karar Formu' });

  if (!localForm || !allMembers) return <div className="p-8 text-center text-slate-500 italic">Yükleniyor...</div>;

  const canUnlock = () => {
    if (!localForm.decisionDate) return true;
    const decisionDate = new Date(localForm.decisionDate);
    const now = new Date();
    const diffTime = now.getTime() - decisionDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= 2;
  };

  const updateForm = (updates: Partial<OfficialForm>) => {
    if (isSaving) return;
    const updated = { ...localForm, ...updates, updatedAt: Date.now() };
    setLocalForm(updated);
    setIsDirty(true);
    localStorage.setItem(`draft_form_${id}`, JSON.stringify(updated));
    // Queue auto-save (debounced 3s)
    db.forms.queueSave(updated);
  };

  const saveToCloud = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    try {
      await db.forms.put(localForm);
      setIsDirty(false);
      localStorage.removeItem(`draft_form_${id}`);
      toast.success('Form kaydedildi.');
    } catch (e) {
      toast.error('Hata: Buluta kayıt yapılamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (type: 'numbered' | 'bullet' = 'numbered') => {
    const newItem: FormItem = { id: uuidv4(), type, text: '' };
    updateForm({ items: [...(localForm.items || []), newItem] });
  };

  const addItemAt = (index: number, type: 'numbered' | 'bullet' = 'numbered') => {
    const newItem: FormItem = { id: uuidv4(), type, text: '' };
    const newItems = [...(localForm.items || [])];
    newItems.splice(index, 0, newItem);
    updateForm({ items: newItems });
  };

  const addSubItemAt = (parentId: string, index: number, type: 'numbered' | 'bullet' = 'bullet') => {
    const parent = localForm.items?.find(i => i.id === parentId);
    if (!parent) return;
    const newSubItems = [...(parent.subItems || [])];
    newSubItems.splice(index, 0, { id: uuidv4(), type, text: '' });
    updateItem(parentId, { subItems: newSubItems });
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

      const ensureParagraph = (html: string) => {
        const trimmed = html.trim();
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
               let clonedLi = li.cloneNode(true) as Element;
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
        updateForm({ items: [...(localForm.items || []), ...newItems] });
        toast.success(`${newItems.length} gündem maddesi başarıyla içe aktarıldı.`);
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

      updateItem(itemId, { 
        table: { columns, rows } 
      });
      toast.success('Excel tablosu başarıyla yüklendi.');
    } catch (err) {
      console.error(err);
      toast.error('Excel dosyası okunurken hata oluştu.');
    } finally {
      e.target.value = '';
    }
  };

  const addTableToItem = (itemId: string) => {
    updateItem(itemId, { 
      hasTable: true, 
      table: { columns: ['SIRA NO', 'ADI SOYADI', 'T.C', 'TALEBİ', 'KARAR'], rows: [['1', '', '', '', '']] } 
    });
  };

  const removeTableFromItem = (itemId: string) => {
    updateItem(itemId, { hasTable: false, table: undefined });
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full h-[calc(100vh-2rem)]">
        {/* Header Actions */}
        <div className="flex items-center justify-between bg-white p-3 rounded border border-slate-300 shadow-sm mb-6 shrink-0 z-10 relative">
          <div className="flex items-center gap-3 w-full overflow-hidden">
            <Link href="/" className="text-slate-400 hover:text-slate-600 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex flex-col min-w-0 flex-1">
              <DebouncedInput 
                type="text" 
                value={localForm.title} 
                disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                onChange={(val) => updateForm({ title: val })}
                className={`text-sm font-bold bg-transparent border-none focus:ring-1 focus:ring-blue-200 rounded p-0.5 text-slate-800 placeholder-slate-400 uppercase outline-none truncate w-full ${(localForm.isLocked && !localForm.isPostponed) || isSaving ? 'cursor-not-allowed opacity-70' : ''}`}
                placeholder="Form Başlığı"
              />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">DÜZENLEME MODU</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            {isDirty && (
              <button 
                onClick={saveToCloud}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded font-bold text-[10px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span className="hidden sm:inline">BULUTA KAYDET</span>
              </button>
            )}
            
            <div className="bg-slate-100 p-1 rounded flex shrink-0">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === 'editor' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:block">DÜZENLE</span>
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:block">ÖNİZLE</span>
              </button>
            </div>

            {activeTab === 'preview' && (
              <div className="flex gap-2">
                {!localForm.isLocked && (
                  <button 
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
                          toast.success('Belge kesinleştirildi. Yazdırabilirsiniz.');
                        }
                      });
                    }}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold text-[10px] shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">KESİNLEŞTİR</span>
                  </button>
                )}
                {localForm.isLocked && !localForm.isPostponed && (
                  <button 
                    onClick={() => {
                      if (!canUnlock()) {
                        toast.error('Toplantı tarihinden itibaren 2 gün geçtiği için bu formun kilidi açılamaz.');
                        return;
                      }
                      updateForm({ isLocked: false });
                    }}
                    disabled={isSaving || !canUnlock()}
                    title={!canUnlock() ? 'Toplantı tarihinden 2 gün geçtiği için kilit açılamaz' : 'Kilidi Aç'}
                    className={`flex items-center gap-1.5 ${!canUnlock() ? 'bg-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 active:scale-95'} text-white px-3 py-1.5 rounded font-bold text-[10px] shadow-sm transition-all disabled:opacity-50`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span className="hidden sm:block">KİLİDİ AÇ</span>
                  </button>
                )}
                <button 
                  onClick={() => handlePrint()}
                  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded font-bold text-[10px] shadow-sm transition-all active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:block">YAZDIR</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Area with Sidebar */}
        <div className="flex-1 flex gap-8 overflow-hidden relative">
          {activeTab === 'editor' && (
            <div className="fixed right-2 lg:right-6 top-1/2 -translate-y-1/2 z-40 print:hidden transition-all duration-300">
              <div className="flex flex-col gap-1 lg:gap-2 p-1.5 lg:p-2 bg-white/60 hover:bg-white/95 backdrop-blur-md rounded-xl lg:rounded-3xl border border-slate-200 shadow-xl lg:shadow-2xl opacity-60 hover:opacity-100 transition-all duration-500 group/panel w-10 lg:w-12 hover:w-44 overflow-hidden">
                <div className="flex items-center gap-2 px-2 mb-1 opacity-0 group-hover/panel:opacity-100 transition-opacity duration-300 min-max">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">Navigasyon</h3>
                </div>
                <nav className="flex flex-col gap-1 lg:gap-1.5">
                  {[
                    { id: 'top', label: 'En Üste', icon: ArrowUp },
                    { id: 'header', label: 'Başlık', icon: FileText },
                    { id: 'items', label: 'Gündem', icon: ListOrdered },
                    { id: 'footer', label: 'Not', icon: MessageSquare },
                    { id: 'signatures', label: 'İmzalar', icon: Users },
                    { id: 'bottom', label: 'En Alta', icon: ArrowDown },
                  ].map(section => {
                    const Icon = section.icon;
                    return (
                      <button 
                        key={section.id}
                        onClick={() => {
                          const container = document.getElementById('main-scroll-container');
                          if (!container) return;
                          if (section.id === 'top') {
                            container.scrollTo({ top: 0, behavior: 'smooth' });
                          } else if (section.id === 'bottom') {
                            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                          } else {
                            const el = document.getElementById(section.id);
                            if (el) {
                               const offset = el.offsetTop;
                               container.scrollTo({ top: offset, behavior: 'smooth' });
                            }
                          }
                        }}
                        className="group/btn flex items-center p-2 lg:p-2.5 text-[10px] font-bold text-slate-600 hover:bg-blue-600 hover:text-white rounded-lg lg:rounded-xl transition-all duration-300 uppercase tracking-tight active:scale-90 border border-transparent hover:border-blue-400 min-w-max"
                        title={section.label}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="opacity-0 group-hover/panel:opacity-100 transition-opacity duration-300 ml-3 whitespace-nowrap">{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          <div className="flex-1 pb-20 w-full overflow-x-hidden" id="main-scroll-container">
            {activeTab === 'editor' ? (
              <div className="w-full max-w-5xl mx-auto space-y-8 px-2 sm:px-4">
                {/* Metadata Section */}
                <div id="header" className={`bg-white p-5 rounded border border-slate-300 shadow-sm space-y-4 scroll-mt-20 transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Resmi Kayıt Bilgileri</h3>
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                      <input 
                        type="checkbox" 
                        id="isPostponed"
                        className="rounded text-blue-700 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        checked={localForm.isPostponed || false}
                        disabled={isSaving}
                        onChange={(e) => updateForm({ isPostponed: e.target.checked })}
                      />
                      <label htmlFor="isPostponed" className="text-[11px] font-bold text-blue-700 cursor-pointer select-none uppercase">
                        Toplantı Ertelendi
                      </label>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase block">Karar Tarihi</label>
                        {!localForm.isPostponed && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <input 
                        type="date"
                        disabled={isSaving || !localForm.isPostponed}
                        className={`w-full text-sm border border-slate-300 rounded p-2 outline-none transition-all ${!localForm.isPostponed || isSaving ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 border-blue-200'}`}
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
                      />
                      {!localForm.isPostponed && <p className="text-[10px] text-slate-400 mt-1 italic">* Değiştirmek için 'Ertelendi' seçiniz.</p>}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase block">Karar Saati</label>
                        {!localForm.isPostponed && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <input 
                        type="time"
                        disabled={isSaving || !localForm.isPostponed}
                        className={`w-full text-sm border border-slate-300 rounded p-2 outline-none transition-all ${!localForm.isPostponed || isSaving ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 border-blue-200'}`}
                        value={localForm.decisionTime || ''}
                        onChange={(e) => updateForm({ decisionTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase block">Karar No</label>
                        {!localForm.isPostponed && <Lock className="w-3 h-3 text-slate-400" />}
                      </div>
                      <DebouncedInput 
                        className={`w-full text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none ${!localForm.isPostponed || isSaving ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500 border-blue-200'}`} 
                        value={localForm.decisionNo || ''}
                        disabled={isSaving || !localForm.isPostponed}
                        onChange={(val) => {
                          const formattedDate = localForm.decisionDate ? new Date(localForm.decisionDate).toLocaleDateString('tr-TR') : '.../.../20...';
                          const newTitle = `${formattedDate} - Karar No: ${val || '...'}`;
                          updateForm({ 
                            decisionNo: val, 
                            headerLine4: newTitle, 
                            title: newTitle 
                          });
                        }}
                      />
                      {!localForm.isPostponed && <p className="text-[10px] text-slate-400 mt-1 italic">* Değiştirmek için 'Ertelendi' seçiniz.</p>}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-500 uppercase block">Kurum Başlığı (T.C. ...)</label>
                      <div className="flex items-center gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Satır Aralığı:</label>
                        <select 
                          className="text-[10px] border border-slate-300 rounded px-1.5 py-0.5"
                          disabled={isSaving}
                          value={localForm.layout?.headerLineSpacing || 'normal'}
                          onChange={(e) => updateForm({ layout: { ...localForm.layout!, headerLineSpacing: e.target.value } })}
                        >
                          <option value="0.8">Çok Dar</option>
                          <option value="1">Dar</option>
                          <option value="normal">Normal</option>
                          <option value="1.5">Geniş</option>
                        </select>
                      </div>
                    </div>
                    <RichTextEditor 
                      value={localForm.headerTop}
                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                      onChange={(val) => updateForm({ headerTop: val })}
                      placeholder="Başlık metnini girin..."
                    />
                  </div>

                  <div className="pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tarih / Karar No Görünümü (Belge Üzerindeki)</label>
                    <DebouncedInput 
                      className={`w-full text-sm border border-slate-300 rounded p-2 outline-none bg-slate-50 text-slate-400 cursor-not-allowed`} 
                      value={localForm.headerLine4}
                      disabled={true}
                      onChange={(val) => updateForm({ headerLine4: val, title: val })}
                      placeholder="Otomatik oluşturulur..."
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div id="items" className={`bg-white p-5 rounded border border-slate-300 shadow-sm space-y-4 scroll-mt-20 transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">Gündem Maddeleri</h3>
                    <div className="flex gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={importWord} 
                        accept=".docx" 
                        className="hidden" 
                      />
                      <button 
                        disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                        onClick={() => fileInputRef.current?.click()} 
                        className="flex items-center gap-1 text-xs font-bold uppercase bg-blue-50 text-blue-700 px-3 py-1.5 rounded hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
                        title="Word (.docx) dosyasından gündem maddelerini içe aktar"
                      >
                        <FileUp className="w-3 h-3" /> Word'den Aktar
                      </button>
                      <button 
                        disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                        onClick={() => addItem('numbered')} 
                        className="flex items-center gap-1 text-xs font-bold uppercase bg-slate-100 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-200 border border-slate-300 disabled:opacity-50"
                      >
                        <ListOrdered className="w-3 h-3" /> Numaralı
                      </button>
                      <button 
                        disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                        onClick={() => addItem('bullet')} 
                        className="flex items-center gap-1 text-xs font-bold uppercase bg-slate-100 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-200 border border-slate-300 disabled:opacity-50"
                      >
                        <Minus className="w-3 h-3" /> Çizgili
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6 mt-4">
                    <AnimatePresence>
                      {localForm.items?.map((item, index) => {
                        const renderEditorItem = (itm: FormItem, idx: number, isSub: boolean = false, parentId: string | null = null, pIdx: number = 0) => {
                          return (
                            <React.Fragment key={itm.id}>
                              {!isSub && (
                                <div className="relative h-4 group/add">
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/add:opacity-100 transition-opacity">
                                    <div className="h-px bg-blue-200 w-full"></div>
                                    <button 
                                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                      onClick={() => isSub && parentId ? addSubItemAt(parentId, idx) : addItemAt(idx)}
                                      className="absolute bg-blue-600 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-1 px-2 z-10"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span className="text-[10px] font-bold uppercase">Araya Ekle</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="relative group border border-slate-100 hover:border-blue-200 p-4 rounded bg-slate-50 transition-colors shadow-sm"
                              >
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity z-10">
                                  {!isSub && (
                                    <button 
                                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                      onClick={() => {
                                        let newSubItems = [...(itm.subItems || [])];
                                        newSubItems.push({ id: uuidv4(), type: 'bullet', text: '' });
                                        updateItem(itm.id, { subItems: newSubItems });
                                      }} 
                                      className="bg-white border border-slate-200 text-green-600 hover:bg-green-50 p-1.5 rounded shadow-sm flex items-center gap-1 text-xs font-bold disabled:opacity-50" 
                                      title="Alt Madde Ekle"
                                    >
                                      <Plus className="w-3 h-3" /> Alt Madde
                                    </button>
                                  )}
                                  {!itm.hasTable && !isSub && (
                                    <button 
                                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                      onClick={() => addTableToItem(itm.id)} 
                                      className="bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 p-1.5 rounded shadow-sm disabled:opacity-50" 
                                      title="Tablo Ekle"
                                    >
                                      <TableIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button 
                                    disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                    onClick={() => {
                                      if (isSub && parentId) {
                                        const parent = localForm.items?.find(i => i.id === parentId);
                                        if (parent) {
                                          const newSub = parent.subItems?.filter(s => s.id !== itm.id);
                                          updateItem(parentId, { subItems: newSub });
                                        }
                                      } else {
                                        removeItem(itm.id)
                                      }
                                    }} 
                                    className="bg-white border border-slate-200 text-red-600 hover:bg-red-50 p-1.5 rounded shadow-sm disabled:opacity-50" 
                                    title="Maddeyi Sil"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="flex gap-3">
                                  <div className="pt-2 font-bold text-slate-500 w-16 flex flex-col items-center gap-2 shrink-0">
                                    <input 
                                      type="number"
                                      value={idx + 1}
                                      min={1}
                                      max={isSub && parentId ? (localForm.items?.find(i => i.id === parentId)?.subItems?.length || 1) : (localForm.items?.length || 1)}
                                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) moveItem(itm.id, val - 1, parentId);
                                      }}
                                      className="w-12 text-center text-xs bg-white border border-slate-200 rounded p-1 outline-none focus:ring-1 focus:ring-blue-400"
                                      title="Sıralamayı değiştir"
                                    />
                                    <span className="text-[10px] uppercase text-slate-400">{itm.type === 'numbered' ? (isSub ? 'Alt' : 'Madde') : '-'}</span>
                                  </div>
                                  <div className="flex-1 space-y-4 min-w-0">
                                    <div className="flex gap-4 items-start">
                                      <div className="flex-1">
                                        <RichTextEditor 
                                          value={itm.text}
                                          disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                          onChange={(val) => {
                                            if (isSub && parentId) {
                                              const parentItem = localForm.items?.find(i => i.id === parentId);
                                              if (parentItem && parentItem.subItems) {
                                                const newSub = parentItem.subItems.map(s => s.id === itm.id ? { ...s, text: val } : s);
                                                updateItem(parentId, { subItems: newSub });
                                              }
                                            } else {
                                              updateItem(itm.id, { text: val });
                                            }
                                          }}
                                          placeholder="Maddenin metnini girin..."
                                        />
                                      </div>
                                      <div className="w-56 shrink-0 flex gap-2">
                                        <div className="flex-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Yaş</label>
                                          <input 
                                            type="text"
                                            value={itm.age || ''}
                                            placeholder="Yaş"
                                            disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                            onChange={(e) => {
                                              if (isSub && parentId) {
                                                const parentItem = localForm.items?.find(i => i.id === parentId);
                                                if (parentItem && parentItem.subItems) {
                                                  const newSub = parentItem.subItems.map(s => s.id === itm.id ? { ...s, age: e.target.value } : s);
                                                  updateItem(parentId, { subItems: newSub });
                                                }
                                              } else {
                                                updateItem(itm.id, { age: e.target.value });
                                              }
                                            }}
                                            className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                          />
                                        </div>
                                        <div className="flex-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Cinsiyet</label>
                                          <select
                                            value={itm.gender || ''}
                                            disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                            onChange={(e) => {
                                              const gender = e.target.value as 'male' | 'female' | '';
                                              if (isSub && parentId) {
                                                const parentItem = localForm.items?.find(i => i.id === parentId);
                                                if (parentItem && parentItem.subItems) {
                                                  const newSub = parentItem.subItems.map(s => s.id === itm.id ? { ...s, gender: gender || undefined } : s);
                                                  updateItem(parentId, { subItems: newSub });
                                                }
                                              } else {
                                                updateItem(itm.id, { gender: gender || undefined });
                                              }
                                            }}
                                            className="w-full text-xs border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white h-[34px]"
                                          >
                                            <option value="">-</option>
                                            <option value="female">KADIN</option>
                                            <option value="male">ERKEK</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Table Editor */}
                                    {itm.hasTable && itm.table && !isSub && (
                                      <div className="bg-white p-4 rounded border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="flex justify-between items-center mb-4">
                                          <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <TableIcon className="w-4 h-4" /> Tablo Düzenleyici
                                          </h4>
                                          <div className="flex gap-4 items-center">
                                            <label className={`text-xs font-bold text-green-600 uppercase cursor-pointer hover:underline flex items-center gap-1 ${isSaving || (localForm.isLocked && !localForm.isPostponed) ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                              <FileUp className="w-3.5 h-3.5" /> Excel Yükle
                                              <input 
                                                type="file" 
                                                accept=".xlsx,.xls,.csv" 
                                                className="hidden" 
                                                disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                onChange={(e) => importExcelToTable(itm.id, e)}
                                              />
                                            </label>
                                            <button 
                                              onClick={() => exportExcelFromTable(itm.table!, idx)} 
                                              className="text-xs font-bold text-blue-600 uppercase hover:underline flex items-center gap-1"
                                            >
                                              <FileDown className="w-3.5 h-3.5" /> Excel İndir
                                            </button>
                                            <button disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)} onClick={() => removeTableFromItem(itm.id)} className="text-xs font-bold text-red-600 uppercase hover:underline disabled:opacity-50">Tabloyu Kaldır</button>
                                          </div>
                                        </div>
                                        
                                        <div className="overflow-x-auto pb-4">
                                          <div className="flex flex-col gap-2 min-w-max">
                                            {/* Columns Header */}
                                            <div className="flex gap-2 items-center">
                                              <div className="w-8 shrink-0"></div>
                                              {itm.table.columns.map((col, cI) => (
                                                <div key={cI} className={`relative group/col flex-1 min-w-[120px] ${isSiraColumn(col) ? 'flex-none min-w-0 w-20' : ''}`}>
                                                  <input 
                                                    disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                    className="w-full pr-8 text-xs font-bold uppercase border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 disabled:opacity-50" 
                                                    value={col}
                                                    placeholder={`Sütun ${cI + 1}`}
                                                    onChange={(e) => {
                                                      const newCols = [...itm.table!.columns];
                                                      newCols[cI] = e.target.value;
                                                      updateItem(itm.id, { table: { ...itm.table!, columns: newCols } });
                                                    }}
                                                  />
                                                  {itm.table!.columns.length > 1 && (
                                                    <button 
                                                      disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                      onClick={() => {
                                                        const newCols = itm.table!.columns.filter((_, i) => i !== cI);
                                                        const newRows = itm.table!.rows.map(r => r.filter((_, i) => i !== cI));
                                                        updateItem(itm.id, { table: { ...itm.table!, columns: newCols, rows: newRows } });
                                                      }}
                                                      className="absolute right-1 top-[5px] p-1 text-red-500 hover:bg-red-50 rounded opacity-0 group-hover/col:opacity-100 transition-opacity disabled:opacity-0"
                                                      title="Sütunu Sil"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                              <button 
                                                disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                onClick={() => {
                                                  const newCols = [...itm.table!.columns, `Yeni Sütun`];
                                                  const newRows = itm.table!.rows.map(r => [...r, '']);
                                                  updateItem(itm.id, { table: { columns: newCols, rows: newRows } });
                                                }}
                                                className="shrink-0 p-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-600 w-[100px] disabled:opacity-50"
                                              >
                                                + SÜTUN Ekle
                                              </button>
                                            </div>
                                            
                                            {/* Rows */}
                                            {itm.table.rows.map((row, rI) => (
                                              <div key={rI} className="flex gap-2 items-center group/row">
                                                <div className="w-8 shrink-0 text-center text-xs font-bold text-slate-400">{rI + 1}</div>
                                                {row.map((cell, cI) => {
                                                  const isSira = isSiraColumn(itm.table!.columns[cI]);
                                                  return (
                                                    <input 
                                                      key={cI}
                                                      readOnly={isSira || isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                      className={`${isSira ? 'w-20 flex-none' : 'flex-1 min-w-[120px]'} text-sm border border-slate-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none ${isSira ? 'bg-slate-100 text-center text-slate-500 font-bold' : ''} disabled:opacity-50`}
                                                      value={isSira ? (rI + 1).toString() : cell}
                                                      onChange={(e) => {
                                                        if (isSira) return;
                                                        const newRows = [...itm.table!.rows];
                                                        newRows[rI][cI] = e.target.value;
                                                        updateItem(itm.id, { table: { ...itm.table!, rows: newRows } });
                                                      }}
                                                    />
                                                  );
                                                })}
                                                <button 
                                                  disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                  onClick={() => {
                                                    const newRows = itm.table!.rows.filter((_, i) => i !== rI);
                                                    updateItem(itm.id, { table: { ...itm.table!, rows: newRows } });
                                                  }}
                                                  className="shrink-0 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded w-[100px] text-xs font-bold text-center opacity-0 group-hover/row:opacity-100 transition-opacity disabled:opacity-0"
                                                >
                                                  Satırı Sil
                                                </button>
                                              </div>
                                            ))}
                                            <div className="flex gap-2 items-center mt-2">
                                              <div className="w-8 shrink-0"></div>
                                              <button 
                                                disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                                onClick={() => {
                                                  const newRow = Array(itm.table!.columns.length).fill('');
                                                  const newRows = [...itm.table!.rows, newRow];
                                                  updateItem(itm.id, { table: { ...itm.table!, rows: newRows } });
                                                }}
                                                className="text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded p-2 px-4 shadow-sm disabled:opacity-50"
                                              >
                                                + SATIR Ekle
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {itm.subItems && itm.subItems.length > 0 && !isSub && (
                                      <div className="ml-8 mt-4 space-y-4 border-l-2 border-slate-200 pl-4">
                                        {itm.subItems.map((sItem, sIdx) => renderEditorItem(sItem as any, sIdx, true, itm.id, idx))}
                                        <div className="flex justify-start">
                                          <button 
                                            disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                                            onClick={() => {
                                              let newSubItems = [...(itm.subItems || [])];
                                              newSubItems.push({ id: uuidv4(), type: 'bullet', text: '' });
                                              updateItem(itm.id, { subItems: newSubItems });
                                            }}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all border border-green-100 disabled:opacity-50"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>SONA ALT MADDE EKLE</span>
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </React.Fragment>
                          );
                        };
                        return renderEditorItem(item, index);
                      })}
                    </AnimatePresence>

                    {localForm.items?.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                        Maddeler ekleyerek başlayın.
                      </div>
                    )}

                    <div className="mt-8 flex flex-col items-center gap-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-2">
                        <button 
                          disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                          onClick={() => {
                            const newItem: FormItem = { id: uuidv4(), type: 'numbered', text: '' };
                            updateForm({ items: [newItem, ...(localForm.items || [])] });
                          }}
                          className="flex items-center gap-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 border border-slate-200 disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>BAŞA EKLE</span>
                        </button>
                        <button 
                          disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                          onClick={() => addItem('numbered')}
                          className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-6 py-2 rounded-lg font-bold transition-all shadow-sm group active:scale-95 border border-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                          <span>SONA EKLE</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div id="footer" className={`bg-white p-5 rounded border border-slate-300 shadow-sm space-y-4 scroll-mt-20 transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                  <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-2">Karar Notu (Alt Açıklama)</h3>
                  <RichTextEditor 
                    value={localForm.footerText}
                    disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                    onChange={(val) => updateForm({ footerText: val })}
                    placeholder="Karar metnini buraya girin..."
                  />
                </div>

                {/* Signatures Section */}
                <div id="signatures" className={`bg-white p-5 rounded border border-slate-300 shadow-sm space-y-4 scroll-mt-20 transition-opacity ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase">İmza Alanı Seçimi</h3>
                    <div className="flex gap-2">
                      <button 
                        disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                        onClick={() => updateForm({ signatureMembers: allMembers.map(m => m.id) })}
                        className="text-[10px] font-bold text-blue-600 uppercase hover:bg-blue-50 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Tümünü Seç
                      </button>
                      <button 
                        disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                        onClick={() => updateForm({ signatureMembers: [] })}
                        className="text-[10px] font-bold text-red-600 uppercase hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Tümünü Kaldır
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">Formda görünecek imzacıları seçin. Sıralama Ayarlar &gt; Üyeler kısmından yönetilir.</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allMembers.map(member => (
                      <label key={member.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-all shadow-sm bg-white active:scale-95">
                        <input 
                          type="checkbox" 
                          className="rounded text-blue-700 focus:ring-blue-500 w-4 h-4"
                          checked={localForm.signatureMembers.includes(member.id)}
                          disabled={isSaving || (localForm.isLocked && !localForm.isPostponed)}
                          onChange={(e) => {
                            const newSignatures = e.target.checked 
                              ? [...localForm.signatureMembers, member.id]
                              : localForm.signatureMembers.filter(id => id !== member.id);
                            updateForm({ signatureMembers: newSignatures });
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs text-center uppercase leading-tight">{member.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter mt-0.5">{member.title}</span>
                          {member.isProxy && <span className="text-[9px] font-bold text-orange-600 text-center uppercase mt-0.5">(Vekil: {member.proxyName})</span>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 overflow-auto preview-container">
                <div className="flex justify-center mb-4 sticky top-0 z-20">
                  <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-xl flex flex-col gap-3 min-w-[500px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Otomatik Sıralama Kontrolleri</span>
                      <button onClick={() => setSortOrder('none')} className="text-[9px] font-bold text-red-500 hover:underline uppercase">Sıralamayı Sıfırla</button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">1. Cinsiyet Önceliği</span>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setGenderPriority('female')}
                            className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${genderPriority === 'female' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${genderPriority === 'female' ? 'bg-pink-500' : 'bg-slate-300'}`}></div>
                            ÖNCE KADINLAR
                          </button>
                          <button 
                            onClick={() => setGenderPriority('male')}
                            className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center justify-center gap-1.5 ${genderPriority === 'male' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${genderPriority === 'male' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                            ÖNCE ERKEKLER
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase">2. Yaş Sıralaması</span>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setSortOrder('asc')}
                            className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${sortOrder === 'asc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            KÜÇÜKTEN BÜYÜĞE
                          </button>
                          <button 
                            onClick={() => setSortOrder('desc')}
                            className={`flex-1 px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${sortOrder === 'desc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            BÜYÜKTEN KÜÇÜĞE
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-400 italic text-center">* Sadece yaş veya cinsiyet belirtilen maddeler kendi aralarında yer değiştirir. Kurumsal maddeler sabit kalır.</p>
                  </div>
                </div>
                <div ref={printRef} className="a4-page">
                  <PrintPreview 
                    form={(() => {
                      const sortItems = (items: any[]): any[] => {
                        if (!items || items.length === 0) return items;
                        
                        // First, sort children recursively
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
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Navigation Floating Buttons */}
      {activeTab === 'editor' && (
        <div className="fixed bottom-10 right-10 flex flex-col gap-3 z-50 print:hidden transition-opacity">
          <button 
            disabled={isSaving}
            onClick={() => {
              const container = document.getElementById('main-scroll-container');
              container?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
            title="En Üste Git"
          >
            <ArrowUp className="w-6 h-6" />
          </button>
          <button 
            disabled={isSaving}
            onClick={() => {
              const container = document.getElementById('main-scroll-container');
              container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
            }}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-110 transition-all active:scale-95 disabled:opacity-50"
            title="En Alta Git"
          >
            <ArrowDown className="w-6 h-6" />
          </button>
        </div>
      )}
      
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
