'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, useLiveQuery, Member } from '@/lib/db';
import { AppLayout } from '@/components/Layout';
import { usePersonnel } from '@/components/PersonnelProvider';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, Trash2, GripVertical, UserCheck, UserPlus, Save, Loader2, 
  ArrowUp, ArrowDown, Award, Search, Users, RotateCcw, FileCheck2, ShieldAlert, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ConfirmModal';

export default function MembersPage() {
  const { personnel } = usePersonnel();
  const members = useLiveQuery(() => db.members.orderBy('order').toArray());
  const [localMembers, setLocalMembers] = useState<Member[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'direct' | 'proxy'>('all');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, message: string, onConfirm: () => void}>({ isOpen: false, message: '', onConfirm: () => {} });

  useEffect(() => {
    if (members) {
      const draft = localStorage.getItem('draft_members');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          setLocalMembers(draftData);
          setIsDirty(true);
          return;
        } catch (e) { console.error('Members draft error', e); }
      }
      setLocalMembers(prev => {
        if (prev.length > 0 && isDirty) return prev;
        return members;
      });
    }
  }, [members, isDirty]);

  const updateLocalAndDraft = (newList: Member[]) => {
    setLocalMembers(newList);
    setIsDirty(true);
    localStorage.setItem('draft_members', JSON.stringify(newList));
  };

  const addMember = () => {
    const order = localMembers.length;
    const newMember: Member = {
      id: uuidv4(),
      name: '',
      title: '',
      order,
      isProxy: false
    };
    updateLocalAndDraft([...localMembers, newMember]);
    toast.info('Yeni üye satırı eklendi. Bilgileri doldurduktan sonra kaydetmeyi unutmayın.');
  };

  const updateMember = (id: string, updates: Partial<Member>) => {
    const newList = localMembers.map(m => m.id === id ? { ...m, ...updates } : m);
    updateLocalAndDraft(newList);
  };

  const deleteMember = (id: string) => {
    setConfirmModal({
      isOpen: true,
      message: 'Bu heyet üyesini listeden silmek istediğinize emin misiniz?',
      onConfirm: () => {
        const newList = localMembers.filter(m => m.id !== id).map((m, i) => ({ ...m, order: i }));
        updateLocalAndDraft(newList);
        toast.success('Üye listeden çıkarıldı.');
      }
    });
  };

  const resetAllProxies = () => {
    const proxyCount = localMembers.filter(m => m.isProxy).length;
    if (proxyCount === 0) {
      toast.info('Şu anda vekil atanmış üye bulunmuyor.');
      return;
    }
    setConfirmModal({
      isOpen: true,
      message: `Vekil atanmış ${proxyCount} üyenin tümünü "Bizzat Katılım (Asil Üye)" durumuna döndürmek istediğinize emin misiniz?`,
      onConfirm: () => {
        const newList = localMembers.map(m => ({ ...m, isProxy: false }));
        updateLocalAndDraft(newList);
        toast.success('Tüm üyeler bizzat katılım (asil) durumuna döndürüldü.');
      }
    });
  };

  const moveMemberToIndex = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= localMembers.length) return;
    const clampedTo = Math.max(0, Math.min(toIndex, localMembers.length - 1));
    if (fromIndex === clampedTo) return;

    const newList = [...localMembers];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(clampedTo, 0, moved);
    const updatedList = newList.map((m, i) => ({ ...m, order: i }));
    updateLocalAndDraft(updatedList);
  };

  const saveToCloud = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await db.members.clear(true);
      for (const m of localMembers) {
        await db.members.put(
          {
            ...m,
            name: m.name.trim() || 'İsimsiz Üye',
            title: m.title.trim() || 'Üye',
          },
          true
        );
      }
      setIsDirty(false);
      localStorage.removeItem('draft_members');
      toast.success('Mütevelli heyet listesi ve vekalet durumları kaydedildi.');
    } catch (e) {
      toast.error('Kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(() => {
    const total = localMembers.length;
    const proxy = localMembers.filter(m => m.isProxy).length;
    const direct = total - proxy;
    return { total, direct, proxy };
  }, [localMembers]);

  const filteredMembers = useMemo(() => {
    return localMembers.filter(m => {
      if (filterMode === 'direct' && m.isProxy) return false;
      if (filterMode === 'proxy' && !m.isProxy) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLocaleLowerCase('tr');
        return (
          (m.name || '').toLocaleLowerCase('tr').includes(q) ||
          (m.title || '').toLocaleLowerCase('tr').includes(q) ||
          (m.proxyName || '').toLocaleLowerCase('tr').includes(q) ||
          (m.proxyTitle || '').toLocaleLowerCase('tr').includes(q)
        );
      }
      return true;
    });
  }, [localMembers, filterMode, searchQuery]);

  if (!localMembers || !personnel) {
    return (
      <AppLayout fullWidth>
        <div className="p-12 text-center font-bold text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
          <span>Heyet üyeleri yükleniyor...</span>
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

  const formatPreviewName = (m: Member) => {
    if (m.isProxy && m.proxyName?.trim()) {
      return `${m.proxyName.trim()}\n(${m.name || 'Asil Üye'} Vekili)`;
    }
    return m.name || 'Ad Soyad Girilmedi';
  };

  const formatPreviewTitle = (m: Member) => {
    if (m.isProxy && m.proxyTitle?.trim()) {
      return m.proxyTitle.trim();
    }
    return m.title || 'Ünvan Girilmedi';
  };

  return (
    <AppLayout fullWidth>
      <div className={`w-full px-1 sm:px-3 pb-16 space-y-3.5 transition-opacity ${isSaving ? 'opacity-60 pointer-events-none' : ''}`}>
        {/* ==================== STICKY COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Mütevelli Heyet Üyeleri & Vekalet Yönetimi
                </h1>
                {isDirty ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    Kaydedilmemiş Değişiklikler
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Güncel
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Toplantıya katılamayan asil üyelerin yerine katılacak vekil görevlileri tek tıkla atayın ve imza önizlemesini anında kontrol edin.
              </p>
            </div>
          </div>

          {/* Right Quick Actions & Stats Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Stat Pills */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-bold mr-1">
              <span className="px-2 py-1 rounded bg-white text-slate-800 shadow-2xs">
                Toplam: {stats.total}
              </span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Asil Katılım: {stats.direct}
              </span>
              <span className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">
                Vekil Katılım: {stats.proxy}
              </span>
            </div>

            {stats.proxy > 0 && (
              <button
                type="button"
                onClick={resetAllProxies}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                title="Tüm Vekaletleri Kaldır ve Asil Üyelere Döndür"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>Tüm Vekilleri Sıfırla ({stats.proxy})</span>
              </button>
            )}

            <button
              type="button"
              onClick={addMember}
              disabled={isSaving}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Yeni Üye Ekle</span>
            </button>

            <button
              type="button"
              onClick={saveToCloud}
              disabled={isSaving || !isDirty}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                isDirty && !isSaving
                  ? 'bg-blue-700 hover:bg-blue-800 text-white ring-2 ring-blue-400/40'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Değişiklikleri Kaydet</span>
            </button>
          </div>
        </header>

        {/* ==================== SEARCH & FILTER BAR ==================== */}
        <div className="bg-white border border-slate-300 rounded-xl p-2.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Üye adı, ünvan veya vekil adı ile ara..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: `Tüm Üyeler (${stats.total})` },
              { id: 'direct', label: `Bizzat Katılanlar (${stats.direct})` },
              { id: 'proxy', label: `Yerine Vekil Katılanlar (${stats.proxy})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase whitespace-nowrap transition-colors ${
                  filterMode === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== FULL-WIDTH MEMBERS & PROXY TABLE ==================== */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-300 overflow-hidden">
          {/* Desktop Column Headers */}
          <div className="hidden xl:grid xl:grid-cols-12 gap-3 px-4 py-2.5 border-b border-slate-200 bg-slate-900 text-slate-200 uppercase font-bold text-[10px] tracking-wider items-center">
            <div className="col-span-1 text-center">Sıra / Taşı</div>
            <div className="col-span-3">Asil Heyet Üyesi (Ad Soyad & Kurum Ünvanı)</div>
            <div className="col-span-2 text-center">Toplantı Katılım Durumu</div>
            <div className="col-span-3">Yerine Katılan Vekil Görevli (Varsa)</div>
            <div className="col-span-2 text-center">Karar Formu İmza Önizlemesi</div>
            <div className="col-span-1 text-right">Sil</div>
          </div>

          <div className="divide-y divide-slate-200/80">
            {filteredMembers.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-medium text-xs italic">
                {searchQuery || filterMode !== 'all'
                  ? 'Filtreye uygun heyet üyesi bulunamadı.'
                  : 'Henüz üye eklenmemiş. Sağ üstteki "Yeni Üye Ekle" butonu ile başlayın.'}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const realIndex = localMembers.findIndex(m => m.id === member.id);
                const isPresident = realIndex === 0;
                const isDragging = draggedIndex === realIndex;
                const isDragOver = dragOverIndex === realIndex;

                return (
                  <div
                    key={member.id}
                    draggable={!searchQuery && filterMode === 'all'}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', realIndex.toString());
                      setDraggedIndex(realIndex);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverIndex !== realIndex) setDragOverIndex(realIndex);
                    }}
                    onDragLeave={() => {
                      if (dragOverIndex === realIndex) setDragOverIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== realIndex) {
                        moveMemberToIndex(draggedIndex, realIndex);
                      }
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`p-3 sm:px-4 sm:py-3 transition-all flex flex-col xl:grid xl:grid-cols-12 gap-3 xl:items-center ${
                      isDragging
                        ? 'opacity-35 bg-slate-100'
                        : isDragOver
                        ? 'bg-blue-50 ring-2 ring-blue-600'
                        : member.isProxy
                        ? 'bg-amber-50/35 hover:bg-amber-50/60'
                        : isPresident
                        ? 'bg-blue-50/20 hover:bg-blue-50/40'
                        : 'hover:bg-slate-50/90'
                    }`}
                  >
                    {/* 1. ORDER & DRAG CONTROLS */}
                    <div className="xl:col-span-1 flex items-center justify-between xl:justify-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1"
                          title="Sürükleyerek Sırayı Değiştir"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={localMembers.length}
                          defaultValue={realIndex + 1}
                          key={`mem-order-${member.id}-${realIndex}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = parseInt((e.target as HTMLInputElement).value, 10);
                              if (!isNaN(val) && val >= 1 && val <= localMembers.length) {
                                moveMemberToIndex(realIndex, val - 1);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= localMembers.length && val !== realIndex + 1) {
                              moveMemberToIndex(realIndex, val - 1);
                            } else {
                              e.target.value = (realIndex + 1).toString();
                            }
                          }}
                          className={`w-9 text-center text-xs font-bold rounded-md py-1 border outline-none focus:ring-1 focus:ring-blue-600 ${
                            isPresident
                              ? 'bg-blue-700 text-white border-blue-800'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                          title="Sıra numarasını yazıp Enter'a basın"
                        />
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => moveMemberToIndex(realIndex, realIndex - 1)}
                            disabled={realIndex === 0}
                            className="text-slate-400 hover:text-blue-700 disabled:opacity-20 p-0.5"
                            title="Yukarı Taşı"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMemberToIndex(realIndex, realIndex + 1)}
                            disabled={realIndex === localMembers.length - 1}
                            className="text-slate-400 hover:text-blue-700 disabled:opacity-20 p-0.5"
                            title="Aşağı Taşı"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        className="xl:hidden text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                        title="Üyeyi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 2. ORIGINAL MEMBER NAME & TITLE */}
                    <div className="xl:col-span-3 space-y-1.5">
                      {isPresident && (
                        <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          <Award className="w-3 h-3 text-blue-700" />
                          <span>1. Sıra: Heyet Başkanı (Üst Ortada İmzalar)</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(e) => updateMember(member.id, { name: e.target.value })}
                          placeholder="Asil Üye Adı Soyadı"
                          className="w-full bg-white border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-2.5 py-1.5 rounded-lg text-slate-900 text-xs font-bold outline-none shadow-2xs"
                        />
                        <input
                          type="text"
                          value={member.title}
                          onChange={(e) => updateMember(member.id, { title: e.target.value })}
                          placeholder="Ünvanı (Örn: Vali Yrd. / Belediye Bşk. Yrd. / Üye)"
                          className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 px-2.5 py-1.5 rounded-lg text-slate-700 text-[11px] font-bold uppercase outline-none"
                        />
                      </div>
                    </div>

                    {/* 3. ATTENDANCE MODE SEGMENTED SWITCH (BİZZAT vs VEKİL) */}
                    <div className="xl:col-span-2 flex flex-col items-stretch xl:items-center justify-center">
                      <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/90 w-full max-w-[230px] mx-auto">
                        <button
                          type="button"
                          onClick={() => updateMember(member.id, { isProxy: false })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-all ${
                            !member.isProxy
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Üye toplantıya kendisi (bizzat) katılıyor"
                        >
                          <UserCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>Asil (Bizzat)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMember(member.id, { isProxy: true })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-1 transition-all ${
                            member.isProxy
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Üye katılamıyor, yerine vekil görevli katılıyor"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>Vekil Katılım</span>
                        </button>
                      </div>
                    </div>

                    {/* 4. PROXY / SUBSTITUTE INPUTS */}
                    <div className="xl:col-span-3">
                      {member.isProxy ? (
                        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-2 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-900 uppercase px-0.5">
                            <span className="flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 text-amber-700" />
                              Yerine Katılan Vekil Görevli
                            </span>
                            <button
                              type="button"
                              onClick={() => updateMember(member.id, { proxyName: '', proxyTitle: '' })}
                              className="text-[9px] text-amber-700 hover:underline"
                            >
                              Temizle
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5">
                            <input
                              type="text"
                              value={member.proxyName || ''}
                              onChange={(e) => updateMember(member.id, { proxyName: e.target.value })}
                              placeholder="Vekil Adı Soyadı (Örn: Ahmet KAYA)"
                              className="w-full bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 px-2.5 py-1.5 rounded-lg text-slate-900 text-xs font-bold outline-none"
                            />
                            <input
                              type="text"
                              value={member.proxyTitle || ''}
                              onChange={(e) => updateMember(member.id, { proxyTitle: e.target.value })}
                              placeholder={`Vekil Ünvanı (Boşsa: ${member.title || 'Asil Ünvanı'})`}
                              className="w-full bg-white/90 border border-amber-200 focus:border-amber-600 focus:ring-1 focus:ring-amber-600 px-2.5 py-1.5 rounded-lg text-slate-700 text-[11px] font-bold uppercase outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs text-slate-500">
                          <span className="font-medium text-[11px]">
                            Toplantıya <strong className="text-slate-700">{member.name || 'asil üye'}</strong> bizzat katılacak.
                          </span>
                          <button
                            type="button"
                            onClick={() => updateMember(member.id, { isProxy: true })}
                            className="text-[10px] font-bold text-blue-700 hover:underline uppercase shrink-0 ml-2"
                          >
                            + Vekil Ata
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5. LIVE OFFICIAL SIGNATURE PREVIEW BOX */}
                    <div className="xl:col-span-2">
                      <div className={`rounded-xl border px-2.5 py-2 text-center transition-colors ${
                        member.isProxy
                          ? 'bg-white border-amber-300 shadow-2xs'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-center gap-1">
                          <FileCheck2 className="w-3 h-3 text-slate-400" />
                          <span>Belgedeki İmza Görünümü</span>
                        </div>
                        <div className="font-bold text-[11px] text-slate-900 whitespace-pre-line leading-tight">
                          {formatPreviewName(member)}
                        </div>
                        <div className="font-bold text-[10px] text-slate-600 uppercase mt-1 leading-tight truncate">
                          {formatPreviewTitle(member)}
                        </div>
                      </div>
                    </div>

                    {/* 6. DESKTOP DELETE ACTION */}
                    <div className="hidden xl:flex xl:col-span-1 justify-end">
                      <button
                        type="button"
                        onClick={() => deleteMember(member.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Üyeyi Listeden Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
