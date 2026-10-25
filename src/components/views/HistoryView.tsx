import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { Filter, Layers, CheckCircle2, Clock, XCircle, Video, ChevronRight } from 'lucide-react';
import { Task } from '../../types';

export const HistoryView: React.FC = () => {
  const { tasks, navigate, userRole } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('Semua toko');
  const [selectedBatch, setSelectedBatch] = useState('Semua batch');
  const [sortOrder, setSortOrder] = useState('Terbaru dikirim');
  const [inspectedTask, setInspectedTask] = useState<Task | null>(null);

  // Distinct stores & batches
  const stores = ['Semua toko', ...Array.from(new Set(tasks.map((t) => t.store).filter(Boolean)))];
  const batches = ['Semua batch', ...Array.from(new Set(tasks.map((t) => t.batch).filter(Boolean)))];

  // History includes submitted, approved, rejected, and completed tasks
  const historyTasks = tasks.filter((t) => t.status !== 'available');

  const filteredTasks = historyTasks.filter((t) => {
    const matchQuery =
      searchQuery === '' ||
      t.id.includes(searchQuery) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStore =
      selectedStore === 'Semua toko' || t.store.toLowerCase() === selectedStore.toLowerCase();
    const matchBatch =
      selectedBatch === 'Semua batch' || t.batch.toLowerCase() === selectedBatch.toLowerCase();
    return matchQuery && matchStore && matchBatch;
  });

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Riwayat Selesai" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Riwayat Selesai
          </h1>

          {/* Filter Card (Screenshot 8) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {/* Cari ID atau nama task */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Cari ID atau nama task
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Contoh: 1234 atau #012"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 text-gray-800"
                />
              </div>

              {/* Toko */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Toko
                </label>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 text-gray-800 bg-white"
                >
                  {stores.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Batch
                </label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 text-gray-800 bg-white"
                >
                  {batches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urutan */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-600">
                  Urutan
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 text-gray-800 bg-white"
                >
                  <option value="Terbaru dikirim">Terbaru dikirim</option>
                  <option value="Terlama dikirim">Terlama dikirim</option>
                </select>
              </div>
            </div>

            {/* Terapkan Button */}
            <div>
              <button
                type="button"
                className="px-4 py-2 bg-[#127369] hover:bg-[#0f6057] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Terapkan</span>
              </button>
            </div>
          </div>

          {/* Subheader info: X task & Daftar Task Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              {filteredTasks.length} task
            </span>

            <button
              onClick={() => navigate('/work')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-medium transition-colors cursor-pointer bg-white shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Daftar task</span>
            </button>
          </div>

          {/* List of Task Cards (Screenshot 8) */}
          <div className="space-y-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const doneNum = task.numbers?.filter((n) => n.status === 'done').length || 0;
                const failNum = task.numbers?.filter((n) => n.status === 'failed').length || 0;
                const totalNum = task.numbers?.length || 0;

                return (
                  <div
                    key={task.id}
                    onClick={() => setInspectedTask(task)}
                    className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs hover:border-teal-400 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-gray-900 hover:text-teal-800 truncate">
                          {task.code}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                          {task.store}
                        </span>
                      </div>

                      <div className="text-[11px] sm:text-xs text-gray-400">
                        ID {task.id}
                      </div>

                      <div className="text-xs font-medium text-gray-700">
                        {doneNum} selesai · {failNum} gagal · {totalNum} nomor
                      </div>

                      <div className="text-[10px] sm:text-[11px] text-gray-400">
                        Dibuat {task.createdAt} · Dikerjakan {task.startedAt || '-'} · Selesai {task.completedAt || '-'}
                      </div>

                      <div className="text-xs text-gray-500 pt-1 flex items-center gap-2 flex-wrap">
                        <span>Pengerja:</span>
                        <span className="bg-gray-100 px-2 py-0.5 rounded-sm text-gray-800 font-medium">
                          {task.operator_name || task.operatorName || 'Pengerja'} · {doneNum}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500">{task.batch}</span>
                      </div>
                    </div>

                    {/* Right Status Badge */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-start sm:self-center pt-2 sm:pt-0">
                      {task.status === 'submitted' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-[#127369] border border-[#127369]/60 bg-teal-50/20 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#127369]" />
                          <span>Menunggu ditinjau</span>
                        </span>
                      )}

                      {task.status === 'approved' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-emerald-800 border border-emerald-300 bg-emerald-50 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Diterima</span>
                        </span>
                      )}

                      {task.status === 'rejected' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-rose-800 border border-rose-300 bg-rose-50 inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Dibatalkan</span>
                        </span>
                      )}

                      {task.status === 'in_progress' && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200">
                          Sedang dikerjakan
                        </span>
                      )}

                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center text-gray-400 text-xs sm:text-sm">
                Belum ada riwayat pengerjaan task yang selesai.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Task Inspection Modal */}
      {inspectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 p-5 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {inspectedTask.code}
                </h3>
                <span className="text-xs text-gray-400">ID {inspectedTask.id}</span>
              </div>
              <button
                onClick={() => setInspectedTask(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-lg text-xs">
                <div>
                  <span className="text-gray-400 block">Toko:</span>
                  <span className="font-semibold text-gray-800">{inspectedTask.store}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Pengerja:</span>
                  <span className="font-semibold text-gray-800">{inspectedTask.operator_name || inspectedTask.operatorName || 'Pengerja'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Selesai:</span>
                  <span className="font-semibold text-gray-800">
                    {inspectedTask.numbers?.filter((n) => n.status === 'done').length || 0} nomor
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Status:</span>
                  <span className="font-bold text-teal-700 capitalize">{inspectedTask.status}</span>
                </div>
              </div>

              {/* Review notes if any */}
              {inspectedTask.review && (
                <div className="bg-teal-50/60 p-3.5 rounded-lg border border-teal-200 text-xs text-teal-900 space-y-1">
                  <div className="font-bold">
                    Catatan Tinjauan Admin ({inspectedTask.review.reviewedBy}):
                  </div>
                  <p>{inspectedTask.review.notes || 'Disetujui tanpa catatan.'}</p>
                  <p className="text-[11px] text-teal-700 pt-1">
                    Ditinjau pada {inspectedTask.review.reviewedAt}
                  </p>
                </div>
              )}

              {/* Videos */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Video Bukti Terlampir ({inspectedTask.proofVideos?.length || 0})
                </h4>
                {(!inspectedTask.proofVideos || inspectedTask.proofVideos.length === 0) ? (
                  <p className="text-xs text-gray-400 italic">Tidak ada video terunggah.</p>
                ) : (
                  <div className="space-y-2">
                    {inspectedTask.proofVideos.map((vid) => (
                      <div
                        key={vid.id}
                        className="p-2.5 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Video className="w-4 h-4 text-teal-700 shrink-0" />
                          <span className="font-medium text-gray-800 truncate">{vid.fileName}</span>
                          <span className="text-gray-400">({vid.fileSize})</span>
                        </div>
                        <a
                          href={vid.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-700 hover:underline font-semibold shrink-0"
                        >
                          Tonton ↗
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-gray-100">
              {userRole === 'admin' && inspectedTask.status === 'submitted' ? (
                <button
                  onClick={() => {
                    setInspectedTask(null);
                    navigate('/admin');
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Buka di Panel Tinjauan Admin →
                </button>
              ) : (
                <div></div>
              )}

              <button
                onClick={() => setInspectedTask(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
