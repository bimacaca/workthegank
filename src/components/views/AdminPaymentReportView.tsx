import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, RefreshCw, Wallet } from 'lucide-react';

type PaymentTask = {
  id: string;
  code: string;
  store: string;
  operatorName: string;
  completedAt?: string;
  status: 'paid' | 'unpaid';
  verifiedCount: number;
  ratePerNumber: number;
  amount: number;
  paidAt?: string;
};

type PaymentReportData = {
  currentRate: number;
  tasks: PaymentTask[];
  summary: {
    paidTasks: number;
    unpaidTasks: number;
    paidNumbers: number;
    unpaidNumbers: number;
    paidAmount: number;
    unpaidAmount: number;
  };
};

const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(amount);

export const AdminPaymentReportView: React.FC = () => {
  const [report, setReport] = useState<PaymentReportData | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadReport = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/payment-report', { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat laporan pembayaran');
      setReport(data);
    } catch (reason) {
      if (signal.aborted) return;
      setError(reason instanceof Error ? reason.message : 'Gagal memuat laporan pembayaran');
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadReport(controller.signal);
    return () => controller.abort();
  }, [loadReport, reloadKey]);

  const visibleTasks = useMemo(() => (report?.tasks || []).filter((task) => filter === 'all' || task.status === filter), [report, filter]);

  return (
    <section className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Laporan pembayaran task</h2>
          <p className="text-xs text-gray-500 mt-1">Hanya task yang sudah disetujui. Nominal paid memakai tarif saat permintaan diajukan; unpaid memakai tarif saat ini ({rupiah(report?.currentRate || 0)} / nomor).</p>
        </div>
        <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={loading} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />{loading ? 'Memuat…' : 'Muat ulang'}
        </button>
      </div>

      {report && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-emerald-800"><CheckCircle2 className="w-4 h-4" /><h3 className="text-xs font-bold">Sudah dibayar</h3></div>
          <p className="text-xl font-bold text-emerald-900 mt-2">{rupiah(report.summary.paidAmount)}</p>
          <p className="text-[11px] text-emerald-800 mt-1">{report.summary.paidTasks} task · {report.summary.paidNumbers} nomor valid</p>
        </article>
        <article className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-800"><Clock3 className="w-4 h-4" /><h3 className="text-xs font-bold">Belum dibayar</h3></div>
          <p className="text-xl font-bold text-amber-900 mt-2">{rupiah(report.summary.unpaidAmount)}</p>
          <p className="text-[11px] text-amber-800 mt-1">{report.summary.unpaidTasks} task · {report.summary.unpaidNumbers} nomor valid</p>
        </article>
      </div>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Wallet className="w-4 h-4 text-teal-700" /><h3 className="text-sm font-bold text-gray-900">Rincian task</h3></div>
          <div className="inline-flex rounded-lg bg-gray-100 p-1 gap-1">
            {([['all', 'Semua'], ['paid', 'Sudah dibayar'], ['unpaid', 'Belum dibayar']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold ${filter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>{label}</button>)}
          </div>
        </div>

        {loading && !report ? <div className="p-10 text-center text-xs text-gray-500">Memuat laporan pembayaran…</div>
          : error ? <div className="p-8 text-center"><p className="text-xs text-rose-700">{error}</p><button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 text-xs font-semibold text-teal-800 hover:underline">Coba lagi</button></div>
          : visibleTasks.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500"><tr>
                <th className="px-4 py-3">Task / Toko</th><th className="px-4 py-3">Pengerja</th><th className="px-4 py-3 text-center">Nomor valid</th><th className="px-4 py-3 text-right">Tarif / nomor</th><th className="px-4 py-3 text-right">Nominal</th><th className="px-4 py-3">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">{visibleTasks.map((task) => <tr key={task.id} className="hover:bg-gray-50/60">
                <td className="px-4 py-3"><span className="block font-semibold text-gray-900">{task.code}</span><span className="text-[11px] text-gray-500">{task.store} · {task.completedAt || '-'}</span></td>
                <td className="px-4 py-3 text-gray-700">{task.operatorName || '-'}</td>
                <td className="px-4 py-3 text-center font-mono font-semibold">{task.verifiedCount}</td>
                <td className="px-4 py-3 text-right text-gray-600">{rupiah(task.ratePerNumber)}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{rupiah(task.amount)}</td>
                <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${task.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{task.status === 'paid' ? 'Sudah dibayar' : 'Belum dibayar'}</span>{task.paidAt && <span className="block text-[10px] text-gray-400 mt-1">{task.paidAt}</span>}</td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="p-8 text-center text-xs text-gray-500">Tidak ada task pada filter ini.</p>}
      </div>
    </section>
  );
};
