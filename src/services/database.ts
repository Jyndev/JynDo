import * as SQLite from 'expo-sqlite';
import { Task, ImportanceLevel } from '../types';

export const DEFAULT_AVATAR_URL = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

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
      fecha_registro TEXT NOT NULL
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
export async function crearTarea(titulo: string, descripcion: string, importancia: ImportanceLevel): Promise<number> {
  const db = getDB();
  const todayStr = new Date().toISOString().split('T')[0];
  const result = await db.runAsync(
    'INSERT INTO tareas (titulo, descripcion, importancia, estado, fecha_registro) VALUES (?, ?, ?, ?, ?)',
    [titulo, descripcion, mapImportanceToDB(importancia), 'pendiente', todayStr]
  );
  return result.lastInsertRowId;
}

export async function obtenerTareasHoy(filtroEstado: 'Todas' | 'Pendientes' | 'Completadas'): Promise<Task[]> {
  const db = getDB();
  const todayStr = new Date().toISOString().split('T')[0];
  
  let query = 'SELECT * FROM tareas WHERE fecha_registro = ?';
  const params: any[] = [todayStr];
  
  if (filtroEstado === 'Pendientes') {
    query += " AND estado = 'pendiente'";
  } else if (filtroEstado === 'Completadas') {
    query += " AND estado = 'completada'";
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
  }>(query, params);
  
  return rows.map(row => {
    const level = mapImportanceToTS(row.importancia);
    const xpValue = level === 'Importante' ? 100 : level === 'Interesante' ? 50 : 30;
    return {
      id: row.id.toString(),
      title: row.titulo,
      description: row.descripcion || '',
      level,
      completed: row.estado === 'completada',
      xpValue
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
