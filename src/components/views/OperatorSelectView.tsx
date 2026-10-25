import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { Check } from 'lucide-react';

export const OperatorSelectView: React.FC = () => {
  const {
    operators,
    activeOperator,
    selectOperator,
    createOperator,
    navigate,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedName, setSelectedName] = useState(activeOperator?.name || '');
  const [showNewNameInput, setShowNewNameInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredOperators = operators.filter((op) =>
    op.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (showNewNameInput && newName.trim()) {
        if (newName.trim().length < 2 || newName.trim().length > 32) {
          showToast('Nama harus antara 2 hingga 32 karakter');
          return;
        }
        const created = await createOperator(newName.trim());
        if (created) {
          navigate('/work');
        }
        return;
      }

      if (!selectedName) {
        showToast('Pilih nama terlebih dahulu atau masukkan nama baru');
        return;
      }

      const success = await selectOperator(selectedName);
      if (success) {
        navigate('/work');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Nama Pengerja" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl w-full overflow-hidden">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
            Nama Pengerja
          </h1>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-8 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">
              Siapa yang mengerjakan?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-2.5 leading-relaxed">
              Satu akun ini dipakai bersama-sama. Isi nama Anda supaya hasil kerja tercatat atas nama sendiri dan muncul di papan peringkat.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
              Nama yang dipilih menjadi identitas sesi pengerjaan ini. Gunakan nama yang sama saat melanjutkan pekerjaan.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Cari nama */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-gray-800">
                  Cari nama
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik sebagian nama"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm"
                />
              </div>

              {/* Nama terdaftar */}
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-medium text-gray-800">
                  Nama terdaftar ({operators.length} pengerja)
                </label>
                <select
                  value={selectedName}
                  onChange={(e) => {
                    setSelectedName(e.target.value);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm bg-white"
                >
                  <option value="">— pilih nama —</option>
                  {filteredOperators.map((op) => (
                    <option key={op.id} value={op.name}>
                      {op.name} ({op.total_completed_tasks ?? op.totalCompletedTasks ?? 0} task selesai)
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggle Nama Baru */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewNameInput(!showNewNameInput)}
                  className="text-xs sm:text-sm text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span>{showNewNameInput ? '▴ Sembunyikan input nama baru' : '▾ Nama saya belum ada di daftar'}</span>
                </button>
              </div>

              {/* Input Nama Baru */}
              {showNewNameInput && (
                <div className="space-y-1.5 bg-teal-50/40 p-3.5 sm:p-4 rounded-lg border border-teal-100 transition-all">
                  <label className="block text-xs sm:text-sm font-medium text-gray-800">
                    Nama baru
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Contoh: Rina"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-xs sm:text-sm bg-white"
                  />
                  <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
                    Isi hanya bila nama Anda memang belum terdaftar; cari dulu di atas supaya tidak tercatat ganda. 2–32 karakter: huruf, angka, spasi, titik, apostrof, strip.
                  </p>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-3 sm:pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#127369] hover:bg-[#0f6057] active:bg-[#0d534b] text-white font-medium rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan & lanjut'}</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};
