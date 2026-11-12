import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { HttpError, integer, pool, requireRole, route, rows, string, transaction } from './db.js';

export const auth = Router();
export const users = Router();
export const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
export const demoMode = process.env.DEMO_MODE === 'true';
const allowedOrigins = new Set([origin]);
if (demoMode) {
  const configured = new URL(origin);
  if (['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname)) {
    for (const hostname of ['localhost', '127.0.0.1', '[::1]']) {
      const alias = new URL(origin);
      alias.hostname = hostname;
      allowedOrigins.add(alias.origin);
    }
  }
}
export const isAllowedOrigin = value => !value || allowedOrigins.has(value);
const roleNames = { alumno: 'student', docente: 'teacher', tecnico: 'technician', admin: 'admin' };
const seededPassword = /^\$2y\$10\$hash_(?:admin|tecnico|docente|alumno)_ejemplo_\d+$/;
const bcryptPassword = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const fakeHash = bcrypt.hashSync(randomUUID(), 10);
const selectUser = `SELECT u.*, c.nombre AS carrera FROM usuarios u LEFT JOIN carreras c ON c.id = u.carrera_id`;
const emailFormat = /^[^\s@]+@uptex\.edu\.mx$/i;
const challenges = new Map();
const rates = new Map();
const codeLifetime = 5 * 60 * 1000;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const mailer = process.env.SMTP_HOST && process.env.SMTP_FROM ? nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort !== 465 && !demoMode,
  connectionTimeout: 10000,
  socketTimeout: 15000,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
}) : null;
const siteKey = process.env.RECAPTCHA_SITE_KEY;
const captchaSecret = process.env.RECAPTCHA_SECRET;

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of challenges) if (record.expires <= now) challenges.delete(key);
  for (const [key, record] of rates) if (record.expires <= now) rates.delete(key);
}, 60000).unref();

function rate(key, maximum, duration) {
  let record = rates.get(key);
  if (!record || record.expires <= Date.now()) {
    record = { count: 0, expires: Date.now() + duration };
    rates.set(key, record);
  }
  if (++record.count > maximum) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
}

function profile(user) {
  return {
    id: String(user.id), matricula: user.matricula, fullName: user.nombre_completo,
    email: user.correo, role: roleNames[user.rol], career: user.carrera ?? '',
    careerId: user.carrera_id == null ? null : String(user.carrera_id), active: Boolean(user.activo),
  };
}

const fingerprint = value => createHash('sha256').update(value).digest('hex');
const sessionCall = (session, method) => new Promise((resolve, reject) => {
  session[method](error => error ? reject(error) : resolve());
});

async function signIn(req, res, user, remember) {
  await sessionCall(req.session, 'regenerate');
  req.session.userId = user.id;
  req.session.credential = fingerprint(user.password);
  if (remember === true) req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
  await sessionCall(req.session, 'save');
  res.json(profile(user));
}

export const authenticate = route(async (req, _res, next) => {
  if (!req.session.userId) throw new HttpError(401, 'Inicia sesión para continuar.');
  const [user] = await rows(pool, `${selectUser} WHERE u.id = ? AND u.activo = 1`, [req.session.userId]);
  if (!user || req.session.credential !== fingerprint(user.password)) {
    await sessionCall(req.session, 'destroy');
    throw new HttpError(401, 'Tu sesión ha caducado. Inicia sesión de nuevo.');
  }
  req.user = user;
  next();
});

async function verifyCaptcha(token) {
  if (!siteKey || !captchaSecret) return;
  if (typeof token !== 'string' || !token || token.length > 4096) throw new HttpError(400, 'Completa reCAPTCHA.');
  let result;
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST', body: new URLSearchParams({ secret: captchaSecret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    result = await response.json();
  } catch {
    throw new HttpError(503, 'La verificación reCAPTCHA no está disponible.');
  }
  if (!result.success || result.hostname !== new URL(origin).hostname) {
    throw new HttpError(400, 'La verificación reCAPTCHA caducó o es inválida.');
  }
}

async function demoUsers() {
  if (!demoMode) return [];
  const records = await rows(pool, `${selectUser} WHERE u.activo = 1 ORDER BY u.id`);
  const onePerRole = new Map();
  for (const user of records) {
    if (seededPassword.test(user.password) && !onePerRole.has(user.rol)) onePerRole.set(user.rol, user);
  }
  return [...onePerRole.values()];
}

auth.get('/config', route(async (_req, res) => {
  res.json({
    demoUsers: (await demoUsers()).map(user => ({ id: String(user.id), role: roleNames[user.rol], matricula: user.matricula })),
    captchaSiteKey: siteKey && captchaSecret ? siteKey : null,
    mailMode: mailer ? 'smtp' : demoMode ? 'console' : 'off',
  });
}));

auth.post('/login', route(async (req, res) => {
  rate(`login:${req.ip}`, 40, codeLifetime);
  const { demoRole, remember, captchaToken, password } = req.body;
  if (demoRole && demoMode) {
    const user = (await demoUsers()).find(account => roleNames[account.rol] === demoRole);
    if (!user) throw new HttpError(401, 'No hay una cuenta de demostración disponible para ese rol.');
    return signIn(req, res, user, remember);
  }
  await verifyCaptcha(captchaToken);
  const identifier = string(req.body.identifier ?? req.body.matricula ?? req.body.correo, 'Matrícula o correo', 120);
  const [user] = await rows(pool, `${selectUser} WHERE u.activo = 1 AND (u.matricula = ? OR u.correo = ?)`,
    [identifier, identifier]);
  const validHash = bcryptPassword.test(user?.password ?? '');
  const candidate = typeof password === 'string' && Buffer.byteLength(password) <= 72 ? password : '';
  const matches = await bcrypt.compare(candidate, validHash ? user.password : fakeHash);
  if (!candidate || !user || !validHash || !matches) throw new HttpError(401, 'Matrícula, correo o contraseña incorrectos.');
  await signIn(req, res, user, remember);
}));

auth.get('/session', authenticate, (req, res) => res.json(profile(req.user)));
auth.post('/logout', route(async (req, res) => {
  await sessionCall(req.session, 'destroy');
  res.clearCookie('uptex.sid', { path: '/api' }).sendStatus(204);
}));

auth.post('/codigo', route(async (req, res) => {
  const { purpose, captchaToken } = req.body;
  if (!['activation', 'recovery'].includes(purpose)) throw new HttpError(400, 'Operación inválida.');
  const email = string(req.body.email, 'Correo institucional', 120).toLowerCase();
  if (!emailFormat.test(email)) throw new HttpError(400, 'Usa tu correo institucional @uptex.edu.mx.');
  const matricula = purpose === 'activation' ? string(req.body.matricula, 'Matrícula', 20) : null;
  if (purpose === 'recovery') await verifyCaptcha(captchaToken);
  if (!mailer && !demoMode) throw new HttpError(503, 'El servicio de correo aún no está configurado.');
  rate(`code-ip:${req.ip}`, 20, codeLifetime);
  rate(`code-email:${email}`, 4, codeLifetime);
  const [user] = await rows(pool, `${selectUser} WHERE u.correo = ? AND u.activo = 1`, [email]);
  const canSend = user && (purpose === 'recovery'
    || (user.matricula.toLowerCase() === matricula.toLowerCase() && !bcryptPassword.test(user.password)));
  const challengeId = randomUUID();
  const code = String(randomInt(100000, 1000000));
  challenges.set(challengeId, {
    userId: canSend ? user.id : null, purpose, codeHash: fingerprint(code), expires: Date.now() + codeLifetime,
    credential: canSend ? fingerprint(user.password) : null, attempts: 0,
  });
  if (canSend && mailer) {
    try {
      await mailer.sendMail({
        from: process.env.SMTP_FROM, to: user.correo, subject: 'Código de Inventario UPTex',
        text: `Tu código de verificación es ${code}. Caduca en 5 minutos.`,
      });
    } catch (error) {
      challenges.delete(challengeId);
      console.error('Error de correo UPTex', error.code);
      throw new HttpError(503, 'No se pudo enviar el correo. Intenta más tarde.');
    }
  } else if (canSend) {
    console.info(`[Demostración local] Código UPTex para ${user.correo}: ${code}`);
  }
  res.json({ challengeId });
}));

function checkCode(req) {
  rate(`check:${req.ip}`, 30, codeLifetime);
  const { challengeId, code } = req.body;
  const challenge = challenges.get(challengeId);
  const valid = challenge && challenge.expires > Date.now() && ++challenge.attempts <= 5
    && typeof code === 'string' && /^\d{6}$/.test(code)
    && timingSafeEqual(Buffer.from(challenge.codeHash), Buffer.from(fingerprint(code))) && challenge.userId;
  if (!valid) throw new HttpError(400, 'Código incorrecto o vencido.');
  return challenge;
}

auth.post('/verificar-codigo', route(async (req, res) => {
  checkCode(req);
  res.sendStatus(204);
}));

auth.post('/clave', route(async (req, res) => {
  const { challengeId, password, accepted, captchaToken } = req.body;
  if (typeof password !== 'string' || [...password].length < 6 || Buffer.byteLength(password) > 72
      || !/[\p{N}\p{P}\p{S}]/u.test(password)) {
    throw new HttpError(400, 'Usa al menos 6 caracteres y agrega un número o símbolo (máximo 72 bytes).');
  }
  const challenge = checkCode(req);
  if (challenge.purpose === 'activation') {
    if (accepted !== true) throw new HttpError(400, 'Acepta el reglamento y el aviso de privacidad.');
    await verifyCaptcha(captchaToken);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  if (!challenges.delete(challengeId)) throw new HttpError(400, 'El código ya se utilizó.');
  const user = await transaction(async db => {
    const [account] = await rows(db, `${selectUser} WHERE u.id = ? AND u.activo = 1 FOR UPDATE`, [challenge.userId]);
    if (!account || fingerprint(account.password) !== challenge.credential) throw new HttpError(400, 'Solicita un código nuevo.');
    await rows(db, 'UPDATE usuarios SET password = ? WHERE id = ?', [passwordHash, account.id]);
    return { ...account, password: passwordHash };
  });
  await signIn(req, res, user, false);
}));

users.get('/docentes', route(async (_req, res) => {
  const records = await rows(pool, "SELECT id, nombre_completo FROM usuarios WHERE rol = 'docente' AND activo = 1 ORDER BY nombre_completo");
  res.json(records.map(user => ({ id: String(user.id), name: user.nombre_completo })));
}));

users.use((req, _res, next) => {
  try {
    requireRole(req.user, 'admin');
    next();
  } catch (error) {
    next(error);
  }
});

users.get('/', route(async (_req, res) => res.json((await rows(pool, `${selectUser} ORDER BY u.id`)).map(profile))));

function databaseRole(value) {
  const role = Object.keys(roleNames).find(key => roleNames[key] === value);
  if (!role) throw new HttpError(400, 'Selecciona un rol válido.');
  return role;
}

users.post('/', route(async (req, res) => {
  const matricula = string(req.body.matricula, 'Matrícula', 20);
  const email = string(req.body.email, 'Correo', 120).toLowerCase();
  if (!emailFormat.test(email)) throw new HttpError(400, 'Usa un correo institucional @uptex.edu.mx.');
  const name = string(req.body.fullName, 'Nombre', 150);
  const careerId = req.body.careerId ? integer(req.body.careerId, 'Carrera') : null;
  const role = databaseRole(req.body.role);
  const result = await rows(pool, `INSERT INTO usuarios (matricula, correo, nombre_completo, carrera_id, password, rol)
    VALUES (?, ?, ?, ?, 'activacion_pendiente', ?)`, [matricula, email, name, careerId, role]);
  const [record] = await rows(pool, `${selectUser} WHERE u.id = ?`, [result.insertId]);
  res.status(201).json(profile(record));
}));

users.patch('/:id/rol', route(async (req, res) => {
  const id = integer(req.params.id, 'Usuario');
  if (id === req.user.id) throw new HttpError(409, 'Otro administrador debe actualizar tu rol.');
  const result = await rows(pool, 'UPDATE usuarios SET rol = ? WHERE id = ?', [databaseRole(req.body.role), id]);
  if (!result.affectedRows) throw new HttpError(404, 'El usuario no existe.');
  const [record] = await rows(pool, `${selectUser} WHERE u.id = ?`, [id]);
  res.json(profile(record));
}));
