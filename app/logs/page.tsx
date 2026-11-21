'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Filter, ChevronLeft, ChevronRight, Loader2, RefreshCw, 
  Search, Activity, Eye, RotateCcw, Calendar, ShieldCheck, User, 
  Globe, Monitor, X, FileDown, Layers, Lock, Unlock, LogIn, LogOut, Trash2, Edit3, PlusCircle
} from 'lucide-react';
import { AppLayout } from '@/components/Layout';
import { usePersonnel } from '@/components/PersonnelProvider';

interface LogEntry {
  _id: string;
  personnelId: string;
  personnelName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  previousValue?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  CREATE: { label: 'Oluşturma', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotClass: 'bg-emerald-600' },
  UPDATE: { label: 'Güncelleme', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', dotClass: 'bg-blue-600' },
  DELETE: { label: 'Silme', badgeClass: 'bg-red-50 text-red-800 border-red-200', dotClass: 'bg-red-600' },
  VIEW: { label: 'Görüntüleme', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', dotClass: 'bg-slate-500' },
  LOGIN: { label: 'Oturum Açma', badgeClass: 'bg-amber-50 text-amber-900 border-amber-200', dotClass: 'bg-amber-600' },
  LOGOUT: { label: 'Çıkış', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200', dotClass: 'bg-orange-500' },
  LOCK: { label: 'Kesinleştirme', badgeClass: 'bg-slate-900 text-amber-400 border-slate-800', dotClass: 'bg-amber-400' },
  UNLOCK: { label: 'Kilit Açma', badgeClass: 'bg-amber-100 text-amber-950 border-amber-300', dotClass: 'bg-amber-700' },
  EXPORT: { label: 'Dışa Aktarma', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', dotClass: 'bg-teal-600' },
  IMPORT: { label: 'İçe Aktarma', badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200', dotClass: 'bg-cyan-600' },
};

const RESOURCE_LABELS: Record<string, { label: string; badge: string }> = {
  form: { label: 'Karar Formu', badge: 'bg-blue-50/80 text-blue-900 border-blue-200' },
  forms: { label: 'Karar Formu', badge: 'bg-blue-50/80 text-blue-900 border-blue-200' },
  member: { label: 'Heyet Üyesi', badge: 'bg-emerald-50/80 text-emerald-900 border-emerald-200' },
  members: { label: 'Heyet Üyesi', badge: 'bg-emerald-50/80 text-emerald-900 border-emerald-200' },
  settings: { label: 'Sistem Ayarı', badge: 'bg-amber-50/80 text-amber-900 border-amber-200' },
  personnel: { label: 'Personel', badge: 'bg-slate-100 text-slate-800 border-slate-300' },
  page: { label: 'Sayfa Gezinme', badge: 'bg-slate-50 text-slate-500 border-slate-200' },
  session: { label: 'Kimlik / Oturum', badge: 'bg-amber-50 text-amber-900 border-amber-300' },
  system: { label: 'Sistem', badge: 'bg-slate-900 text-white border-slate-800' },
};

export default function LogsPage() {
  const router = useRouter();
  const { personnel } = usePersonnel();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterPersonnel, setFilterPersonnel] = useState('');
  const [searchDetail, setSearchDetail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hidePageViews, setHidePageViews] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (filterResource) {
        params.set('resource', filterResource);
      } else if (hidePageViews) {
        params.set('excludeResource', 'page');
      }
      if (filterPersonnel.trim()) params.set('personnelId', filterPersonnel.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [filterAction, filterResource, filterPersonnel, startDate, endDate, hidePageViews]);

  useEffect(() => {
    if (personnel && !personnel.isAdmin) {
      router.push('/');
      return;
    }
    if (personnel?.isAdmin) {
      fetchLogs(1);
    }
  }, [personnel, router, fetchLogs]);

  const applyQuickDate = (type: 'today' | 'week' | 'month' | 'all') => {
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'week') {
      const past = new Date(now);
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (type === 'month') {
      const past = new Date(now);
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const resetAllFilters = () => {
    setFilterAction('');
    setFilterResource('');
    setFilterPersonnel('');
    setSearchDetail('');
    setStartDate('');
    setEndDate('');
    setHidePageViews(false);
  };

  // Client-side detail filter on the loaded page
  const visibleLogs = useMemo(() => {
    if (!searchDetail.trim()) return logs;
    const q = searchDetail.toLocaleLowerCase('tr');
    return logs.filter(l => {
      const detailStr = typeof l.details === 'string' ? l.details : JSON.stringify(l.details || '');
      return (
        detailStr.toLocaleLowerCase('tr').includes(q) ||
        (l.personnelName || '').toLocaleLowerCase('tr').includes(q) ||
        (l.resourceId || '').toLocaleLowerCase('tr').includes(q) ||
        (l.ipAddress || '').toLocaleLowerCase('tr').includes(q)
      );
    });
  }, [logs, searchDetail]);

  const stats = useMemo(() => {
    const mutations = logs.filter(l => ['CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK'].includes(l.action)).length;
    const auths = logs.filter(l => ['LOGIN', 'LOGOUT'].includes(l.action)).length;
    const uniqueUsers = new Set(logs.map(l => l.personnelName)).size;
    return { mutations, auths, uniqueUsers };
  }, [logs]);

  const exportLogsToExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const rows = visibleLogs.map((l) => ({
        'Tarih & Saat': new Date(l.timestamp).toLocaleString('tr-TR'),
        'Personel': l.personnelName,
        'İşlem Türü': ACTION_LABELS[l.action]?.label || l.action,
        'Kaynak': RESOURCE_LABELS[l.resource]?.label || l.resource,
        'Kaynak ID': l.resourceId || '-',
        'İşlem Detayı': typeof l.details === 'string' ? l.details : JSON.stringify(l.details),
        'IP Adresi': l.ipAddress || '-',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Denetim Loglari');
      XLSX.writeFile(wb, `sydv-denetim-loglari-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
    }
  };

  if (!personnel?.isAdmin) {
    return (
      <AppLayout fullWidth>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-7 h-7 animate-spin text-blue-700" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout fullWidth>
      <div className="w-full px-1 sm:px-3 pb-14 space-y-3.5">
        {/* ==================== STICKY COMMAND HEADER ==================== */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-300 rounded-xl p-3 sm:px-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 uppercase">
                  Sistem Denetim & İşlem Logları
                </h1>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Toplam {pagination.total.toLocaleString('tr-TR')} Kayıt
                </span>
              </div>
              <p className="text-slate-500 text-xs font-medium">
                Kurum personellerinin karar formu, üye, oturum ve mizanpaj üzerinde gerçekleştirdiği tüm işlemlerin şifreli denetim izleri.
              </p>
            </div>
          </div>

          {/* Right Quick Summary & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Page Summary Pills */}
            <div className="hidden xl:flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg p-1 text-[11px] font-bold mr-1">
              <span className="px-2 py-1 rounded bg-white text-slate-800 shadow-2xs">
                Bu Sayfada: {visibleLogs.length}
              </span>
              <span className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                Veri Değişikliği: {stats.mutations}
              </span>
              <span className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200">
                Oturum: {stats.auths}
              </span>
              <span className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Aktif Personel: {stats.uniqueUsers}
              </span>
            </div>

            <button
              type="button"
              onClick={exportLogsToExcel}
              disabled={visibleLogs.length === 0}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              title="Listelenen Logları Excel Olarak İndir"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
              <span>Excel İndir</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLogs(pagination.page)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>
        </header>

        {/* ==================== COMPACT FILTER & QUICK PRESETS BAR ==================== */}
        <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-2xs space-y-3">
          {/* Top Row: Quick Action Category Pills & Date Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            {/* Quick Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { label: 'Tüm Kayıtlar', action: '', resource: '', hideViews: false },
                { label: 'Sadece Veri İşlemleri (Gezinmeyi Gizle)', action: '', resource: '', hideViews: true },
                { label: 'Karar Formu İşlemleri', action: '', resource: 'forms', hideViews: false },
                { label: 'Oluşturulanlar', action: 'CREATE', resource: '', hideViews: false },
                { label: 'Güncellenenler', action: 'UPDATE', resource: '', hideViews: false },
                { label: 'Silinenler', action: 'DELETE', resource: '', hideViews: false },
                { label: 'Giriş / Çıkış', action: 'LOGIN', resource: 'session', hideViews: false },
              ].map((preset, idx) => {
                const isSelected =
                  filterAction === preset.action &&
                  filterResource === preset.resource &&
                  hidePageViews === preset.hideViews;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFilterAction(preset.action);
                      setFilterResource(preset.resource);
                      setHidePageViews(preset.hideViews);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase whitespace-nowrap transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Date Shortcuts */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1 hidden sm:inline">Hızlı Tarih:</span>
              <button
                type="button"
                onClick={() => applyQuickDate('today')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[10px] font-bold text-slate-600 uppercase"
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={() => applyQuickDate('week')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[10px] font-bold text-slate-600 uppercase"
              >
                Son 7 Gün
              </button>
              <button
                type="button"
                onClick={() => applyQuickDate('month')}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[10px] font-bold text-slate-600 uppercase"
              >
                Son 30 Gün
              </button>
              {(filterAction || filterResource || filterPersonnel || searchDetail || startDate || endDate || hidePageViews) && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold uppercase flex items-center gap-1 ml-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Filtreyi Temizle</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: Detailed Filter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-center">
            {/* Search in Details */}
            <div className="lg:col-span-3 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchDetail}
                onChange={(e) => setSearchDetail(e.target.value)}
                placeholder="Detay metni, başlık veya IP içinde ara..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            {/* Personnel Name or ID */}
            <div className="lg:col-span-2 relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterPersonnel}
                onChange={(e) => setFilterPersonnel(e.target.value)}
                placeholder="Personel Adı / ID"
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-600"
              />
            </div>

            {/* Action Select */}
            <div className="lg:col-span-2">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-600"
              >
                <option value="">Tüm İşlem Türleri</option>
                {Object.entries(ACTION_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>

            {/* Resource Select */}
            <div className="lg:col-span-2">
              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-600"
              >
                <option value="">Tüm Kaynaklar</option>
                <option value="forms">Karar Formları</option>
                <option value="members">Heyet Üyeleri</option>
                <option value="settings">Sistem Ayarları</option>
                <option value="personnel">Personel Hesapları</option>
                <option value="session">Oturum (Giriş/Çıkış)</option>
                <option value="page">Sayfa Gezinmeleri</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="lg:col-span-3 flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-600"
                title="Başlangıç Tarihi"
              />
              <span className="text-slate-400 text-xs font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-600"
                title="Bitiş Tarihi"
              />
            </div>
          </div>
        </div>

        {/* ==================== FULL-WIDTH LOGS TABLE + DETAIL DRAWER ==================== */}
        <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin text-blue-700" />
              <span className="text-xs font-bold uppercase tracking-wider">Denetim Kayıtları Yükleniyor...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-200 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-3.5 py-2.5 whitespace-nowrap w-40">Tarih & Saat</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap w-48">İşlemi Yapan Personel</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap w-36">İşlem Türü</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap w-40">Hedef Kaynak</th>
                    <th className="px-3.5 py-2.5">Açıklama & Değişiklik Özeti</th>
                    <th className="px-3.5 py-2.5 whitespace-nowrap w-32">IP Adresi</th>
                    <th className="px-3.5 py-2.5 text-right whitespace-nowrap w-24">İncele</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 text-xs">
                  {visibleLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-bold text-xs uppercase text-slate-500">Eşleşen Log Kaydı Bulunamadı</p>
                        <p className="text-[11px] mt-0.5">Filtreleri sıfırlayarak tüm kayıtları görüntüleyebilirsiniz.</p>
                      </td>
                    </tr>
                  ) : (
                    visibleLogs.map((log) => {
                      const actionInfo = ACTION_LABELS[log.action] || {
                        label: log.action,
                        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
                        dotClass: 'bg-slate-500',
                      };
                      const resInfo = RESOURCE_LABELS[log.resource] || {
                        label: log.resource,
                        badge: 'bg-slate-100 text-slate-700 border-slate-200',
                      };
                      const detailText = typeof log.details === 'string' ? log.details : JSON.stringify(log.details);
                      const isSelected = selectedLog?._id === log._id;
                      const dt = new Date(log.timestamp);

                      return (
                        <tr
                          key={log._id}
                          onClick={() => setSelectedLog(isSelected ? null : log)}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/90'
                              : 'hover:bg-slate-50/90'
                          }`}
                        >
                          {/* Timestamp */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-[11px]">
                              {dt.toLocaleDateString('tr-TR')}
                            </div>
                            <div className="text-[10px] font-semibold text-slate-400 font-mono">
                              {dt.toLocaleTimeString('tr-TR')}
                            </div>
                          </td>

                          {/* Personnel */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {(log.personnelName || 'P').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate max-w-[150px]">
                                  {log.personnelName || 'Bilinmeyen'}
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono truncate max-w-[140px]">
                                  {log.personnelId}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-md border uppercase tracking-tight ${actionInfo.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${actionInfo.dotClass}`} />
                              {actionInfo.label}
                            </span>
                          </td>

                          {/* Resource */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-tight ${resInfo.badge}`}>
                              {resInfo.label}
                            </span>
                            {log.resourceId && (
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate max-w-[130px]" title={log.resourceId}>
                                {log.resourceId}
                              </div>
                            )}
                          </td>

                          {/* Details */}
                          <td className="px-3.5 py-2.5">
                            <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-snug max-w-2xl">
                              {detailText || <span className="italic text-slate-400">Detay belirtilmemiş</span>}
                            </p>
                          </td>

                          {/* IP */}
                          <td className="px-3.5 py-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              <Globe className="w-3 h-3 text-slate-400" />
                              {log.ipAddress || '-'}
                            </span>
                          </td>

                          {/* Inspect Action */}
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLog(log);
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors uppercase"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detay</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-600">
                Sayfa <span className="text-slate-900">{pagination.page}</span> / {pagination.totalPages} • Toplam <span className="text-slate-900">{pagination.total}</span> Kayıt
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fetchLogs(1)}
                  disabled={pagination.page <= 1}
                  className="text-xs font-bold text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-30"
                >
                  İlk
                </button>
                <button
                  type="button"
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-700 px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Önceki</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-700 px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-30"
                >
                  <span>Sonraki</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fetchLogs(pagination.totalPages)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="text-xs font-bold text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-blue-50 disabled:opacity-30"
                >
                  Son
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ==================== LOG DETAIL INSPECTION MODAL ==================== */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider">Denetim Kaydı Detay Raporu</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Kayıt ID: {selectedLog._id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">İşlem Tarihi & Saati</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedLog.timestamp).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Personel Adı</span>
                  <span className="font-bold text-slate-900">{selectedLog.personnelName}</span>
                  <span className="block text-[9px] text-slate-400 font-mono truncate">{selectedLog.personnelId}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">İşlem & Kaynak</span>
                  <span className="font-bold text-blue-800 uppercase">
                    {ACTION_LABELS[selectedLog.action]?.label || selectedLog.action} • {RESOURCE_LABELS[selectedLog.resource]?.label || selectedLog.resource}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Hedef Kaynak ID / Sayfa</span>
                  <span className="font-mono font-bold text-slate-800 break-all">{selectedLog.resourceId || 'Belirtilmemiş'}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">IP Adresi</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLog.ipAddress || '-'}</span>
                </div>
              </div>

              {/* Full Details Box */}
              <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-3.5">
                <span className="text-[10px] font-bold text-blue-900 uppercase block mb-1.5">İşlem Açıklaması / Değişiklik Özeti</span>
                <div className="text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed break-words">
                  {typeof selectedLog.details === 'string' ? selectedLog.details : JSON.stringify(selectedLog.details, null, 2)}
                </div>
              </div>

              {/* Previous Value Snapshot (if captured) */}
              {selectedLog.previousValue && (
                <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1.5">
                    İşlem Öncesi Veri Yedeği (Previous Snapshot)
                  </span>
                  <pre className="text-[11px] font-mono overflow-x-auto max-h-56 text-slate-300 leading-relaxed">
                    {typeof selectedLog.previousValue === 'string'
                      ? selectedLog.previousValue
                      : JSON.stringify(selectedLog.previousValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              {selectedLog.resource === 'forms' && selectedLog.resourceId && selectedLog.action !== 'DELETE' ? (
                <button
                  type="button"
                  onClick={() => router.push(`/forms/${selectedLog.resourceId}`)}
                  className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>İlgili Karar Formuna Git</span>
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
