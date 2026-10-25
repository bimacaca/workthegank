import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useApp();

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const ok = await login(usernameInput, passwordInput);
      if (!ok) {
        setErrorMsg('Login gagal. Periksa kembali username atau password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfcfc] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6 sm:p-10 transition-all">
        {/* Header Title */}
        {/* <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-6 bg-[#127369] rounded-full inline-block"></span>
            <span className="text-xl font-bold text-teal-900 tracking-tight">Work The Gank</span>
            <span className="text-[10px] bg-teal-50 text-teal-800 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
              v3.0
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Masuk dengan username pengerja atau username admin. Hak akses dan halaman ditentukan otomatis berdasarkan role akun Anda.
          </p>
        </div> */}

        {/* <p className="mb-5 text-xs sm:text-sm text-gray-600 leading-relaxed">
          Pengerja menggunakan username dan password bersama. Setelah login, pilih nama pengerja untuk membuat sesi kerja.
        </p> */}

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Username Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Username
              </label>
              {/* {usernameInput.toLowerCase().includes('admin') && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Mode Admin
                </span>
              )} */}
            </div>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Masukan Username"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-gray-800 text-sm transition-all font-medium"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                Password
              </label>
              {/* <span className="text-[11px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Wajib diisi
              </span> */}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Masukkan password"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent text-gray-800 text-sm pr-10 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Cloudflare Captcha Box (Exact replica of Screenshot 1) */}
          {/* <div className="bg-[#f9fafb] border border-gray-200 rounded-lg p-3.5 flex items-center justify-between select-none shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span className="text-sm font-medium text-gray-800">Success!</span>
            </div>
            <div className="flex flex-col items-end text-right">
              <div className="flex items-center gap-1.5">
                <svg
                  className="w-7 h-4 text-[#f38020]"
                  viewBox="0 0 48 24"
                  fill="currentColor"
                >
                  <path d="M37.5 12.5c-.2-4.1-3.6-7.5-7.8-7.5-3.3 0-6.1 2.1-7.2 5.1-1-.6-2.2-.9-3.5-.9-3.6 0-6.5 2.9-6.5 6.5 0 .3 0 .7.1 1h25.4c1.4-.7 2.4-2.2 2.4-3.8 0-.2 0-.3-.1-.4h-2.8z" />
                  <path
                    d="M39.6 12.9c-.3 0-.6.1-.9.1 0-.2.1-.5.1-.7 0-4.6-3.7-8.3-8.3-8.3-3.7 0-6.8 2.4-7.9 5.8-1.2-.8-2.6-1.3-4.1-1.3-4.1 0-7.4 3.3-7.4 7.4 0 .4 0 .8.1 1.2-4.5.3-8.1 4.1-8.1 8.7 0 4.8 3.9 8.7 8.7 8.7h27.8c4.6 0 8.3-3.7 8.3-8.3 0-4.3-3.2-7.8-7.3-8.2z"
                    fill="#f38020"
                    opacity="0.9"
                  />
                </svg>
                <span className="text-[10px] font-bold tracking-wider text-gray-800">
                  CLOUDFLARE
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-normal">
                <span className="hover:underline cursor-pointer">Privacy</span> •{' '}
                <span className="hover:underline cursor-pointer">Help</span>
              </div>
            </div>
          </div> */}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 px-4 font-semibold rounded-lg text-sm text-white transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
              usernameInput.toLowerCase().includes('admin')
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                : 'bg-[#127369] hover:bg-[#0f6057] active:bg-[#0d534b]'
            }`}
          >
            <span>{isSubmitting ? 'Memeriksa kredensial...' : 'Sign in'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Helpful Info Guide */}
        {/* <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-500 space-y-1.5 leading-relaxed">
          <div className="flex items-start gap-1.5 text-gray-600">
            <span className="font-semibold text-teal-800 shrink-0">Pengerja:</span>
            <span>Username <strong>GasTerus</strong> (password: <strong>Gas12</strong>) masuk ke antrean tugas & pelaporan.</span>
          </div>
          <div className="flex items-start gap-1.5 text-gray-600">
            <span className="font-semibold text-amber-800 shrink-0">Admin:</span>
            <span>Username <strong>worktheadmin</strong> (password: <strong>admin123</strong>) langsung membuka Panel Admin.</span>
          </div>
        </div> */}
      </div>
    </div>
  );
};
