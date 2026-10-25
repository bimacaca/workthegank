import { Task, Operator, DailyStat } from '../types';

export const SAMPLE_MESSAGE_CONTENT = `Depo dan Login pake link ini : cutt.ly/LOGIN-HOKI

percaya !! kamu bisa dapet segini> https://www.cnpmciozgh.net/sTRioS95Vu

(Bisa juga cari di google ketik 🌐 "GACOR8800")

didaftarin> https://cutt.ly/WhatsapLENA

⚠️ Balas OK untuk bisa akses link`;

// Clean slate: no dummy tasks or hardcoded fake data!
export const SEED_OPERATORS: Operator[] = [];
export const SEED_TASKS: Task[] = [];

export const SEED_DAILY_STAT: DailyStat = {
  date: new Date().toISOString().slice(0, 10),
  completedNumbers: 0,
  submittedTasks: 0,
  activeWorkers: 0,
  failedNumbers: 0,
  peakHourly: 0,
  hourlyCompleted: Array(24).fill(0),
  hourlyFailed: Array(24).fill(0),
};
