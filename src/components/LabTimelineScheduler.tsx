import React, { useState } from 'react';
import { Laboratory, LabBooking, LoanRequest, UserProfile } from '../types/warehouse';
import { errorMessage } from '../services/api';
import type { NewBooking, Subject, Teacher } from '../services/api';
import { Calendar, Clock, Plus, CheckCircle2, AlertCircle, X, User, BookOpen, ShieldAlert, Users, Layers, Filter } from 'lucide-react';

interface LabTimelineSchedulerProps {
  laboratories: Laboratory[];
  bookings: LabBooking[];
  currentUser: UserProfile;
  subjects: Subject[];
  teachers: Teacher[];
  loans: LoanRequest[];
  onAddBooking: (booking: NewBooking) => Promise<void>;
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // 7am to 9pm (21:00 is end of hour 20)

export const LabTimelineScheduler: React.FC<LabTimelineSchedulerProps> = ({
  laboratories,
  bookings,
  currentUser,
  subjects,
  teachers,
  loans,
  onAddBooking,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City' }).format(new Date()));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [targetLabId, setTargetLabId] = useState(laboratories.find(lab => lab.status === 'disponible')?.id ?? '');
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(11);
  const [subject, setSubject] = useState(String(subjects.find(item => String(item.carrera_id) === currentUser.careerId)?.id ?? subjects[0]?.id ?? ''));
  const [group, setGroup] = useState('');
  const [teacher, setTeacher] = useState(currentUser.role === 'teacher' ? currentUser.id : teachers[0]?.id ?? '');
  const [linkedLoan, setLinkedLoan] = useState('');
  const [busy, setBusy] = useState(false);
  const [conflictError, setConflictError] = useState<string>('');
  const [inspectedBooking, setInspectedBooking] = useState<LabBooking | null>(null);

  const availableLabs = laboratories.filter(lab => lab.status === 'disponible');
  const subjectName = subjects.find(item => String(item.id) === subject)?.nombre;
  const eligibleLoans = loans.filter(loan => loan.subject === subjectName && loan.teacherId === teacher);
  const canBook = currentUser.role === 'teacher' || currentUser.role === 'admin';

  // Filter bookings for the selected date
  const dateBookings = bookings.filter((b) => b.date === selectedDate && b.status !== 'cancelada');

  // Check if a specific lab has a booking at a specific hour
  const hourTime = (hour: number) => String(hour).padStart(2, '0') + ':00:00';
  const bookingHours = (booking: LabBooking) => booking.startTime.slice(0, 5) + ' a ' + booking.endTime.slice(0, 5);
  const getBookingForHour = (labId: string, hour: number): LabBooking | undefined => {
    return dateBookings.find(
      (b) => b.labId === labId && b.startTime < hourTime(hour + 1) && b.endTime > hourTime(hour)
    );
  };

  const handleOpenBookingModal = (labId?: string, hour?: number) => {
    if (!canBook || !availableLabs.length) return;
    setLinkedLoan('');
    if (labId) setTargetLabId(labId);
    if (hour !== undefined) {
      setStartHour(hour);
      setEndHour(Math.min(21, hour + 2));
    }
    setConflictError('');
    setIsModalOpen(true);
  };

  async function handleSubmitBooking(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setConflictError('');
    if (startHour >= endHour) {
      setConflictError('La hora de fin debe ser posterior al inicio.');
      return;
    }
    setBusy(true);
    try {
      await onAddBooking({
        laboratorio_id: Number(targetLabId), docente_id: Number(teacher), materia_id: Number(subject),
        prestamo_id: linkedLoan ? Number(linkedLoan) : undefined, grupo: group.trim(), fecha: selectedDate,
        hora_inicio: hourTime(startHour), hora_fin: hourTime(endHour),
      });
      setIsModalOpen(false);
    } catch (error) {
      setConflictError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Title & Date Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {availableLabs.length} laboratorios disponibles · 7:00 AM a 9:00 PM
            </span>
            <span className="text-xs font-mono text-slate-500">
              Horario Continuo
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900 tracking-tight">
            Apartado y Línea de Tiempo de Laboratorios
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 max-w-3xl">
            Línea de tiempo de ocupación en tiempo real. 
            <strong className="text-rose-700"> Las horas en rojo indican que un profesor ya apartó el laboratorio</strong> para su sesión práctica.
          </p>
        </div>

        {/* Right Action & Date Selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              aria-label="Fecha de consulta"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-mono font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Book Lab CTA */}
          {canBook ? (
            <button
              disabled={!availableLabs.length}
              onClick={() => handleOpenBookingModal()}
              className="px-4 py-2 bg-[#007A33] hover:bg-[#00682b] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Apartar Laboratorio</span>
            </button>
          ) : (
            <div className="text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              ℹ Consulta de apartados de laboratorio
            </div>
          )}
        </div>
      </div>

      {/* Legend & Instructions Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded-sm bg-rose-600 border border-rose-700"></span>
            <span><strong>Rojo:</strong> Apartado por Profesor (Ocupado)</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-100 border border-slate-300"></span>
            <span><strong>Gris / Libre:</strong> Horario Disponible para Apartar</span>
          </span>
        </div>

        <div className="text-slate-500 text-[11px]">
          Tip: Haz clic en cualquier bloque libre para apartar ese horario directamente.
        </div>
      </div>

      {/* 11 Laboratories Cards with Timelines */}
      <div className="space-y-4">
        {laboratories.map((lab) => {
          return (
            <div
              key={lab.id}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
            >
              {/* Lab Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-xs px-2 py-0.5 rounded-sm bg-slate-900 text-white">
                      {lab.code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {lab.name}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                    <span>{lab.building}</span>
                    <span aria-hidden="true">·</span>
                    <span>Capacidad: {lab.capacityStudents} alumnos</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600 font-medium">{({ disponible: 'Disponible', mantenimiento: 'En mantenimiento', cerrado: 'Cerrado' })[lab.status]}</span>
                  </p>
                </div>

                {canBook && lab.status === "disponible" && (
                  <button
                    onClick={() => handleOpenBookingModal(lab.id)}
                    className="self-start sm:self-center px-3 py-1 text-[11px] font-bold bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    <span>Apartar {lab.code}</span>
                  </button>
                )}
              </div>

              {/* TIMELINE FROM 7:00 AM TO 9:00 PM */}
              <div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>07:00 AM</span>
                  <span>10:00 AM</span>
                  <span>01:00 PM (13:00)</span>
                  <span>04:00 PM (16:00)</span>
                  <span>07:00 PM (19:00)</span>
                  <span>09:00 PM (21:00)</span>
                </div>

                {/* Timeline Grid (14 hour blocks: 7:00 to 21:00) */}
                <div
                  style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}
                  className="grid gap-1 w-full bg-slate-50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto min-w-[700px]"
                >
                  {HOURS.map((hour) => {
                    const booking = getBookingForHour(lab.id, hour);
                    const isOccupied = !!booking;
                    const isFirstHourOfBooking = booking && booking.startTime >= hourTime(hour) && booking.startTime < hourTime(hour + 1);

                    return (
                      <button
                        key={hour}
                        type="button"
                        onClick={() => {
                          if (isOccupied && booking) {
                            setInspectedBooking(booking);
                          } else {
                            handleOpenBookingModal(lab.id, hour);
                          }
                        }}
                        className={`h-11 rounded-lg text-center transition-all flex flex-col justify-center items-center px-1 select-none relative group cursor-pointer ${
                          isOccupied
                            ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs'
                            : 'bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-600'
                        }`}
                        title={
                          isOccupied && booking
                            ? `OCUPADO: ${booking.teacherName} (${booking.subject}) de ${bookingHours(booking)}`
                            : `Disponible: ${hour}:00 - ${hour + 1}:00. Clic para apartar.`
                        }
                      >
                        <span className="text-[10px] font-mono leading-tight">
                          {hour}:00
                        </span>

                        {isOccupied ? (
                          <span className="text-[8px] truncate max-w-full font-bold uppercase tracking-tighter">
                            {isFirstHourOfBooking ? 'Profesor' : 'Ocupado'}
                          </span>
                        ) : (
                          <span className="text-[8px] text-slate-400 font-medium">
                            {lab.status === "disponible" ? "Libre" : "No disponible"}
                          </span>
                        )}

                        {/* Hover Tooltip for Occupied Blocks */}
                        {isOccupied && booking && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 text-left">
                            <div className="font-bold text-rose-400">APARTADO POR PROFESOR</div>
                            <div><strong>Profesor:</strong> {booking.teacherName}</div>
                            <div><strong>Materia:</strong> {booking.subject}</div>
                            <div><strong>Grupo:</strong> {booking.group}</div>
                            <div><strong>Horario:</strong> {bookingHours(booking)} hrs</div>
                            <div><strong>Tema:</strong> {booking.purpose ?? 'Sin vale asociado'}</div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Apartar Laboratorio (Teacher / Admin form) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="p-5 bg-[#007A33] text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-200 uppercase font-bold block">
                  SISTEMA DE APARTADO DOCENTE · UPTEX
                </span>
                <h3 className="text-base font-extrabold mt-0.5">
                  Apartar Laboratorio para Práctica
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-100 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBooking} className="p-6 space-y-4 text-xs text-slate-800">
              {conflictError && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span role="alert">{conflictError}</span>
                </div>
              )}

              {/* Laboratorio Selector */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Laboratorio a Solicitar *
                </label>
                <select
                  aria-label="Laboratorio a solicitar"
                  value={targetLabId}
                  onChange={(e) => setTargetLabId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-600"
                >
                  {availableLabs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code} - {l.name} ({l.building})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Fecha *
                  </label>
                  <input
                    type="date"
                    aria-label="Fecha de la reserva"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Hora Inicio *
                  </label>
                  <select
                    aria-label="Hora de inicio"
                    value={startHour}
                    onChange={(e) => setStartHour(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}:00 {h < 12 ? 'AM' : 'PM'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Hora Fin *
                  </label>
                  <select
                    aria-label="Hora de fin"
                    value={endHour}
                    onChange={(e) => setEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-900"
                  >
                    {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                      <option key={h} value={h}>
                        {h}:00 {h < 12 ? 'AM' : 'PM'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Materia y Grupo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Materia Asignada *
                  </label>
                  <select aria-label="Materia asignada" required value={subject} onChange={event => { setSubject(event.target.value); setLinkedLoan(''); }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                    <option value="" disabled>Selecciona una materia</option>
                    {subjects.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Grupo y Carrera *
                  </label>
                  <input
                    type="text"
                    required
                    aria-label="Grupo y carrera" maxLength={20} placeholder="Ej. 7ISC1"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              {currentUser.role === 'admin' && <label className="block font-bold text-slate-900">
                Docente responsable *
                <select required value={teacher} onChange={event => { setTeacher(event.target.value); setLinkedLoan(''); }}
                  className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="" disabled>Selecciona un docente</option>
                  {teachers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>}
              <label className="block font-bold text-slate-900">
                Vale asociado (opcional)
                <select value={linkedLoan} onChange={event => setLinkedLoan(event.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl">
                  <option value="">Sin vale asociado</option>
                  {eligibleLoans.map(loan => <option key={loan.id} value={loan.recordId}>{loan.id} · {loan.practiceName}</option>)}
                </select>
              </label>

              {/* Notice */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                Al confirmar, <strong>las horas seleccionadas se marcarán en color ROJO</strong> en la línea de tiempo del laboratorio para evitar empalmes con otros profesores.
              </div>

              {/* Submit CTA */}
              <button
                type="submit" disabled={busy}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-[#007A33] hover:bg-[#00682b] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{busy ? 'Guardando reserva…' : 'Confirmar Apartado de Laboratorio'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalle de Apartado Ocupado (al hacer clic en bloque rojo) */}
      {inspectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-rose-200 uppercase font-bold block">
                  HORARIO APARTADO (EN ROJO)
                </span>
                <h3 className="text-base font-extrabold mt-0.5">
                  {inspectedBooking.labName}
                </h3>
              </div>
              <button
                onClick={() => setInspectedBooking(null)}
                className="text-rose-100 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-800">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-950 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Profesor Titular:</span>
                  <span className="font-bold">{inspectedBooking.teacherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Materia:</span>
                  <span className="font-bold text-blue-900">{inspectedBooking.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grupo:</span>
                  <span className="font-semibold">{inspectedBooking.group}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Horario Ocupado:</span>
                  <span className="font-mono font-bold text-rose-700">
                    {bookingHours(inspectedBooking)} hrs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span className="font-mono">{inspectedBooking.date}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-900 block mb-1">
                  Práctica / Tema Académico:
                </span>
                <p className="text-slate-600 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                  {inspectedBooking.purpose ?? 'Sin vale asociado'}
                </p>
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setInspectedBooking(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
