import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'HACKATON',
  charset: 'utf8mb4',
  dateStrings: true,
  decimalNumbers: true,
  connectionLimit: 10,
  connectTimeout: 5000,
});

export async function rows(db, sql, params = []) {
  const [result] = await db.execute(sql, params);
  return result;
}

export async function transaction(work) {
  const db = await pool.getConnection();
  try {
    await db.beginTransaction();
    const result = await work(db);
    await db.commit();
    return result;
  } catch (error) {
    await db.rollback();
    throw error;
  } finally {
    db.release();
  }
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const route = (handler) => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next);
};

export function requireRole(user, ...roles) {
  if (!roles.includes(user.rol)) throw new HttpError(403, 'Tu rol no permite realizar esta acción.');
}

export function integer(value, label, minimum = 1, maximum = 2147483647) {
  const number = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new HttpError(400, `${label} debe ser un entero entre ${minimum} y ${maximum}.`);
  }
  return number;
}

export function string(value, label, maximum, required = true) {
  const result = typeof value === 'string' ? value.trim() : '';
  if ((required && !result) || result.length > maximum) {
    throw new HttpError(400, `${label} debe contener ${required ? 'entre 1 y' : 'hasta'} ${maximum} caracteres.`);
  }
  return result || null;
}
