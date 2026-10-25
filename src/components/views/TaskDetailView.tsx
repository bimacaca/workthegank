import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import {
  Copy,
  Check,
  Store,
  ChevronDown,
  ChevronRight,
  Video,
  X,
  MessageCircle,
  RotateCcw,
  Download,
} from 'lucide-react';

const formatPhoneForDisplay = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits && !digits.startsWith('62') ? `+${digits}` : digits;
};

export const TaskDetailView: React.FC = () => {
  const {
    activeTask,
    updateNumberStatus,
    activeOperator,
    navigate,
    showToast,
  } = useApp();

  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failedModalNumberId, setFailedModalNumberId] = useState<string | null>(null);
  const [failReason, setFailReason] = useState('Nomor tidak terdaftar di WhatsApp');

  if (!activeTask) {
    return (
      <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 sm:p-8 text-center text-gray-500">
            <p>Task tidak ditemukan atau belum dipilih.</p>
            <button
              onClick={() => navigate('/work')}
              className="mt-4 px-4 py-2 bg-[#127369] text-white rounded-lg text-sm cursor-pointer"
            >
              Kembali ke Daftar Task
            </button>
          </main>
        </div>
      </div>
    );
  }

  const doneCount = activeTask.numbers?.filter((n) => n.status === 'done').length || 0;
  const failedCount = activeTask.numbers?.filter((n) => n.status === 'failed').length || 0;
  const remainingCount = (activeTask.numbers?.length || 0) - doneCount - failedCount;
  const promoImageUrl = activeTask.promoImageUrl || activeTask.promo_image_url;

  const handleCopyContent = () => {
    navigator.clipboard.writeText(activeTask.content);
    setCopied(true);
    showToast('Konten pesan berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = (numId: string) => {
    updateNumberStatus(activeTask.id, numId, 'done');
  };

  const handleFailClick = (numId: string) => {
    setFailedModalNumberId(numId);
  };

  const confirmFail = () => {
    if (failedModalNumberId) {
      updateNumberStatus(activeTask.id, failedModalNumberId, 'failed', failReason);
      setFailedModalNumberId(null);
      showToast('Nomor ditandai Gagal');
    }
  };

  const handleResetNumber = (numId: string) => {
    updateNumberStatus(activeTask.id, numId, 'pending');
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header
        title={activeTask.code}
        rightAction={
          <button
            onClick={() => navigate(`/work/tasks/${activeTask.id}/proof`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-teal-200 text-[#127369] bg-teal-50/50 hover:bg-teal-100 transition-colors font-medium text-xs sm:text-sm cursor-pointer"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Kelola bukti ({activeTask.proofVideos?.length || 0})</span>
          </button>
        }
      />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          {/* Header Info */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight break-words">
              {activeTask.code}
            </h1>
            <div className="text-xs text-gray-400 mt-0.5">
              ID {activeTask.id}
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Dikerjakan sebagai <b className="text-gray-900">{activeTask.operator_name || activeTask.operatorName || activeOperator?.name || 'bima10'}</b>{' '}
              —{' '}
              <button
                onClick={() => navigate('/work/operator')}
                className="text-[#127369] underline hover:text-teal-900 cursor-pointer"
              >
                ganti nama
              </button>
            </div>
          </div>

          {/* Accordion: Cara mengerjakan (Screenshot 4) */}
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            <button
              onClick={() => setIsAccordionOpen(!isAccordionOpen)}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between hover:bg-gray-50/80 transition-colors cursor-pointer text-xs sm:text-sm font-semibold text-gray-800"
            >
              <div className="flex items-center gap-2">
                {isAccordionOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                )}
                <span>Cara mengerjakan (4 langkah, ketuk untuk membuka)</span>
              </div>
            </button>

            {isAccordionOpen && (
              <div className="p-4 pt-1 border-t border-gray-100 text-xs sm:text-sm text-gray-600 space-y-2 bg-gray-50/40">
                <p>1. <b>Salin pesan</b> yang tertera di kotak &apos;Konten pesan&apos; di bawah.</p>
                <p>2. <b>Buka nomor WhatsApp</b> tujuan dengan mengklik nomor di daftar bawah.</p>
                <p>3. <b>Kirim pesan</b> sambil merekam layar handphone/desktop sebagai bukti pengerjaan.</p>
                <p>4. <b>Tandai Done</b> jika terkirim, atau <b>Gagal</b> jika nomor tidak ada WhatsApp, lalu unggah video rekaman bukti.</p>
              </div>
            )}
          </div>

          {/* Alert Banner Toko (Screenshot 4) */}
          <div className="bg-[#e6f5f3] border border-[#127369]/20 rounded-xl p-3 sm:p-3.5 flex items-center gap-2.5 sm:gap-3 text-xs sm:text-sm text-[#0f544d]">
            <Store className="w-4 sm:w-5 h-4 sm:h-5 text-[#127369] shrink-0" />
            <span>
              <b>Toko berbeda dari task sebelumnya.</b> Salin isi pesan yang baru.
            </span>
          </div>

          {/* Konten Pesan Card (Screenshot 4) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-gray-900">Konten pesan</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {activeTask.store}
                </span>
              </div>

              <button
                onClick={handleCopyContent}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:border-teal-500 hover:text-teal-800 transition-colors bg-white font-medium text-xs cursor-pointer shadow-2xs shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-gray-500" />
                    <span>Salin Konten</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-[#fcfdfd] border border-gray-200/80 rounded-lg p-3 sm:p-4 font-mono text-xs sm:text-sm text-gray-800 whitespace-pre-line leading-relaxed select-all overflow-x-auto">
              {activeTask.content || 'Tidak ada konten pesan'}
            </div>
            {promoImageUrl && (
              <div className="space-y-2">
                <img
                  src={promoImageUrl}
                  alt="Gambar promosi task"
                  className="w-full max-w-md rounded-lg border border-gray-200 object-contain bg-gray-50"
                />
                <a
                  href={promoImageUrl}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-teal-200 text-[#127369] bg-teal-50 hover:bg-teal-100 transition-colors font-medium text-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download gambar</span>
                </a>
              </div>
            )}
          </div>

          {/* Counters line (Screenshot 4 & 5) */}
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 border-b border-gray-200 pb-3 font-medium">
            <div>
              Selesai <b className="text-gray-900 text-sm sm:text-base">{doneCount}</b>
            </div>
            <div>
              Gagal <b className="text-gray-900 text-sm sm:text-base">{failedCount}</b>
            </div>
            <div>
              Sisa <b className="text-gray-900 text-sm sm:text-base">{remainingCount}</b>
            </div>
          </div>

          {/* Table of Numbers (Screenshots 5 & 6) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm min-w-[340px]">
                <thead className="bg-[#fafafa] border-b border-gray-200 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 sm:px-5 py-3 w-12 sm:w-16">NO</th>
                    <th className="px-3 sm:px-5 py-3">NOMOR</th>
                    <th className="px-3 sm:px-5 py-3 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTask.numbers?.map((item) => {
                    const isDone = item.status === 'done';
                    const isFailed = item.status === 'failed';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50/60 transition-colors ${
                          isDone ? 'bg-emerald-50/20' : isFailed ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="px-3 sm:px-5 py-3 text-gray-400 font-medium text-xs">
                          {item.no}
                        </td>

                        <td className="px-3 sm:px-5 py-3">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <a
                              href={`https://wa.me/${item.phoneNumber.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#25D366] hover:opacity-80 transition-opacity p-0.5 inline-flex items-center"
                              title="Buka WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 fill-[#25D366] text-white" />
                            </a>

                            <a
                              href={`https://wa.me/${item.phoneNumber.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs sm:text-sm text-teal-700 hover:underline hover:text-teal-900 font-medium"
                            >
                              {formatPhoneForDisplay(item.phoneNumber)}
                            </a>

                            {isFailed && item.failedReason && (
                              <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full ml-1 truncate max-w-[150px]">
                                {item.failedReason}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 sm:px-5 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 sm:gap-2">
                            {isDone || isFailed ? (
                              <button
                                onClick={() => handleResetNumber(item.id)}
                                title="Kembalikan nomor agar dapat diproses ulang"
                                className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                              >
                                <RotateCcw className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                <span>Restore</span>
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDone(item.id)}
                                  className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 shadow-2xs bg-[#127369] text-white hover:bg-[#0f6057]"
                                >
                                  <Check className="w-3 sm:w-3.5 h-3 sm:h-3.5 stroke-[2.5]" />
                                  <span>Done</span>
                                </button>

                                <button
                                  onClick={() => handleFailClick(item.id)}
                                  className="px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 border bg-white text-gray-500 border-gray-200 hover:text-gray-700 hover:bg-gray-50"
                                >
                                  <X className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                                  <span>Gagal</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {(!activeTask.numbers || activeTask.numbers.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-gray-400 text-xs">
                        Tidak ada nomor terdaftar di task ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Video Bukti Bottom Box (Screenshot 6) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                Video bukti
              </h3>
              <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                Rekaman boleh diunggah bertahap, tidak harus menunggu seluruh nomor selesai. Memecah rekaman panjang membuat unggahan jauh lebih cepat.
              </p>
            </div>

            <button
              onClick={() => navigate(`/work/tasks/${activeTask.id}/proof`)}
              className="w-full sm:w-auto px-4 py-2 border border-gray-200 text-gray-700 hover:border-teal-500 hover:text-teal-800 bg-white font-medium rounded-lg text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-2xs"
            >
              <Video className="w-4 h-4 text-teal-700" />
              <span>Kelola bukti</span>
              {activeTask.proofVideos && activeTask.proofVideos.length > 0 && (
                <span className="bg-teal-100 text-teal-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {activeTask.proofVideos.length}
                </span>
              )}
            </button>
          </div>
        </main>
      </div>

      {/* Modal for Failed Reason */}
      {failedModalNumberId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 sm:p-6 border border-gray-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-gray-900">
                Pilih Alasan Gagal
              </h3>
              <button
                onClick={() => setFailedModalNumberId(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs sm:text-sm">
              {[
                'Nomor tidak terdaftar di WhatsApp',
                'Nomor salah / tidak aktif',
                'Nomor terblokir / privasi',
                'Chat gagal terkirim (pending terus)',
              ].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-gray-700"
                >
                  <input
                    type="radio"
                    name="failReason"
                    value={reason}
                    checked={failReason === reason}
                    onChange={(e) => setFailReason(e.target.value)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFailedModalNumberId(null)}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmFail}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Tandai Gagal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
