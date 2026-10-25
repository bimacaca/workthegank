import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { User, Play, ChevronRight, PlusCircle, ShieldCheck } from 'lucide-react';

export const TaskListView: React.FC = () => {
  const {
    activeOperator,
    tasks,
    claimNextTask,
    navigate,
    setActiveTaskId,
    userRole,
  } = useApp();

  const availableTasks = tasks.filter((t) => t.status === 'available');
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
  const completedTasks = tasks.filter(
    (t) => t.status === 'approved' || t.status === 'submitted'
  );

  const myActiveTask = inProgressTasks.find(
    (t) => t.operator_name === activeOperator?.name || t.operatorName === activeOperator?.name
  );

  const handleMainAction = () => {
    if (!activeOperator) {
      navigate('/work/operator');
      return;
    }
    if (myActiveTask) {
      setActiveTaskId(myActiveTask.id);
      navigate(`/work/tasks/${myActiveTask.id}`);
      return;
    }
    claimNextTask();
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Daftar Task" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
            Daftar Task
          </h1>

          {/* Banner notification (Screenshot 2) */}
          {!activeOperator ? (
            <div className="bg-[#e6f5f3] border-l-4 border-[#127369] p-3.5 sm:p-4 rounded-r-lg text-xs sm:text-sm text-gray-800">
              <p className="font-bold text-[#127369] mb-0.5">Isi nama pengerja dulu.</p>
              <p className="text-gray-600">
                Akun ini dipakai bersama-sama, jadi hasil kerja dicatat atas nama yang Anda pilih.{' '}
                <button
                  onClick={() => navigate('/work/operator')}
                  className="text-[#127369] underline font-medium hover:text-teal-900 cursor-pointer"
                >
                  Pilih nama sekarang.
                </button>
              </p>
            </div>
          ) : (
            <div className="bg-[#e6f5f3] border-l-4 border-[#127369] p-3.5 sm:p-4 rounded-r-lg text-xs sm:text-sm text-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-bold text-[#127369] mb-0.5">
                  Dikerjakan sebagai: {activeOperator.name}
                </p>
                <p className="text-gray-600 text-xs sm:text-sm">
                  Hasil pengerjaan nomor dan video bukti akan otomatis dicatat atas nama ini.
                </p>
              </div>
              <button
                onClick={() => navigate('/work/operator')}
                className="text-xs text-[#127369] bg-white border border-teal-300 px-3 py-1.5 rounded-full font-medium hover:bg-teal-50 cursor-pointer self-start sm:self-auto"
              >
                Ganti nama
              </button>
            </div>
          )}

          {/* Action Card with Big Button */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-7 shadow-xs space-y-2">
            <div>
              <button
                onClick={handleMainAction}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-[#127369] hover:bg-[#0f6057] active:bg-[#0d534b] text-white font-medium rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2.5"
              >
                {!activeOperator ? (
                  <>
                    <User className="w-4 h-4" />
                    <span>Pilih nama untuk mengambil task</span>
                  </>
                ) : myActiveTask ? (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Lanjutkan pengerjaan task #{myActiveTask.id}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Ambil task teratas antrean</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 pt-1">
              Sistem memberi task teratas antrean. Tidak perlu memilih.
            </p>
          </div>

          {/* 3 Metrics Cards (Screenshot 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Task tersedia */}
            <div className="bg-white rounded-xl border-2 border-teal-600/70 p-4 sm:p-5 shadow-xs bg-teal-50/10">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                Task tersedia
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {availableTasks.length}
              </div>
            </div>

            {/* Sedang dikerjakan */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                Sedang dikerjakan
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {inProgressTasks.length}
              </div>
            </div>

            {/* Selesai hari ini */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                Selesai hari ini
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                {completedTasks.length}
              </div>
            </div>
          </div>

          {/* Antrean berikutnya (Screenshot 2) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                Antrean berikutnya
              </h2>
              {userRole === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Tambah Task Baru</span>
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-xs overflow-hidden">
              {availableTasks.length > 0 ? (
                availableTasks.map((task, idx) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      if (!activeOperator) {
                        navigate('/work/operator');
                      } else {
                        setActiveTaskId(task.id);
                        claimNextTask();
                      }
                    }}
                    className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-gray-400 w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-[#127369] transition-colors truncate">
                          {task.code}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          ID {task.id} • Toko: {task.store}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 sm:px-2.5 py-1 rounded-md">
                        {task.numbers?.length || 0} nomor
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-teal-700 transition-colors" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 sm:p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Belum Ada Task
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                    Data dummy telah dihapus. Silakan tambahkan task baru melalui Panel Admin untuk mulai mendistribusikan pengerjaan nomor.
                  </p>
                  <div>
                    <button
                      onClick={() => navigate('/admin')}
                      className="px-4 py-2 bg-[#127369] hover:bg-teal-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Buka Panel Admin & Tambah Task</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
