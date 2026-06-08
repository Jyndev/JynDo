import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Task, DayHistory, UserProfile, ImportanceLevel, DailyXpLog } from '../types';
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
  getDB,
  guardarNotificacion
} from '@/services/database';

// Set up the foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
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
  addTask: (title: string, description: string, level: ImportanceLevel) => void;
  toggleTask: (id: string) => void;
  deleteHistoryDay: (id: string) => void;
  addXP: (amount: number) => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  processMidnightCrossover: (manual?: boolean) => void;
  markNotificationsAsRead: () => void;
  clearNotifications: () => void;
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

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Points delay system states
  const [pendingXp, setPendingXp] = useState<number>(0);
  const [lastProcessedTime, setLastProcessedTime] = useState<number>(Date.now());
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [todayConsolidatedXp, setTodayConsolidatedXp] = useState<number>(150);

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
      setTodayTasks(tasks);

      // 3. Calculate today's pending XP
      const completedXp = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.xpValue, 0);
      setPendingXp(completedXp);

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
      const todayStr = new Date().toISOString().split('T')[0];
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
    loadAppData();
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
        processMidnightCrossover(false);
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

  const processMidnightCrossover = async (manual = false) => {
    const xpToAdd = pendingXp;
    const title = manual ? "⚡ Corte de Simulación" : "🌙 ¡Corte de Media Noche!";
    const message = xpToAdd > 0
      ? `Se ha realizado el corte diario. ¡Felicidades! Sumaste +${xpToAdd} XP a tu nivel por las tareas de hoy.`
      : `Se ha realizado el corte diario. Hoy no sumaste puntos pendientes. ¡A por todas mañana!`;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      
      // 1. Consolidate pending XP into user profile total
      if (xpToAdd > 0) {
        await addXP(xpToAdd);
      }

      // 2. Save today's completion data in historial_dias
      const totalTasks = todayTasks.length;
      const completedTasks = todayTasks.filter(t => t.completed).length;
      const pct = totalTasks > 0 ? (completedTasks / totalTasks) * 100.0 : 0.0;
      
      const db = getDB();
      const existingTodayHistory = await db.getFirstAsync<{ puntos_del_dia: number }>(
        'SELECT puntos_del_dia FROM historial_dias WHERE fecha = ?',
        [todayStr]
      );
      const previousPoints = existingTodayHistory ? existingTodayHistory.puntos_del_dia : 0;
      const newTodayPoints = previousPoints + xpToAdd;

      await guardarDiaEnHistorial(todayStr, pct, newTodayPoints);
      setTodayConsolidatedXp(newTodayPoints);
      
      // Update chart logs
      setDailyXp((prevDaily) =>
        prevDaily.map((item) => {
          if (item.day === 'Hoy') {
            return { ...item, xp: newTodayPoints };
          }
          return item;
        })
      );

      // 3. Add App-Internal Notification via SQLite
      await guardarNotificacion(title, message);

      // 4. Trigger native system notification
      await triggerSystemNotification(title, message);

      // 5. Reset pending XP buffer
      setPendingXp(0);

      // 6. Update last processed time
      setLastProcessedTime(Date.now());

      // 7. Reload data to refresh lists
      await loadAppData();

      // 8. Feedback toast
      if (manual) {
        showToast(`⚡ ¡Corte simulado! +${xpToAdd} XP procesados.`);
      } else {
        showToast(`🌙 ¡Corte de medianoche! +${xpToAdd} XP agregados.`);
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

  const addTask = async (title: string, description: string, level: ImportanceLevel) => {
    const xpValue = level === 'Importante' ? 100 : level === 'Interesante' ? 50 : 30;
    try {
      const insertId = await crearTarea(title, description, level);
      const newTask: Task = {
        id: insertId.toString(),
        title,
        description,
        level,
        completed: false,
        xpValue,
      };
      setTodayTasks((prev) => [newTask, ...prev]);
    } catch (err) {
      console.log('Error adding task in SQLite:', err);
    }
  };

  const toggleTask = async (id: string) => {
    let taskToToggle: Task | undefined;
    
    setTodayTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          const newCompleted = !task.completed;
          taskToToggle = { ...task, completed: newCompleted };
          
          setPendingXp((prevPending) => Math.max(0, prevPending + (newCompleted ? task.xpValue : -task.xpValue)));

          if (newCompleted) {
            showToast(`¡Excelente trabajo! 🎉 +${task.xpValue} XP acumulados para medianoche`);
          } else {
            showToast(`¡Desmarcada! Se restaron -${task.xpValue} XP de tu acumulado de hoy`);
          }
          
          return { ...task, completed: newCompleted };
        }
        return task;
      })
    );

    if (taskToToggle) {
      try {
        await cambiarEstadoTarea(taskToToggle.id, taskToToggle.completed);
      } catch (err) {
        console.log('Error toggling task in SQLite:', err);
      }
    }
  };

  const deleteHistoryDay = async (id: string) => {
    try {
      await eliminarDiaHistorial(id);
      setHistoryDays((prev) => prev.filter((day) => day.id !== id));
      
      // Reload chart logs
      const lastDaysLogs = await obtenerPuntosUltimosDias();
      const todayStr = new Date().toISOString().split('T')[0];
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
