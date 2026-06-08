export type ImportanceLevel = 'Poca' | 'Interesante' | 'Importante';

export interface Task {
  id: string;
  title: string;
  description: string;
  level: ImportanceLevel;
  completed: boolean;
  xpValue: number; // XP points awarded on completion
}

export interface DayHistory {
  id: string;
  date: string; // e.g. "2026-06-07"
  tasks: Task[];
}

export interface DailyXpLog {
  day: string; // "Jue", "Vie", "Sáb", "Dom", "Hoy"
  xp: number;
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  xp: number;
}
