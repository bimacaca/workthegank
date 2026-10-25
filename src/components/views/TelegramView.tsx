import React from 'react';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { Send, ExternalLink, ShieldCheck, MessageCircle } from 'lucide-react';

export const TelegramView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Telegram Group & Bantuan" />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 sm:p-8 max-w-4xl space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Telegram Resmi
          </h1>

          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center shrink-0">
                <Send className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Grup Koordinasi & Info Task
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dapatkan info batch terbaru, update toko, dan koordinasi dengan admin dan sesama pengerja.
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4 text-sm text-gray-600">
              <p>
                Semua pengerja diwajibkan bergabung ke grup resmi untuk mendapatkan notifikasi jika ada instruksi khusus dari toko atau perubahan template pesan promosi.
              </p>

              <div className="bg-[#e6f5f3] p-4 rounded-xl border border-teal-200 text-xs text-teal-900 flex items-center justify-between">
                <div>
                  <div className="font-bold">Saluran Pengumuman Resmi: @workthegank_official</div>
                  <div className="text-teal-700 mt-0.5">Admin fast response untuk kendala nomor & verifikasi video</div>
                </div>
                <a
                  href="https://t.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#127369] text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-1.5 shrink-0"
                >
                  <span>Buka Telegram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
