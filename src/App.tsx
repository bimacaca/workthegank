import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/views/LoginView';
import { TaskListView } from './components/views/TaskListView';
import { OperatorSelectView } from './components/views/OperatorSelectView';
import { TaskDetailView } from './components/views/TaskDetailView';
import { TaskProofView } from './components/views/TaskProofView';
import { HistoryView } from './components/views/HistoryView';
import { LeaderboardView } from './components/views/LeaderboardView';
import { MyReportView } from './components/views/MyReportView';
import { TelegramView } from './components/views/TelegramView';
import { AdminPanelView } from './components/views/AdminPanelView';
import { CheckCircle2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentPath, isLoggedIn, activeAdmin, userRole, toastMessage } = useApp();

  // 1. Unauthenticated or explicitly on /login or /admin/login
  if (!isLoggedIn || currentPath === '/login' || currentPath === '/admin/login') {
    return (
      <>
        <LoginView />
        {toastMessage && (
          <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-gray-900/95 backdrop-blur-xs text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-2xl text-xs font-medium flex items-center gap-2 border border-gray-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // 2. Admin Panel Routes: /admin or /work/admin
  if (currentPath.startsWith('/admin') || currentPath.startsWith('/work/admin')) {
    // If not authenticated as admin, prompt via LoginView
    if (!activeAdmin || userRole !== 'admin') {
      return (
        <>
          <LoginView />
          {toastMessage && (
            <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-gray-900/95 backdrop-blur-xs text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-2xl text-xs font-medium flex items-center gap-2 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="min-h-screen bg-[#fcfdfd] text-gray-800 antialiased font-sans selection:bg-amber-100 selection:text-amber-900">
        <AdminPanelView />
        {toastMessage && (
          <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-gray-900/95 backdrop-blur-xs text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-2xl text-xs font-medium flex items-center gap-2 border border-gray-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // URL-based Route Dispatcher (Replaces pure CSR in-memory state)
  const renderRouteView = () => {
    // 1. Task Proof URL route: /work/tasks/:id/proof
    if (currentPath.match(/^\/work\/tasks\/[^/]+\/proof$/)) {
      return <TaskProofView />;
    }

    // 2. Task Detail URL route: /work/tasks/:id
    if (currentPath.match(/^\/work\/tasks\/[^/]+$/)) {
      return <TaskDetailView />;
    }

    // 3. Operator select/create URL route: /work/operator
    if (currentPath.startsWith('/work/operator')) {
      return <OperatorSelectView />;
    }

    // 4. History URL route: /work/history
    if (currentPath.startsWith('/work/history')) {
      return <HistoryView />;
    }

    // 5. Leaderboard URL route: /work/leaderboard
    if (currentPath.startsWith('/work/leaderboard')) {
      return <LeaderboardView />;
    }

    // 6. My Report URL route: /work/me
    if (currentPath.startsWith('/work/me')) {
      return <MyReportView />;
    }

    // 7. Telegram URL route: /work/telegram
    if (currentPath.startsWith('/work/telegram')) {
      return <TelegramView />;
    }

    // 8. Admin Panel URL route: /admin or /work/admin
    if (currentPath.startsWith('/admin') || currentPath.startsWith('/work/admin')) {
      return <AdminPanelView />;
    }

    // Default route: /work
    return <TaskListView />;
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-gray-800 antialiased font-sans selection:bg-teal-100 selection:text-teal-900">
      {renderRouteView()}

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-gray-900/95 backdrop-blur-xs text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-lg shadow-2xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-150 border border-gray-800 max-w-[90vw]">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
