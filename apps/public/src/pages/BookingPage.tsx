import { FormEvent, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { createAppointment, getAvailability } from '../lib/api';
import { useSiteConfig } from '../lib/useSiteConfig';

export function BookingPage() {
  const { data, loading, error } = useSiteConfig('/');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{ start: string; end: string; staffId?: string | null }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const selectedService = useMemo(
    () => data?.services.find((service) => service.id === selectedServiceId),
    [data, selectedServiceId],
  );

  if (loading) return <div className="p-10 text-slate-600">Cargando agenda...</div>;
  if (!data || error) return <div className="p-10 text-red-600">{error}</div>;
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
    if (!selectedServiceId || !selectedDate) {
      return;
    }
    const availableSlots = await getAvailability(selectedServiceId, selectedDate);
    setSlots(availableSlots);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!selectedSlot) {
      setMessage('Selecciona un horario disponible.');
      return;
    }

    await createAppointment({
      serviceId: selectedServiceId,
      startDateTime: selectedSlot,
      customer: {
        fullName: String(form.get('fullName') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
      },
      notes: String(form.get('notes') ?? ''),
    });

    setMessage('Reserva creada correctamente.');
  }

  return (
    <Layout site={data}>
      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="font-serif text-4xl text-slate-900">Reservar cita</h1>
          <p className="mt-3 text-slate-600">Selecciona un servicio, revisa horarios y confirma tu reserva.</p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3"
              value={selectedServiceId}
              onChange={(event) => setSelectedServiceId(event.target.value)}
            >
              <option value="">Selecciona un servicio</option>
              {data.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="rounded-2xl border border-slate-200 px-4 py-3"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />

            <button
              type="button"
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
              onClick={loadAvailability}
            >
              Consultar disponibilidad
            </button>

            {slots.length > 0 ? (
              <div className="grid gap-2 rounded-3xl bg-slate-50 p-4">
                {slots.map((slot) => (
                  <label key={slot.start} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                    <input
                      type="radio"
                      name="slot"
                      value={slot.start}
                      checked={selectedSlot === slot.start}
                      onChange={(event) => setSelectedSlot(event.target.value)}
                    />
                    <span>{new Date(slot.start).toLocaleString()}</span>
                  </label>
                ))}
              </div>
            ) : null}

            <input name="fullName" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Nombre completo" />
            <input name="email" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Email" />
            <input name="phone" className="rounded-2xl border border-slate-200 px-4 py-3" placeholder="Teléfono" />
            <textarea name="notes" className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3" placeholder="Notas" />

            <button type="submit" className="rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white">
              Confirmar reserva
            </button>
          </form>

          {message ? <p className="mt-4 text-sm text-slate-700">{message}</p> : null}
        </section>

        <aside className="rounded-3xl bg-slate-900 p-8 text-white shadow-sm">
          <h2 className="font-serif text-3xl">Resumen</h2>
          <div className="mt-6 grid gap-3 text-sm text-white/80">
            <p>Servicio: {selectedService?.name ?? 'No seleccionado'}</p>
            <p>Fecha: {selectedDate || 'No seleccionada'}</p>
            <p>Horario: {selectedSlot ? new Date(selectedSlot).toLocaleString() : 'No seleccionado'}</p>
          </div>
        </aside>
      </main>
    </Layout>
  );
}
