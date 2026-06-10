import * as SQLite from 'expo-sqlite';
import { Task, ImportanceLevel, TaskType } from '../types';

export const DEFAULT_AVATAR_URL = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

export function getLocalDateString(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

const DB_NAME = 'antigravity_tasks_v2.db';
let dbInstance: SQLite.SQLiteDatabase | null = null;

export function getDB(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
  }
  return dbInstance;
}

export function mapImportanceToTS(imp: string): ImportanceLevel {
  if (imp === 'importante') return 'Importante';
  if (imp === 'interesante') return 'Interesante';
  return 'Poca';
}

export function mapImportanceToDB(imp: ImportanceLevel): string {
  return imp.toLowerCase();
}

export async function initializeDatabase(): Promise<void> {
  const db = getDB();

  // Create tables and set SQLite settings
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT DEFAULT 'Leyenda en Progreso',
      foto_uri TEXT NULL,
      puntos_acumulados INTEGER DEFAULT 0,
      is_dark_mode INTEGER DEFAULT 0,
      primary_color_hex TEXT DEFAULT '#4E46B4'
    );

    CREATE TABLE IF NOT EXISTS tareas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      importancia TEXT CHECK(importancia IN ('poca', 'interesante', 'importante')),
      estado TEXT CHECK(estado IN ('pendiente', 'completada', 'pospuesta', 'incumplida')) DEFAULT 'pendiente',
      fecha_registro TEXT NOT NULL,
      tipo TEXT CHECK(tipo IN ('unica', 'recurrente', 'fecha_limite')) DEFAULT 'unica',
      dias_recurrentes TEXT,
      fecha_limite TEXT
    );

    CREATE TABLE IF NOT EXISTS historial_dias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT UNIQUE NOT NULL,
      porcentaje_completado REAL NOT NULL,
      puntos_del_dia INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      leida INTEGER DEFAULT 0,
      fecha_registro TEXT NOT NULL
    );
  `);

  // Migrate existing schema if necessary (for users who already had the table created without the new columns)
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tareas)');
  const hasTipo = columns.some(col => col.name === 'tipo');
  if (!hasTipo) {
    await db.execAsync(`
      ALTER TABLE tareas ADD COLUMN tipo TEXT CHECK(tipo IN ('unica', 'recurrente', 'fecha_limite')) DEFAULT 'unica';
      ALTER TABLE tareas ADD COLUMN dias_recurrentes TEXT;
      ALTER TABLE tareas ADD COLUMN fecha_limite TEXT;
    `);
  }

  // Seed default user if not exists
  const defaultUser = await db.getFirstAsync<{ id: number }>('SELECT id FROM usuarios WHERE id = 1');
  if (!defaultUser) {
    await db.runAsync(`
      INSERT INTO usuarios (id, nombre, foto_uri, puntos_acumulados, is_dark_mode, primary_color_hex)
      VALUES (1, 'Leyenda en Progreso', ?, 0, 0, '#4E46B4')
    `, [DEFAULT_AVATAR_URL]);
  }

  // Note: We do NOT seed initial tasks as per user instruction.

  // Note: We do NOT seed initial history logs as per user instruction.
}

// User Profile Operations
export async function obtenerUsuario() {
  const db = getDB();
  return await db.getFirstAsync<{
    nombre: string;
    foto_uri: string | null;
    puntos_acumulados: number;
    is_dark_mode: number;
    primary_color_hex: string;
  }>('SELECT nombre, foto_uri, puntos_acumulados, is_dark_mode, primary_color_hex FROM usuarios WHERE id = 1');
}

export async function actualizarPerfil(nombre: string, fotoUri: string | null) {
  const db = getDB();
  await db.runAsync('UPDATE usuarios SET nombre = ?, foto_uri = ? WHERE id = 1', [nombre, fotoUri]);
}

export async function actualizarPuntosUsuario(puntos: number) {
  const db = getDB();
  await db.runAsync('UPDATE usuarios SET puntos_acumulados = ? WHERE id = 1', [puntos]);
}

export async function actualizarTemaUsuario(isDarkMode: boolean, primaryColor: string) {
  const db = getDB();
  const dm = isDarkMode ? 1 : 0;
  await db.runAsync('UPDATE usuarios SET is_dark_mode = ?, primary_color_hex = ? WHERE id = 1', [dm, primaryColor]);
}

// Task Operations
export async function crearTarea(
  titulo: string,
  descripcion: string,
  importancia: ImportanceLevel,
  tipo: TaskType = 'unica',
  diasRecurrentes?: number[],
  fechaLimite?: string
): Promise<number> {
  const db = getDB();
  const todayStr = getLocalDateString();
  const diasRecurrentesStr = diasRecurrentes ? JSON.stringify(diasRecurrentes) : null;
  const result = await db.runAsync(
    'INSERT INTO tareas (titulo, descripcion, importancia, estado, fecha_registro, tipo, dias_recurrentes, fecha_limite) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      titulo,
      descripcion,
      mapImportanceToDB(importancia),
      'pendiente',
      todayStr,
      tipo,
      diasRecurrentesStr,
      fechaLimite || null
    ]
  );
  return result.lastInsertRowId;
}

export async function obtenerTareasHoy(filtroEstado: 'Todas' | 'Pendientes' | 'Completadas'): Promise<Task[]> {
  const db = getDB();
  const todayStr = getLocalDateString();
  
  let query = `
    SELECT * FROM tareas 
    WHERE fecha_registro = ?
       OR (tipo = 'fecha_limite' AND fecha_registro <= ? AND fecha_limite >= ? AND (estado = 'pendiente' OR fecha_limite = ?))
  `;
  const params: any[] = [todayStr, todayStr, todayStr, todayStr];
  
  if (filtroEstado === 'Pendientes') {
    query = `
      SELECT * FROM (
        ${query}
      ) WHERE estado = 'pendiente'
    `;
  } else if (filtroEstado === 'Completadas') {
    query = `
      SELECT * FROM (
        ${query}
      ) WHERE estado = 'completada'
    `;
  }
  
  // Sort: pending tasks first, then by priority weight descending (importante -> interesante -> poca)
  query += ` ORDER BY 
    CASE estado WHEN 'completada' THEN 1 ELSE 0 END ASC,
    CASE importancia WHEN 'importante' THEN 0 WHEN 'interesante' THEN 1 ELSE 2 END ASC`;

  const rows = await db.getAllAsync<{
    id: number;
    titulo: string;
    descripcion: string;
    importancia: string;
    estado: string;
    fecha_registro: string;
    tipo?: string;
    dias_recurrentes?: string | null;
    fecha_limite?: string | null;
  }>(query, params);
  
  return rows.map(row => {
    const level = mapImportanceToTS(row.importancia);
    const xpValue = level === 'Importante' ? 100 : level === 'Interesante' ? 50 : 30;
    
    let diasRecurrentes: number[] | undefined;
    if (row.dias_recurrentes) {
      try {
        diasRecurrentes = JSON.parse(row.dias_recurrentes);
      } catch (e) {
        console.error("Error parsing dias_recurrentes JSON:", e);
      }
    }

    return {
      id: row.id.toString(),
      title: row.titulo,
      description: row.descripcion || '',
      level,
      completed: row.estado === 'completada',
      xpValue,
      tipo: (row.tipo as TaskType) || 'unica',
      dias_recurrentes: diasRecurrentes,
      fecha_limite: row.fecha_limite || undefined
    };
  });
}

export async function cambiarEstadoTarea(id: string, completed: boolean) {
  const db = getDB();
  const nuevoEstado = completed ? 'completada' : 'pendiente';
  await db.runAsync('UPDATE tareas SET estado = ? WHERE id = ?', [nuevoEstado, parseInt(id, 10)]);
}

// History Operations
export async function obtenerPuntosUltimosDias(): Promise<{ day: string; xp: number; date: string }[]> {
  const db = getDB();
  const rows = await db.getAllAsync<{
    fecha: string;
    puntos_del_dia: number;
  }>('SELECT fecha, puntos_del_dia FROM historial_dias ORDER BY fecha DESC LIMIT 5');
  
  const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  const historyLogs = rows.map(row => {
    const dateObj = new Date(row.fecha + 'T00:00:00');
    const dayIndex = dateObj.getDay();
    const dayLabel = weekdays[dayIndex];
    return {
      day: dayLabel,
      xp: row.puntos_del_dia,
      date: row.fecha
    };
  });
  
  return historyLogs.reverse();
}

export async function guardarDiaEnHistorial(fecha: string, porcentaje: number, puntos: number) {
  const db = getDB();
  await db.runAsync(
    'INSERT OR REPLACE INTO historial_dias (fecha, porcentaje_completado, puntos_del_dia) VALUES (?, ?, ?)',
    [fecha, porcentaje, puntos]
  );
}

export async function eliminarDiaHistorial(fecha: string) {
  const db = getDB();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM tareas WHERE fecha_registro = ?', [fecha]);
    await db.runAsync('DELETE FROM historial_dias WHERE fecha = ?', [fecha]);
  });
}

// Notifications Operations
export async function guardarNotificacion(titulo: string, mensaje: string): Promise<void> {
  const db = getDB();
  const fechaActual = new Date().toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
  await db.runAsync(
    'INSERT INTO notificaciones (titulo, mensaje, leida, fecha_registro) VALUES (?, ?, 0, ?)',
    [titulo, mensaje, fechaActual]
  );
}

export async function obtenerNotificaciones(): Promise<{ id: string; title: string; message: string; read: boolean; timestamp: string }[]> {
  const db = getDB();
  const rows = await db.getAllAsync<{
    id: number;
    titulo: string;
    mensaje: string;
    leida: number;
    fecha_registro: string;
  }>('SELECT * FROM notificaciones ORDER BY fecha_registro DESC');
  
  return rows.map(row => ({
    id: row.id.toString(),
    title: row.titulo,
    message: row.mensaje,
    read: row.leida === 1,
    timestamp: row.fecha_registro,
  }));
}

export async function contarNotificacionesNoLeidas(): Promise<number> {
  const db = getDB();
  const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM notificaciones WHERE leida = 0');
  return result ? result.count : 0;
}

export async function marcarNotificacionesComoLeidas(): Promise<void> {
  const db = getDB();
  await db.runAsync('UPDATE notificaciones SET leida = 1 WHERE leida = 0');
}

export async function limpiarNotificaciones(): Promise<void> {
  const db = getDB();
  await db.runAsync('DELETE FROM notificaciones');
}

export async function obtenerTareasRecurrentes(): Promise<Task[]> {
  const db = getDB();
  const rows = await db.getAllAsync<{
    id: number;
    titulo: string;
    description: string | null;
    descripcion: string | null;
    importancia: string;
    estado: string;
    fecha_registro: string;
    tipo?: string;
    dias_recurrentes?: string | null;
    fecha_limite?: string | null;
  }>("SELECT * FROM tareas WHERE tipo = 'recurrente'");

  return rows.map(row => {
    const level = mapImportanceToTS(row.importancia);
    const xpValue = level === 'Importante' ? 100 : level === 'Interesante' ? 50 : 30;
    
    let diasRecurrentes: number[] | undefined;
    if (row.dias_recurrentes) {
      try {
        diasRecurrentes = JSON.parse(row.dias_recurrentes);
      } catch (e) {
        console.error("Error parsing dias_recurrentes JSON:", e);
      }
    }

    return {
      id: row.id.toString(),
      title: row.titulo,
      description: row.descripcion || row.description || '',
      level,
      completed: row.estado === 'completada',
      xpValue,
      tipo: 'recurrente',
      dias_recurrentes: diasRecurrentes,
      fecha_limite: row.fecha_limite || undefined
    };
  });
}

export async function obtenerTareasFuturas(todayStr: string): Promise<Task[]> {
  const db = getDB();
  const rows = await db.getAllAsync<{
    id: number;
    titulo: string;
    description: string | null;
    descripcion: string | null;
    importancia: string;
    estado: string;
    fecha_registro: string;
    tipo?: string;
    dias_recurrentes?: string | null;
    fecha_limite?: string | null;
  }>(
    "SELECT * FROM tareas WHERE tipo = 'fecha_limite' AND fecha_limite > ? AND estado = 'pendiente' ORDER BY fecha_limite ASC",
    [todayStr]
  );

  return rows.map(row => {
    const level = mapImportanceToTS(row.importancia);
    const xpValue = level === 'Importante' ? 100 : level === 'Interesante' ? 50 : 30;
    
    return {
      id: row.id.toString(),
      title: row.titulo,
      description: row.descripcion || row.description || '',
      level,
      completed: row.estado === 'completada',
      xpValue,
      tipo: 'fecha_limite',
      dias_recurrentes: undefined,
      fecha_limite: row.fecha_limite || undefined
    };
  });
}
