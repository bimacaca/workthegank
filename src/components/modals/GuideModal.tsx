import React from 'react';
import { X, CheckCircle, Copy, Video, Send, ShieldCheck } from 'lucide-react';

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-5 bg-[#127369] rounded-full inline-block"></span>
            Panduan Pengerjaan & Sistem
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-sm text-gray-600">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                1
              </span>
              Pilih Nama Pengerja
            </h3>
            <p className="text-gray-500 pl-7">
              Akun ini digunakan bersama-sama. Setelah login, pilih nama pengerja Anda untuk memulai sesi. Hasil kerja akan tercatat atas nama tersebut di laporan dan papan peringkat.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                2
              </span>
              Ambil Task dari Antrean
            </h3>
            <p className="text-gray-500 pl-7">
              Sistem akan memberikan task paling atas antrean secara berurutan. Setiap task berisi toko/brand dan 20 nomor tujuan.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                3
              </span>
              Salin Pesan & Broadcast WhatsApp
            </h3>
            <p className="text-gray-500 pl-7 flex items-start gap-1.5">
              <Copy className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Salin isi pesan promosi yang tersedia, buka WhatsApp ke nomor tujuan, rekam layar sebagai bukti pengerjaan, lalu tandai tombol <b>Done</b> atau <b>Gagal</b>.
              </span>
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                4
              </span>
              Unggah Rekaman Video Bukti
            </h3>
            <p className="text-gray-500 pl-7 flex items-start gap-1.5">
              <Video className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Unggah video rekaman bukti pengerjaan di menu <b>Kelola bukti</b>. Boleh dicicil beberapa file rekaman agar upload cepat dan tidak mudah putus.
              </span>
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold">
                5
              </span>
              Tinjauan oleh Admin
            </h3>
            <p className="text-gray-500 pl-7 flex items-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Admin akan meninjau kesesuaian video bukti. Status task akan berubah menjadi <b>Diterima</b> (komisi dicatat) atau <b>Dibatalkan</b> jika bukti tidak sesuai.
              </span>
            </p>
          </div>

          <div className="bg-[#e6f5f3] p-3.5 rounded-lg border border-teal-200 text-xs text-teal-900 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-[#127369] shrink-0 mt-0.5" />
            <span>
              <b>Fitur Admin:</b> Anda dapat beralih ke mode Admin kapan saja melalui tombol di pojok kanan atas atau menu samping untuk menambah task, mengedit nomor/konten, dan meninjau video.
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#127369] hover:bg-[#0f6057] text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
