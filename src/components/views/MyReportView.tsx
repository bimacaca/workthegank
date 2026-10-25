import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export const MyReportView: React.FC = () => {
  const { activeOperator, tasks, navigate } = useApp();
  const [activeTab, setActiveTab] = useState<'nomor' | 'tinjauan' | 'task' | 'telegram'>('nomor');
  const [periodFilter, setPeriodFilter] = useState<'Harian' | 'Mingguan' | 'Bulanan' | 'Sebelumnya'>('Mingguan');

  const operatorName = activeOperator?.name || 'Pengerja';

  // Filter tasks belonging to active operator
  const myTasks = tasks.filter(
    (t) => (t.operator_name || t.operatorName) === operatorName
  );
  const reviewedTasks = myTasks.filter(
    (t) => t.review !== undefined || t.status === 'approved' || t.status === 'rejected'
  );

  const totalCompletedNumbers = myTasks.reduce((sum, t) => {
    return sum + (t.numbers?.filter((n) => n.status === 'done').length || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Laporan saya" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Laporan saya
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Laporan untuk sesi pengerja <b>{operatorName}</b> yang sedang dipilih.
            </p>
          </div>

          {/* Navigation Tab Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('nomor')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'nomor'
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Nomor selesai
            </button>

            <button
              onClick={() => setActiveTab('tinjauan')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'tinjauan'
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Hasil tinjauan
            </button>

            <button
              onClick={() => setActiveTab('task')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'task'
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Task saya ({myTasks.length})
            </button>

            <button
              onClick={() => navigate('/work/telegram')}
              className="px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Telegram Saya
            </button>
          </div>

          {/* Card: Nomor selesai saya · Minggu ini (Screenshot 10) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Nomor selesai saya · Minggu ini
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Rincian per toko per hari, dengan status pembayaran terbaru.
              </p>
            </div>

            {/* Sub-filter Buttons */}
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 overflow-x-auto max-w-full">
              {(['Harian', 'Mingguan', 'Bulanan', 'Sebelumnya'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0 ${
                    periodFilter === p
                      ? 'bg-[#127369] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Breakdown Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm min-w-[340px]">
                  <thead className="bg-[#fafafa] border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 sm:px-5 py-3">HARI</th>
                      <th className="px-4 sm:px-5 py-3">TOKO</th>
                      <th className="px-4 sm:px-5 py-3 text-center">SELESAI</th>
                      <th className="px-4 sm:px-5 py-3 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {myTasks.length > 0 ? (
                      myTasks.map((t) => {
                        const done = t.numbers?.filter((n) => n.status === 'done').length || 0;
                        const status = t.payment_status || t.paymentStatus || 'unpaid';

                        return (
                          <tr key={t.id} className="hover:bg-gray-50/50">
                            <td className="px-4 sm:px-5 py-3 font-medium text-gray-900">
                              {t.createdAt?.slice(0, 10) || 'Hari ini'}
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-gray-700">{t.store}</td>
                            <td className="px-4 sm:px-5 py-3 text-center font-mono text-gray-900 font-bold">
                              {done}
                            </td>
                            <td className="px-4 sm:px-5 py-3 text-right">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                  status === 'paid'
                                    ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                                    : 'border-teal-300 text-teal-800 bg-teal-50'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 sm:px-5 py-8 text-center text-gray-400 text-xs">
                          Belum ada data pengerjaan nomor untuk pengerja ini.
                        </td>
                      </tr>
                    )}

                    {/* Total row */}
                    {myTasks.length > 0 && (
                      <tr className="bg-gray-100/60 font-bold text-xs border-t border-gray-200">
                        <td className="px-4 sm:px-5 py-3 text-gray-900" colSpan={2}>
                          Total
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-center font-mono text-gray-900">
                          {totalCompletedNumbers}
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-teal-800 bg-teal-100">
                            {myTasks.filter((t) => (t.payment_status || t.paymentStatus) === 'unpaid').length} unpaid
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card: Hasil tinjauan toko (Screenshot 10) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Hasil tinjauan toko
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Satu kartu per task: angka selesai awal → akhir, lalu setiap tinjauan toko pada task itu (urut waktu) beserta alasannya.
              </p>
            </div>

            <div className="space-y-3">
              {reviewedTasks.length > 0 ? (
                reviewedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-teal-400 transition-colors bg-[#fcfdfd]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{t.code}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                          {t.store}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 mt-1">ID {t.id}</div>

                    <div className="mt-2 text-xs font-semibold text-gray-800 flex items-center gap-2">
                      {t.status === 'approved' ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Diterima · selesai {t.review?.initialCount || 0} → {t.review?.verifiedCount || 0}
                        </span>
                      ) : t.status === 'rejected' ? (
                        <span className="text-rose-700 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Dibatalkan ({t.review?.notes || 'Bukti video tidak valid'})
                        </span>
                      ) : (
                        <span className="text-teal-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Menunggu tinjauan admin
                        </span>
                      )}
                    </div>

                    {t.review?.notes && (
                      <div className="text-xs text-gray-500 mt-1 pl-4 italic">
                        &quot;{t.review.notes}&quot;
                      </div>
                    )}

                    <div className="text-[11px] text-gray-400 mt-2">
                      {t.review?.reviewedAt || t.completedAt || '-'}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic py-3">
                  Belum ada hasil tinjauan task untuk nama ini.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
