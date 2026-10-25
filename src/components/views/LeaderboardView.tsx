import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { Calendar, ChevronRight, Trophy } from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { dailyStat, operators } = useApp();
  const [activeTab, setActiveTab] = useState<'Harian' | 'Mingguan' | 'Bulanan' | 'Rentang tanggal'>('Harian');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const rankedOperators = [...operators].sort((a, b) => {
    return (b.totalCompletedNumbers || 0) - (a.totalCompletedNumbers || 0);
  });

  // Set the graph scale from the largest stacked bar (completed + failed),
  // rounded up to an easy-to-read value rather than a fixed 2,000.
  const highestHourlyTotal = Math.max(
    0,
    ...dailyStat.hourlyCompleted.map(
      (completed, hour) => completed + (dailyStat.hourlyFailed[hour] || 0)
    )
  );
  const chartMax = (() => {
    if (highestHourlyTotal === 0) return 1;

    const magnitude = 10 ** Math.floor(Math.log10(highestHourlyTotal));
    const normalized = highestHourlyTotal / magnitude;
    const rounded = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return rounded * magnitude;
  })();
  const chartMidpoint = Math.ceil(chartMax / 2);

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Papan Peringkat" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Papan Peringkat
          </h1>

          {/* Period Selector Tabs (Screenshot 9) */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-white shadow-2xs overflow-x-auto max-w-full">
              {(['Harian', 'Mingguan', 'Bulanan', 'Rentang tanggal'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer shrink-0 ${
                    activeTab === tab
                      ? 'bg-[#127369] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              <span>Data terbaru</span>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Periode ditutup pukul 00.00 WIB. Pekerjaan setelah tengah malam masuk ke periode berikutnya.
          </p>

          {/* Daily Card Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Hari ini</h2>
                <span className="text-xs text-gray-400">{dailyStat.date}</span>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <span>Pilih tanggal</span>
                </button>

                <button className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer">
                  <span>Sebelumnya</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* 4 Metrics Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Nomor selesai
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dailyStat.completedNumbers.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Task dikirim
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dailyStat.submittedTasks.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Nama aktif
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {operators.length}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Gagal (tidak dihitung)
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {dailyStat.failedNumbers}
                </div>
              </div>
            </div>
          </div>

          {/* Tren Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Tren</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                puncak {dailyStat.peakHourly}
              </span>
            </div>

            <p className="text-xs text-gray-500">
              Nomor selesai per jam, dengan yang gagal ditumpuk di atasnya. Sentuh atau tunjuk satu jam untuk rinciannya.
            </p>

            {/* Chart Area */}
            <div className="pt-4 relative overflow-x-auto">
              <div className="flex items-end justify-between h-40 sm:h-48 border-b border-gray-200 relative gap-1 px-1 min-w-[280px]">
                <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{chartMax.toLocaleString()}</span>
                </div>
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
                  <span>{chartMidpoint.toLocaleString()}</span>
                </div>

                {/* Bars */}
                {dailyStat.hourlyCompleted.map((completed, hour) => {
                  const failed = dailyStat.hourlyFailed[hour] || 0;
                  const completedPercent = (completed / chartMax) * 100;
                  const failedPercent = (failed / chartMax) * 100;

                  return (
                    <div
                      key={hour}
                      onMouseEnter={() => setHoveredHour(hour)}
                      onMouseLeave={() => setHoveredHour(null)}
                      className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                    >
                      {hoveredHour === hour && (
                        <div className="absolute -top-14 z-20 bg-gray-900 text-white text-[11px] py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none">
                          <div className="font-bold">Pukul {hour.toString().padStart(2, '0')}:00</div>
                          <div>Selesai: {completed}</div>
                          {failed > 0 && <div className="text-rose-300">Gagal: {failed}</div>}
                        </div>
                      )}

                      {failed > 0 && (
                        <div
                          style={{ height: `${failedPercent}%` }}
                          className="w-full max-w-[14px] bg-gray-300 rounded-t-xs"
                        />
                      )}

                      <div
                        style={{ height: `${Math.max(completedPercent, 2)}%` }}
                        className={`w-full max-w-[14px] bg-[#127369] transition-all group-hover:bg-teal-700 ${
                          failed === 0 ? 'rounded-t-xs' : ''
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X Axis Hours */}
              <div className="flex justify-between text-[10px] text-gray-400 mt-2 px-1 min-w-[280px]">
                <span>00:00</span>
                <span>06:00</span>
                <span>12:00</span>
                <span>18:00</span>
                <span>23:00</span>
              </div>
            </div>
          </div>

          {/* Top Rankings Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Peringkat Pengerja Teratas</span>
              </h3>
              <span className="text-xs text-gray-400">{rankedOperators.length} pengerja</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[340px]">
                <thead className="bg-[#fafafa] border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 sm:px-5 py-3 w-14">PERINGKAT</th>
                    <th className="px-4 sm:px-5 py-3">NAMA PENGERJA</th>
                    <th className="px-4 sm:px-5 py-3 text-center">TASK</th>
                    <th className="px-4 sm:px-5 py-3 text-center">NOMOR</th>
                    <th className="px-4 sm:px-5 py-3 text-right">SUKSES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rankedOperators.length > 0 ? (
                    rankedOperators.map((op, idx) => {
                      const total = (op.totalCompletedNumbers || 0) + (op.totalFailedNumbers || 0);
                      const successRate = total > 0 ? (((op.totalCompletedNumbers || 0) / total) * 100).toFixed(1) : '100.0';

                      return (
                        <tr key={op.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 sm:px-5 py-3.5">
                            <span
                              className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : idx === 1
                                  ? 'bg-slate-200 text-slate-800'
                                  : idx === 2
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'text-gray-500'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>

                          <td className="px-4 sm:px-5 py-3.5 font-semibold text-gray-900">
                            {op.name}
                          </td>

                          <td className="px-4 sm:px-5 py-3.5 text-center font-mono text-gray-700">
                            {op.totalCompletedTasks || 0}
                          </td>

                          <td className="px-4 sm:px-5 py-3.5 text-center font-mono text-teal-800 font-bold">
                            {op.totalCompletedNumbers || 0}
                          </td>

                          <td className="px-4 sm:px-5 py-3.5 text-right font-medium text-emerald-700">
                            {successRate}%
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-xs">
                        Belum ada data pengerja terdaftar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
