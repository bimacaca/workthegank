import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import {
  ShieldCheck,
  PlusCircle,
  FileEdit,
  Video,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Trash2,
  Save,
  AlertCircle,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { Task, NumberStatus } from '../../types';

const formatPhoneForDisplay = (phoneNumber: string) => {
  const digits = phoneNumber.replace(/\D/g, '');
  return digits && !digits.startsWith('62') ? `+${digits}` : digits;
};

export const AdminPanelView: React.FC = () => {
  const {
    tasks,
    operators,
    adminCreateTask,
    adminUpdateTask,
    adminDeleteTask,
    adminReviewTask,
    adminAccounts,
    createAdminAccount,
    changeAdminPassword,
    deleteAdminAccount,
    activeAdmin,
    adminLogout,
    showToast,
    refreshData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'review' | 'add_task' | 'edit_task' | 'workers' | 'admin_users'>('review');

  // Admin user management states
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('admin');
  const [changePassAdminId, setChangePassAdminId] = useState<string | null>(null);
  const [changePassValue, setChangePassValue] = useState('');
  const [pinOperatorId, setPinOperatorId] = useState<string | null>(null);
  const [operatorPinValue, setOperatorPinValue] = useState('');

  // Review states
  const pendingTasks = tasks.filter((t) => t.status === 'submitted');
  const [selectedTaskToReview, setSelectedTaskToReview] = useState<Task | null>(
    pendingTasks.length > 0 ? pendingTasks[0] : null
  );
  const [approvalNotes, setApprovalNotes] = useState('Video bukti sesuai dan valid.');
  const [rejectReason, setRejectReason] = useState('Video bukti terpotong / nomor tidak terlihat jelas');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [verifiedCount, setVerifiedCount] = useState<number>(20);
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [isCheckingNumbers, setIsCheckingNumbers] = useState(false);
  const [numberCheckResult, setNumberCheckResult] = useState<{
    checkedVideos: number; framesScanned: number;
    matched: string[]; missing: string[]; unexpected: string[]; note: string;
  } | null>(null);

  const checkNumbersInVideo = async (taskId: string) => {
    setIsCheckingNumbers(true);
    setNumberCheckResult(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/check-numbers`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pengecekan gagal');
      setNumberCheckResult(result);
      setApprovalNotes(result.note);
    } catch (error: any) {
      showToast(error.message || 'Pengecekan nomor gagal');
    } finally {
      setIsCheckingNumbers(false);
    }
  };

  const handleOperatorPinSave = async (operatorId: string) => {
    if (!/^\d{6}$/.test(operatorPinValue)) {
      showToast('PIN harus terdiri dari 6 angka');
      return;
    }
    try {
      const response = await fetch('/api/operators/reset-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, newPin: operatorPinValue }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Gagal menyimpan PIN');
      setPinOperatorId(null);
      setOperatorPinValue('');
      await refreshData();
      showToast('PIN pengerja berhasil disimpan');
    } catch (error: any) {
      showToast(error.message || 'Gagal menyimpan PIN');
    }
  };

  // Add Task form state
  const [newTaskCode, setNewTaskCode] = useState('gacor 02_batch_28_task #004');
  const [newTaskStore, setNewTaskStore] = useState('gacor8800');
  const [newTaskBatch, setNewTaskBatch] = useState('batch_28');
  const [newTaskContent, setNewTaskContent] = useState(`Depo dan Login pake link ini : cutt.ly/LOGIN-HOKI

percaya !! kamu bisa dapet segini> https://www.cnpmciozgh.net/sTRioS95Vu

(Bisa juga cari di google ketik 🌐 "GACOR8800")

didaftarin> https://cutt.ly/WhatsapLENA

⚠️ Balas OK untuk bisa akses link`);
  const [newPromoImageUrl, setNewPromoImageUrl] = useState('');
  const [newPromoImageFile, setNewPromoImageFile] = useState<File | null>(null);
  const [rawNumbersInput, setRawNumbersInput] = useState(
    `082234594977
081253203314
081241311745
082275601781
081374056903
081293237398
082112407908
081391193106
082295670044
082293330854
081293901133
081292932176
081312192221
08135986723
082239220555
081216614533
082121920917
082351975984
081343450014
081320267771`
  );

  // Edit Task state
  const [selectedEditTaskId, setSelectedEditTaskId] = useState<string>(
    tasks[0]?.id || ''
  );
  const taskToEdit = tasks.find((t) => t.id === selectedEditTaskId);
  const [editCode, setEditCode] = useState(taskToEdit?.code || '');
  const [editStore, setEditStore] = useState(taskToEdit?.store || '');
  const [editBatch, setEditBatch] = useState(taskToEdit?.batch || '');
  const [editContent, setEditContent] = useState(taskToEdit?.content || '');
  const [editPromoImageUrl, setEditPromoImageUrl] = useState(taskToEdit?.promoImageUrl || taskToEdit?.promo_image_url || '');
  const [editPromoImageFile, setEditPromoImageFile] = useState<File | null>(null);
  const [editNumbers, setEditNumbers] = useState(taskToEdit?.numbers || []);
  const [newNumberToAdd, setNewNumberToAdd] = useState('');

  const handleSelectEditTask = (id: string) => {
    setSelectedEditTaskId(id);
    const t = tasks.find((item) => item.id === id);
    if (t) {
      setEditCode(t.code);
      setEditStore(t.store);
      setEditBatch(t.batch);
      setEditContent(t.content);
      setEditPromoImageUrl(t.promoImageUrl || t.promo_image_url || '');
      setEditNumbers([...(t.numbers || [])]);
    }
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = rawNumbersInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 5);

    if (parsed.length === 0) {
      showToast('Masukkan minimal 1 nomor telepon!');
      return;
    }

    const created = await adminCreateTask({
      code: newTaskCode,
      store: newTaskStore,
      batch: newTaskBatch,
      content: newTaskContent,
      promoImageUrl: newPromoImageUrl,
      numbers: parsed,
    });

    if (created) {
      if (newPromoImageFile) await uploadPromoImage(created.id, newPromoImageFile);
      handleSelectEditTask(created.id);
      setActiveTab('edit_task');
    }
  };

  const handleSaveEditedTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditTaskId) return;

    await adminUpdateTask(selectedEditTaskId, {
      code: editCode,
      store: editStore,
      batch: editBatch,
      content: editContent,
      promoImageUrl: editPromoImageUrl,
      numbers: editNumbers,
    });
    if (editPromoImageFile) await uploadPromoImage(selectedEditTaskId, editPromoImageFile);
  };

  const uploadPromoImage = async (taskId: string, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await fetch(`/api/tasks/${taskId}/promo-image`, { method: 'POST', body: formData });
    const result = await response.json();
    if (!response.ok) {
      showToast(result.error || 'Gagal mengunggah gambar');
      return;
    }
    await refreshData();
    showToast('Gambar promosi berhasil diunggah');
  };

  const handleAddNumberToEdit = () => {
    if (!newNumberToAdd.trim()) return;
    const cleanedInput = newNumberToAdd.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    let clean = cleanedInput.replace(/\D/g, '');
    if (!cleanedInput.startsWith('+') && clean.startsWith('08')) {
      clean = '62' + clean.slice(1);
    }

    setEditNumbers((prev) => [
      ...prev,
      {
        id: `num-custom-${Date.now()}`,
        no: prev.length + 1,
        phoneNumber: clean,
        status: 'pending' as NumberStatus,
      },
    ]);
    setNewNumberToAdd('');
    showToast('Nomor baru ditambahkan ke daftar.');
  };

  const handleApprove = async (taskId: string) => {
    await adminReviewTask(taskId, 'approved', approvalNotes, verifiedCount);
    const remaining = pendingTasks.filter((t) => t.id !== taskId);
    setSelectedTaskToReview(remaining.length > 0 ? remaining[0] : null);
  };

  const handleReject = async (taskId: string) => {
    const finalReason = customRejectNote ? `${rejectReason}: ${customRejectNote}` : rejectReason;
    await adminReviewTask(taskId, 'rejected', finalReason);
    const remaining = pendingTasks.filter((t) => t.id !== taskId);
    setSelectedTaskToReview(remaining.length > 0 ? remaining[0] : null);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Panel Admin & Peninjauan" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl space-y-5 sm:space-y-6 w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-200 pb-4">
            <div className="flex items-start sm:items-center justify-between gap-3 w-full sm:w-auto">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600 shrink-0" />
                  <span>Panel Admin</span>
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Kelola antrean task, tambah nomor & konten broadcast, serta tinjau rekaman video bukti pengerjaan.
                </p>
              </div>

              {activeAdmin && (
                <div className="sm:hidden flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={adminLogout}
                    className="px-2.5 py-1 text-xs border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {activeAdmin && (
                <div className="hidden sm:flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-gray-600">Admin:</span>
                  <span className="font-bold text-gray-900 font-mono">{activeAdmin.username}</span>
                  <button
                    onClick={adminLogout}
                    className="ml-2 pl-2 border-l border-amber-200 text-rose-700 hover:text-rose-900 font-semibold cursor-pointer inline-flex items-center gap-1"
                    title="Keluar dari Panel Admin"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">

            {/* Admin Tabs */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl overflow-x-auto max-w-full text-xs font-semibold">
              <button
                onClick={() => setActiveTab('review')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'review'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-amber-600" />
                <span>Tinjau Video</span>
                {pendingTasks.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingTasks.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('add_task')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'add_task'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Tambah Task</span>
              </button>

              <button
                onClick={() => setActiveTab('edit_task')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'edit_task'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Konten & Nomor</span>
              </button>

              <button
                onClick={() => setActiveTab('workers')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'workers'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Pengerja</span>
              </button>

              <button
                onClick={() => setActiveTab('admin_users')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'admin_users'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Akun Admin ({adminAccounts.length})</span>
              </button>
            </div>
          </div>

          {/* TAB 1: TINJAU VIDEO BUKTI */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
                  <CheckCircle2 className="w-10 sm:w-12 h-10 sm:h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Tidak ada antrean tinjauan
                  </h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Semua task yang dikirim pengerja telah selesai ditinjau atau belum ada pengerja yang mengirim task baru.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: List */}
                  <div className="lg:col-span-1 space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Menunggu Ditinjau ({pendingTasks.length})
                    </h3>

                    <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                      {pendingTasks.map((t) => {
                        const isSelected = selectedTaskToReview?.id === t.id;
                        const doneCount = t.numbers?.filter((n) => n.status === 'done').length || 0;

                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setSelectedTaskToReview(t);
                              setVerifiedCount(doneCount);
                            }}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-300'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">
                                {t.code}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                {t.store}
                              </span>
                            </div>

                            <div className="text-[11px] text-gray-400 mt-0.5">
                              ID {t.id}
                            </div>

                            <div className="text-xs text-gray-700 mt-2 flex items-center justify-between">
                              <span>Pengerja: <b>{t.operator_name || t.operatorName || 'Pengerja'}</b></span>
                              <span className="text-teal-700 font-bold">{doneCount} selesai</span>
                            </div>

                            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1.5">
                              <Video className="w-3 h-3 text-amber-600" />
                              <span>{t.proofVideos?.length || 0} berkas video terlampir</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Player & Review Decision */}
                  <div className="lg:col-span-2">
                    {selectedTaskToReview ? (
                      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                          <div>
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                              Verifikasi Video Bukti
                            </span>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-2">
                              {selectedTaskToReview.code}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Pengerja: <b>{selectedTaskToReview.operator_name || selectedTaskToReview.operatorName}</b> • Toko: <b>{selectedTaskToReview.store}</b>
                            </p>
                          </div>
                          <span className="text-xs font-mono text-gray-400">ID #{selectedTaskToReview.id}</span>
                        </div>

                        {/* Video Player Box */}
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Bukti Rekaman Video ({selectedTaskToReview.proofVideos?.length || 0} File)
                          </label>

                          {(!selectedTaskToReview.proofVideos || selectedTaskToReview.proofVideos.length === 0) ? (
                            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 sm:p-4 text-xs text-rose-700 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              <span>Pengerja tidak melampirkan video bukti!</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-xl overflow-hidden bg-black border border-gray-800 shadow-inner">
                                <video
                                  src={
                                    playingVideoUrl ||
                                    selectedTaskToReview.proofVideos[0]?.fileUrl ||
                                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
                                  }
                                  controls
                                  className="w-full max-h-[320px] bg-black"
                                />
                              </div>

                              {selectedTaskToReview.proofVideos.length > 1 && (
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                  {selectedTaskToReview.proofVideos.map((vid, idx) => (
                                    <button
                                      key={vid.id}
                                      onClick={() => setPlayingVideoUrl(vid.fileUrl)}
                                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                                        playingVideoUrl === vid.fileUrl || (!playingVideoUrl && idx === 0)
                                          ? 'bg-teal-50 border-teal-400 text-teal-800 font-bold'
                                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                      }`}
                                    >
                                      <Play className="w-3 h-3" />
                                      <span>Part #{idx + 1} ({vid.fileSize})</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="border border-blue-200 bg-blue-50/60 rounded-lg p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-blue-900">Pengecekan nomor video</p>
                              <p className="text-[11px] text-blue-700">Diproses lokal dan tidak mengubah keputusan task.</p>
                            </div>
                            <button
                              onClick={() => checkNumbersInVideo(selectedTaskToReview.id)}
                              disabled={isCheckingNumbers || !selectedTaskToReview.proofVideos?.length}
                              className="px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                            >
                              {isCheckingNumbers ? 'Memeriksa video…' : 'Check Nomor'}
                            </button>
                          </div>
                          {numberCheckResult && (
                            <div className="text-xs text-gray-700 space-y-1 border-t border-blue-200 pt-2">
                              <p className="text-[11px] text-gray-500">{numberCheckResult.checkedVideos} video · {numberCheckResult.framesScanned} frame dipindai</p>
                              <p><b>{numberCheckResult.matched.length}</b> cocok · <b>{numberCheckResult.missing.length}</b> belum terdeteksi · <b>{numberCheckResult.unexpected.length}</b> nomor asing</p>
                              {numberCheckResult.missing.length > 0 && <p className="text-rose-700 break-all">Belum terdeteksi: {numberCheckResult.missing.join(', ')}</p>}
                              {numberCheckResult.unexpected.length > 0 && <p className="text-blue-800 break-all">Nomor asing: {numberCheckResult.unexpected.join(', ')}</p>}
                            </div>
                          )}
                        </div>

                        {/* Decision Box */}
                        <div className="border-t border-gray-200 pt-4 space-y-3 sm:space-y-4">
                          <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                            Keputusan Tinjauan Admin
                          </h3>

                          {/* Approval Form */}
                          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 sm:p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Verifikasi Diterima (Disetujui)</span>
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Nomor valid:</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={selectedTaskToReview.numbers?.length || 20}
                                  value={verifiedCount}
                                  onChange={(e) => setVerifiedCount(Number(e.target.value))}
                                  className="w-16 px-2 py-1 text-xs border border-emerald-300 rounded font-bold text-emerald-900 text-center bg-white"
                                />
                              </div>
                            </div>

                            <input
                              type="text"
                              value={approvalNotes}
                              onChange={(e) => setApprovalNotes(e.target.value)}
                              placeholder="Catatan tinjauan penerimaan..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />

                            <button
                              onClick={() => handleApprove(selectedTaskToReview.id)}
                              className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Tetapkan: Diterima (Lolos Tinjauan)</span>
                            </button>
                          </div>

                          {/* Reject Form */}
                          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3 sm:p-4 space-y-3">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Batalkan Tinjauan (Ditolak)</span>
                            </span>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {[
                                'Video bukti terpotong / nomor tidak terlihat jelas',
                                'Nomor di video tidak sesuai dengan yang ditandai',
                                'Format isi pesan promosi keliru / tidak dikirim',
                                'Video buram / bukan rekaman layar yang valid',
                              ].map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => setRejectReason(reason)}
                                  className={`p-2 text-left rounded-lg border transition-all cursor-pointer text-xs ${
                                    rejectReason === reason
                                      ? 'bg-rose-100 border-rose-400 font-semibold text-rose-900'
                                      : 'bg-white border-rose-100 text-gray-700 hover:bg-rose-50'
                                  }`}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>

                            <input
                              type="text"
                              value={customRejectNote}
                              onChange={(e) => setCustomRejectNote(e.target.value)}
                              placeholder="Keterangan tambahan untuk pengerja..."
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-rose-200 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
                            />

                            <button
                              onClick={() => handleReject(selectedTaskToReview.id)}
                              className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Tetapkan: Dibatalkan (Tolak Bukti)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        Pilih task di sebelah kiri untuk melihat rekaman video bukti.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TAMBAH TASK BARU */}
          {activeTab === 'add_task' && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-8 shadow-xs max-w-3xl">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-teal-700" />
                <span>Tambah Task Baru</span>
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                Masukkan identitas task, konten broadcast WhatsApp, dan tempel daftar nomor kontak tujuan.
              </p>

              <form onSubmit={handleCreateTaskSubmit} className="space-y-4 sm:space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Nama / Kode Task
                    </label>
                    <input
                      type="text"
                      value={newTaskCode}
                      onChange={(e) => setNewTaskCode(e.target.value)}
                      placeholder="Contoh: gacor 02_batch_28_task #004"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Toko / Brand
                    </label>
                    <input
                      type="text"
                      value={newTaskStore}
                      onChange={(e) => setNewTaskStore(e.target.value)}
                      placeholder="Contoh: gacor8800"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Nama Batch
                    </label>
                    <input
                      type="text"
                      value={newTaskBatch}
                      onChange={(e) => setNewTaskBatch(e.target.value)}
                      placeholder="Contoh: batch_28"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>

                {/* Konten Pesan */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      Konten Pesan Promosi (Template WhatsApp)
                    </label>
                    <span className="text-[11px] text-gray-400">
                      {newTaskContent.length} karakter
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={newTaskContent}
                    onChange={(e) => setNewTaskContent(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <input
                    type="url"
                    value={newPromoImageUrl}
                    onChange={(e) => setNewPromoImageUrl(e.target.value)}
                    placeholder="URL gambar promosi (opsional)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <label className="block text-xs text-gray-600">
                    Atau unggah gambar dari perangkat
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => setNewPromoImageFile(e.target.files?.[0] || null)}
                      className="block w-full mt-1 text-xs text-gray-500 file:mr-2 file:px-2.5 file:py-1 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-800 file:font-medium"
                    />
                  </label>
                </div>

                {/* Numbers Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-gray-700">
                      Daftar Nomor Tujuan (Tempel 1 nomor per baris)
                    </label>
                    <span className="text-[11px] font-bold text-teal-700">
                      {rawNumbersInput.split('\n').filter((n) => n.trim().length > 5).length} nomor terdeteksi
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={rawNumbersInput}
                    onChange={(e) => setRawNumbersInput(e.target.value)}
                    placeholder="082234594977&#10;85267041592&#10;+1 202 555 0123"
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 leading-relaxed"
                  />
                  <p className="text-[11px] text-gray-400">
                    Nomor internasional diterima. Nomor lokal Indonesia berawalan 08 otomatis diubah menjadi 628; kode negara lain, misalnya 852, tetap dipertahankan.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2.5 bg-[#127369] hover:bg-[#0f6057] text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Simpan & Terbitkan</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: EDIT KONTEN & NOMOR */}
          {activeTab === 'edit_task' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Pilih Task untuk Diedit ({tasks.length})
                </h3>

                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {tasks.length > 0 ? (
                    tasks.map((t) => {
                      const isSelected = t.id === selectedEditTaskId;
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectEditTask(t.id)}
                          className={`p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 shadow-xs'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {t.code}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold uppercase">
                              {t.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1 flex items-center justify-between">
                            <span>ID {t.id} • {t.store}</span>
                            <span>{t.numbers?.length || 0} nomor</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-xs">
                      Belum ada task.
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                {taskToEdit ? (
                  <form onSubmit={handleSaveEditedTask} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-gray-900">
                          Edit Task #{taskToEdit.id}
                        </h2>
                        <span className="text-xs text-gray-400">Status: {taskToEdit.status}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => adminDeleteTask(taskToEdit.id)}
                        className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700">Kode Task</label>
                        <input
                          type="text"
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700">Toko</label>
                        <input
                          type="text"
                          value={editStore}
                          onChange={(e) => setEditStore(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-gray-700">Batch</label>
                        <input
                          type="text"
                          value={editBatch}
                          onChange={(e) => setEditBatch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200"
                        />
                      </div>
                    </div>

                    {/* Edit Konten Pesan */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Konten Pesan Promosi
                      </label>
                      <textarea
                        rows={5}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-gray-200"
                      />
                      <input
                        type="url"
                        value={editPromoImageUrl}
                        onChange={(e) => setEditPromoImageUrl(e.target.value)}
                        placeholder="URL gambar promosi (opsional)"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200"
                      />
                      <label className="block text-xs text-gray-600">
                        Atau ganti dengan gambar dari perangkat
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          onChange={(e) => setEditPromoImageFile(e.target.files?.[0] || null)}
                          className="block w-full mt-1 text-xs text-gray-500 file:mr-2 file:px-2.5 file:py-1 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-800 file:font-medium"
                        />
                      </label>
                    </div>

                    {/* Edit Numbers List */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="block text-xs font-bold text-gray-800">
                          Daftar Nomor Telepon ({editNumbers.length} nomor)
                        </label>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Tambah nomor (08...)"
                            value={newNumberToAdd}
                            onChange={(e) => setNewNumberToAdd(e.target.value)}
                            className="px-2.5 py-1 text-xs border border-gray-200 rounded-md w-36 sm:w-auto"
                          />
                          <button
                            type="button"
                            onClick={handleAddNumberToEdit}
                            className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-medium cursor-pointer"
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>

                      <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 text-xs">
                        {editNumbers.map((num, idx) => (
                          <div key={num.id || idx} className="p-2 sm:p-2.5 flex items-center justify-between hover:bg-gray-50 gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                              <span className="text-gray-400 w-4 font-mono shrink-0">{idx + 1}.</span>
                              <input
                                type="text"
                                value={formatPhoneForDisplay(num.phoneNumber)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditNumbers((prev) =>
                                    prev.map((n, i) => (i === idx ? { ...n, phoneNumber: val } : n))
                                  );
                                }}
                                className="px-2 py-0.5 border border-gray-200 rounded font-mono text-xs w-36 sm:w-44"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                              <select
                                value={num.status}
                                onChange={(e) => {
                                  const newStatus = e.target.value as NumberStatus;
                                  setEditNumbers((prev) =>
                                    prev.map((n, i) => (i === idx ? { ...n, status: newStatus } : n))
                                  );
                                }}
                                className="px-1.5 sm:px-2 py-0.5 border border-gray-200 rounded text-xs bg-white"
                              >
                                <option value="pending">pending</option>
                                <option value="done">done</option>
                                <option value="failed">failed</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditNumbers((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Hapus nomor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-6 py-2.5 bg-[#127369] hover:bg-[#0f6057] text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs sm:text-sm">
                    Pilih task di sebelah kiri untuk mengedit konten dan nomornya.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: KELOLA PENGERJA */}
          {activeTab === 'workers' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">
                    Daftar Pengerja
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Atur PIN 6 angka agar pengerja dapat memilih nama dan memulai sesi.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 self-start sm:self-auto">
                  {operators.length} pengerja terdaftar
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm min-w-[520px]">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">NAMA PENGERJA</th>
                      <th className="px-4 sm:px-6 py-3.5 text-center">TASK</th>
                      <th className="px-4 sm:px-6 py-3.5 text-center">NOMOR</th>
                      <th className="px-4 sm:px-6 py-3.5 text-center">PIN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {operators.length > 0 ? (
                      operators.map((op) => (
                        <tr key={op.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 font-bold text-gray-900">
                            {op.name}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center font-mono text-gray-700">
                            {op.total_completed_tasks ?? op.totalCompletedTasks ?? 0}
                          </td>
                          <td className="px-4 sm:px-6 py-4 text-center font-mono text-gray-900 font-semibold">
                            {op.total_completed_numbers ?? op.totalCompletedNumbers ?? 0}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-center">
                            {pinOperatorId === op.id ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="password"
                                  value={operatorPinValue}
                                  onChange={(e) => setOperatorPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  placeholder="6 angka"
                                  inputMode="numeric"
                                  maxLength={6}
                                  autoComplete="new-password"
                                  aria-label={`PIN baru untuk ${op.name}`}
                                  className="w-24 px-2 py-1.5 rounded border border-gray-200 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => void handleOperatorPinSave(op.id)}
                                  className="text-teal-700 hover:underline font-semibold"
                                >Simpan</button>
                                <button
                                  type="button"
                                  onClick={() => { setPinOperatorId(null); setOperatorPinValue(''); }}
                                  className="text-gray-500 hover:underline"
                                >Batal</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setPinOperatorId(op.id); setOperatorPinValue(''); }}
                                className="text-teal-700 hover:underline font-medium"
                              >{op.hasPin ? 'Ganti PIN' : 'Atur PIN'}</button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-xs">
                          Belum ada pengerja yang mendaftar. Pengerja dapat mendaftar melalui halaman &apos;Nama Pengerja&apos;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: KELOLA AKUN ADMIN (ADMIN BISA BUAT USERNAME & PASSWORD) */}
          {activeTab === 'admin_users' && (
            <div className="space-y-6">
              {/* Form Tambah Admin Baru */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-7 shadow-xs max-w-2xl">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">
                    Buat Akun Admin Baru
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mb-5">
                  Admin dapat membuat username dan password baru untuk mengelola task dan peninjauan.
                </p>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newAdminUser.trim() || !newAdminPass.trim()) {
                      showToast('Username dan password admin wajib diisi');
                      return;
                    }
                    const ok = await createAdminAccount(newAdminUser, newAdminPass, newAdminRole);
                    if (ok) {
                      setNewAdminUser('');
                      setNewAdminPass('');
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Username Admin Baru
                      </label>
                      <input
                        type="text"
                        value={newAdminUser}
                        onChange={(e) => setNewAdminUser(e.target.value)}
                        placeholder="Contoh: supervisor_bima"
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        Password Admin
                      </label>
                      <input
                        type="password"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        placeholder="Minimal 5 karakter"
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Tingkat / Peran Akses
                    </label>
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="admin">Admin Reguler (Review & Task)</option>
                      <option value="super_admin">Super Administrator (Akses Penuh)</option>
                      <option value="reviewer">Admin Verifikator Video</option>
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Buat Akun Admin</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Table Daftar Admin Terdaftar */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">
                      Daftar Akun Administrator Terdaftar
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Setiap akun memiliki kredensial terpisah untuk mengakses panel kontrol dan meninjau video.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">
                    {adminAccounts.length} akun aktif
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm min-w-[420px]">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px] uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="px-5 py-3.5">USERNAME ADMIN</th>
                        <th className="px-5 py-3.5">ROLE</th>
                        <th className="px-5 py-3.5">TANGGAL DIBUAT</th>
                        <th className="px-5 py-3.5 text-right">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminAccounts.map((adm) => (
                        <tr key={adm.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>{adm.username}</span>
                            {adm.id === 'adm-primary' && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-semibold">
                                Utama
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium capitalize">
                              {adm.role?.replace('_', ' ') || 'admin'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">
                            {adm.created_at || adm.createdAt || '2026-10-24'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setChangePassAdminId(adm.id);
                                  setChangePassValue('');
                                }}
                                className="px-2.5 py-1 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded text-xs font-medium cursor-pointer"
                              >
                                Ubah Password
                              </button>

                              {adm.id !== 'adm-primary' && (
                                <button
                                  onClick={() => deleteAdminAccount(adm.id)}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                                  title="Hapus akun admin ini"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Change Admin Password Modal */}
      {changePassAdminId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 sm:p-6 border border-gray-200 space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Ganti Password Admin</span>
            </h3>

            <p className="text-xs text-gray-500 leading-relaxed">
              Masukkan password baru untuk akun admin <b>{adminAccounts.find((a) => a.id === changePassAdminId)?.username}</b>:
            </p>

            <input
              type="password"
              value={changePassValue}
              onChange={(e) => setChangePassValue(e.target.value)}
              placeholder="Password baru (min. 5 karakter)"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setChangePassAdminId(null);
                  setChangePassValue('');
                }}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!changePassValue || changePassValue.length < 5) {
                    showToast('Password minimal 5 karakter!');
                    return;
                  }
                  const ok = await changeAdminPassword(changePassAdminId, changePassValue);
                  if (ok) {
                    setChangePassAdminId(null);
                    setChangePassValue('');
                  }
                }}
                className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Simpan Password Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
