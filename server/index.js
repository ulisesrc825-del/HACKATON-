import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { HttpError, pool, route, rows } from './db.js';
import { auth, authenticate, demoMode, isAllowedOrigin, origin, users } from './auth.js';
import { catalog } from './catalog.js';
import { loans } from './loans.js';
import { reservations } from './reservations.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const cookieSecure = origin.startsWith('https:');
const sessionSecret = process.env.SESSION_SECRET || randomBytes(32).toString('hex');
app.disable('x-powered-by');
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use('/api', cors({ origin: (value, callback) => callback(null, isAllowedOrigin(value)), credentials: true }));
app.use('/api', (req, _res, next) => {
  const requestOrigin = req.get('Origin');
  if (!isAllowedOrigin(requestOrigin)) return next(new HttpError(403, 'Origen no autorizado.'));
  if (['POST', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    return next(new HttpError(415, 'Usa Content-Type: application/json.'));
  }
  next();
});
app.use('/api', express.json({ limit: '64kb' }));
app.get('/api/health', route(async (_req, res) => {
  await rows(pool, 'SELECT 1');
  res.json({ ok: true });
}));
app.use('/api', session({
  name: 'uptex.sid', secret: sessionSecret, resave: false, saveUninitialized: false,
  proxy: cookieSecure,
  cookie: { httpOnly: true, sameSite: 'strict', secure: cookieSecure, path: '/api' },
}));
app.use('/api/auth', auth);
app.use('/api', authenticate, catalog);
app.use('/api/usuarios', users);
app.use('/api/prestamos', loans);
app.use('/api/reservas-laboratorio', reservations);
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'La ruta solicitada no existe.')));

app.use((error, _req, res, _next) => {
  const unavailable = ['ECONNREFUSED', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'PROTOCOL_CONNECTION_LOST'];
  if (unavailable.includes(error.code)) {
    console.error('MariaDB', error.code);
    return res.status(503).json({ error: 'MariaDB no está disponible. Revisa el servicio y la configuración en .env.' });
  }
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Uno de los registros seleccionados ya no existe.' });
  if (['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.code)) {
    return res.status(409).json({ error: 'Otra operación está actualizando estos datos. Intenta de nuevo.' });
  }
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  if (error.status === 400 || error.status === 413) return res.status(error.status).json({ error: 'El cuerpo de la solicitud no es válido.' });
  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud.' });
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Inventario UPTex API en http://localhost:${port}/api${demoMode ? ' (demostración local)' : ''}`);
});
