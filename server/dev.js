import { spawn } from 'node:child_process';
import { access, mkdir, readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
dotenv.config({ path: path.join(root, '.env'), quiet: true });
const port = Number(process.env.PORT || 3001);
const options = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectTimeout: 2000,
};
const database = process.env.DB_NAME || 'HACKATON';
const requiredTables = [
  'carreras', 'materias', 'categorias', 'ubicaciones', 'usuarios', 'materiales', 'kits', 'detalle_kits',
  'prestamos', 'detalle_prestamos', 'laboratorios', 'reservas_laboratorio', 'movimientos_inventario',
  'incidencias', 'registros_cola',
];
const children = [];
let ownedDatabase;
let stopping = false;

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function portIsOpen(value) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port: value });
    const finish = open => { socket.destroy(); resolve(open); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}

function runNode(file, args = []) {
  const child = spawn(process.execPath, [path.join(root, file), ...args], {
    cwd: root, env: process.env, stdio: 'inherit', windowsHide: true,
  });
  children.push(child);
  child.on('error', error => { console.error(error.message); void stop(1); });
  child.on('exit', code => { if (!stopping) void stop(code ?? 1); });
  return child;
}

async function startLocalDatabase() {
  const localHost = ['localhost', '127.0.0.1'].includes(options.host);
  if (process.platform !== 'win32' || !localHost || process.env.LOCAL_MARIADB !== 'true'
      || options.user !== 'root' || options.password) {
    throw new Error('MariaDB está apagada. Inicia tu servidor de base de datos y revisa DB_HOST y DB_PORT en .env.');
  }
  const install = process.env.MARIADB_HOME || path.join(process.env.LOCALAPPDATA, 'InventarioUPTex', 'mariadb-11.4.10-winx64');
  const binary = path.join(install, 'bin', 'mariadbd.exe');
  if (!await exists(binary)) {
    throw new Error('No se encontró MariaDB. Enciende tu instalación o configura MARIADB_HOME en .env con la carpeta que contiene bin/ y share/.');
  }
  const data = path.join(root, '.local', 'mariadb');
  await mkdir(data, { recursive: true });
  if (!await exists(path.join(data, 'mysql'))) {
    console.log('Inicializando MariaDB local para Inventario UPTex…');
    const initializer = spawn(path.join(install, 'bin', 'mariadb-install-db.exe'),
      [`--datadir=${data}`, `--port=${options.port}`], { stdio: 'inherit', windowsHide: true });
    await new Promise((resolve, reject) => {
      initializer.once('error', reject);
      initializer.once('exit', code => code === 0 ? resolve() : reject(new Error('No se pudo inicializar MariaDB.')));
    });
  }
  ownedDatabase = spawn(binary, [`--datadir=${data}`, `--port=${options.port}`, '--bind-address=127.0.0.1', '--console'],
    { stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
  ownedDatabase.on('error', error => console.error('MariaDB', error.message));
  for (let attempt = 0; attempt < 45; attempt++) {
    if (ownedDatabase.exitCode !== null) throw new Error('MariaDB terminó durante el arranque. Revisa el error mostrado arriba.');
    try { return await mysql.createConnection(options); } catch (error) {
      if (error.code !== 'ECONNREFUSED') throw error;
      await delay(500);
    }
  }
  throw new Error('MariaDB no respondió después de iniciar.');
}

async function prepareDatabase() {
  let db;
  try { db = await mysql.createConnection(options); } catch (error) {
    if (error.code !== 'ECONNREFUSED') throw error;
    db = await startLocalDatabase();
  }
  let imported = false;
  try {
    const [tables] = await db.execute('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?', [database]);
    if (!tables.length && process.env.DEMO_MODE === 'true' && ownedDatabase) {
      console.log('Importando el esquema y los datos originales de HACKATON…');
      await db.query('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [database]);
      await db.changeUser({ database });
      const importer = await mysql.createConnection({ ...options, database, multipleStatements: true });
      try {
        await importer.query(await readFile(path.join(root, 'database', '01-esquema.sql'), 'utf8'));
        await importer.beginTransaction();
        await importer.query(await readFile(path.join(root, 'database', '02-datos.sql'), 'utf8'));
        await importer.commit();
      } catch (error) {
        await importer.rollback();
        throw error;
      } finally { await importer.end(); }
      imported = true;
    } else {
      const names = new Set(tables.map(table => table.TABLE_NAME));
      const missing = requiredTables.filter(table => !names.has(table));
      if (missing.length) throw new Error(`El esquema ${database} está incompleto. Faltan las tablas ${missing.join(', ')}.`);
      await db.changeUser({ database });
      await db.query('SELECT id FROM usuarios LIMIT 1');
      await db.query('SELECT id FROM materiales LIMIT 1');
    }
  } finally { await db.end(); }
  if (imported) {
    const setup = spawn(process.execPath, [path.join(root, 'server', 'setup-demo.js')],
      { cwd: root, stdio: 'inherit', windowsHide: true });
    await new Promise((resolve, reject) => {
      setup.once('error', reject);
      setup.once('exit', code => code === 0 ? resolve() : reject(new Error('No se pudieron configurar las credenciales de prueba.')));
    });
  }
}

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  if (ownedDatabase && ownedDatabase.exitCode === null) {
    try {
      const db = await mysql.createConnection(options);
      await db.query('SHUTDOWN');
      await db.end();
    } catch { /* El proceso puede haber terminado con la señal de la consola. */ }
  }
  process.exitCode = code;
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
  if (await portIsOpen(port) || await portIsOpen(3000)) {
    throw new Error('Los puertos 3000 o 3001 ya están ocupados. Cierra el arranque anterior antes de iniciar otra copia.');
  }
  await prepareDatabase();
  const api = runNode('server/index.js');
  let ready = false;
  for (let attempt = 0; attempt < 30 && api.exitCode === null; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) { ready = true; break; }
    } catch { /* La API todavía está iniciando. */ }
    await delay(300);
  }
  if (!ready) throw new Error('La API no pudo arrancar o conectarse a MariaDB.');
  runNode('node_modules/vite/bin/vite.js', ['--port=3000', '--host=127.0.0.1', '--strictPort']);
  console.log('\nSistema disponible en http://localhost:3000 · Ctrl+C para detenerlo.\n');
} catch (error) {
  console.error(`No se pudo iniciar Inventario UPTex. ${error.code || ''} ${error.message}`);
  await stop(1);
}
