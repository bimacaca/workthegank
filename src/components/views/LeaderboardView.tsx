import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { Calendar, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';

type Period = 'Harian' | 'Mingguan' | 'Bulanan' | 'Rentang tanggal';
type RankedOperator = {
  id: string;
  name: string;
  totalCompletedTasks: number;
  totalCompletedNumbers: number;
  totalFailedNumbers: number;
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
};

const shiftDate = (value: string, days: number) => {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
};

const shiftMonth = (value: string, months: number) => {
  const date = parseLocalDate(value);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(targetDay, lastDay));
  return formatLocalDate(date);
};

export const LeaderboardView: React.FC = () => {
  const { dailyStat } = useApp();
  const today = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [activeTab, setActiveTab] = useState<Period>('Harian');
  const [periodOperators, setPeriodOperators] = useState<RankedOperator[]>([]);
  const [periodStats, setPeriodStats] = useState(dailyStat);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const period = useMemo(() => {
    if (activeTab === 'Mingguan') {
      const start = parseLocalDate(selectedDate);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const startDate = formatLocalDate(start);
      return { startDate, endDate: shiftDate(startDate, 6) };
    }
    if (activeTab === 'Bulanan') {
      const date = parseLocalDate(selectedDate);
      const startDate = formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1, 12));
      const endDate = formatLocalDate(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
      return { startDate, endDate };
    }
    if (activeTab === 'Rentang tanggal') {
      return rangeStart <= rangeEnd
        ? { startDate: rangeStart, endDate: rangeEnd }
        : { startDate: rangeEnd, endDate: rangeStart };
    }
    return { startDate: selectedDate, endDate: selectedDate };
  }, [activeTab, selectedDate, rangeStart, rangeEnd]);

  useEffect(() => {
    const controller = new AbortController();
    const loadPeriod = async () => {
      setIsLoadingPeriod(true);
      setPeriodError(null);
      try {
        const query = new URLSearchParams(period);
        const [response, statsResponse] = await Promise.all([
          fetch(`/api/leaderboard?${query}`, { signal: controller.signal }),
          fetch(`/api/stats?date=${encodeURIComponent(period.endDate)}`, { signal: controller.signal }),
        ]);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gagal memuat papan peringkat');
        setPeriodOperators(data);
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          setPeriodStats((current) => ({
            ...current,
            ...stats,
            hourlyCompleted: stats.hourlyCompleted || current.hourlyCompleted,
            hourlyFailed: stats.hourlyFailed || current.hourlyFailed,
          }));
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setPeriodError(error instanceof Error ? error.message : 'Gagal memuat papan peringkat');
        setPeriodOperators([]);
      } finally {
        if (!controller.signal.aborted) setIsLoadingPeriod(false);
      }
    };
    void loadPeriod();
    return () => controller.abort();
  }, [period]);

  const rankedOperators = [...periodOperators].sort((a, b) => b.totalCompletedNumbers - a.totalCompletedNumbers);
  const totalCompletedNumbers = periodOperators.reduce((sum, operator) => sum + operator.totalCompletedNumbers, 0);
  const totalFailedNumbers = periodOperators.reduce((sum, operator) => sum + operator.totalFailedNumbers, 0);
  const totalCompletedTasks = periodOperators.reduce((sum, operator) => sum + operator.totalCompletedTasks, 0);
  const canGoNext = period.endDate < today;

  const movePeriod = (direction: -1 | 1) => {
    if (direction > 0 && !canGoNext) return;
    if (activeTab === 'Harian') setSelectedDate((date) => shiftDate(date, direction));
    else if (activeTab === 'Mingguan') setSelectedDate((date) => shiftDate(date, direction * 7));
    else if (activeTab === 'Bulanan') setSelectedDate((date) => shiftMonth(date, direction));
    else {
      const span = Math.max(0, Math.round((parseLocalDate(period.endDate).getTime() - parseLocalDate(period.startDate).getTime()) / 86_400_000));
      const nextStart = shiftDate(period.startDate, direction);
      const nextEnd = shiftDate(nextStart, span);
      if (direction < 0 || nextEnd <= today) {
        setRangeStart(nextStart);
        setRangeEnd(nextEnd);
      } else {
        setRangeEnd(today);
        setRangeStart(shiftDate(today, -span));
      }
    }
  };

  const periodLabel = activeTab === 'Harian'
    ? period.startDate
    : `${period.startDate} – ${period.endDate}`;

  // Set the graph scale from the largest stacked bar (completed + failed),
  // rounded up to an easy-to-read value rather than a fixed 2,000.
  const highestHourlyTotal = Math.max(
    0,
    ...periodStats.hourlyCompleted.map(
      (completed, hour) => completed + (periodStats.hourlyFailed[hour] || 0)
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
                <span>{isLoadingPeriod ? 'Memuat data' : periodError ? 'Gagal memuat' : 'Data periode'}</span>
            </div>
          </div>

              <p className="text-xs text-gray-500">Periode: {periodLabel}. Waktu pembagian periode mengikuti tanggal lokal perangkat.</p>

          {/* Daily Card Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{activeTab}</h2>
                <span className="text-xs text-gray-400">{periodLabel}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeTab === 'Rentang tanggal' ? <>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" /><span>Dari</span>
                    <input type="date" value={rangeStart} max={today} onChange={(event) => { const value = event.target.value; if (value) { setRangeStart(value); if (value > rangeEnd) setRangeEnd(value); } }} className="bg-transparent outline-none" />
                  </label>
                  <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700">
                    <span>Sampai</span>
                    <input type="date" value={rangeEnd} max={today} onChange={(event) => { if (event.target.value) setRangeEnd(event.target.value); }} className="bg-transparent outline-none" />
                  </label>
                </> : <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-gray-200 text-xs text-gray-700">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <input type="date" value={selectedDate} max={today} onChange={(event) => { if (event.target.value) setSelectedDate(event.target.value); }} className="bg-transparent outline-none" />
                </label>}

                <button onClick={() => movePeriod(-1)} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer">
                  <ChevronLeft className="w-3.5 h-3.5 text-gray-400" /><span>Sebelumnya</span>
                </button>
                <button onClick={() => movePeriod(1)} disabled={!canGoNext} className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <span>Berikutnya</span><ChevronRight className="w-3.5 h-3.5 text-gray-400" />
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
                  {totalCompletedNumbers.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Task dikirim
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totalCompletedTasks.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Nama aktif
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {periodOperators.filter((operator) => operator.totalCompletedTasks > 0).length}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Gagal (tidak dihitung)
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {totalFailedNumbers.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Tren Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Tren</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
                puncak {periodStats.peakHourly}
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
                {periodStats.hourlyCompleted.map((completed, hour) => {
                  const failed = periodStats.hourlyFailed[hour] || 0;
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
                  {periodError ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-rose-700 text-xs">{periodError}</td></tr>
                  ) : isLoadingPeriod ? (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-400 text-xs">Memuat peringkat periode…</td></tr>
                  ) : rankedOperators.length > 0 ? (
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
