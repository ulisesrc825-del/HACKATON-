import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types/warehouse';
import { errorMessage } from '../services/api';
import type { Career, NewUser } from '../services/api';
import { Users, Shield, Plus, CheckCircle2, UserCheck, Search, Filter, AlertCircle, X } from 'lucide-react';

interface UserRoleManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  careers: Career[];
  onUpdateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  onAddUser: (user: NewUser) => Promise<void>;
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  currentUser,
  careers,
  onUpdateUserRole,
  onAddUser,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New user form state
  const [newMatricula, setNewMatricula] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newCareer, setNewCareer] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.fullName.toLowerCase().includes(term) ||
      u.matricula.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.career.toLowerCase().includes(term);

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  async function save(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setActionError('');
    setNotification(null);
    try { await work(); }
    catch (error) { setActionError(errorMessage(error)); }
    finally { setBusy(false); }
  }

  function handleRoleChange(userId: string, targetName: string, role: UserRole) {
    void save(async () => {
      await onUpdateUserRole(userId, role);
      setNotification('Rol actualizado para ' + targetName + '.');
    });
  }

  function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    void save(async () => {
      await onAddUser({
        matricula: newMatricula.trim(), fullName: newFullName.trim(), email: newEmail.trim(),
        careerId: newCareer || null, role: newRole,
      });
      setIsNewUserModalOpen(false);
      setNotification('Usuario registrado. Puede activar su cuenta con su correo institucional.');
      setNewMatricula('');
      setNewFullName('');
      setNewEmail('');
      setNewCareer('');
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Control de Accesos y Privilegios · RBAC
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">
            Gestión y Asignación de Roles de Usuarios
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 max-w-2xl">
            Como Administrador, puedes asignar y modificar los roles del sistema entre 
            <strong> Estudiante</strong>, <strong>Profesor (con permisos de apartado de laboratorios)</strong>, 
            <strong> Técnico de Almacén</strong> y <strong>Administrador</strong>.
          </p>
        </div>

        <button
          onClick={() => setIsNewUserModalOpen(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Usuario</span>
        </button>
      </div>

      {actionError && !isNewUserModalOpen && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{actionError}</p>}
      {notification && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Role Distribution Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Estudiantes
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-blue-700">
            {users.filter((u) => u.role === 'student').length}
          </div>
          <span className="text-[11px] text-slate-500">Solicitan material con QR</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Profesores / Docentes
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-emerald-700">
            {users.filter((u) => u.role === 'teacher').length}
          </div>
          <span className="text-[11px] text-emerald-800 font-medium">Apartan laboratorios (7am-9pm)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Técnicos de Almacén
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-amber-700">
            {users.filter((u) => u.role === 'technician').length}
          </div>
          <span className="text-[11px] text-slate-500">Ventanillas 1 y 2 (Carril Rápido)</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Administradores
          </span>
          <div className="mt-1 text-2xl font-bold font-mono text-indigo-700">
            {users.filter((u) => u.role === 'admin').length}
          </div>
          <span className="text-[11px] text-slate-500">Acceso total y configuración</span>
        </div>
      </div>

      {/* Users Table with Role Switcher Dropdowns */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {/* Filters */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por nombre, matrícula o correo institucional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar Rol:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="student">Estudiantes</option>
              <option value="teacher">Profesores</option>
              <option value="technician">Técnicos de Almacén</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Usuario (Nombre Completo)</th>
                <th className="py-3 px-3">Matrícula</th>
                <th className="py-3 px-4">Correo Institucional</th>
                <th className="py-3 px-4">Carrera / Área</th>
                <th className="py-3 px-4">Rol Asignado (Modificable)</th>
                <th className="py-3 px-4 text-center">Permisos Principales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map((u) => {
                const isCurrentSelf = currentUser.id === u.id || currentUser.matricula === u.matricula;

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    {/* Nombre */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{u.fullName}</span>
                        {isCurrentSelf && (
                          <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded-xs border border-emerald-200">
                            Tú
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Matrícula */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {u.matricula}
                    </td>

                    {/* Correo */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>

                    {/* Carrera / Depto */}
                    <td className="py-3 px-4 text-slate-600">
                      {u.career}
                    </td>

                    {/* Role Selector Dropdown (The administrator can reassign roles here!) */}
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={busy || u.id === currentUser.id}
                        aria-label={"Rol de " + u.fullName}
                        onChange={(e) => handleRoleChange(u.id, u.fullName, e.target.value as UserRole)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          u.role === 'student'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : u.role === 'teacher'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : u.role === 'technician'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-indigo-50 text-indigo-900 border-indigo-300'
                        }`}
                      >
                        <option value="student">Estudiante / Alumno</option>
                        <option value="teacher">Profesor / Docente</option>
                        <option value="technician">Técnico de Almacén</option>
                        <option value="admin">Administrador General</option>
                      </select>
                    </td>

                    {/* Description of permissions */}
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] text-slate-500">
                        {u.role === 'student' && 'Solicitar materiales y vale QR'}
                        {u.role === 'teacher' && '⚡ Apartar laboratorios (7am-9pm)'}
                        {u.role === 'technician' && 'Escanear QR y despacho ventanilla'}
                        {u.role === 'admin' && 'Acceso total y asignación de roles'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New User */}
      {isNewUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">
                  ALTA DE USUARIOS · UPTEX
                </span>
                <h3 className="text-base font-bold">Registrar Nuevo Usuario</h3>
              </div>
              <button
                onClick={() => setIsNewUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5 text-xs text-slate-800">
              {actionError && <p role="alert" className="text-rose-800">{actionError}</p>}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Matrícula Institucional *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 232211050 o DOC-UPTEX-20"
                  value={newMatricula}
                  onChange={(e) => setNewMatricula(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nombre y Apellidos"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Correo Institucional *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@uptex.edu.mx"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Carrera o Academia *
                </label>
                <select aria-label="Carrera" value={newCareer} onChange={event => setNewCareer(event.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="">Sin carrera asignada</option>
                  {careers.map(career => <option key={career.id} value={career.id}>{career.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Rol Inicial Asignado *
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="student">Estudiante / Alumno</option>
                  <option value="teacher">Profesor / Docente (Apartar laboratorios)</option>
                  <option value="technician">Técnico de Almacén</option>
                  <option value="admin">Administrador General</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={busy}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
