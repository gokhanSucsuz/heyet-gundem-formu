'use client';

import { useState } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import Link from 'next/link';
import { Plus, FileText, Calendar, Trash2, Lock, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { usePersonnel } from '@/components/PersonnelProvider';

export default function FormsPage() {
  const router = useRouter();
  const forms = useLiveQuery(() => db.forms.orderBy('updatedAt').reverse().toArray());
  const { personnel } = usePersonnel();
  const isAdmin = personnel?.isAdmin || false;
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });

  const createForm = async () => {
    if (!isAdmin) {
      toast.error('Yeni form oluşturma yetkiniz bulunmuyor.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Otomatik pasif yapma: Yeni form oluşturulurken, tarihi bugünden eski olan aktif formları pasife çek.
    if (forms) {
      for (const f of forms) {
        const isActive = f.isActive !== false; // default true
        if (isActive && f.decisionDate && f.decisionDate < today) {
          await db.forms.update(f.id, { isActive: false });
        }
      }
    }

    const id = uuidv4();
    await db.forms.add({
      id,
      title: 'Yeni Karar Formu',
      documentDate: new Date().toLocaleDateString('tr-TR'),
      decisionNo: '2023/ 01',
      decisionDate: today,
      decisionTime: '10:00',
      isPostponed: false,
      isActive: true,
      headerTop: 'T.C\n.......... İLİ\n.......... BAŞKANLIĞI',
      headerMiddle: '',
      headerBottom: '',
      headerLine4: 'Tarih ve Karar No',
      items: [
        {
          id: uuidv4(),
          type: 'numbered',
          text: 'Örnek kişinin talebi',
        }
      ],
      footerText: 'Yukarıda maddeler halinde belirtilen yardım talepleri görüşülmüş olup verilen kararlar oy birliği ile alınmıştır.',
      signatureMembers: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layout: { 
        fontFamily: 'Verdana, sans-serif',
        fontSizeTitle: 12,
        fontSizeContent: 11,
        lineSpacing: 'normal', 
        marginX: 10,
        marginY: 10,
        watermarkOpacity: 5,
        watermarkSize: 36,
        signatureFontSize: 12,
        signatureSpacing: 1,
        showPageNumbers: true
      }
    });
    router.push(`/forms/${id}`);
  };

  const deleteForm = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      message: 'Bu formu silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        await db.forms.delete(id);
        toast.success('Form silindi.');
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const duplicateForm = async (formToCopy: any, e: React.MouseEvent) => {
    e.preventDefault();
    const newId = uuidv4();
    const newForm = {
      ...formToCopy,
      id: newId,
      title: formToCopy.title ? `${formToCopy.title} (Kopya)` : 'Kopya Form',
      isLocked: false,
      isPostponed: false,
      isActive: true,
      decisionNo: '',
      decisionDate: new Date().toISOString().split('T')[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      signatureSnapshots: []
    };
    await db.forms.add(newForm);
    toast.success('Şablon oluşturuldu. Yeni forma yönlendiriliyorsunuz...');
    router.push(`/forms/${newId}`);
  };

  const toggleActiveStatus = async (form: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    
    const newStatus = form.isActive === false ? true : false;
    await db.forms.update(form.id, { isActive: newStatus });
    toast.success(`Form ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`);
  };

  return (
    <AppLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">Karar Formları</h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Hazırlanmış karar ve gündem formları</p>
        </div>
        {isAdmin && (
          <button
            onClick={createForm}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            YENİ FORM OLUŞTUR
          </button>
        )}
      </div>

      {!forms ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : forms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded border border-slate-300 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2 uppercase">Henüz form bulunmuyor</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">
            Yeni bir karar veya gündem formu oluşturarak başlayabilirsiniz.
          </p>
          <button
            onClick={createForm}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded text-sm font-bold transition-colors mx-auto shadow-sm"
          >
            <Plus className="w-5 h-5" />
            İLK FORMU OLUŞTUR
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map(form => {
            const isLocked = form.isLocked;
            const isPostponed = form.isPostponed;
            const isPassive = form.isActive === false;
            
            let iconBgColor = 'bg-blue-50';
            let iconTextColor = 'text-blue-700';
            let borderColor = 'border-slate-300 hover:border-blue-500';
            let badgeText = '';
            let badgeColor = '';
            
            if (isPostponed) {
              iconBgColor = 'bg-amber-50';
              iconTextColor = 'text-amber-700';
              borderColor = 'border-slate-300 hover:border-amber-500';
              badgeText = 'ERTELENDİ';
              badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
            } else if (isLocked) {
              iconBgColor = 'bg-emerald-50';
              iconTextColor = 'text-emerald-700';
              borderColor = 'border-slate-300 hover:border-emerald-500';
              badgeText = 'KESİNLEŞTİ';
              badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            }
            if (isPassive) {
              iconBgColor = 'bg-slate-100';
              iconTextColor = 'text-slate-500';
              borderColor = 'border-slate-200 hover:border-slate-400 opacity-75';
              badgeText = 'PASİF';
              badgeColor = 'bg-slate-100 text-slate-600 border-slate-300';
            }

            return (
            <Link key={form.id || (form as any)._id} href={`/forms/${form.id}`} className="block group">
              <div className={`bg-white rounded border ${borderColor} p-5 hover:shadow-md transition-all h-full flex flex-col relative z-0 overflow-hidden`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`${iconBgColor} ${iconTextColor} p-2 rounded relative`}>
                      <FileText className="w-6 h-6" />
                      {isLocked && !isPostponed && (
                        <div className="absolute -right-1.5 -bottom-1.5 bg-emerald-100 text-emerald-700 rounded-full p-0.5 border border-white">
                          <Lock className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    {badgeText && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded border ${badgeColor} uppercase tracking-tighter self-center`}>
                        {badgeText}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 relative z-10">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        duplicateForm(form, e);
                      }}
                      className="text-slate-400 hover:text-blue-600 p-1.5 bg-white hover:bg-blue-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Şablon Olarak Kopyala"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={(e) => toggleActiveStatus(form, e)}
                        className={`text-slate-400 hover:text-amber-600 p-1.5 bg-white hover:bg-amber-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isPassive ? 'text-amber-500 opacity-100' : ''}`}
                        title={isPassive ? "Formu Aktif Et" : "Formu Pasif Yap"}
                      >
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                    {!isLocked && isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteForm(form.id, e);
                        }}
                        className="text-slate-400 hover:text-red-600 p-1.5 bg-white hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Formu Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 leading-tight uppercase text-sm">
                  {form.title || 'İSİMSİZ FORM'}
                </h3>
                <div className="text-[13px] font-medium text-slate-500 flex flex-col gap-1.5 mt-auto pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-xs text-slate-400">Karar No:</span> {form.decisionNo || '-'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{form.decisionDate ? new Date(form.decisionDate).toLocaleDateString('tr-TR') : 'Tarih Belirtilmemiş'}</span>
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        variant="danger"
      />
    </AppLayout>
  );
}
