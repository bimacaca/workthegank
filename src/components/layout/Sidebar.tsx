import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Clock,
  BarChart3,
  User,
  Send,
  LogOut,
  ShieldCheck,
  RefreshCw,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentPath,
    navigate,
    logout,
    tasks,
    refreshData,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    userRole,
  } = useApp();

  const pendingReviewCount = tasks.filter((t) => t.status === 'submitted').length;

  const baseNavItems: { path: string; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      path: '/work',
      label: 'Daftar Task',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      path: '/work/history',
      label: 'Riwayat',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      path: '/work/leaderboard',
      label: 'Papan Peringkat',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      path: '/work/me',
      label: 'Laporan Saya',
      icon: <User className="w-4 h-4" />,
      badge: 3,
    }
  ];

  // Tab Panel Admin strictly only visible if authenticated userRole is admin
  const navItems =
    userRole === 'admin'
      ? [
          ...baseNavItems,
          {
            path: '/admin',
            label: 'Panel Admin',
            icon: <ShieldCheck className="w-4 h-4" />,
            badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
          },
        ]
      : baseNavItems;

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between py-5 px-3 bg-white">
      <div className="space-y-1">
        {/* Mobile drawer header */}
        <div className="md:hidden flex items-center justify-between px-2 pb-4 mb-2 border-b border-gray-100">
          <span className="font-bold text-gray-900 text-sm">Menu Navigasi</span>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {navItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path === '/work' &&
              (currentPath.startsWith('/work/tasks') || currentPath === '/work/operator'));

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-[#e6f5f3] text-[#127369] font-semibold'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-[#127369]' : 'text-gray-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    item.path === '/admin'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-1">
        <button
          onClick={() => refreshData()}
          title="Sinkronisasi ulang data"
          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-500 hover:text-teal-800 hover:bg-gray-50 rounded-md transition-colors cursor-pointer text-left"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
          <span>Sinkronkan Data</span>
        </button>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer text-left"
        >
          <LogOut className="w-4 h-4 rotate-180" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on md and up) */}
      <aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-gray-200 min-h-[calc(100vh-57px)] flex-col justify-between">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Drawer (visible on < md when open) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
