import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool, rows, transaction } from './db.js';

const accounts = [
  { matricula: '1323144021', role: 'alumno', password: 'Alumno2026!' },
  { matricula: 'DOC-102', role: 'docente', password: 'Docente2026!' },
  { matricula: 'TEC-014', role: 'tecnico', password: 'Tecnico2026!' },
  { matricula: 'EMP-001', role: 'admin', password: 'Admin2026!' },
];
const placeholder = /^\$2y\$10\$hash_(?:admin|tecnico|docente|alumno)_ejemplo_\d+$/;

try {
  const messages = await transaction(async db => {
    const result = [];
    for (const account of accounts) {
      const [user] = await rows(db, 'SELECT id, password, rol, activo FROM usuarios WHERE matricula = ? FOR UPDATE', [account.matricula]);
      if (!user || user.rol !== account.role || !user.activo) {
        throw new Error(`Importa los datos originales. Falta la cuenta activa ${account.matricula} con rol ${account.role}.`);
      }
      if (placeholder.test(user.password)) {
        const hash = await bcrypt.hash(account.password, 12);
        await rows(db, 'UPDATE usuarios SET password = ? WHERE id = ?', [hash, user.id]);
      } else if (!await bcrypt.compare(account.password, user.password).catch(() => false)) {
        throw new Error(`La cuenta ${account.matricula} tiene una contraseña personalizada. Usa la recuperación de contraseña de esa cuenta.`);
      }
      result.push(`${account.role} | ${account.matricula} | ${account.password}`);
    }
    return result;
  });
  console.log('Credenciales de demostración verificadas.');
  console.log(messages.join('\n'));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
