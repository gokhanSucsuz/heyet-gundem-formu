'use client';

import { useState, useMemo } from 'react';
import { db, useLiveQuery } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import Link from 'next/link';
import { 
  Plus, FileText, Calendar, Trash2, Lock, Unlock, Copy, Bookmark, 
  Search, Clock, CheckCircle2, AlertCircle, LayoutGrid, List, 
  ArrowUpDown, Users, Table as TableIcon, Edit3, ArrowRight, Archive, Sparkles
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';
import { usePersonnel } from '@/components/PersonnelProvider';

function stripHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function FormsPage() {
  const router = useRouter();
  const forms = useLiveQuery(() => db.forms.orderBy('updatedAt').reverse().toArray());
  const { personnel } = usePersonnel();
  const isAdmin = personnel?.isAdmin || false;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'locked' | 'postponed' | 'passive' | 'template'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'decisionDateDesc' | 'updatedAtDesc' | 'decisionNoDesc' | 'itemCountDesc'>('decisionDateDesc');
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
        if (isActive && !f.isTemplate && f.decisionDate && f.decisionDate < today) {
          await db.forms.update(f.id, { isActive: false });
        }
      }
    }

    const templateForm = forms?.find(f => f.isTemplate === true);
    const id = uuidv4();

    if (templateForm) {
      const formattedToday = new Date(today).toLocaleDateString('tr-TR');
      const newForm = {
        ...templateForm,
        id,
        isTemplate: false,
        title: `${formattedToday} - Yeni Karar Formu`,
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
      toast.success('Sistem şablonu kullanılarak yeni karar formu oluşturuldu.');
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
      message: 'Bu formun tüm gündem maddeleri ve tablolarıyla birlikte yeni bir kopyasını oluşturmak istediğinize emin misiniz?',
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
      message: `Bu formu ${newStatus ? 'aktif (düzenlenebilir)' : 'pasif (arşiv)'} duruma getirmek istediğinize emin misiniz?`,
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
        : 'Bu formu sistem şablonu olarak belirlemek istediğinize emin misiniz? (Yeni oluşturulan formlar bu şablondaki maddelerle başlar)',
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

  // Summary counts for tabs & stats
  const counts = useMemo(() => {
    const base = (forms || []).filter(f => isAdmin || !f.isTemplate);
    return {
      all: base.length,
      active: base.filter(f => f.isActive !== false && !f.isLocked && !f.isTemplate).length,
      locked: base.filter(f => f.isLocked && !f.isPostponed).length,
      postponed: base.filter(f => f.isPostponed).length,
      passive: base.filter(f => f.isActive === false && !f.isTemplate).length,
      template: base.filter(f => f.isTemplate).length,
    };
  }, [forms, isAdmin]);

  // Filtered and Sorted Forms
  const visibleForms = useMemo(() => {
    if (!forms) return [];
    const filtered = forms.filter(f => {
      if (!isAdmin && f.isTemplate) return false;
      if (statusFilter === 'active' && (f.isActive === false || f.isLocked || f.isTemplate)) return false;
      if (statusFilter === 'locked' && (!f.isLocked || f.isPostponed)) return false;
      if (statusFilter === 'postponed' && !f.isPostponed) return false;
      if (statusFilter === 'passive' && (f.isActive !== false || f.isTemplate)) return false;
      if (statusFilter === 'template' && !f.isTemplate) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr');
        const matchTitle = (f.title || '').toLocaleLowerCase('tr').includes(q);
        const matchNo = (f.decisionNo || '').toLocaleLowerCase('tr').includes(q);
        const matchDate = f.decisionDate ? new Date(f.decisionDate).toLocaleDateString('tr-TR').includes(q) : false;
        const matchItems = (f.items || []).some(itm => stripHtml(itm.text).toLocaleLowerCase('tr').includes(q));
        return matchTitle || matchNo || matchDate || matchItems;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      // Pin active forms (not passive, not template) first when in 'all' filter
      if (statusFilter === 'all') {
        const aIsActiveCurrent = a.isActive !== false && !a.isTemplate ? 1 : 0;
        const bIsActiveCurrent = b.isActive !== false && !b.isTemplate ? 1 : 0;
        if (aIsActiveCurrent !== bIsActiveCurrent) return bIsActiveCurrent - aIsActiveCurrent;

        const aIsTemplate = a.isTemplate ? 1 : 0;
        const bIsTemplate = b.isTemplate ? 1 : 0;
        if (aIsTemplate !== bIsTemplate) return bIsTemplate - aIsTemplate;
      }

      if (sortBy === 'decisionDateDesc') {
        const dateA = a.decisionDate ? new Date(a.decisionDate).getTime() : 0;
        const dateB = b.decisionDate ? new Date(b.decisionDate).getTime() : 0;
        if (dateA !== dateB) return dateB - dateA;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      if (sortBy === 'decisionNoDesc') {
        return (b.decisionNo || '').localeCompare(a.decisionNo || '', 'tr', { numeric: true });
      }
      if (sortBy === 'itemCountDesc') {
        return (b.items?.length || 0) - (a.items?.length || 0);
      }
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [forms, isAdmin, statusFilter, searchQuery, sortBy]);

  // Format clean card display title & subtitle
  const getFormPresentation = (form: any) => {
    const formattedDate = form.decisionDate
      ? new Date(form.decisionDate).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

    const cleanNo = (form.decisionNo || '').trim();
    const rawTitle = (form.title || '').trim();
    const isBrokenPlaceholderTitle = rawTitle.includes('.../.../20...') || rawTitle.endsWith('Karar No: ...') || !rawTitle;

    if (form.isTemplate) {
      return {
        primaryTitle: isBrokenPlaceholderTitle ? 'Mütevelli Heyeti Standart Gündem Şablonu' : rawTitle,
        dateLabel: formattedDate || 'Otomatik Tarih',
        noLabel: cleanNo || 'Şablon',
      };
    }

    if (isBrokenPlaceholderTitle) {
      return {
        primaryTitle: formattedDate ? `${formattedDate} Tarihli Heyet Karar Formu` : 'Yeni Heyet Karar Formu',
        dateLabel: formattedDate || 'Tarih Belirtilmedi',
        noLabel: cleanNo || 'Atanmadı',
      };
    }

    return {
      primaryTitle: rawTitle,
      dateLabel: formattedDate || 'Tarih Belirtilmedi',
      noLabel: cleanNo || '-',
    };
  };

  return (
    <AppLayout fullWidth>
      <div className="w-full px-1 sm:px-3 pb-14 space-y-3.5">
        {/* ==================== STICKY COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Mütevelli Heyeti Gündem & Karar Formları
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Toplam {counts.all} Belge
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Karar formuna tıklayarak canlı A4 Word sayfası düzeninde gündem maddelerini ve sosyal yardım tablolarını yönetin.
              </p>
            </div>
          </div>

          {/* Right Quick Summary Pills & Create Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-bold mr-1">
              <span className="px-2.5 py-1 rounded bg-blue-600 text-white shadow-2xs">
                Aktif Gündem: {counts.active}
              </span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Kesinleşen: {counts.locked}
              </span>
              <span className="px-2 py-1 rounded bg-white text-slate-600">
                Arşiv: {counts.passive}
              </span>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={createForm}
                className="flex items-center justify-center gap-1.5 w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Karar Formu Oluştur</span>
              </button>
            )}
          </div>
        </header>

        {/* ==================== SEARCH, FILTER TABS, SORT & VIEW SWITCHER ==================== */}
        <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-2xs flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5">
          {/* Left: Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Karar no, tarih veya gündem maddesi içeriği ile ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          {/* Center: Filter Tabs with Counts */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 xl:pb-0">
            {[
              { id: 'all', label: `Tümü (${counts.all})` },
              { id: 'active', label: `Aktif / Hazırlanan (${counts.active})` },
              { id: 'locked', label: `Kesinleşen (${counts.locked})` },
              { id: 'postponed', label: `Ertelenen (${counts.postponed})` },
              { id: 'passive', label: `Arşiv / Pasif (${counts.passive})` },
              ...(isAdmin && counts.template > 0 ? [{ id: 'template', label: `Şablon (${counts.template})` }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right: Sort Dropdown & Grid/Table View Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t xl:border-t-0 pt-2 xl:pt-0 border-slate-100">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-600"
              >
                <option value="decisionDateDesc">Toplantı Tarihine Göre (Yeni → Eski)</option>
                <option value="updatedAtDesc">Son Düzenlemeye Göre</option>
                <option value="decisionNoDesc">Karar Numarasına Göre</option>
                <option value="itemCountDesc">Madde Sayısına Göre (Çok → Az)</option>
              </select>
            </div>

            <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Kart Görünümü"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tablo / Liste Görünümü"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==================== CONTENT AREA: 4-COL GRID OR COMPACT TABLE ==================== */}
        {!forms ? (
          <div className="text-center py-14 text-slate-500 text-xs font-bold uppercase tracking-wider">
            Karar Formları Yükleniyor...
          </div>
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
        ) : viewMode === 'grid' ? (
          /* ==================== 4-COLUMN FULL-WIDTH COMPACT DOCUMENT CARDS ==================== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
            {visibleForms.map(form => {
              const isLocked = form.isLocked;
              const isPostponed = form.isPostponed;
              const isPassive = form.isActive === false && !form.isTemplate;
              const isActiveCurrent = form.isActive !== false && !isLocked && !form.isTemplate;
              const itemCount = form.items?.length || 0;
              const tableCount = (form.items || []).filter((i: any) => i.hasTable).length;
              const totalApplicantRows = (form.items || []).reduce((acc: number, i: any) => acc + (i.table?.rows?.length || 0), 0);
              const firstItemPreview = stripHtml(form.items?.[0]?.text) || 'Henüz gündem maddesi girilmemiş.';
              const { primaryTitle, dateLabel, noLabel } = getFormPresentation(form);

              let topAccentBar = 'bg-blue-700';
              let cardBorder = 'border-blue-300 hover:border-blue-600 ring-1 ring-blue-500/15';
              let statusBadge = 'bg-blue-700 text-white border-blue-800';
              let statusText = 'AKTİF GÜNDEM';

              if (isPostponed) {
                topAccentBar = 'bg-amber-500';
                cardBorder = 'border-amber-300 hover:border-amber-600';
                statusBadge = 'bg-amber-100 text-amber-900 border-amber-300';
                statusText = 'ERTELENDİ';
              } else if (isLocked) {
                topAccentBar = 'bg-emerald-600';
                cardBorder = 'border-emerald-300 hover:border-emerald-600';
                statusBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                statusText = 'KESİNLEŞTİ';
              } else if (isPassive) {
                topAccentBar = 'bg-slate-400';
                cardBorder = 'border-slate-300 hover:border-slate-500';
                statusBadge = 'bg-slate-100 text-slate-600 border-slate-300';
                statusText = 'PASİF / ARŞİV';
              }

              if (form.isTemplate) {
                topAccentBar = 'bg-amber-500';
                cardBorder = 'border-amber-400 hover:border-amber-600 bg-amber-50/20';
                statusBadge = 'bg-slate-900 text-amber-400 border-slate-800';
                statusText = 'SİSTEM ŞABLONU';
              }

              return (
                <Link key={form.id || (form as any)._id} href={`/forms/${form.id}`} className="block group">
                  <div className={`bg-white rounded-xl border ${cardBorder} hover:shadow-lg transition-all h-full flex flex-col relative overflow-hidden`}>
                    {/* Top Color Accent Strip */}
                    <div className={`h-1.5 w-full ${topAccentBar}`} />

                    <div className="p-4 flex-1 flex flex-col">
                      {/* Card Header: Status Badge + Action Toolbar */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-tight ${statusBadge}`}>
                          {isActiveCurrent && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                          {isLocked && !isPostponed && <Lock className="w-2.5 h-2.5" />}
                          {form.isTemplate && <Bookmark className="w-2.5 h-2.5 text-amber-400" />}
                          {statusText}
                        </span>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 relative z-10">
                          <button 
                            type="button"
                            onClick={(e) => duplicateForm(form, e)}
                            className="text-slate-500 hover:text-blue-700 p-1.5 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 transition-colors"
                            title="Bu Formdan Kopya Oluştur"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button 
                              type="button"
                              onClick={(e) => toggleTemplateStatus(form, e)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                form.isTemplate
                                  ? 'bg-slate-900 text-amber-400 border-slate-800'
                                  : 'bg-slate-50 text-slate-400 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                              }`}
                              title={form.isTemplate ? "Şablon Özelliğini Kaldır" : "Yeni Formlar İçin Şablon Olarak Belirle"}
                            >
                              <Bookmark className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {isAdmin && !form.isTemplate && (
                            <button 
                              type="button"
                              onClick={(e) => toggleActiveStatus(form, e)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isPassive
                                  ? 'bg-slate-100 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border-slate-300'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-amber-50 hover:text-amber-800 border-emerald-200'
                              }`}
                              title={isPassive ? "Arşivden Çıkar (Aktif Et)" : "Arşive Kaldır (Pasif Yap)"}
                            >
                              {isPassive ? <Archive className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!isLocked && isAdmin && (
                            <button 
                              type="button"
                              onClick={(e) => deleteForm(form.id, e)}
                              className="text-slate-400 hover:text-red-600 p-1.5 bg-slate-50 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors"
                              title="Formu Kalıcı Olarak Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prominent Decision Date & Decision No Row */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2 mb-2.5">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Toplantı Tarihi</span>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-blue-700 shrink-0" />
                            <span className="truncate">{dateLabel}</span>
                          </div>
                        </div>
                        <div className="border-l border-slate-200 pl-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase block">Karar Numarası</span>
                          <div className="text-xs font-bold text-slate-900 truncate mt-0.5">
                            {noLabel}
                          </div>
                        </div>
                      </div>

                      {/* Form Title & First Agenda Item Preview */}
                      <h3 className="font-bold text-slate-900 text-xs uppercase line-clamp-1 group-hover:text-blue-700 transition-colors mb-1">
                        {primaryTitle}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug mb-3">
                        <strong className="text-slate-700">1. Madde:</strong> {firstItemPreview}
                      </p>

                      {/* Bottom Metrics Bar */}
                      <div className="mt-auto pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                          <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded">
                            {itemCount} Madde
                          </span>
                          {tableCount > 0 && (
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                              {tableCount} Tablo
                            </span>
                          )}
                          {totalApplicantRows > 0 && (
                            <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded" title="Tablolardaki toplam başvuru/kişi satırı">
                              {totalApplicantRows} Kayıt
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 shrink-0">
                          <span>Aç</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ==================== COMPACT TABLE VIEW FOR FAST ARCHIVE SCANNING ==================== */
          <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5 w-36">Durum</th>
                    <th className="px-4 py-2.5 w-36">Toplantı Tarihi</th>
                    <th className="px-4 py-2.5 w-36">Karar No</th>
                    <th className="px-4 py-2.5">Belge Başlığı & İlk Madde Özeti</th>
                    <th className="px-4 py-2.5 w-44 text-center">İçerik Özeti</th>
                    <th className="px-4 py-2.5 w-40 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {visibleForms.map((form) => {
                    const isLocked = form.isLocked;
                    const isPostponed = form.isPostponed;
                    const isPassive = form.isActive === false && !form.isTemplate;
                    const itemCount = form.items?.length || 0;
                    const tableCount = (form.items || []).filter((i: any) => i.hasTable).length;
                    const totalApplicantRows = (form.items || []).reduce((acc: number, i: any) => acc + (i.table?.rows?.length || 0), 0);
                    const { primaryTitle, dateLabel, noLabel } = getFormPresentation(form);

                    let badge = 'bg-blue-700 text-white';
                    let label = 'AKTİF GÜNDEM';
                    if (isPostponed) {
                      badge = 'bg-amber-100 text-amber-900 border border-amber-300';
                      label = 'ERTELENDİ';
                    } else if (isLocked) {
                      badge = 'bg-emerald-100 text-emerald-900 border border-emerald-300';
                      label = 'KESİNLEŞTİ';
                    } else if (isPassive) {
                      badge = 'bg-slate-100 text-slate-600 border border-slate-300';
                      label = 'PASİF / ARŞİV';
                    }
                    if (form.isTemplate) {
                      badge = 'bg-slate-900 text-amber-400';
                      label = 'SİSTEM ŞABLONU';
                    }

                    return (
                      <tr
                        key={form.id}
                        onClick={() => router.push(`/forms/${form.id}`)}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded uppercase ${badge}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-bold text-slate-900">
                          {dateLabel}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-bold text-blue-800">
                          {noLabel}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 uppercase">{primaryTitle}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xl">
                            {stripHtml(form.items?.[0]?.text) || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {itemCount} Madde
                            </span>
                            {tableCount > 0 && (
                              <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                                {tableCount} Tablo ({totalApplicantRows})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => duplicateForm(form, e)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700"
                              title="Kopyala"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => toggleTemplateStatus(form, e)}
                                className={`p-1.5 rounded-lg border ${
                                  form.isTemplate
                                    ? 'bg-slate-900 text-amber-400 border-slate-800'
                                    : 'bg-white border-slate-200 text-slate-400 hover:text-amber-700'
                                }`}
                                title="Şablon"
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && !form.isTemplate && (
                              <button
                                type="button"
                                onClick={(e) => toggleActiveStatus(form, e)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700"
                                title={isPassive ? 'Aktif Et' : 'Arşive Kaldır'}
                              >
                                {isPassive ? <Archive className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {!isLocked && isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => deleteForm(form.id, e)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 text-slate-500 hover:text-red-600"
                                title="Sil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

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
