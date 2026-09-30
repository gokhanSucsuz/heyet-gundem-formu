'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Database, Loader2, CheckCircle, AlertTriangle, Play } from 'lucide-react';

export default function AdminMigratePage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('admin-authenticated') !== 'true') {
      router.push('/admin');
    }
  }, [router]);

  const runMigration = async () => {
    if (!confirm('Veri migrasyonunu başlatmak istediğinize emin misiniz? Bu işlem mevcut verilerin şifreleme formatını güncelleyecektir.')) {
      return;
    }

    setRunning(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/admin/migrate', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Migrasyon başarısız');
        return;
      }

      setResult(data);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/admin')} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-sm uppercase tracking-tight">Veri Migrasyonu</h1>
            <span className="text-[10px] text-slate-500 font-bold">CryptoJS AES → AES-256-GCM</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="font-bold text-lg mb-2">Şifreleme Format Güncelleme</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Bu işlem mevcut tüm verileri (formlar, üyeler, ayarlar) eski CryptoJS AES formatından
                yeni AES-256-GCM formatına dönüştürür. Her döküman tek tek okunur, şifre çözülür,
                yeni formatla şifrelenir ve doğrulanır. <strong className="text-amber-400">Veri kaybı riski yoktur.</strong>
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-700 pt-4">
            <button
              onClick={runMigration}
              disabled={running}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Migrasyon Devam Ediyor...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Migrasyonu Başlat
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm text-red-400 font-bold">{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border flex items-center gap-3 ${
              result.summary.totalFailed === 0
                ? 'bg-emerald-500/20 border-emerald-500/30'
                : 'bg-amber-500/20 border-amber-500/30'
            }`}>
              {result.summary.totalFailed === 0 ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              )}
              <span className="font-bold text-sm">
                Migrasyon Tamamlandı: {result.summary.totalMigrated}/{result.summary.totalDocuments} başarılı
                {result.summary.totalFailed > 0 && `, ${result.summary.totalFailed} başarısız`}
              </span>
            </div>

            {/* Detailed Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['members', 'forms', 'settings'] as const).map(col => {
                const r = result.results[col];
                return (
                  <div key={col} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
                      {col === 'members' ? 'Üyeler' : col === 'forms' ? 'Formlar' : 'Ayarlar'}
                    </h3>
                    <div className="text-2xl font-bold text-white mb-1">{r.migrated}/{r.total}</div>
                    {r.failed > 0 && (
                      <div className="text-xs text-red-400 font-bold">{r.failed} başarısız</div>
                    )}
                    {r.errors.length > 0 && (
                      <div className="mt-2 text-[10px] text-red-400 space-y-1">
                        {r.errors.map((err: string, i: number) => (
                          <div key={i}>{err}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
