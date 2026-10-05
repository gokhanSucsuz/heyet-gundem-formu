'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Filter, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, Activity } from 'lucide-react';
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
  timestamp: string;
  ipAddress?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  CREATE: { label: 'Oluşturma', color: 'bg-emerald-100 text-emerald-700' },
  UPDATE: { label: 'Güncelleme', color: 'bg-blue-100 text-blue-700' },
  DELETE: { label: 'Silme', color: 'bg-red-100 text-red-700' },
  VIEW: { label: 'Görüntüleme', color: 'bg-slate-100 text-slate-700' },
  LOGIN: { label: 'Giriş', color: 'bg-amber-100 text-amber-700' },
  LOGOUT: { label: 'Çıkış', color: 'bg-orange-100 text-orange-700' },
  LOCK: { label: 'Kilitleme', color: 'bg-purple-100 text-purple-700' },
  UNLOCK: { label: 'Kilit Açma', color: 'bg-pink-100 text-pink-700' },
  EXPORT: { label: 'Dışa Aktarma', color: 'bg-teal-100 text-teal-700' },
  IMPORT: { label: 'İçe Aktarma', color: 'bg-cyan-100 text-cyan-700' },
};

const RESOURCE_LABELS: Record<string, string> = {
  form: 'Form',
  member: 'Üye',
  settings: 'Ayarlar',
  personnel: 'Personel',
  page: 'Sayfa',
  session: 'Oturum',
  system: 'Sistem',
};

export default function LogsPage() {
  const router = useRouter();
  const { personnel } = usePersonnel();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [filterPersonnel, setFilterPersonnel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterAction) params.set('action', filterAction);
      if (filterResource) params.set('resource', filterResource);
      if (filterPersonnel) params.set('personnelId', filterPersonnel);
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
  }, [filterAction, filterResource, filterPersonnel, startDate, endDate]);

  useEffect(() => {
    if (personnel && !personnel.isAdmin) {
      router.push('/');
      return;
    }
    if (personnel?.isAdmin) {
      fetchLogs();
    }
  }, [personnel, router, fetchLogs]);

  if (!personnel?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-2rem)] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shrink-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" /> Sistem Logları
              </h1>
              <span className="text-[10px] text-slate-500 font-bold">{pagination.total} kayıt bulundu</span>
            </div>
            <button
              onClick={() => fetchLogs(1)}
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors border border-slate-200 hover:border-blue-200"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase">Filtreler</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              >
                <option value="">Tüm İşlemler</option>
                {Object.entries(ACTION_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>

              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              >
                <option value="">Tüm Kaynaklar</option>
                {Object.entries(RESOURCE_LABELS).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>

              <input
                type="text"
                value={filterPersonnel}
                onChange={(e) => setFilterPersonnel(e.target.value)}
                placeholder="Personel ID"
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              />

              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
              />

              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 flex-1"
                />
                <button
                  onClick={() => fetchLogs(1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm"
                >
                  <Search className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Logs Table */}
          {loading ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="text-left px-4 py-3 whitespace-nowrap">Tarih</th>
                        <th className="text-left px-4 py-3">Personel</th>
                        <th className="text-left px-4 py-3">İşlem</th>
                        <th className="text-left px-4 py-3">Kaynak</th>
                        <th className="text-left px-4 py-3">Detay</th>
                        <th className="text-left px-4 py-3">IP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            Henüz log kaydı bulunmuyor
                          </td>
                        </tr>
                      ) : (
                        logs.map(log => {
                          const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-100 text-slate-600' };
                          return (
                            <tr key={log._id} className="hover:bg-blue-50/50 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap font-medium">
                                {new Date(log.timestamp).toLocaleString('tr-TR')}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs font-bold text-slate-800">{log.personnelName}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${actionInfo.color}`}>
                                  {actionInfo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-tight">
                                {RESOURCE_LABELS[log.resource] || log.resource}
                                {log.resourceId && (
                                  <span className="text-[9px] text-slate-400 ml-1">({log.resourceId.slice(0, 8)}...)</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-600 max-w-[300px] truncate" title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>
                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                              </td>
                              <td className="px-4 py-3 text-[10px] text-slate-400 font-mono">
                                {log.ipAddress || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs font-bold text-slate-500">
                    Sayfa {pagination.page} / {pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchLogs(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-30 border border-slate-200 bg-white shadow-sm"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Önceki
                    </button>
                    <button
                      onClick={() => fetchLogs(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 disabled:opacity-30 border border-slate-200 bg-white shadow-sm"
                    >
                      Sonraki
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
