export type ImportanceLevel = 'Poca' | 'Interesante' | 'Importante';
export type TaskType = 'unica' | 'recurrente' | 'fecha_limite';

export interface Task {
  id: string;
  title: string;
  description: string;
  level: ImportanceLevel;
  completed: boolean;
  xpValue: number; // XP points awarded on completion
  tipo?: TaskType;
  dias_recurrentes?: number[]; // Array of numbers representing weekdays (0-6)
  fecha_limite?: string; // ISO format or YYYY-MM-DD
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
