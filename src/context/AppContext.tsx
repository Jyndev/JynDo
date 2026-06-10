import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Task, DayHistory, UserProfile, ImportanceLevel, DailyXpLog, TaskType } from '../types';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import { 
  DEFAULT_AVATAR_URL,
  obtenerUsuario, 
  actualizarPerfil, 
  actualizarPuntosUsuario, 
  crearTarea, 
  obtenerTareasHoy, 
  cambiarEstadoTarea, 
  obtenerPuntosUltimosDias, 
  guardarDiaEnHistorial, 
  eliminarDiaHistorial,
  mapImportanceToTS,
  mapImportanceToDB,
  getDB,
  guardarNotificacion,
  getLocalDateString,
  obtenerTareasRecurrentes,
  obtenerTareasFuturas
} from '@/services/database';

// Set up the foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface AppContextType {
  profile: UserProfile;
  todayTasks: Task[];
  historyDays: DayHistory[];
  dailyXp: DailyXpLog[];
  toastMessage: string | null;
  pendingXp: number;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  updateProfileName: (name: string) => void;
  updateProfileAvatar: (url: string) => void;
  addTask: (title: string, description: string, level: ImportanceLevel, tipo?: TaskType, diasRecurrentes?: number[], fechaLimite?: string) => void;
  toggleTask: (id: string) => void;
  deleteHistoryDay: (id: string) => void;
  addXP: (amount: number) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  processMidnightCrossover: () => Promise<void>;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;
  deleteTask: (id: string) => Promise<void>;
  taskToEdit: Task | null;
  editModalVisible: boolean;
  openEditModal: (task: Task) => void;
  closeEditModal: () => void;
  updateTask: (id: string, title: string, description: string, level: ImportanceLevel, tipo?: TaskType, diasRecurrentes?: number[], fechaLimite?: string) => Promise<void>;
  recurrentTasks: Task[];
  futureTasks: Task[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialNotifications: AppNotification[] = [
  {
    id: 'n1',
    title: '¡Corte de Media Noche!',
    message: 'Se han procesado tus tareas de ayer. ¡Sumaste +150 XP a tu nivel!',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    read: true,
  },
  {
    id: 'n2',
    title: '¡Bienvenido a Antigravity Tasks!',
    message: 'Completa tus retos diarios y acumula puntos para el corte de medianoche.',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
    read: true,
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Leyenda en Progreso',
    avatarUrl: DEFAULT_AVATAR_URL,
    xp: 0,
  });

  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [historyDays, setHistoryDays] = useState<DayHistory[]>([]);
  const [dailyXp, setDailyXp] = useState<DailyXpLog[]>([]);
  const [recurrentTasks, setRecurrentTasks] = useState<Task[]>([]);
  const [futureTasks, setFutureTasks] = useState<Task[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Points delay system states
  const [pendingXp, setPendingXp] = useState<number>(0);
  const [lastProcessedTime, setLastProcessedTime] = useState<number>(Date.now());
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [todayConsolidatedXp, setTodayConsolidatedXp] = useState<number>(150);

  // Edit task states
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // Load app data from SQLite Database
  const loadAppData = async () => {
    try {
      // 1. Load User Profile
      const user = await obtenerUsuario();
      if (user) {
        setProfile({
          name: user.nombre,
          avatarUrl: user.foto_uri || DEFAULT_AVATAR_URL,
          xp: user.puntos_acumulados,
        });
      }

      // 2. Load Today's Tasks
      const tasks = await obtenerTareasHoy('Todas');
      
      // Filter recurrent tasks to only include those matching today's weekday
      const today = new Date();
      const dayOfWeek = today.getDay();
      
      const filteredTasks = tasks.filter(task => {
        if (task.tipo === 'recurrente') {
          return task.dias_recurrentes ? task.dias_recurrentes.includes(dayOfWeek) : false;
        }
        return true;
      });
      setTodayTasks(filteredTasks);

      // 3. Calculate today's pending XP (excluding fecha_limite tasks as their XP is deferred)
      const completedXp = filteredTasks.filter(t => t.completed && t.tipo !== 'fecha_limite').reduce((sum, t) => sum + t.xpValue, 0);
      setPendingXp(completedXp);

      // 3b. Load Recurrent & Future tasks
      const todayStr = getLocalDateString(today);
      const recTasks = await obtenerTareasRecurrentes();
      setRecurrentTasks(recTasks);

      const futTasks = await obtenerTareasFuturas(todayStr);
      setFutureTasks(futTasks);

      // 4. Load History Days
      const db = getDB();
      const historyRows = await db.getAllAsync<{ fecha: string; porcentaje_completado: number; puntos_del_dia: number }>(
        'SELECT fecha, porcentaje_completado, puntos_del_dia FROM historial_dias ORDER BY fecha DESC'
      );
      
      const dayHistories: DayHistory[] = [];
      for (const hRow of historyRows) {
        const historyTasksRows = await db.getAllAsync<{
          id: number;
          titulo: string;
          descripcion: string;
          importancia: string;
          estado: string;
        }>("SELECT id, titulo, descripcion, importancia, estado FROM tareas WHERE fecha_registro = ?", [hRow.fecha]);
        
        const tasksMapped: Task[] = historyTasksRows.map(tRow => {
          const lvl = mapImportanceToTS(tRow.importancia);
          return {
            id: tRow.id.toString(),
            title: tRow.titulo,
            description: tRow.descripcion || '',
            level: lvl,
            completed: tRow.estado === 'completada',
            xpValue: lvl === 'Importante' ? 100 : lvl === 'Interesante' ? 50 : 30
          };
        });
        
        const formatHistoryDate = (dateStr: string) => {
          const d = new Date(dateStr + 'T00:00:00');
          const now = new Date();
          
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const formattedDate = `${d.getDate()} de ${months[d.getMonth()]}`;
          
          if (d.toDateString() === yesterday.toDateString()) {
            return `Ayer, ${formattedDate}`;
          }
          return `${formattedDate}, ${d.getFullYear()}`;
        };

        dayHistories.push({
          id: hRow.fecha,
          date: formatHistoryDate(hRow.fecha),
          tasks: tasksMapped
        });
      }
      setHistoryDays(dayHistories);

      // 5. Load today's consolidated XP from database
      const todayHistoryRow = await db.getFirstAsync<{ puntos_del_dia: number }>(
        'SELECT puntos_del_dia FROM historial_dias WHERE fecha = ?',
        [todayStr]
      );
      const todayConsXp = todayHistoryRow ? todayHistoryRow.puntos_del_dia : 150;
      setTodayConsolidatedXp(todayConsXp);

      // 6. Load Daily XP Chart Logs (excluding today's date if present to put it manually at the end)
      const lastDaysLogs = await obtenerPuntosUltimosDias();
      const filteredLogs = lastDaysLogs.filter(log => log.date !== todayStr);
      const chartLogs: DailyXpLog[] = filteredLogs.slice(-4).map(log => ({
        day: log.day,
        xp: log.xp
      }));
      setDailyXp([...chartLogs, { day: 'Hoy', xp: todayConsXp }]);
    } catch (err) {
      console.log('Error loading app data from SQLite:', err);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      await loadAppData();
      await processMidnightCrossover();
    };
    initApp();
  }, []);

  // Request system notification permissions on mount
  useEffect(() => {
    async function requestPermissions() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Permission for notifications not granted');
        }
      } catch (err) {
        console.log('Error requesting notification permissions:', err);
      }
    }
    requestPermissions();
  }, []);

  // Background midnight crossover checker (runs every 5 seconds)
  useEffect(() => {
    const checkMidnight = () => {
      const lastDate = new Date(lastProcessedTime);
      const currentDate = new Date();
      if (lastDate.toDateString() !== currentDate.toDateString()) {
        processMidnightCrossover();
      }
    };
    const timer = setInterval(checkMidnight, 5000);
    return () => clearInterval(timer);
  }, [lastProcessedTime, pendingXp, todayTasks]);

  const triggerSystemNotification = async (title: string, body: string) => {
    try {
      // Importación dinámica para evitar el crash global en Expo Go SDK 53
      const Notifications = await import('expo-notifications');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: null, // trigger inmediato
      });
    } catch (error) {
      console.log('Push/Local notifications no disponibles en Expo Go SDK 53. Usando Alert fallback.');
      // Fallback seguro para Expo Go
      Alert.alert(title, body);
    }
  };

  const processMidnightCrossover = async () => {
    try {
      const today = new Date();
      const todayStr = getLocalDateString(today);
      const dayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, etc.
      const db = getDB();

      // Find all unique dates in the tareas table (fecha_registro or fecha_limite) that are in the past and don't exist in historial_dias
      const pastDates = await db.getAllAsync<{ date_val: string }>(
        `SELECT DISTINCT date_val FROM (
          SELECT fecha_registro as date_val FROM tareas WHERE fecha_registro < ?
          UNION
          SELECT fecha_limite as date_val FROM tareas WHERE fecha_limite < ? AND fecha_limite IS NOT NULL
        )
        WHERE date_val NOT IN (SELECT fecha FROM historial_dias)
        ORDER BY date_val ASC`,
        [todayStr, todayStr]
      );

      if (pastDates.length === 0) {
        // No past days to process, but we still need to check if we should reset recurrent tasks for today
        await db.withTransactionAsync(async () => {
          const recurrentTasks = await db.getAllAsync<{ id: number; dias_recurrentes: string | null }>(
            "SELECT id, dias_recurrentes FROM tareas WHERE tipo = 'recurrente' AND fecha_registro < ?",
            [todayStr]
          );
          for (const task of recurrentTasks) {
            if (task.dias_recurrentes) {
              try {
                const days = JSON.parse(task.dias_recurrentes) as number[];
                if (days.includes(dayOfWeek)) {
                  await db.runAsync(
                    "UPDATE tareas SET estado = 'pendiente', fecha_registro = ? WHERE id = ?",
                    [todayStr, task.id]
                  );
                }
              } catch (e) {
                console.error("Error parsing dias_recurrentes:", e);
              }
            }
          }
        });

        setLastProcessedTime(Date.now());
        await loadAppData(); // Reload to refresh lists in case recurrent tasks were reset
        return;
      }

      let totalProcessedXp = 0;
      const notificationsToSave: { title: string; message: string }[] = [];

      // Run database operations in a single transaction
      await db.withTransactionAsync(async () => {
        for (const row of pastDates) {
          const fecha = row.date_val;

          // Get tasks for this date (registered tasks of non-deadline type, plus deadline tasks with this deadline)
          const tasksRows = await db.getAllAsync<{
            id: number;
            titulo: string;
            descripcion: string;
            importancia: string;
            estado: string;
            tipo: string | null;
            dias_recurrentes: string | null;
            fecha_limite: string | null;
          }>(
            `SELECT id, titulo, descripcion, importancia, estado, tipo, dias_recurrentes, fecha_limite 
             FROM tareas 
             WHERE (fecha_registro = ? AND (tipo IS NULL OR tipo != 'fecha_limite'))
                OR (fecha_limite = ? AND tipo = 'fecha_limite')`,
            [fecha, fecha]
          );

          let totalTasks = tasksRows.length;
          let completedTasks = 0;
          let dayXp = 0;

          for (const tRow of tasksRows) {
            let estado = tRow.estado;
            // Si llega el día límite y la tarea con fecha_limite está 'pendiente', cambia automáticamente a 'incumplida'
            if (tRow.tipo === 'fecha_limite' && tRow.fecha_limite === fecha && estado === 'pendiente') {
              estado = 'incumplida';
              await db.runAsync("UPDATE tareas SET estado = 'incumplida' WHERE id = ?", [tRow.id]);
            }

            if (estado === 'completada') {
              completedTasks++;
              const lvl = mapImportanceToTS(tRow.importancia || 'poca');
              dayXp += lvl === 'Importante' ? 100 : lvl === 'Interesante' ? 50 : 30;
            }
          }

          const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100.0 : 0.0;

          // Credit XP to user profile
          if (dayXp > 0) {
            totalProcessedXp += dayXp;
            // Get current XP of user inside transaction to be safe
            const user = await db.getFirstAsync<{ puntos_acumulados: number }>('SELECT puntos_acumulados FROM usuarios WHERE id = 1');
            const currentXp = user ? user.puntos_acumulados : 0;
            const newXp = Math.max(0, currentXp + dayXp);
            await db.runAsync('UPDATE usuarios SET puntos_acumulados = ? WHERE id = 1', [newXp]);
          }

          // Save the history record
          await db.runAsync(
            'INSERT OR REPLACE INTO historial_dias (fecha, porcentaje_completado, puntos_del_dia) VALUES (?, ?, ?)',
            [fecha, pct, dayXp]
          );

          // Build notifications
          const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const dateParts = fecha.split('-');
          const d = new Date(parseInt(dateParts[0], 10), parseInt(dateParts[1], 10) - 1, parseInt(dateParts[2], 10));
          const formattedDate = `${d.getDate()} de ${months[d.getMonth()]}`;

          const title = "🌙 ¡Corte de Media Noche!";
          const message = dayXp > 0
            ? `Se ha realizado el corte diario para el ${formattedDate}. ¡Felicidades! Sumaste +${dayXp} XP por tus tareas de ese día.`
            : `Se ha realizado el corte diario para el ${formattedDate}. Ese día no acumulaste XP. ¡A por todas hoy!`;

          notificationsToSave.push({ title, message });
        }

        // resetea el estado de las tareas 'recurrentes' a 'pendiente' si el día de hoy coincide con sus dias_recurrentes
        const recurrentTasks = await db.getAllAsync<{ id: number; dias_recurrentes: string | null }>(
          "SELECT id, dias_recurrentes FROM tareas WHERE tipo = 'recurrente' AND fecha_registro < ?",
          [todayStr]
        );
        for (const task of recurrentTasks) {
          if (task.dias_recurrentes) {
            try {
              const days = JSON.parse(task.dias_recurrentes) as number[];
              if (days.includes(dayOfWeek)) {
                await db.runAsync(
                  "UPDATE tareas SET estado = 'pendiente', fecha_registro = ? WHERE id = ?",
                  [todayStr, task.id]
                );
              }
            } catch (e) {
              console.error("Error parsing dias_recurrentes:", e);
            }
          }
        }
      });

      // Save notifications and trigger system alerts (outside transaction to avoid delays/blocking)
      for (const notif of notificationsToSave) {
        await guardarNotificacion(notif.title, notif.message);
        await triggerSystemNotification(notif.title, notif.message);
      }

      // Reset pending XP buffer
      setPendingXp(0);

      // Update last processed time
      setLastProcessedTime(Date.now());

      // Reload data to refresh lists
      await loadAppData();

      // Feedback toast
      if (totalProcessedXp > 0) {
        showToast(`🌙 ¡Cortes de medianoche procesados! +${totalProcessedXp} XP agregados.`);
      } else {
        showToast(`🌙 ¡Cortes de medianoche procesados!`);
      }
    } catch (err) {
      console.log('Error processing midnight crossover in SQLite Provider:', err);
    }
  };

  const markNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotificationsCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadNotificationsCount(0);
  };

  const updateProfileName = async (name: string) => {
    setProfile((prev) => ({ ...prev, name }));
    try {
      await actualizarPerfil(name, profile.avatarUrl);
    } catch (err) {
      console.log('Error updating profile name in SQLite:', err);
    }
  };

  const updateProfileAvatar = async (avatarUrl: string) => {
    setProfile((prev) => ({ ...prev, avatarUrl }));
    try {
      await actualizarPerfil(profile.name, avatarUrl);
    } catch (err) {
      console.log('Error updating profile avatar in SQLite:', err);
    }
  };

  const addXP = async (amount: number) => {
    setProfile((prev) => {
      const newXp = Math.max(0, prev.xp + amount);
      actualizarPuntosUsuario(newXp).catch(err => console.log('Error updating user points in DB:', err));
      return { ...prev, xp: newXp };
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  const addTask = async (
    title: string,
    description: string,
    level: ImportanceLevel,
    tipo: TaskType = 'unica',
    diasRecurrentes?: number[],
    fechaLimite?: string
  ) => {
    try {
      await crearTarea(title, description, level, tipo, diasRecurrentes, fechaLimite);
      await loadAppData();
    } catch (err) {
      console.log('Error adding task in SQLite:', err);
    }
  };

  const toggleTask = async (id: string) => {
    let taskToToggle: Task | undefined;
    let skipToggle = false;
    
    setTodayTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          if (task.tipo === 'fecha_limite' && task.completed) {
            skipToggle = true;
            return task;
          }
          const newCompleted = !task.completed;
          taskToToggle = { ...task, completed: newCompleted };
          
          const isFechaLimite = task.tipo === 'fecha_limite';
          if (!isFechaLimite) {
            setPendingXp((prevPending) => Math.max(0, prevPending + (newCompleted ? task.xpValue : -task.xpValue)));
            if (newCompleted) {
              showToast(`¡Excelente trabajo! 🎉 +${task.xpValue} XP acumulados para medianoche`);
            } else {
              showToast(`¡Desmarcada! Se restaron -${task.xpValue} XP de tu acumulado de hoy`);
            }
          } else {
            if (newCompleted) {
              showToast(`¡Completada! 🎉 Tarea con fecha límite congelada. +${task.xpValue} XP se liberarán en la fecha límite.`);
            }
          }
          
          return { ...task, completed: newCompleted };
        }
        return task;
      })
    );

    if (skipToggle) {
      showToast("Esta tarea con fecha límite ya está completada y congelada.");
      return;
    }

    if (taskToToggle) {
      try {
        await cambiarEstadoTarea(taskToToggle.id, taskToToggle.completed);
      } catch (err) {
        console.log('Error toggling task in SQLite:', err);
      }
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const db = getDB();
      
      // Retrieve task before deleting to check type and recurrence days
      const taskRow = await db.getFirstAsync<{ tipo: string; dias_recurrentes: string | null }>(
        'SELECT tipo, dias_recurrentes FROM tareas WHERE id = ?',
        [parseInt(id, 10)]
      );
      
      if (!taskRow) {
        return;
      }
      
      let penalize = false;
      if (taskRow.tipo === 'unica' || taskRow.tipo === 'fecha_limite') {
        penalize = true;
      } else if (taskRow.tipo === 'recurrente') {
        const todayDay = new Date().getDay();
        if (taskRow.dias_recurrentes) {
          try {
            const days = JSON.parse(taskRow.dias_recurrentes) as number[];
            if (days.includes(todayDay)) {
              penalize = true;
            }
          } catch (e) {
            console.error("Error parsing dias_recurrentes in deleteTask:", e);
          }
        }
      }
      
      // Perform deletion and penalty subtraction inside transaction
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM tareas WHERE id = ?', [parseInt(id, 10)]);
        
        if (penalize) {
          const user = await db.getFirstAsync<{ puntos_acumulados: number }>('SELECT puntos_acumulados FROM usuarios WHERE id = 1');
          const currentXp = user ? user.puntos_acumulados : 0;
          const newXp = Math.max(0, currentXp - 20); // El progreso NO puede quedar en negativo
          await db.runAsync('UPDATE usuarios SET puntos_acumulados = ? WHERE id = 1', [newXp]);
        }
      });

      await loadAppData();
      if (penalize) {
        showToast("Tarea eliminada. Penalización: -20 XP");
      } else {
        showToast("Rutina eliminada con éxito");
      }
    } catch (err) {
      console.log('Error deleting task in SQLite:', err);
    }
  };

  const deleteHistoryDay = async (id: string) => {
    try {
      await eliminarDiaHistorial(id);
      setHistoryDays((prev) => prev.filter((day) => day.id !== id));
      
      // Reload chart logs
      const lastDaysLogs = await obtenerPuntosUltimosDias();
      const todayStr = getLocalDateString();
      const filteredLogs = lastDaysLogs.filter(log => log.date !== todayStr);
      const chartLogs: DailyXpLog[] = filteredLogs.slice(-4).map(log => ({
        day: log.day,
        xp: log.xp
      }));
      setDailyXp([...chartLogs, { day: 'Hoy', xp: todayConsolidatedXp }]);
    } catch (err) {
      console.log('Error deleting history day in SQLite:', err);
    }
  };

  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setTaskToEdit(null);
    setEditModalVisible(false);
  };

  const updateTask = async (
    id: string,
    title: string,
    description: string,
    level: ImportanceLevel,
    tipo: TaskType = 'unica',
    diasRecurrentes?: number[],
    fechaLimite?: string
  ) => {
    try {
      const db = getDB();

      // Anti-cheat verification for active recurrent tasks
      const originalTask = await db.getFirstAsync<{ tipo: string; dias_recurrentes: string | null }>(
        'SELECT tipo, dias_recurrentes FROM tareas WHERE id = ?',
        [parseInt(id, 10)]
      );

      if (originalTask && originalTask.tipo === 'recurrente' && originalTask.dias_recurrentes) {
        try {
          const originalDays = JSON.parse(originalTask.dias_recurrentes) as number[];
          const todayDay = new Date().getDay();
          if (originalDays.includes(todayDay)) {
            // Today was scheduled in the original task. Verify it is still scheduled.
            if (!diasRecurrentes || !diasRecurrentes.includes(todayDay)) {
              showToast("No puedes desmarcar el día de hoy de una rutina activa.");
              return; // Block update
            }
          }
        } catch (e) {
          console.error("Error parsing original dias_recurrentes in updateTask:", e);
        }
      }

      const diasRecurrentesStr = diasRecurrentes ? JSON.stringify(diasRecurrentes) : null;
      await db.runAsync(
        `UPDATE tareas 
         SET titulo = ?, descripcion = ?, importancia = ?, tipo = ?, dias_recurrentes = ?, fecha_limite = ?
         WHERE id = ?`,
        [
          title,
          description,
          mapImportanceToDB(level),
          tipo,
          diasRecurrentesStr,
          fechaLimite || null,
          parseInt(id, 10)
        ]
      );
      
      await loadAppData();
      closeEditModal();
      showToast("Tarea actualizada con éxito");
    } catch (err) {
      console.log('Error updating task in SQLite:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        profile,
        todayTasks,
        historyDays,
        dailyXp,
        toastMessage,
        pendingXp,
        notifications,
        unreadNotificationsCount,
        updateProfileName,
        updateProfileAvatar,
        addTask,
        toggleTask,
        deleteHistoryDay,
        addXP,
        showToast,
        hideToast,
        processMidnightCrossover,
        markNotificationsAsRead,
        clearNotifications,
        deleteTask,
        taskToEdit,
        editModalVisible,
        openEditModal,
        closeEditModal,
        updateTask,
        recurrentTasks,
        futureTasks,
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
