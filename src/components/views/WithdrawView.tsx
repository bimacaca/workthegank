import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { CheckCircle2, Clock3, RefreshCw, Wallet, XCircle } from 'lucide-react';

type EligibleTask = { id: string; code: string; store: string; completedAt?: string; verifiedCount: number; estimatedAmount: number };
type WithdrawalRequest = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  totalVerified: number;
  taskCount: number;
  ratePerNumber: number;
  amount: number;
};

const statusLabel = { pending: 'Menunggu verifikasi', approved: 'Disetujui / dibayar', rejected: 'Ditolak' };
const rupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

export const WithdrawView: React.FC = () => {
  const { activeOperator, showToast } = useApp();
  const [eligibleTasks, setEligibleTasks] = useState<EligibleTask[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [ratePerNumber, setRatePerNumber] = useState(500);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadWithdrawals = useCallback(async () => {
    if (!activeOperator) {
      setEligibleTasks([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`/api/withdrawals?operatorName=${encodeURIComponent(activeOperator.name)}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal memuat data withdraw');
      setEligibleTasks(data.eligibleTasks || []);
      setRequests(data.requests || []);
      setRatePerNumber(Number(data.ratePerNumber ?? 500));
      const availableIds = new Set((data.eligibleTasks || []).map((task: EligibleTask) => task.id));
      setSelectedIds((previous) => previous.filter((id) => availableIds.has(id)));
    } catch (error) {
      setLoadError(error instanceof Error && error.name === 'AbortError'
        ? 'Server terlalu lama merespons. Periksa koneksi lalu coba muat ulang.'
        : error instanceof Error ? error.message : 'Gagal memuat data withdraw');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }, [activeOperator]);

  useEffect(() => { void loadWithdrawals(); }, [loadWithdrawals]);

  const selectedTasks = useMemo(() => eligibleTasks.filter((task) => selectedIds.includes(task.id)), [eligibleTasks, selectedIds]);
  const selectedNumbers = selectedTasks.reduce((sum, task) => sum + task.verifiedCount, 0);
  const estimatedAmount = selectedNumbers * ratePerNumber;
  const allSelected = eligibleTasks.length > 0 && selectedIds.length === eligibleTasks.length;

  const toggleTask = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleAll = () => setSelectedIds(allSelected ? [] : eligibleTasks.map((task) => task.id));

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeOperator || !selectedIds.length) return showToast('Pilih setidaknya satu task yang sudah disetujui');
    setSubmitting(true);
    try {
      const response = await fetch('/api/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName: activeOperator.name, taskIds: selectedIds, bankName, accountName, accountNumber, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal mengirim permintaan pembayaran');
      setSelectedIds([]);
      setBankName('');
      setAccountName('');
      setAccountNumber('');
      setNotes('');
      await loadWithdrawals();
      showToast('Permintaan pembayaran berhasil dikirim ke admin');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal mengirim permintaan pembayaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Withdraw" />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 w-full overflow-hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Withdraw</h1>
            <p className="text-xs text-gray-500 mt-1">Pilih task yang sudah disetujui untuk mengajukan pembayaran, lalu masukkan rekening penerima.</p>
          </div>

          {!activeOperator && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Pilih sesi pengerja terlebih dahulu untuk melihat task withdraw.</div>}

          {activeOperator && loading && <section className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <RefreshCw className="w-5 h-5 text-teal-700 animate-spin mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">Memuat task yang memenuhi syarat</p>
            <p className="text-xs text-gray-500 mt-1">Kami mencari task yang sudah disetujui dan belum dibayar.</p>
          </section>}
          {activeOperator && !loading && !loadError && eligibleTasks.length === 0 && <section className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-center">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-gray-900">Belum ada task yang bisa di-withdraw</h2>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">Task akan muncul di sini setelah peninjau menyetujuinya dan task masih berstatus Unpaid. Permintaan yang menunggu verifikasi admin juga tidak dapat diajukan ulang.</p>
            <button type="button" onClick={() => void loadWithdrawals()} className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5" />Periksa lagi</button>
          </section>}
          {activeOperator && !loading && loadError && <section className="bg-white border border-rose-200 rounded-xl p-6 text-center">
            <h2 className="text-sm font-bold text-gray-900">Daftar withdraw belum dapat dimuat</h2>
            <p className="text-xs text-rose-700 mt-1">{loadError}</p>
            <button type="button" onClick={() => void loadWithdrawals()} className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50"><RefreshCw className="w-3.5 h-3.5" />Coba lagi</button>
          </section>}

          {activeOperator && !loading && eligibleTasks.length > 0 && <form onSubmit={(event) => void submitRequest(event)} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-bold text-sm text-gray-900">Task belum dibayar</h2><p className="text-xs text-gray-500 mt-1">Tarif saat ini <b className="text-teal-800">{rupiah(ratePerNumber)} / nomor valid</b>. Tarif permintaan dikunci saat dikirim.</p></div>
              <button type="button" onClick={() => void loadWithdrawals()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"><RefreshCw className="w-3.5 h-3.5" />Muat ulang</button>
            </div>

            {eligibleTasks.length > 0 && <div className="border border-gray-200 rounded-lg overflow-hidden">
              <label className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 cursor-pointer">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} className="accent-teal-700" />Pilih semua ({eligibleTasks.length})
              </label>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {eligibleTasks.map((task) => <label key={task.id} className="flex items-center gap-3 px-3 py-3 hover:bg-teal-50/40 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => toggleTask(task.id)} className="accent-teal-700" />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-gray-900">{task.code} · {task.store}</span><span className="block text-[11px] text-gray-500">{task.completedAt || 'Tanggal tidak tersedia'}</span></span>
                  <span className="text-right shrink-0"><span className="block text-xs font-bold text-teal-800">{task.verifiedCount} nomor valid</span><span className="block text-[11px] text-gray-500">{rupiah(task.estimatedAmount)}</span></span>
                </label>)}
              </div>
            </div>}

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-700 space-y-1.5">Bank / e-wallet penerima<input required maxLength={80} value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="Contoh: BCA, BRI, GoPay" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600" /></label>
              <label className="text-xs font-semibold text-gray-700 space-y-1.5">Nama pemilik rekening<input required maxLength={100} value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="Nama sesuai rekening" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600" /></label>
              <label className="text-xs font-semibold text-gray-700 space-y-1.5 sm:col-span-2">Nomor rekening / akun<input required maxLength={40} value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Nomor rekening atau akun tujuan" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600" /></label>
              <label className="text-xs font-semibold text-gray-700 space-y-1.5 sm:col-span-2">Catatan (opsional)<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="Catatan untuk admin" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600 resize-y" /></label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-600">{selectedTasks.length} task · {selectedNumbers} nomor tervalidasi · Estimasi <b className="text-teal-800">{rupiah(estimatedAmount)}</b></p>
              <button type="submit" disabled={submitting || loading || !selectedIds.length} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold"><Wallet className="w-4 h-4" />{submitting ? 'Mengirim…' : 'Kirim Pembayaran'}</button>
            </div>
          </form>}

          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200"><h2 className="font-bold text-sm text-gray-900">Riwayat permintaan withdraw</h2></div>
            {loading ? <p className="p-5 text-xs text-gray-500">Memuat riwayat…</p> : requests.length ? <div className="divide-y divide-gray-100">{requests.map((request) => <article key={request.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><p className="text-xs font-bold text-gray-900">{request.taskCount} task · {request.totalVerified} nomor valid · {request.bankName}</p><p className="text-[11px] text-gray-700 font-semibold">{rupiah(request.amount)} · tarif {rupiah(request.ratePerNumber)}/nomor</p><p className="text-[11px] text-gray-500">{request.accountName} · {request.accountNumber} · {request.createdAt}</p>{request.reviewNote && <p className="text-[11px] text-gray-600 mt-1">Catatan admin: {request.reviewNote}</p>}</div>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full self-start ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : request.status === 'rejected' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800'}`}>{request.status === 'approved' ? <CheckCircle2 className="w-3.5 h-3.5" /> : request.status === 'rejected' ? <XCircle className="w-3.5 h-3.5" /> : <Clock3 className="w-3.5 h-3.5" />}{statusLabel[request.status]}</span>
            </article>)}</div> : <p className="p-5 text-xs text-gray-500">Belum ada permintaan pembayaran.</p>}
          </section>
        </main>
      </div>
    </div>
  );
};
