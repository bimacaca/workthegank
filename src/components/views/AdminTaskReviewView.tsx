import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { AlertCircle, ArrowLeft, CheckCircle2, Play, Video, XCircle } from 'lucide-react';
import { Task } from '../../types';

const formatPhoneForDisplay = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits && !digits.startsWith('62') ? `+${digits}` : digits;
};

type NumberCheckResult = {
  checkedVideos: number;
  framesScanned: number;
  matched: string[];
  missing: string[];
  note: string;
};

export const AdminTaskReviewView: React.FC = () => {
  const {
    currentPath,
    tasks,
    adminReviewTask,
    navigate,
    showToast,
  } = useApp();

  const taskId = currentPath.match(/^\/admin\/tasks\/([^/]+)\/review$/)?.[1] || '';
  const selectedTask = useMemo<Task | null>(
    () => tasks.find((task) => task.id === taskId) || null,
    [taskId, tasks]
  );

  const [approvalNotes, setApprovalNotes] = useState('Video bukti sesuai dan valid.');
  const [rejectReason, setRejectReason] = useState('Video bukti terpotong / nomor tidak terlihat jelas');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [isCheckingNumbers, setIsCheckingNumbers] = useState(false);
  const [numberCheckResult, setNumberCheckResult] = useState<NumberCheckResult | null>(null);
  const [profilePhotos, setProfilePhotos] = useState<Record<string, string | null>>({});
  const [isLoadingProfilePhotos, setIsLoadingProfilePhotos] = useState(false);

  useEffect(() => {
    if (!selectedTask) return;
    setVerifiedCount(selectedTask.numbers?.filter((number) => number.status === 'done').length || 0);
    setPlayingVideoUrl(null);
    setNumberCheckResult(null);
    setApprovalNotes('Video bukti sesuai dan valid.');
  }, [selectedTask?.id]);

  const loadProfilePhotos = async () => {
    if (!selectedTask?.numbers?.length) return;
    setIsLoadingProfilePhotos(true);
    try {
      const response = await fetch('/api/whatsapp/profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: selectedTask.numbers.map((item) => item.phoneNumber) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'WhatsApp belum terhubung');
      setProfilePhotos(Object.fromEntries(
        (data.results || []).map((item: { phone: string; photoUrl: string | null }) => [item.phone, item.photoUrl])
      ));
    } catch (error: any) {
      showToast(error.message || 'Foto profil belum dapat dimuat');
    } finally {
      setIsLoadingProfilePhotos(false);
    }
  };

  const checkNumbersInVideo = async () => {
    if (!selectedTask) return;
    setIsCheckingNumbers(true);
    setNumberCheckResult(null);
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/check-numbers`, { method: 'POST' });
      const started = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(started.error || 'Pengecekan gagal');
      if (!started.jobId) throw new Error('Server tidak mengembalikan ID pemeriksaan');

      let result: NumberCheckResult | null = null;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        const statusResponse = await fetch(`/api/number-check-jobs/${started.jobId}`);
        const status = await statusResponse.json().catch(() => ({}));
        if (!statusResponse.ok) throw new Error(status.error || 'Pengecekan gagal');
        if (status.status === 'completed') {
          result = status.result;
          break;
        }
      }
      if (!result) throw new Error('Check Nomor melebihi batas 30 detik. Video perlu diperiksa manual.');
      setNumberCheckResult(result);
      setApprovalNotes(result.note);
    } catch (error: any) {
      showToast(error.message || 'Pengecekan nomor gagal');
    } finally {
      setIsCheckingNumbers(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedTask) return;
    await adminReviewTask(selectedTask.id, 'approved', approvalNotes, verifiedCount);
    navigate('/admin');
  };

  const handleReject = async () => {
    if (!selectedTask) return;
    const finalReason = customRejectNote ? `${rejectReason}: ${customRejectNote}` : rejectReason;
    await adminReviewTask(selectedTask.id, 'rejected', finalReason);
    navigate('/admin');
  };

  if (!selectedTask) {
    return (
      <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
        <Header title="Tinjau Task" />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 sm:p-8 text-center text-gray-500">
            <p>Task tinjauan tidak ditemukan atau sudah selesai ditinjau.</p>
            <button onClick={() => navigate('/admin')} className="mt-4 px-4 py-2 bg-[#127369] text-white rounded-lg text-sm cursor-pointer">
              Kembali ke Panel Admin
            </button>
          </main>
        </div>
      </div>
    );
  }

  const doneCount = selectedTask.numbers?.filter((number) => number.status === 'done').length || 0;
  const reasons = [
    'Video bukti terpotong / nomor tidak terlihat jelas',
    'Nomor di video tidak sesuai dengan yang ditandai',
    'Format isi pesan promosi keliru / tidak dikirim',
    'Video buram / bukan rekaman layar yang valid',
  ];

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Tinjau Task" />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Kembali ke antrean tinjauan
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">Verifikasi Video Bukti</span>
                <h1 className="text-base sm:text-lg font-bold text-gray-900 mt-2">{selectedTask.code}</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pengerja: <b>{selectedTask.operator_name || selectedTask.operatorName || 'Pengerja'}</b> • Toko: <b>{selectedTask.store}</b>
                </p>
              </div>
              <span className="text-xs font-mono text-gray-400">ID #{selectedTask.id}</span>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-gray-900">Daftar Kontak Task ({selectedTask.numbers?.length || 0})</h2>
                  <p className="text-[11px] text-gray-500">Foto profil diambil dari WhatsApp Baileys.</p>
                </div>
                <button type="button" onClick={() => void loadProfilePhotos()} disabled={isLoadingProfilePhotos} className="px-2.5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-[11px] font-semibold cursor-pointer">
                  {isLoadingProfilePhotos ? 'Memuat…' : 'Muat Foto Profil'}
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                {(selectedTask.numbers || []).map((number) => {
                  const photo = profilePhotos[number.phoneNumber];
                  return (
                    <div key={number.id} className="flex items-center gap-3 px-3 py-2">
                      {photo ? <img src={photo} alt={`Foto profil ${number.phoneNumber}`} className="w-9 h-9 rounded-full object-cover border border-gray-200" /> : <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-xs">?</div>}
                      <div className="min-w-0 flex-1"><div className="text-xs font-semibold text-gray-800">{formatPhoneForDisplay(number.phoneNumber)}</div><div className="text-[10px] text-gray-500">Nomor #{number.no} · {number.status === 'done' ? 'Selesai' : number.status === 'failed' ? 'Gagal' : 'Belum selesai'}</div></div>
                      <span className={`text-[10px] ${photo ? 'text-emerald-700' : 'text-gray-400'}`}>{photo ? 'Foto tersedia' : 'Tidak ada foto'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Bukti Rekaman Video ({selectedTask.proofVideos?.length || 0} File)</label>
              {(!selectedTask.proofVideos || selectedTask.proofVideos.length === 0) ? (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 sm:p-4 text-xs text-rose-700 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Pengerja tidak melampirkan video bukti!</div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl overflow-hidden bg-black border border-gray-800 shadow-inner">
                    <video src={playingVideoUrl || selectedTask.proofVideos[0]?.fileUrl} controls className="w-full max-h-[320px] bg-black" />
                  </div>
                  {selectedTask.proofVideos.length > 1 && <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {selectedTask.proofVideos.map((video, index) => <button key={video.id} onClick={() => setPlayingVideoUrl(video.fileUrl)} className={`px-3 py-1.5 text-xs rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer shrink-0 ${playingVideoUrl === video.fileUrl || (!playingVideoUrl && index === 0) ? 'bg-teal-50 border-teal-400 text-teal-800 font-bold' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Play className="w-3 h-3" /> Part #{index + 1} ({video.fileSize})</button>)}
                  </div>}
                </div>
              )}
            </div>

            <div className="border border-blue-200 bg-blue-50/60 rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-xs font-bold text-blue-900">Pengecekan nomor video</p><p className="text-[11px] text-blue-700">Pencocokan konservatif selesai maksimal 30 detik.</p></div>
                <button onClick={() => void checkNumbersInVideo()} disabled={isCheckingNumbers || !selectedTask.proofVideos?.length} className="px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer">{isCheckingNumbers ? 'Memeriksa video…' : 'Check Nomor'}</button>
              </div>
              {numberCheckResult && <div className="text-xs text-gray-700 space-y-1 border-t border-blue-200 pt-2">
                <p className="text-[11px] text-gray-500">{numberCheckResult.checkedVideos} video · {numberCheckResult.framesScanned} frame dipindai</p>
                <p><b>{numberCheckResult.matched.length}</b> cocok · <b>{numberCheckResult.missing.length}</b> belum terdeteksi</p>
                {numberCheckResult.matched.length > 0 && <p className="text-emerald-800 break-all"><b>Nomor cocok:</b> {numberCheckResult.matched.map(formatPhoneForDisplay).join(', ')}</p>}
                {numberCheckResult.missing.length > 0 && <p className="text-rose-700 break-all">Belum terdeteksi: {numberCheckResult.missing.map(formatPhoneForDisplay).join(', ')}</p>}
                <p className="text-[11px] text-gray-500">Hasil hanya dinyatakan cocok jika nomor lengkap terbaca; hasil tetap perlu dibandingkan dengan video.</p>
              </div>}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-3 sm:space-y-4">
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Keputusan Tinjauan Admin</h2>
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex items-center justify-between"><span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Verifikasi Diterima</span><div className="flex items-center gap-2"><span className="text-xs text-gray-600">Nomor valid:</span><input type="number" min={0} max={selectedTask.numbers?.length || 20} value={verifiedCount} onChange={(event) => setVerifiedCount(Number(event.target.value))} className="w-16 px-2 py-1 text-xs border border-emerald-300 rounded font-bold text-emerald-900 text-center bg-white" /></div></div>
                <input type="text" value={approvalNotes} onChange={(event) => setApprovalNotes(event.target.value)} placeholder="Catatan tinjauan penerimaan..." className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white" />
                <button onClick={() => void handleApprove()} className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Tetapkan: Diterima</button>
              </div>
              <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 sm:p-4 space-y-3">
                <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5"><XCircle className="w-4 h-4 text-rose-600" /> Batalkan Tinjauan</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">{reasons.map((reason) => <button key={reason} type="button" onClick={() => setRejectReason(reason)} className={`p-2 text-left rounded-lg border cursor-pointer text-xs ${rejectReason === reason ? 'bg-rose-100 border-rose-400 font-semibold text-rose-900' : 'bg-white border-rose-100 text-gray-700 hover:bg-rose-50'}`}>{reason}</button>)}</div>
                <input type="text" value={customRejectNote} onChange={(event) => setCustomRejectNote(event.target.value)} placeholder="Keterangan tambahan untuk pengerja..." className="w-full px-3 py-1.5 text-xs rounded-lg border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white" />
                <button onClick={() => void handleReject()} className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> Tetapkan: Dibatalkan</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
