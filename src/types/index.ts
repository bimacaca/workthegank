export type TaskStatus = 'available' | 'in_progress' | 'submitted' | 'approved' | 'rejected';

export type NumberStatus = 'pending' | 'done' | 'failed';

export interface TaskNumber {
  id: string;
  no: number;
  phoneNumber: string; // e.g. 6282234594977
  status: NumberStatus;
  failedReason?: string;
  updatedAt?: string;
}

export interface VideoProof {
  id: string;
  fileName: string;
  fileSize: string;
  fileUrl: string;
  duration?: string;
  uploadedAt: string;
}

export interface TaskReview {
  reviewedBy: string;
  reviewedAt: string;
  status: 'approved' | 'rejected';
  initialCount: number;
  verifiedCount: number;
  notes?: string;
}

export interface Task {
  id: string; // e.g. '3439'
  code: string; // e.g. 'gacor 02_batch_28_task #004'
  store: string; // e.g. 'gacor8800'
  batch: string; // e.g. 'batch_28'
  content: string; // Broadcast message template
  promoImageUrl?: string;
  promo_image_url?: string;
  numbers: TaskNumber[];
  operatorName?: string;
  operator_name?: string;
  operatorPin?: string;
  operator_pin?: string;
  status: TaskStatus;
  createdAt: string;
  created_at?: string;
  startedAt?: string;
  started_at?: string;
  completedAt?: string;
  completed_at?: string;
  submittedAt?: string;
  submitted_at?: string;
  proofVideos: VideoProof[];
  review?: TaskReview;
  paymentStatus: 'unpaid' | 'paid';
  payment_status?: 'unpaid' | 'paid';
}

export interface AdminAccount {
  id: string;
  username: string;
  role: string;
  createdAt?: string;
  created_at?: string;
}

export interface Operator {
  id: string;
  name: string;
  pin?: string;
  hasPin?: boolean;
  createdAt: string;
  created_at?: string;
  totalCompletedTasks: number;
  total_completed_tasks?: number;
  todayCompletedTasks?: number;
  totalCompletedNumbers: number;
  total_completed_numbers?: number;
  todayCompletedNumbers?: number;
  totalFailedNumbers: number;
  total_failed_numbers?: number;
  todayFailedNumbers?: number;
  isActive: boolean;
  is_active?: number | boolean;
}

export interface DailyStat {
  date: string;
  completedNumbers: number;
  submittedTasks: number;
  activeWorkers: number;
  failedNumbers: number;
  peakHourly: number;
  hourlyCompleted: number[]; // 24 hours
  hourlyFailed: number[]; // 24 hours
}
