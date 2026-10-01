'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Key, Calendar, Activity, Shield, Trash2, Edit3, ShieldAlert, FileText, User } from 'lucide-react';

interface PersonnelDetail {
  id: string;
  name: string;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  passwordPlain: string;
}

interface LogEntry {
  _id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  timestamp: string;
}

export default function PersonnelDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [personnel, setPersonnel] = useState<PersonnelDetail | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem('admin-authenticated') !== 'true') {
      router.push('/admin');
      return;
    }
    
    // Unwrap params in next 15+ (just use directly here assuming it's available)
    const pId = params.id;

    const fetchData = async () => {
      try {
        const [pRes, lRes] = await Promise.all([
          fetch(`/api/admin/personnel?id=${pId}`),
          fetch(`/api/admin/logs?personnelId=${pId}&limit=100`)
        ]);

        if (pRes.ok) {
          const pData = await pRes.json();
          setPersonnel(pData);
        }

        if (lRes.ok) {
          const lData = await lRes.json();
          setLogs(lData.logs || []);
        }
      } catch (e) {
        console.error('Failed to fetch data', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!personnel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
        <ShieldAlert className="w-12 h-12 text-red-500" />
        <h1 className="text-xl font-bold">Personel Bulunamadı</h1>
        <button onClick={() => router.push('/admin/personnel')} className="text-blue-400 hover:underline">Geri Dön</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pb-10">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => router.push('/admin/personnel')} className="text-slate-400 hover:text-white shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="font-bold text-xs sm:text-sm uppercase tracking-tight truncate">Personel Detayları</h1>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold whitespace-nowrap">{personnel.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center text-3xl font-bold">
              {personnel.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-white">{personnel.name}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${personnel.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {personnel.isActive ? 'Aktif' : 'Devre Dışı'}
                  </span>
                  {personnel.isAdmin && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                  <Key className="w-5 h-5 text-amber-500" />
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mevcut Şifre</div>
                    <div className="font-mono text-sm text-slate-300 font-bold">{personnel.passwordPlain || 'Gizli (Eski)'}</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kayıt Tarihi</div>
                    <div className="text-sm text-slate-300 font-bold">{new Date(personnel.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-700 flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wide">Son İşlem Kayıtları</h3>
            <span className="ml-auto bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{logs.length} İşlem</span>
          </div>

          <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-medium">
                Bu personele ait henüz log kaydı bulunmuyor.
              </div>
            ) : (
              logs.map((log) => {
                let ActionIcon = FileText;
                let actionColor = 'text-blue-400';
                
                if (log.action === 'CREATE') {
                  ActionIcon = Edit3;
                  actionColor = 'text-emerald-400';
                } else if (log.action === 'UPDATE') {
                  ActionIcon = Edit3;
                  actionColor = 'text-amber-400';
                } else if (log.action === 'DELETE') {
                  ActionIcon = Trash2;
                  actionColor = 'text-red-400';
                } else if (log.action === 'LOGIN') {
                  ActionIcon = User;
                  actionColor = 'text-purple-400';
                }

                return (
                  <div key={log._id} className="p-4 hover:bg-slate-700/30 transition-colors flex gap-4">
                    <div className={`mt-1 ${actionColor}`}>
                      <ActionIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider bg-slate-900 border border-slate-700 ${actionColor}`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded-md border border-slate-700">
                          {log.resource}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(log.timestamp).toLocaleString('tr-TR')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        {log.details}
                      </p>
                      {log.resourceId && (
                        <p className="text-[10px] text-slate-500 font-mono mt-1">
                          ID: {log.resourceId}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
