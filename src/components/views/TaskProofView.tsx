import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import {
  Video,
  Upload,
  Trash2,
  Play,
  FileVideo,
  Send,
  ArrowLeft,
} from 'lucide-react';

export const TaskProofView: React.FC = () => {
  const {
    activeTask,
    uploadProofVideo,
    deleteProofVideo,
    submitTaskForReview,
    navigate,
    showToast,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewingVideoUrl, setPreviewingVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!activeTask) {
    return (
      <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 sm:p-8 text-center text-gray-500">
            <p>Task tidak ditemukan.</p>
            <button
              onClick={() => navigate('/work')}
              className="mt-4 px-4 py-2 bg-[#127369] text-white rounded-lg text-sm cursor-pointer"
            >
              Kembali
            </button>
          </main>
        </div>
      </div>
    );
  }

  const doneCount = activeTask.numbers?.filter((n) => n.status === 'done').length || 0;
  const failedCount = activeTask.numbers?.filter((n) => n.status === 'failed').length || 0;
  const totalCount = activeTask.numbers?.length || 0;
  const remainingCount = totalCount - doneCount - failedCount;
  const isAllNumbersProcessed = totalCount > 0 && remainingCount === 0;
  const hasProofVideos = activeTask.proofVideos && activeTask.proofVideos.length > 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    setIsUploading(true);
    try {
      if (selectedFile) {
        await uploadProofVideo(activeTask.id, selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const sampleNames = [
          'rekaman_layar_wa_batch_part1.mp4',
          'rekaman_layar_wa_batch_part2.mp4',
          'screen_record_done_bukti.mp4',
        ];
        const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
        await uploadProofVideo(activeTask.id, {
          name: randomName,
          size: `${(Math.random() * 25 + 15).toFixed(1)} MB`,
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitTask = () => {
    if (!isAllNumbersProcessed) {
      showToast('Masih ada sisa nomor yang belum diproses!');
      return;
    }
    if (!hasProofVideos) {
      showToast('Wajib mengunggah minimal 1 video bukti rekaman!');
      return;
    }
    submitTaskForReview(activeTask.id);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title={`Bukti — ${activeTask.code}`} />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          {/* Header Title */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate(`/work/tasks/${activeTask.id}`)}
                className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke task</span>
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight break-words">
              Bukti — {activeTask.code}
            </h1>
            <div className="text-xs text-gray-400 mt-0.5">
              ID {activeTask.id}
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs text-gray-500">Toko</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {activeTask.store}
              </span>
            </div>
          </div>

          {/* Status Card (Screenshot 7) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">
                {isAllNumbersProcessed ? 'Semua nomor selesai - Siap dikirim' : 'Task masih berjalan'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Bukti boleh dicicil: unggah rekaman yang sudah ada sekarang, lanjutkan sisa nomornya, lalu unggah rekaman berikutnya. Task baru bisa dikirim setelah semua nomor diproses.
              </p>
            </div>

            {/* 4 Stats Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-gray-100">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Selesai</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{doneCount}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Gagal</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{failedCount}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Sisa nomor</div>
                <div className={`text-xl sm:text-2xl font-bold ${remainingCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                  {remainingCount}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Total nomor</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalCount}</div>
              </div>
            </div>
          </div>

          {/* Berkas bukti counter & list (Screenshot 7) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                  Berkas bukti
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {activeTask.proofVideos?.length || 0}/20
                </span>
              </div>
            </div>

            {(!activeTask.proofVideos || activeTask.proofVideos.length === 0) ? (
              <p className="text-xs sm:text-sm text-gray-500 italic py-2">
                Belum ada berkas bukti yang diunggah.
              </p>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {activeTask.proofVideos.map((vid, idx) => (
                  <div
                    key={vid.id}
                    className="p-3 sm:p-3.5 border border-gray-200 rounded-lg flex items-center justify-between gap-2 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-teal-100 text-[#127369] flex items-center justify-center shrink-0">
                        <FileVideo className="w-4 sm:w-5 h-4 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                          {vid.fileName}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>{vid.fileSize}</span>
                          <span>•</span>
                          <span>{vid.uploadedAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      <button
                        onClick={() => setPreviewingVideoUrl(vid.fileUrl)}
                        className="px-2.5 sm:px-3 py-1.5 bg-white border border-gray-200 text-teal-700 hover:bg-teal-50 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-teal-700" />
                        <span className="hidden xs:inline">Putar</span>
                      </button>

                      <button
                        onClick={() => deleteProofVideo(activeTask.id, vid.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        title="Hapus video"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unggah video bukti box (Screenshot 7) */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900">
              Unggah video bukti
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">
                Berkas video
              </label>

              {/* Drag & drop upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-teal-500 rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-50/30 hover:bg-teal-50/10 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                />

                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 group-hover:bg-teal-100 text-gray-400 group-hover:text-[#127369] flex items-center justify-center mb-2.5 transition-colors">
                  <Video className="w-5 sm:w-6 h-5 sm:h-6 stroke-[1.75]" />
                </div>

                <div className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 break-all">
                  {selectedFile ? selectedFile.name : 'Pilih satu atau beberapa video'}
                </div>
                <div className="text-[11px] text-gray-400">
                  {selectedFile
                    ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : 'mp4, webm, atau mov · maksimal 100 MB per berkas'}
                </div>
              </div>
            </div>

            {/* Buttons: Kembali & Unggah */}
            <div className="flex items-center gap-2.5 sm:gap-3 pt-1">
              <button
                onClick={() => navigate(`/work/tasks/${activeTask.id}`)}
                className="px-3.5 sm:px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Kembali
              </button>

              <button
                onClick={handleUploadSubmit}
                disabled={isUploading}
                className="px-4 sm:px-5 py-2 bg-[#127369] hover:bg-[#0f6057] active:bg-[#0d534b] text-white font-medium rounded-lg text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                <Upload className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                <span>{isUploading ? 'Mengunggah...' : 'Unggah'}</span>
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-gray-500 pt-1 leading-relaxed">
              Rekaman panjang boleh dipecah menjadi beberapa berkas — unggahannya jadi lebih cepat dan tidak mudah putus.
            </p>
          </div>

          {/* Submit Task Section */}
          <div className="bg-[#e6f5f3] border border-[#127369]/30 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-[#127369]">
                Kirim Task Selesai
              </h4>
              <p className="text-xs text-gray-600">
                {!isAllNumbersProcessed
                  ? `Selesaikan ${remainingCount} nomor lagi untuk dapat mengirim task ini ke admin.`
                  : !hasProofVideos
                  ? 'Unggah minimal satu rekaman layar bukti sebelum mengirim.'
                  : 'Semua nomor telah diproses dan bukti rekaman terunggah. Siap ditinjau oleh Admin!'}
              </p>
            </div>

            <button
              onClick={handleSubmitTask}
              disabled={!isAllNumbersProcessed || !hasProofVideos}
              className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 ${
                isAllNumbersProcessed && hasProofVideos
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Kirim Task untuk Ditinjau</span>
            </button>
          </div>
        </main>
      </div>

      {/* Video Preview Modal */}
      {previewingVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-black rounded-xl overflow-hidden max-w-2xl w-full border border-gray-700 relative">
            <div className="flex items-center justify-between p-3 bg-gray-900 text-white">
              <span className="text-xs font-semibold">Pemutar Video Bukti</span>
              <button
                onClick={() => setPreviewingVideoUrl(null)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕ Tutup
              </button>
            </div>
            <video
              src={previewingVideoUrl}
              controls
              autoPlay
              className="w-full max-h-[70vh] bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
