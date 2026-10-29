import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Task, Operator, DailyStat, NumberStatus, VideoProof, AdminAccount } from '../types';
import { SEED_DAILY_STAT } from '../data/seedData';

export type UserRole = 'worker' | 'admin';

interface AppContextType {
  // Navigation & Routing
  currentPath: string;
  navigate: (path: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;

  // Auth & Roles
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isLoggedIn: boolean;
  username: string;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;

  // Operator
  activeOperator: Operator | null;
  operators: Operator[];
  selectOperator: (name: string, pin: string) => Promise<boolean>;
  createOperator: (name: string, pin: string) => Promise<Operator | null>;
  clearOperator: () => void;

  // Tasks
  tasks: Task[];
  activeTaskId: string | null;
  activeTask: Task | null;
  setActiveTaskId: (id: string | null) => void;
  claimNextTask: () => Promise<Task | null>;
  updateNumberStatus: (
    taskId: string,
    numberId: string,
    status: NumberStatus,
    failedReason?: string
  ) => Promise<void>;
  uploadProofVideo: (taskId: string, file: File | { name: string; size: string; url: string }) => Promise<void>;
  deleteProofVideo: (taskId: string, videoId: string) => Promise<void>;
  submitTaskForReview: (taskId: string) => Promise<void>;

  // Admin capabilities
  adminCreateTask: (data: {
    code: string;
    store: string;
    batch: string;
    content: string;
    promoImageUrl?: string;
    numbers: string[];
  }) => Promise<Task | null>;
  adminUpdateTask: (
    taskId: string,
    data: {
      code?: string;
      store?: string;
      batch?: string;
      content?: string;
    promoImageUrl?: string;
      numbers?: { id?: string; no: number; phoneNumber: string; status: NumberStatus; failedReason?: string }[];
    }
  ) => Promise<void>;
  adminDeleteTask: (taskId: string) => Promise<void>;
  adminDeleteTasks: (taskIds: string[]) => Promise<boolean>;
  adminReviewTask: (
    taskId: string,
    verdict: 'approved' | 'rejected',
    notes?: string,
    verifiedCount?: number
  ) => Promise<void>;
  adminTogglePayment: (taskId: string) => Promise<void>;

  // Admin authentication & account management
  adminLogin: (user: string, pass: string) => Promise<boolean>;
  activeAdmin: AdminAccount | null;
  adminAccounts: AdminAccount[];
  fetchAdminAccounts: () => Promise<void>;
  createAdminAccount: (user: string, pass: string, role?: string) => Promise<boolean>;
  changeAdminPassword: (adminId: string, newPass: string) => Promise<boolean>;
  deleteAdminAccount: (adminId: string) => Promise<boolean>;
  adminLogout: () => void;

  // Stats & Utilities
  dailyStat: DailyStat;
  isLoading: boolean;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  refreshData: (date?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ACTIVE_OP: 'wtg_active_operator_v2',
  AUTH: 'wtg_auth_user_v2',
  ROLE: 'wtg_user_role_v2',
  ADMIN: 'wtg_admin_user_v2',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Path routing (Real route navigation instead of pure CSR state)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname === '/' ? '/work' : window.location.pathname;
  });

  // Mobile menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) !== null;
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH) || 'GasTerus';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'worker';
  });

  // Loaded application data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [activeOperator, setActiveOperator] = useState<Operator | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_OP);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return null;
  });

  const [activeAdmin, setActiveAdmin] = useState<AdminAccount | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ADMIN);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return null;
  });
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);

  const [dailyStat, setDailyStat] = useState<DailyStat>(SEED_DAILY_STAT);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Real route navigation function
  const navigate = useCallback((path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Listen to browser Back / Forward buttons (Popstate)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname === '/' ? '/work' : window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Fetch current data from the service API
  const refreshData = useCallback(async (date?: string) => {
    try {
      setIsLoading(true);
      const [tasksRes, opsRes, statsRes, adminRes] = await Promise.all([
        fetch('/api/tasks').catch(() => null),
        fetch('/api/operators').catch(() => null),
        fetch(`/api/stats${date ? `?date=${encodeURIComponent(date)}` : ''}`).catch(() => null),
        fetch('/api/admin/list').catch(() => null),
      ]);

      if (tasksRes && tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }
      if (opsRes && opsRes.ok) {
        const opsData = await opsRes.json();
        setOperators(opsData);
        // Sync the active operator only while the session still has one.
        // A pending refresh may finish after logout; in that case the storage
        // entry has been removed and must not restore the previous selection.
        if (activeOperator && localStorage.getItem(STORAGE_KEYS.ACTIVE_OP)) {
          const matched = opsData.find((o: Operator) => o.name === activeOperator.name);
          if (matched) {
            setActiveOperator(matched);
            localStorage.setItem(STORAGE_KEYS.ACTIVE_OP, JSON.stringify(matched));
          }
        }
      }
      if (adminRes && adminRes.ok) {
        const adminData = await adminRes.json();
        setAdminAccounts(adminData);
      }
      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        setDailyStat({
          date: statsData.date || new Date().toISOString().slice(0, 10),
          completedNumbers: statsData.completedNumbers || 0,
          submittedTasks: statsData.submittedTasks || 0,
          activeWorkers: statsData.activeWorkers || 0,
          failedNumbers: statsData.failedNumbers || 0,
          peakHourly: Math.max(...(statsData.hourlyCompleted || Array(24).fill(0))),
          hourlyCompleted: statsData.hourlyCompleted || Array(24).fill(0),
          hourlyFailed: statsData.hourlyFailed || Array(24).fill(0),
        });
      }
    } catch (e) {
      console.error('Failed to fetch application data', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeOperator]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Fetch admin accounts list
  const fetchAdminAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/list');
      if (res.ok) {
        const data = await res.json();
        setAdminAccounts(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Handle active task sync from route (e.g. /work/tasks/:id)
  useEffect(() => {
    const match = currentPath.match(/\/work\/tasks\/([^/]+)/);
    if (match && match[1]) {
      setActiveTaskId(match[1]);
    }
  }, [currentPath]);

  // Save auth to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ROLE, userRole);
  }, [userRole]);

  // Unified Login:
  // - Worker username "GasTerus" + password "Gas12" -> opens Worker Panel / Task List (/work)
  // - Admin username "worktheadmin" / "admin" + password "admin123" -> opens Panel Admin (/admin)
  // Password is not optional for workers!
  const login = async (user: string, pass: string): Promise<boolean> => {
    const cleanUser = user.trim() || 'GasTerus';
    const cleanPass = (pass || '').trim();

    if (!cleanPass) {
      showToast('Password wajib diisi!');
      return false;
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || 'Login gagal. Periksa kembali username atau password.');
        return false;
      }

      if (data.role === 'admin') {
        setActiveAdmin(data.user);
        setUsername(data.user.username);
        setUserRole('admin');
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEYS.AUTH, data.user.username);
        localStorage.setItem(STORAGE_KEYS.ROLE, 'admin');
        localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(data.user));
        navigate('/admin');
        showToast(`Selamat datang di Panel Admin: ${data.user.username}`);
        await fetchAdminAccounts();
        return true;
      } else {
        // Worker login
        setActiveAdmin(null);
        setActiveOperator(null);
        setUsername(data.user.username);
        setUserRole('worker');
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEYS.AUTH, data.user.username);
        localStorage.setItem(STORAGE_KEYS.ROLE, 'worker');
        localStorage.removeItem(STORAGE_KEYS.ADMIN);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_OP);
        navigate('/work/operator');
        showToast('Login berhasil. Pilih nama pengerja untuk memulai sesi.');
        return true;
      }
    } catch (e) {
      // Offline fallback validation
      if (cleanUser.toLowerCase() === 'gasterus' && cleanPass === 'Gas12') {
        setActiveAdmin(null);
        setActiveOperator(null);
        setUsername('GasTerus');
        setUserRole('worker');
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEYS.AUTH, 'GasTerus');
        localStorage.setItem(STORAGE_KEYS.ROLE, 'worker');
        localStorage.removeItem(STORAGE_KEYS.ADMIN);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_OP);
        navigate('/work/operator');
        showToast('Login berhasil. Pilih nama pengerja untuk memulai sesi.');
        return true;
      } else if (cleanUser.toLowerCase() === 'worktheadmin' && cleanPass === 'admin123') {
        const fallbackAdmin: AdminAccount = {
          id: 'adm-worktheadmin',
          username: 'worktheadmin',
          role: 'super_admin',
          createdAt: '2026-10-24 00:00',
        };
        setActiveAdmin(fallbackAdmin);
        setUsername('worktheadmin');
        setUserRole('admin');
        setIsLoggedIn(true);
        localStorage.setItem(STORAGE_KEYS.AUTH, 'worktheadmin');
        localStorage.setItem(STORAGE_KEYS.ROLE, 'admin');
        localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(fallbackAdmin));
        navigate('/admin');
        showToast('Selamat datang di Panel Admin: worktheadmin');
        return true;
      }

      showToast('Kredensial tidak valid!');
      return false;
    }
  };

  // Dedicated Admin Login
  const adminLogin = async (user: string, pass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Username atau password admin salah');
        return false;
      }
      const data = await res.json();
      setActiveAdmin(data.admin);
      setUsername(data.admin.username);
      setUserRole('admin');
      setIsLoggedIn(true);
      localStorage.setItem(STORAGE_KEYS.AUTH, data.admin.username);
      localStorage.setItem(STORAGE_KEYS.ROLE, 'admin');
      localStorage.setItem(STORAGE_KEYS.ADMIN, JSON.stringify(data.admin));
      navigate('/admin');
      showToast(`Berhasil masuk sebagai Admin: ${data.admin.username}`);
      await fetchAdminAccounts();
      return true;
    } catch (e) {
      showToast('Gagal menghubungi server admin');
      return false;
    }
  };

  // Create new Admin username & password
  const createAdminAccount = async (user: string, pass: string, role?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, role }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat akun admin');
        return false;
      }
      showToast(`Akun admin "${user}" berhasil dibuat!`);
      await fetchAdminAccounts();
      return true;
    } catch (e) {
      showToast('Gagal membuat akun admin');
      return false;
    }
  };

  // Change Admin Password
  const changeAdminPassword = async (adminId: string, newPass: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, newPassword: newPass }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Gagal mengubah password');
        return false;
      }
      showToast('Password admin berhasil diubah!');
      return true;
    } catch (e) {
      showToast('Gagal mengubah password');
      return false;
    }
  };

  // Delete Admin account
  const deleteAdminAccount = async (adminId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/${adminId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapus admin');
        return false;
      }
      showToast('Akun admin berhasil dihapus');
      await fetchAdminAccounts();
      return true;
    } catch (e) {
      showToast('Gagal menghapus admin');
      return false;
    }
  };

  const logout = () => {
    setIsLoggedIn(false);
    setActiveAdmin(null);
    setActiveOperator(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.ADMIN);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_OP);
    navigate('/login');
    showToast('Telah keluar dari sistem');
  };

  const adminLogout = () => {
    // Clear the worker identity too, so every login starts without a selected
    // operator regardless of which logout button was used.
    setActiveAdmin(null);
    setActiveOperator(null);
    setIsLoggedIn(false);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_OP);
    localStorage.removeItem(STORAGE_KEYS.ADMIN);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    navigate('/login');
    showToast('Telah keluar dari Panel Administrator');
  };

  // Operator actions
  const selectOperator = async (name: string, pin: string): Promise<boolean> => {
    const found = operators.find((op) => op.name.toLowerCase() === name.trim().toLowerCase());
    if (!found) {
      showToast('Nama operator tidak ditemukan!');
      return false;
    }

    try {
      const res = await fetch('/api/operators/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId: found.id, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || 'PIN tidak sesuai');
        return false;
      }
    } catch {
      showToast('Gagal memverifikasi PIN. Periksa koneksi server.');
      return false;
    }

    setActiveOperator(found);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_OP, JSON.stringify(found));
    showToast(`Pengerja aktif: ${found.name}`);
    return true;
  };

  const createOperator = async (name: string, pin: string): Promise<Operator | null> => {
    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Gagal mendaftarkan operator');
        return null;
      }
      const created = await res.json();
      const newOp: Operator = {
        id: created.id,
        name: created.name,
        hasPin: true,
        createdAt: created.created_at,
        totalCompletedTasks: created.total_completed_tasks || 0,
        totalCompletedNumbers: created.total_completed_numbers || 0,
        totalFailedNumbers: created.total_failed_numbers || 0,
        isActive: Boolean(created.is_active),
      };
      setActiveOperator(newOp);
      localStorage.setItem(STORAGE_KEYS.ACTIVE_OP, JSON.stringify(newOp));
      await refreshData();
      showToast(`Operator baru "${name}" berhasil didaftarkan`);
      return newOp;
    } catch (e: any) {
      showToast('Gagal menghubungi server');
      return null;
    }
  };

  const clearOperator = () => {
    setActiveOperator(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_OP);
    showToast('Nama pengerja dilepas');
  };

  // Claim next available task
  const claimNextTask = async (): Promise<Task | null> => {
    if (!activeOperator) {
      navigate('/work/operator');
      showToast('Harap pilih atau isi nama pengerja terlebih dahulu');
      return null;
    }

    try {
      const res = await fetch('/api/tasks/claim-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operatorName: activeOperator.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Tidak ada task tersedia di antrean');
        return null;
      }

      const task: Task = await res.json();
      setActiveTaskId(task.id);
      await refreshData();
      navigate(`/work/tasks/${task.id}`);
      showToast(`Task ${task.code} berhasil diambil`);
      return task;
    } catch (e) {
      showToast('Gagal mengambil task');
      return null;
    }
  };

  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // Update single number status
  const updateNumberStatus = async (
    taskId: string,
    numberId: string,
    status: NumberStatus,
    failedReason?: string
  ) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          numbers: t.numbers.map((n) =>
            n.id === numberId ? { ...n, status, failedReason: status === 'failed' ? failedReason : undefined } : n
          ),
        };
      })
    );

    try {
      await fetch(`/api/tasks/${taskId}/numbers/${numberId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, failedReason }),
      });
      await refreshData();
    } catch (e) {
      console.error('Failed to update number status', e);
    }
  };

  // Upload proof video
  const uploadProofVideo = async (
    taskId: string,
    file: File | { name: string; size: string; url: string }
  ) => {
    try {
      let res;
      if (file instanceof File) {
        const formData = new FormData();
        formData.append('video', file);
        res = await fetch(`/api/tasks/${taskId}/upload-proof`, {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch(`/api/tasks/${taskId}/upload-proof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mockUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
          }),
        });
      }

      if (res && res.ok) {
        await refreshData();
        showToast('Video bukti berhasil disimpan');
      } else {
        showToast('Gagal mengunggah video');
      }
    } catch (e) {
      showToast('Gagal mengunggah video ke server');
    }
  };

  // Delete proof video
  const deleteProofVideo = async (taskId: string, videoId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/proof/${videoId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshData();
        showToast('Video bukti dihapus');
      }
    } catch (e) {
      showToast('Gagal menghapus video');
    }
  };

  // Submit task for review
  const submitTaskForReview = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/submit`, {
        method: 'POST',
      });
      if (res.ok) {
        await refreshData();
        showToast(`Task #${taskId} berhasil dikirim untuk ditinjau!`);
        navigate('/work/history');
      } else {
        showToast('Gagal mengirim task');
      }
    } catch (e) {
      showToast('Gagal mengirim task');
    }
  };

  // Admin: Create new task
  const adminCreateTask = async (data: {
    code: string;
    store: string;
    batch: string;
    content: string;
    promoImageUrl?: string;
    numbers: string[];
  }): Promise<Task | null> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat task');
        return null;
      }
      const created: Task = await res.json();
      await refreshData();
      showToast(`Task baru ID ${created.id} (${created.code}) berhasil disimpan!`);
      return created;
    } catch (e) {
      showToast('Gagal menyimpan task');
      return null;
    }
  };

  // Admin: Update task
  const adminUpdateTask = async (
    taskId: string,
    data: {
      code?: string;
      store?: string;
      batch?: string;
      content?: string;
      promoImageUrl?: string;
      numbers?: { id?: string; no: number; phoneNumber: string; status: NumberStatus; failedReason?: string }[];
    }
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await refreshData();
        showToast(`Task #${taskId} berhasil diperbarui!`);
      } else {
        showToast('Gagal memperbarui task');
      }
    } catch (e) {
      showToast('Gagal menghubungi server');
    }
  };

  // Admin: Delete task
  const adminDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await refreshData();
        showToast(`Task #${taskId} berhasil dihapus`);
      }
    } catch (e) {
      showToast('Gagal menghapus task');
    }
  };

  const adminDeleteTasks = async (taskIds: string[]): Promise<boolean> => {
    if (!taskIds.length) return false;
    try {
      const res = await fetch('/api/tasks/bulk-delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: taskIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { showToast(data.error || 'Gagal menghapus task'); return false; }
      await refreshData();
      showToast(`${data.deleted || taskIds.length} task berhasil dihapus`);
      return true;
    } catch { showToast('Gagal menghapus task'); return false; }
  };

  // Admin: Review task (Diterima / Dibatalkan)
  const adminReviewTask = async (
    taskId: string,
    verdict: 'approved' | 'rejected',
    notes?: string,
    verifiedCount?: number
  ) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verdict,
          notes,
          verifiedCount,
          reviewer: username,
        }),
      });

      if (res.ok) {
        await refreshData();
        showToast(
          verdict === 'approved'
            ? `Task #${taskId} telah DITERIMA (${verifiedCount} nomor diverifikasi)`
            : `Task #${taskId} telah DIBATALKAN (${notes || 'Ditolak'})`
        );
      } else {
        showToast('Gagal menyimpan tinjauan');
      }
    } catch (e) {
      showToast('Gagal mengirim tinjauan ke server');
    }
  };

  // Admin: Toggle payment
  const adminTogglePayment = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/toggle-payment`, {
        method: 'POST',
      });
      if (res.ok) {
        await refreshData();
        showToast(`Status pembayaran diperbarui`);
      }
    } catch (e) {
      showToast('Gagal mengubah status pembayaran');
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        userRole,
        setUserRole,
        isLoggedIn,
        username,
        login,
        logout,
        activeOperator,
        operators,
        selectOperator,
        createOperator,
        clearOperator,
        tasks,
        activeTaskId,
        activeTask,
        setActiveTaskId,
        claimNextTask,
        updateNumberStatus,
        uploadProofVideo,
        deleteProofVideo,
        submitTaskForReview,
        adminCreateTask,
        adminUpdateTask,
        adminDeleteTask,
        adminDeleteTasks,
        adminReviewTask,
        adminTogglePayment,
        adminLogin,
        activeAdmin,
        adminAccounts,
        fetchAdminAccounts,
        createAdminAccount,
        changeAdminPassword,
        deleteAdminAccount,
        adminLogout,
        dailyStat,
        isLoading,
        toastMessage,
        showToast,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
