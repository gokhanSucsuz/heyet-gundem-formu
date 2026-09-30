'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Filter, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';

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
  CREATE: { label: 'Oluşturma', color: 'bg-emerald-500/20 text-emerald-400' },
  UPDATE: { label: 'Güncelleme', color: 'bg-blue-500/20 text-blue-400' },
  DELETE: { label: 'Silme', color: 'bg-red-500/20 text-red-400' },
  VIEW: { label: 'Görüntüleme', color: 'bg-slate-500/20 text-slate-400' },
  LOGIN: { label: 'Giriş', color: 'bg-amber-500/20 text-amber-400' },
  LOGOUT: { label: 'Çıkış', color: 'bg-orange-500/20 text-orange-400' },
  LOCK: { label: 'Kilitleme', color: 'bg-purple-500/20 text-purple-400' },
  UNLOCK: { label: 'Kilit Açma', color: 'bg-pink-500/20 text-pink-400' },
  EXPORT: { label: 'Dışa Aktarma', color: 'bg-teal-500/20 text-teal-400' },
  IMPORT: { label: 'İçe Aktarma', color: 'bg-cyan-500/20 text-cyan-400' },
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

export default function AdminLogsPage() {
  const router = useRouter();
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
    if (sessionStorage.getItem('admin-authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    fetchLogs();
  }, [router, fetchLogs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-sm uppercase tracking-tight">Sistem Logları</h1>
              <span className="text-[10px] text-slate-500 font-bold">{pagination.total} kayıt bulundu</span>
            </div>
          </div>
          <button
            onClick={() => fetchLogs(1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Yenile
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase">Filtreler</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-white outline-none"
            >
              <option value="">Tüm İşlemler</option>
              {Object.entries(ACTION_LABELS).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>

            <select
              value={filterResource}
              onChange={(e) => setFilterResource(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-white outline-none"
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
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-white outline-none"
            />

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-white outline-none"
            />

            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-xs text-white outline-none flex-1"
              />
              <button
                onClick={() => fetchLogs(1)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-bold"
              >
                <Search className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
          </div>
        ) : (
          <>
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="text-left px-4 py-3">Tarih</th>
                      <th className="text-left px-4 py-3">Personel</th>
                      <th className="text-left px-4 py-3">İşlem</th>
                      <th className="text-left px-4 py-3">Kaynak</th>
                      <th className="text-left px-4 py-3">Detay</th>
                      <th className="text-left px-4 py-3">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                          Henüz log kaydı bulunmuyor
                        </td>
                      </tr>
                    ) : (
                      logs.map(log => {
                        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-slate-500/20 text-slate-400' };
                        return (
                          <tr key={log._id} className="hover:bg-slate-700/20 transition-colors">
                            <td className="px-4 py-3 text-xs text-slate-300 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString('tr-TR')}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-bold text-white">{log.personnelName}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${actionInfo.color}`}>
                                {actionInfo.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">
                              {RESOURCE_LABELS[log.resource] || log.resource}
                              {log.resourceId && (
                                <span className="text-[10px] text-slate-500 ml-1">({log.resourceId.slice(0, 8)}...)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 max-w-[300px] truncate">
                              {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                            </td>
                            <td className="px-4 py-3 text-[10px] text-slate-500 font-mono">
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
                <span className="text-xs text-slate-500">
                  Sayfa {pagination.page} / {pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    Önceki
                  </button>
                  <button
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-700/50 disabled:opacity-30"
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
  );
}
