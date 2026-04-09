import { FormEvent, useMemo, useRef, useState } from 'react';
import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { createAppointment, getAvailability } from '../lib/api';
import { useSiteConfig } from '../lib/useSiteConfig';
import { emitPublicNotification } from '../shared/notifications/notifications';

function formatCurrency(value?: number | null) {
  if (value == null) {
    return 'Consulta precio';
  }

  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-EC', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getSlotSelectionValue(slot: {
  start: string;
  staffId?: string | null;
}) {
  return `${slot.start}::${slot.staffId ?? 'unassigned'}`;
}

export function BookingPage() {
  const { data, loading, error } = useSiteConfig('/');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{
    start: string;
    end: string;
    staffId?: string | null;
    staffName?: string | null;
    available: boolean;
    unavailableReason?: string | null;
  }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [formResetVersion, setFormResetVersion] = useState(0);
  const availabilityLockRef = useRef(false);
  const submitLockRef = useRef(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedService = useMemo(
    () => data?.services.find((service) => service.id === selectedServiceId) ?? null,
    [data, selectedServiceId],
  );
  const compatibleStaff = useMemo(
    () => data?.staff.filter((member) => !selectedServiceId || member.serviceIds?.includes(selectedServiceId)) ?? [],
    [data, selectedServiceId],
  );
  const selectedStaff = useMemo(
    () => compatibleStaff.find((member) => member.id === selectedStaffId) ?? null,
    [compatibleStaff, selectedStaffId],
  );
  const selectedSlotData = useMemo(
    () => slots.find((slot) => getSlotSelectionValue(slot) === selectedSlot) ?? null,
    [selectedSlot, slots],
  );

  function resetBookingFlow() {
    formRef.current?.reset();
    availabilityLockRef.current = false;
    submitLockRef.current = false;
    setSelectedServiceId('');
    setSelectedStaffId('');
    setSelectedDate('');
    setSelectedSlot('');
    setSlots([]);
    setAvailabilityMessage(null);
    setAvailabilityLoading(false);
    setSubmittingReservation(false);
    setFormResetVersion((current) => current + 1);
  }

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow="Cargando agenda"
        title="Estamos cargando la agenda de reservas."
        description="Preparamos una experiencia más fluida para elegir servicio, profesional y horario."
      />
    );
  }

  if (!data || error) {
    return <PageErrorState />;
  }

  if (!data.capabilities.bookingEnabled) {
    return (
      <Layout site={data}>
        <main className="mx-auto max-w-4xl px-6 py-10">
          <section className="rounded-3xl bg-white p-8 shadow-sm">
            <h1 className="font-serif text-4xl text-slate-900">Reservas no disponibles</h1>
            <p className="mt-3 text-slate-600">
              Este sitio está en un plan que no incluye reservas online. Usa los datos de contacto o WhatsApp para agendar.
            </p>
          </section>
        </main>
      </Layout>
    );
  }

  async function loadAvailability() {
    if (availabilityLockRef.current) {
      return;
    }

    if (!selectedServiceId || !selectedStaffId || !selectedDate) {
      setAvailabilityMessage('Selecciona servicio, profesional y fecha para consultar horarios.');
      return;
    }

    try {
      availabilityLockRef.current = true;
      setAvailabilityLoading(true);
      const nextSlots = await getAvailability(selectedServiceId, selectedDate, selectedStaffId);
      setSlots(nextSlots);
      setSelectedSlot('');
      setAvailabilityMessage(
        nextSlots.filter((slot) => slot.available).length === 0
          ? 'No existen horarios disponibles para la fecha seleccionada. Prueba con otro día o profesional.'
          : null,
      );
    } catch (err) {
      setSlots([]);
      setSelectedSlot('');
      setAvailabilityMessage(null);
      emitPublicNotification(err instanceof Error ? err.message : 'No se pudo consultar la disponibilidad.', 'error');
    } finally {
      availabilityLockRef.current = false;
      setAvailabilityLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) {
      return;
    }

    const form = new FormData(event.currentTarget);

    if (!selectedServiceId || !selectedStaffId || !selectedSlot) {
      emitPublicNotification('Completa servicio, profesional y horario antes de confirmar.', 'info');
      return;
    }

    try {
      submitLockRef.current = true;
      setSubmittingReservation(true);
      await createAppointment({
        serviceId: selectedServiceId,
        staffId: selectedSlotData?.staffId ?? selectedStaffId,
        startDateTime: selectedSlotData?.start ?? selectedSlot,
        customer: {
          fullName: String(form.get('fullName') ?? ''),
          email: String(form.get('email') ?? ''),
          phone: String(form.get('phone') ?? ''),
        },
        notes: String(form.get('notes') ?? ''),
      });

      resetBookingFlow();
      emitPublicNotification('Reserva creada correctamente.', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la reserva.';
      if (message.toLowerCase().includes('ya no está disponible')) {
        setSelectedSlot('');
        emitPublicNotification('Ese horario acaba de ocuparse. Actualizamos la agenda para que elijas otro.', 'info');
        await loadAvailability();
      } else {
        emitPublicNotification(message, 'error');
      }
    } finally {
      submitLockRef.current = false;
      setSubmittingReservation(false);
    }
  }

  return (
    <Layout site={data}>
      <main className="mx-auto grid max-w-7xl items-start gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] bg-white p-8 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">Reserva online</p>
            <h1 className="mt-3 font-serif text-4xl text-slate-900">Agenda tu cita paso a paso</h1>
            <p className="mt-3 text-slate-600">
              Elige primero el servicio, luego el profesional disponible para ese servicio y finalmente la fecha y hora que mejor se adapte.
            </p>
          </div>

          <form key={formResetVersion} ref={formRef} className="mt-8 grid gap-8" onSubmit={handleSubmit}>
            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">1</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Selecciona un servicio</h2>
                  <p className="text-sm text-slate-500">Este catálogo es general para el tenant.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.services.map((service) => {
                  const isSelected = service.id === selectedServiceId;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      className={`rounded-[1.5rem] border p-5 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-white'}`}
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setSelectedStaffId('');
                        setSelectedDate('');
                        setSelectedSlot('');
                        setSlots([]);
                        setAvailabilityMessage(null);
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold">{service.name}</p>
                          <p className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>{service.description}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isSelected ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {service.durationMinutes} min
                        </span>
                      </div>
                      <div className={`mt-4 text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {formatCurrency(service.price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">2</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Elige un profesional</h2>
                  <p className="text-sm text-slate-500">Solo se muestran profesionales que pueden realizar el servicio elegido.</p>
                </div>
              </div>
              {!selectedServiceId ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  Selecciona primero un servicio para ver los profesionales compatibles.
                </div>
              ) : compatibleStaff.length === 0 ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  No hay profesionales activos asignados a este servicio todavía.
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {compatibleStaff.map((member) => {
                    const isSelected = member.id === selectedStaffId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`flex items-start gap-4 rounded-[1.5rem] border p-4 text-left transition ${isSelected ? 'border-slate-900 bg-slate-900 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50'}`}
                        onClick={() => {
                          setSelectedStaffId(member.id);
                          setSelectedDate('');
                          setSelectedSlot('');
                          setSlots([]);
                          setAvailabilityMessage(null);
                        }}
                      >
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-semibold ${isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'}`}>
                            {member.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold">{member.name}</p>
                          <p className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>{member.bio ?? 'Profesional disponible para esta línea de atención.'}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">3</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Escoge fecha y hora</h2>
                  <p className="text-sm text-slate-500">Consulta la agenda disponible del profesional seleccionado.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.7fr_0.3fr]">
                <input
                  type="date"
                  name={`booking-date-${formResetVersion}`}
                  autoComplete="off"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  value={selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setSelectedSlot('');
                    setSlots([]);
                    setAvailabilityMessage(null);
                  }}
                />
                <button
                  type="button"
                  className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition ${availabilityLoading || !selectedServiceId || !selectedStaffId || !selectedDate ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'}`}
                  onClick={loadAvailability}
                  disabled={availabilityLoading || !selectedServiceId || !selectedStaffId || !selectedDate}
                >
                  {availabilityLoading ? 'Consultando...' : 'Consultar horarios'}
                </button>
              </div>

              {slots.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {slots.map((slot) => {
                    const slotValue = getSlotSelectionValue(slot);
                    const isSelected = selectedSlot === slotValue;
                    const isDisabled = !slot.available;
                    return (
                      <label
                        key={slotValue}
                        className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                          isDisabled
                            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                            : isSelected
                              ? 'cursor-pointer border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary) 10%,white)]'
                              : 'cursor-pointer border-slate-200 bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="slot"
                          value={slotValue}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={(event) => setSelectedSlot(event.target.value)}
                        />
                        <div>
                          <p className={`font-medium ${isDisabled ? 'text-slate-500' : 'text-slate-900'}`}>{formatDateTime(slot.start)}</p>
                          <p className={`text-sm ${isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                            {slot.staffName ?? selectedStaff?.name ?? 'Profesional seleccionado'}
                          </p>
                          {isDisabled && slot.unavailableReason ? (
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                              {slot.unavailableReason}
                            </p>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              {availabilityMessage ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {availabilityMessage}
                </div>
              ) : null}
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">4</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Confirma tus datos</h2>
                  <p className="text-sm text-slate-500">Estos datos se usarán para crear y dar seguimiento a tu reserva.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input name="fullName" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Nombre completo" />
                <input name="phone" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Teléfono" />
              </div>
              <input name="email" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Correo electrónico" />
              <textarea name="notes" className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3" placeholder="Notas adicionales" />

              <button
                type="submit"
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition ${submittingReservation || !selectedServiceId || !selectedStaffId || !selectedSlot ? 'cursor-not-allowed bg-[color-mix(in_srgb,var(--primary) 45%,#cbd5e1)]' : 'bg-[var(--primary)] hover:opacity-90'}`}
                disabled={submittingReservation || !selectedServiceId || !selectedStaffId || !selectedSlot}
              >
                {submittingReservation ? 'Registrando...' : 'Confirmar reserva'}
              </button>
            </section>
          </form>

            </section>

        <aside className="space-y-6 md:sticky md:top-24">
          <section className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-sm">
            <h2 className="font-serif text-3xl">Resumen de tu reserva</h2>
            <div className="mt-6 grid gap-4 text-sm text-white/80">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Servicio</p>
                <p className="mt-2 text-base text-white">{selectedService?.name ?? 'No seleccionado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Profesional</p>
                <p className="mt-2 text-base text-white">{selectedStaff?.name ?? selectedSlotData?.staffName ?? 'No seleccionado'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Fecha y hora</p>
                <p className="mt-2 text-base text-white">{selectedSlot ? formatDateTime(selectedSlot) : 'No seleccionada'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Duración</p>
                <p className="mt-2 text-base text-white">{selectedService ? `${selectedService.durationMinutes} min` : 'No definida'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Valor referencial</p>
                <p className="mt-2 text-base text-white">{selectedService ? formatCurrency(selectedService.price) : 'No definido'}</p>
              </div>
            </div>
          </section>

          {selectedStaff ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">Profesional seleccionado</p>
              <div className="mt-4 flex items-start gap-4">
                {selectedStaff.avatarUrl ? (
                  <img
                    src={selectedStaff.avatarUrl}
                    alt={selectedStaff.name}
                    className="h-24 w-24 rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-slate-100 text-2xl font-semibold text-slate-700">
                    {selectedStaff.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedStaff.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {selectedStaff.bio ?? 'Profesional disponible para atender este servicio.'}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </main>
    </Layout>
  );
}
