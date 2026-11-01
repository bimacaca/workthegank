import React from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

/** Dedicated review page kept separate from the admin task queue. */
export const AdminTaskReviewView: React.FC = () => {
  const { currentPath, tasks, navigate } = useApp();
  const taskId = currentPath.match(/^\/admin\/tasks\/([^/]+)\/review$/)?.[1];
  const task = tasks.find((item) => item.id === taskId);

  return (
    <div className="min-h-screen bg-[#fcfdfd] flex flex-col text-gray-800">
      <Header title="Tinjau Task" />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 sm:p-8 max-w-5xl w-full">
          <button onClick={() => navigate('/admin')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 cursor-pointer">
            <ArrowLeft className="w-4 h-4" /> Kembali ke antrean tinjauan
          </button>
          <section className="mt-5 bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            {task ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-amber-600 mb-3" />
                <h1 className="text-xl font-bold text-gray-900">{task.code}</h1>
                <p className="text-xs text-gray-500 mt-1">ID #{task.id} · {task.store}</p>
                <p className="text-sm text-gray-600 mt-5">Halaman peninjauan task terpisah.</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Task tinjauan tidak ditemukan.</p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
