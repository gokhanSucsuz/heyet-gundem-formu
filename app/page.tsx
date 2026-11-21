'use client';

import { useState, useMemo } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import Link from 'next/link';
import { Plus, FileText, Calendar, Trash2, Lock, Copy, Bookmark, Search, ListChecks, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked' | 'postponed' | 'passive'>('all');
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
        const isActive = f.isActive !== false;
        if (isActive && f.decisionDate && f.decisionDate < today) {
          await db.forms.update(f.id, { isActive: false });
        }
      }
    }

    const templateForm = forms?.find(f => f.isTemplate === true);
    const id = uuidv4();

    if (templateForm) {
      const newForm = {
        ...templateForm,
        id,
        isTemplate: false,
        title: 'Yeni Karar Formu',
        isLocked: false,
        isPostponed: false,
        isActive: true,
        decisionNo: '',
        decisionDate: today,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        signatureSnapshots: [],
        items: (templateForm.items || []).map(item => ({
          ...item,
          id: uuidv4(),
          table: item.table ? {
            ...item.table,
            columns: [...item.table.columns],
            rows: item.table.rows.map(r => [...r])
          } : undefined,
          subItems: item.subItems?.map(sub => ({ ...sub, id: uuidv4() }))
        }))
      };
      await db.forms.add(newForm);
      toast.success('Şablon kullanılarak yeni karar formu oluşturuldu.');
      router.push(`/forms/${id}`);
      return;
    }

    await db.forms.add({
      id,
      title: 'Yeni Karar Formu',
      documentDate: new Date().toLocaleDateString('tr-TR'),
      decisionNo: `${new Date().getFullYear()} / 01`,
      decisionDate: today,
      decisionTime: '10:00',
      isPostponed: false,
      isActive: true,
      headerTop: 'T.C\n.......... VALİLİĞİ / KAYMAKAMLIĞI\nSosyal Yardımlaşma ve Dayanışma Vakfı Başkanlığı',
      headerMiddle: '',
      headerBottom: '',
      headerLine4: `${new Date(today).toLocaleDateString('tr-TR')} - Karar No: ${new Date().getFullYear()} / 01`,
      items: [
        {
          id: uuidv4(),
          type: 'numbered',
          text: 'Vakfımıza yapılan sosyal yardım taleplerinin görüşülmesi.',
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
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      message: 'Bu karar formunu kalıcı olarak silmek istediğinize emin misiniz?',
      onConfirm: async () => {
        await db.forms.delete(id);
        toast.success('Form silindi.');
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const duplicateForm = async (formToCopy: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      message: 'Bu formun tüm maddeleriyle birlikte bir kopyasını oluşturmak istediğinize emin misiniz?',
      onConfirm: async () => {
        const newId = uuidv4();
        const newForm = {
          ...formToCopy,
          id: newId,
          title: formToCopy.title ? `${formToCopy.title} (Kopya)` : 'Kopya Form',
          isTemplate: false,
          isLocked: false,
          isPostponed: false,
          isActive: true,
          decisionNo: '',
          decisionDate: new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          signatureSnapshots: [],
          items: (formToCopy.items || []).map((item: any) => ({
            ...item,
            id: uuidv4(),
            table: item.table ? {
              ...item.table,
              columns: [...item.table.columns],
              rows: item.table.rows.map((r: string[]) => [...r])
            } : undefined,
            subItems: item.subItems?.map((sub: any) => ({ ...sub, id: uuidv4() }))
          }))
        };
        await db.forms.add(newForm);
        toast.success('Form kopyalandı.');
        setConfirmModal({ ...confirmModal, isOpen: false });
        router.push(`/forms/${newId}`);
      }
    });
  };

  const toggleActiveStatus = async (form: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    
    const newStatus = form.isActive === false ? true : false;
    
    setConfirmModal({
      isOpen: true,
      message: `Bu formu ${newStatus ? 'aktif' : 'pasif'} duruma getirmek istediğinize emin misiniz?`,
      onConfirm: async () => {
        await db.forms.update(form.id, { isActive: newStatus });
        toast.success(`Form ${newStatus ? 'aktif' : 'pasif'} duruma getirildi.`);
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const toggleTemplateStatus = async (form: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAdmin) return;
    
    setConfirmModal({
      isOpen: true,
      message: form.isTemplate 
        ? 'Bu formun şablon özelliğini iptal etmek istediğinize emin misiniz?' 
        : 'Bu formu sistem şablonu olarak belirlemek istediğinize emin misiniz? (Yeni formlar bu şablondan üretilir)',
      onConfirm: async () => {
        if (form.isTemplate) {
          await db.forms.update(form.id, { isTemplate: false });
          toast.success('Şablon iptal edildi.');
        } else {
          const others = forms?.filter(f => f.isTemplate && f.id !== form.id) || [];
          for (const o of others) {
            await db.forms.update(o.id, { isTemplate: false });
          }
          await db.forms.update(form.id, { isTemplate: true });
          toast.success('Form sistem şablonu olarak belirlendi.');
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  const visibleForms = useMemo(() => {
    if (!forms) return [];
    return forms.filter(f => {
      if (!isAdmin && f.isTemplate) return false;
      if (statusFilter === 'active' && (f.isActive === false || f.isLocked)) return false;
      if (statusFilter === 'locked' && !f.isLocked) return false;
      if (statusFilter === 'postponed' && !f.isPostponed) return false;
      if (statusFilter === 'passive' && f.isActive !== false) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr');
        const matchTitle = (f.title || '').toLocaleLowerCase('tr').includes(q);
        const matchNo = (f.decisionNo || '').toLocaleLowerCase('tr').includes(q);
        const matchDate = f.decisionDate ? new Date(f.decisionDate).toLocaleDateString('tr-TR').includes(q) : false;
        return matchTitle || matchNo || matchDate;
      }
      return true;
    });
  }, [forms, isAdmin, statusFilter, searchQuery]);

  return (
    <AppLayout>
      {/* Compact Header & Primary Action */}
      <div className="bg-white border border-slate-300 rounded-xl p-4 mb-4 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            <span>Mütevelli Heyeti Gündem & Karar Formları</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Belgeyi açarak gerçek Word sayfası düzeninde maddeleri ve tabloları hazırlayın.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={createForm}
            className="flex items-center justify-center gap-1.5 w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Karar Formu</span>
          </button>
        )}
      </div>

      {/* Compact Filter & Search Bar */}
      <div className="bg-white border border-slate-300 rounded-xl p-2.5 mb-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Karar adı, karar no veya tarih ile ara..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 md:pb-0">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'active', label: 'Hazırlanan' },
            { id: 'locked', label: 'Kesinleşen' },
            { id: 'postponed', label: 'Ertelenen' },
            { id: 'passive', label: 'Arşiv / Pasif' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!forms ? (
        <div className="text-center py-12 text-slate-500 text-sm font-bold">Yükleniyor...</div>
      ) : visibleForms.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-slate-300 shadow-2xs px-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1 uppercase">Karar Formu Bulunamadı</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-5 text-xs">
            {searchQuery || statusFilter !== 'all'
              ? 'Arama veya filtre kriterlerinize uygun karar formu bulunamadı.'
              : isAdmin
              ? 'Yeni bir karar veya gündem formu oluşturarak başlayabilirsiniz.'
              : 'Yönetici tarafından yeni bir karar veya gündem formu oluşturulduğunda burada listelenecektir.'}
          </p>
          {isAdmin && statusFilter === 'all' && !searchQuery && (
            <button
              type="button"
              onClick={createForm}
              className="inline-flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Formu Oluştur</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {visibleForms.map(form => {
            const isLocked = form.isLocked;
            const isPostponed = form.isPostponed;
            const isPassive = form.isActive === false;
            const itemCount = form.items?.length || 0;
            const tableCount = (form.items || []).filter(i => i.hasTable).length;
            
            let iconBgColor = 'bg-blue-50';
            let iconTextColor = 'text-blue-700';
            let borderColor = 'border-slate-300 hover:border-blue-600';
            let badgeText = 'HAZIRLANIYOR';
            let badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
            
            if (isPostponed) {
              iconBgColor = 'bg-amber-50';
              iconTextColor = 'text-amber-700';
              borderColor = 'border-amber-300 hover:border-amber-600';
              badgeText = 'ERTELENDİ';
              badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
            } else if (isLocked) {
              iconBgColor = 'bg-emerald-50';
              iconTextColor = 'text-emerald-700';
              borderColor = 'border-emerald-300 hover:border-emerald-600';
              badgeText = 'KESİNLEŞTİ';
              badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
            }
            if (isPassive) {
              iconBgColor = 'bg-slate-100';
              iconTextColor = 'text-slate-500';
              borderColor = 'border-slate-200 hover:border-slate-400 opacity-80';
              badgeText = 'PASİF / ARŞİV';
              badgeColor = 'bg-slate-100 text-slate-600 border-slate-300';
            }
            if (form.isTemplate) {
              iconBgColor = 'bg-amber-100';
              iconTextColor = 'text-amber-800';
              borderColor = 'border-amber-400 hover:border-amber-600 border-2 border-dashed';
              badgeText = 'SİSTEM ŞABLONU';
              badgeColor = 'bg-amber-100 text-amber-900 border-amber-300';
            }

            return (
              <Link key={form.id || (form as any)._id} href={`/forms/${form.id}`} className="block group">
                <div className={`bg-white rounded-xl border ${borderColor} p-4 hover:shadow-md transition-all h-full flex flex-col relative overflow-hidden`}>
                  {/* Card Top: Status & Always-Accessible Mobile Actions */}
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${iconBgColor} ${iconTextColor} p-1.5 rounded-lg relative`}>
                        <FileText className="w-4 h-4" />
                        {isLocked && !isPostponed && (
                          <div className="absolute -right-1 -bottom-1 bg-emerald-600 text-white rounded-full p-0.5">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${badgeColor} uppercase tracking-tight`}>
                        {badgeText}
                      </span>
                    </div>

                    {/* Action Buttons - Always visible on mobile, subtle on desktop */}
                    <div className="flex items-center gap-1 relative z-10">
                      <button 
                        type="button"
                        onClick={(e) => duplicateForm(form, e)}
                        className="text-slate-500 hover:text-blue-700 p-1.5 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                        title="Formu Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={(e) => toggleTemplateStatus(form, e)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            form.isTemplate
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-50 text-slate-500 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                          }`}
                          title={form.isTemplate ? "Şablonu İptal Et" : "Şablon Olarak Belirle"}
                        >
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button 
                          type="button"
                          onClick={(e) => toggleActiveStatus(form, e)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isPassive
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-50 text-slate-500 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                          }`}
                          title={isPassive ? "Formu Aktif Et" : "Formu Pasif Yap"}
                        >
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!isLocked && isAdmin && (
                        <button 
                          type="button"
                          onClick={(e) => deleteForm(form.id, e)}
                          className="text-slate-500 hover:text-red-600 p-1.5 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                          title="Formu Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Form Title */}
                  <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 leading-snug uppercase group-hover:text-blue-700 transition-colors">
                    {form.title || 'İSİMSİZ KARAR FORMU'}
                  </h3>

                  {/* Metadata Footer */}
                  <div className="text-xs font-medium text-slate-600 flex flex-wrap items-center justify-between gap-2 mt-auto pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-bold text-[10px] uppercase text-slate-400">No:</span>
                        <strong className="text-slate-800">{form.decisionNo || '-'}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{form.decisionDate ? new Date(form.decisionDate).toLocaleDateString('tr-TR') : 'Tarihsiz'}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {itemCount} Madde
                      </span>
                      {tableCount > 0 && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                          {tableCount} Tablo
                        </span>
                      )}
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
