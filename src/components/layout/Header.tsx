import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HelpCircle, User, ShieldCheck, Menu, X, LogOut } from 'lucide-react';
import { GuideModal } from '../modals/GuideModal';

interface HeaderProps {
  title?: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, rightAction }) => {
  const {
    activeOperator,
    activeAdmin,
    username,
    navigate,
    userRole,
    logout,
    tasks,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useApp();
  const [showGuide, setShowGuide] = useState(false);

  const pendingReviewCount = tasks.filter((t) => t.status === 'submitted').length;

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 shadow-xs">
        {/* Left: Mobile hamburger menu & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {title ? (
            <h1 className="text-base sm:text-2xl font-bold text-gray-900 tracking-tight truncate">
              {title}
            </h1>
          ) : (
            <div
              onClick={() => navigate('/work')}
              className="text-base sm:text-xl font-bold text-teal-800 flex items-center gap-2 cursor-pointer"
            >
              <span className="w-2 sm:w-2.5 h-5 sm:h-6 bg-teal-700 rounded-full inline-block"></span>
              <span className="truncate">Work The Gank</span>
            </div>
          )}
        </div>

        {/* Right action & badges */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm shrink-0">
          {rightAction}

          {/* Panduan Button */}
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors bg-white font-medium text-xs sm:text-sm cursor-pointer shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden xs:inline">Panduan</span>
          </button>

          {/* Operator Selector Button */}
          <button
            onClick={() => navigate('/work/operator')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-800 transition-colors bg-white font-medium text-xs sm:text-sm cursor-pointer shadow-2xs max-w-[140px] sm:max-w-none truncate"
          >
            {activeOperator ? (
              <>
                <span className="font-semibold text-gray-800 truncate">{activeOperator.name}</span>
                <span className="text-gray-400">·</span>
                <span className="text-teal-700 hover:underline">ganti</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="truncate">Pilih nama</span>
              </>
            )}
          </button>

          {/* System Account Name (Desktop) */}
          <span className="text-gray-500 font-normal text-xs hidden lg:inline">
            {userRole === 'admin' && activeAdmin ? `Admin: ${activeAdmin.username}` : username}
          </span>

          {/* Authenticated Role Indicator (Pure role based, no toggles) */}
          <div className="flex items-center gap-2">
            {/* {userRole === 'admin' ? (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-xs sm:text-sm font-semibold shadow-2xs select-none">
                <ShieldCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-700 shrink-0" />
                <span>Admin</span>
                {pendingReviewCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-0.5" title={`${pendingReviewCount} review menunggu`} />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 text-xs sm:text-sm font-semibold shadow-2xs select-none">
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0"></span>
                <span>Pengerja</span>
              </div>
            )} */}

            {/* Logout button */}
            <button
              onClick={logout}
              title="Keluar dari akun"
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-gray-200 hover:border-rose-200 transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {showGuide && <GuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
};
