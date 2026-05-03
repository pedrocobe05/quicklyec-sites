import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { PageErrorState } from '../components/PageErrorState';
import { PageLoadingShell } from '../components/PageLoadingShell';
import { createAppointment, getAvailability, preparePayphonePayment, resolvePublicAppOrigin } from '../lib/api';
import { isPlausiblePayphoneE164, mountPayphonePaymentBox, normalizePayphonePhoneNumber } from '../lib/payphone-box-sdk';
import { useSiteConfig } from '../lib/useSiteConfig';
import { getLocalizedPath, usePublicCopy, usePublicLanguage } from '../lib/public-language';
import { emitPublicNotification } from '../shared/notifications/notifications';

const PAYPHONE_BOOKING_BOX_ID = 'pp-booking-payphone-box';

type CountryDialCodeOption = {
  iso2: string;
  dialCode: string;
  nameEs: string;
  nameEn: string;
};

const COUNTRY_DIAL_CODE_OPTIONS: CountryDialCodeOption[] = [
  { iso2: 'EC', dialCode: '+593', nameEs: 'Ecuador', nameEn: 'Ecuador' },
  { iso2: 'US', dialCode: '+1', nameEs: 'Estados Unidos', nameEn: 'United States' },
  { iso2: 'CA', dialCode: '+1', nameEs: 'Canadá', nameEn: 'Canada' },
  { iso2: 'MX', dialCode: '+52', nameEs: 'México', nameEn: 'Mexico' },
  { iso2: 'CO', dialCode: '+57', nameEs: 'Colombia', nameEn: 'Colombia' },
  { iso2: 'PE', dialCode: '+51', nameEs: 'Perú', nameEn: 'Peru' },
  { iso2: 'CL', dialCode: '+56', nameEs: 'Chile', nameEn: 'Chile' },
  { iso2: 'AR', dialCode: '+54', nameEs: 'Argentina', nameEn: 'Argentina' },
  { iso2: 'BO', dialCode: '+591', nameEs: 'Bolivia', nameEn: 'Bolivia' },
  { iso2: 'BR', dialCode: '+55', nameEs: 'Brasil', nameEn: 'Brazil' },
  { iso2: 'UY', dialCode: '+598', nameEs: 'Uruguay', nameEn: 'Uruguay' },
  { iso2: 'PY', dialCode: '+595', nameEs: 'Paraguay', nameEn: 'Paraguay' },
  { iso2: 'VE', dialCode: '+58', nameEs: 'Venezuela', nameEn: 'Venezuela' },
  { iso2: 'PA', dialCode: '+507', nameEs: 'Panamá', nameEn: 'Panama' },
  { iso2: 'CR', dialCode: '+506', nameEs: 'Costa Rica', nameEn: 'Costa Rica' },
  { iso2: 'GT', dialCode: '+502', nameEs: 'Guatemala', nameEn: 'Guatemala' },
  { iso2: 'SV', dialCode: '+503', nameEs: 'El Salvador', nameEn: 'El Salvador' },
  { iso2: 'HN', dialCode: '+504', nameEs: 'Honduras', nameEn: 'Honduras' },
  { iso2: 'NI', dialCode: '+505', nameEs: 'Nicaragua', nameEn: 'Nicaragua' },
  { iso2: 'DO', dialCode: '+1', nameEs: 'República Dominicana', nameEn: 'Dominican Republic' },
  { iso2: 'ES', dialCode: '+34', nameEs: 'España', nameEn: 'Spain' },
  { iso2: 'IT', dialCode: '+39', nameEs: 'Italia', nameEn: 'Italy' },
  { iso2: 'FR', dialCode: '+33', nameEs: 'Francia', nameEn: 'France' },
  { iso2: 'DE', dialCode: '+49', nameEs: 'Alemania', nameEn: 'Germany' },
  { iso2: 'GB', dialCode: '+44', nameEs: 'Reino Unido', nameEn: 'United Kingdom' },
];

function flagEmojiFromIso2(iso2: string) {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function normalizeSearchableText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDisplayCountryName(option: CountryDialCodeOption, language: 'es' | 'en') {
  return language === 'en' ? option.nameEn : option.nameEs;
}

function buildPhonePayload(dialCode: string, localPhone: string) {
  const normalizedDialCode = dialCode.trim().startsWith('+') ? dialCode.trim() : `+${dialCode.trim()}`;
  const localDigits = localPhone.replace(/\D/g, '').replace(/^0+/, '');
  if (!localDigits) {
    return '';
  }
  return `${normalizedDialCode}${localDigits}`;
}

function formatCurrency(value?: number | null, language: 'es' | 'en' = 'es') {
  if (value == null) {
    return language === 'en' ? 'Check price' : 'Consultar precio';
  }

  return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-EC', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string, language: 'es' | 'en' = 'es') {
  return new Date(value).toLocaleString(language === 'en' ? 'en-US' : 'es-EC', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getSlotSelectionValue(slot: {
  start: string;
  staffId?: string | null;
}) {
  return `${slot.start}::${slot.staffId ?? 'unassigned'}`;
}

function getPaymentMethodLabel(method: string, language: 'es' | 'en') {
  const labels: Record<string, Record<'es' | 'en', string>> = {
    cash: { es: 'Efectivo', en: 'Cash' },
    transfer: { es: 'Transferencia', en: 'Bank transfer' },
    payphone: { es: 'Payphone', en: 'Payphone' },
  };

  return labels[method]?.[language] ?? (language === 'en' ? 'Payment method' : 'Método de pago');
}

export function BookingPage() {
  const { data, loading, error } = useSiteConfig('/');
  const copy = usePublicCopy();
  const { language } = usePublicLanguage();
  const navigate = useNavigate();
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'transfer' | 'payphone'>('cash');
  const [selectedCountryDialCode, setSelectedCountryDialCode] = useState('+593');
  const [countrySearchOpen, setCountrySearchOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submittingReservation, setSubmittingReservation] = useState(false);
  const [payphoneBoxSession, setPayphoneBoxSession] = useState<{
    clientTransactionId: string;
    token: string;
    storeId: string;
    amount: number;
    currency: string;
    reference: string;
    email: string;
    phoneNumber: string;
  } | null>(null);
  const availabilityLockRef = useRef(false);
  const submitLockRef = useRef(false);
  const payphoneBoxAnchorRef = useRef<HTMLDivElement | null>(null);
  const serviceSelectRef = useRef<HTMLDivElement | null>(null);
  const countrySelectRef = useRef<HTMLDivElement | null>(null);

  const selectedService = useMemo(
    () => data?.services.find((service) => service.id === selectedServiceId) ?? null,
    [data, selectedServiceId],
  );
  const filteredServices = useMemo(() => {
    const query = normalizeSearchableText(serviceSearchQuery);
    const source = data?.services ?? [];
    if (!query) {
      return source;
    }

    return source.filter((service) =>
      normalizeSearchableText(`${service.name} ${service.description ?? ''}`).includes(query),
    );
  }, [data?.services, serviceSearchQuery]);
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
  const paymentMethodOptions = useMemo(() => {
    const settings = data?.tenant.paymentMethods;
    const priceOk = Boolean(selectedService?.price && selectedService.price > 0);
    const mode = settings?.payphoneMode ?? 'redirect';
    const box = settings?.payphoneBox;
    const payphoneOk =
      (settings?.payphonePaymentEnabled ?? false) &&
      priceOk &&
      (mode !== 'box' || Boolean(box?.token?.trim() && box?.storeId?.trim()));
    return [
      { value: 'cash' as const, enabled: settings?.cashPaymentEnabled ?? true },
      { value: 'transfer' as const, enabled: settings?.transferPaymentEnabled ?? false },
      { value: 'payphone' as const, enabled: payphoneOk },
    ].filter((option) => option.enabled);
  }, [
    data?.tenant.paymentMethods.cashPaymentEnabled,
    data?.tenant.paymentMethods.payphonePaymentEnabled,
    data?.tenant.paymentMethods.transferPaymentEnabled,
    data?.tenant.paymentMethods.payphoneMode,
    data?.tenant.paymentMethods.payphoneBox,
    selectedService?.price,
  ]);
  const selectedPaymentMethodLabel = useMemo(
    () => getPaymentMethodLabel(selectedPaymentMethod, language),
    [language, selectedPaymentMethod],
  );
  const selectedCountry = useMemo(
    () => COUNTRY_DIAL_CODE_OPTIONS.find((option) => option.dialCode === selectedCountryDialCode) ?? COUNTRY_DIAL_CODE_OPTIONS[0],
    [selectedCountryDialCode],
  );
  const filteredCountryOptions = useMemo(() => {
    const query = normalizeSearchableText(countrySearchQuery);
    if (!query) {
      return COUNTRY_DIAL_CODE_OPTIONS;
    }

    return COUNTRY_DIAL_CODE_OPTIONS.filter((option) => {
      const haystack = normalizeSearchableText(
        `${option.nameEs} ${option.nameEn} ${option.iso2} ${option.dialCode}`,
      );
      return haystack.includes(query);
    });
  }, [countrySearchQuery]);
  const phonePayloadValue = useMemo(
    () => buildPhonePayload(selectedCountryDialCode, localPhone),
    [selectedCountryDialCode, localPhone],
  );

  useEffect(() => {
    if (paymentMethodOptions.length === 0) {
      return;
    }

    if (!paymentMethodOptions.some((option) => option.value === selectedPaymentMethod)) {
      setSelectedPaymentMethod(paymentMethodOptions[0].value);
    }
  }, [paymentMethodOptions, selectedPaymentMethod]);

  useEffect(() => {
    setPayphoneBoxSession(null);
  }, [selectedServiceId, selectedStaffId, selectedDate, selectedSlot, selectedPaymentMethod]);

  useEffect(() => {
    if (!countrySearchOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!countrySelectRef.current?.contains(event.target as Node)) {
        setCountrySearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [countrySearchOpen]);

  useEffect(() => {
    if (!serviceSearchOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!serviceSelectRef.current?.contains(event.target as Node)) {
        setServiceSearchOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [serviceSearchOpen]);

  useEffect(() => {
    if (!payphoneBoxSession) {
      return;
    }

    let cancelled = false;
    let destroyBox: (() => void) | undefined;

    mountPayphonePaymentBox({
      containerId: PAYPHONE_BOOKING_BOX_ID,
      token: payphoneBoxSession.token,
      storeId: payphoneBoxSession.storeId,
      clientTransactionId: payphoneBoxSession.clientTransactionId,
      amount: payphoneBoxSession.amount,
      currency: payphoneBoxSession.currency,
      reference: payphoneBoxSession.reference,
      lang: language,
      timeZone: -5,
      email: payphoneBoxSession.email,
      phoneNumber: payphoneBoxSession.phoneNumber,
    })
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        destroyBox = handle.destroy;
        queueMicrotask(() => {
          payphoneBoxAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      })
      .catch((err: Error) => {
        if (!cancelled) {
          emitPublicNotification(err.message || copy.booking.payphoneBoxLoadError, 'error');
          setPayphoneBoxSession(null);
        }
      });

    return () => {
      cancelled = true;
      destroyBox?.();
      const el = document.getElementById(PAYPHONE_BOOKING_BOX_ID);
      if (el) {
        el.innerHTML = '';
      }
    };
  }, [payphoneBoxSession, language, copy.booking.payphoneBoxLoadError]);

  if (loading) {
    return (
      <PageLoadingShell
        eyebrow={copy.booking.loading.eyebrow}
        title={copy.booking.loading.title}
        description={copy.booking.loading.description}
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
            <h1 className="font-serif text-4xl text-slate-900">{copy.booking.notAvailable.title}</h1>
            <p className="mt-3 text-slate-600">{copy.booking.notAvailable.description}</p>
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
      setAvailabilityMessage(copy.booking.selectDatePrompt);
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
          ? copy.booking.noSlots
          : null,
      );
    } catch (err) {
      setSlots([]);
      setSelectedSlot('');
      setAvailabilityMessage(null);
      emitPublicNotification(err instanceof Error ? err.message : copy.booking.availabilityError, 'error');
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

    if (!data) {
      return;
    }

    const form = new FormData(event.currentTarget);

    if (!selectedServiceId || !selectedStaffId || !selectedSlot) {
      emitPublicNotification(copy.booking.confirmPrompt, 'info');
      return;
    }

    try {
      submitLockRef.current = true;
      setSubmittingReservation(true);

      if (selectedPaymentMethod === 'payphone') {
        const pm = data.tenant.paymentMethods;
        if (pm.payphoneMode === 'box' && (!pm.payphoneBox?.token?.trim() || !pm.payphoneBox?.storeId?.trim())) {
          emitPublicNotification(copy.booking.payphoneBoxMisconfigured, 'error');
          return;
        }

        const emailRaw = String(form.get('email') ?? '').trim();
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRaw || !emailPattern.test(emailRaw)) {
          emitPublicNotification(copy.booking.payphoneEmailRequired, 'info');
          return;
        }

        const phoneRaw = String(form.get('phone') ?? '').trim();
        const phoneE164 = normalizePayphonePhoneNumber(phoneRaw);
        if (!phoneRaw) {
          emitPublicNotification(copy.booking.payphonePhoneRequired, 'info');
          return;
        }
        if (!isPlausiblePayphoneE164(phoneE164)) {
          emitPublicNotification(copy.booking.payphonePhoneInvalid, 'info');
          return;
        }

        const appOrigin = resolvePublicAppOrigin();
        const responseUrl = `${appOrigin}/payphone/return`;
        const cancellationUrl = `${appOrigin}/book`;
        const payment = await preparePayphonePayment({
          serviceId: selectedServiceId,
          staffId: selectedSlotData?.staffId ?? selectedStaffId,
          startDateTime: selectedSlotData?.start ?? selectedSlot,
          customer: {
            fullName: String(form.get('fullName') ?? '').trim(),
            email: emailRaw,
            phone: phoneE164,
            notes: String(form.get('notes') ?? '') || undefined,
          },
          notes: String(form.get('notes') ?? ''),
          responseUrl,
          cancellationUrl,
        });

        if (payment.payphoneFlow === 'box') {
          const token = pm.payphoneBox?.token?.trim();
          const storeId = pm.payphoneBox?.storeId?.trim();
          if (!token || !storeId || payment.amount == null) {
            emitPublicNotification(copy.booking.payphoneBoxMisconfigured, 'error');
            return;
          }
          setPayphoneBoxSession({
            clientTransactionId: payment.clientTransactionId,
            token,
            storeId,
            amount: payment.amount,
            currency: payment.currency ?? 'USD',
            reference: payment.reference ?? '',
            email: emailRaw,
            phoneNumber: phoneE164,
          });
          return;
        }

        if (!payment.redirectUrl?.trim()) {
          emitPublicNotification(copy.booking.createError, 'error');
          return;
        }

        window.location.href = payment.redirectUrl;
        return;
      }

      const createdAppointment = await createAppointment({
        serviceId: selectedServiceId,
        staffId: selectedSlotData?.staffId ?? selectedStaffId,
        startDateTime: selectedSlotData?.start ?? selectedSlot,
        paymentMethod: selectedPaymentMethod,
        customer: {
          fullName: String(form.get('fullName') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          phone: String(form.get('phone') ?? '').trim(),
        },
        notes: String(form.get('notes') ?? ''),
      });

      const pendingPath = getLocalizedPath('bookingConfirmation', language);
      navigate(
        `${pendingPath}?method=${encodeURIComponent(selectedPaymentMethod)}&appointmentId=${encodeURIComponent(createdAppointment.id)}`,
        { replace: true },
      );
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.booking.createError;
      if (message.toLowerCase().includes('ya no está disponible')) {
        setSelectedSlot('');
        emitPublicNotification(copy.booking.slotUnavailable, 'info');
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
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">{copy.booking.heroEyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl text-slate-900">{copy.booking.heroTitle}</h1>
            <p className="mt-3 text-slate-600">{copy.booking.heroDescription}</p>
          </div>

          <form className="mt-8 grid gap-8" onSubmit={handleSubmit}>
            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">1</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{copy.booking.stepOne}</h2>
                  <p className="text-sm text-slate-500">{copy.booking.fieldHints.serviceCatalog}</p>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="relative" ref={serviceSelectRef}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-[var(--primary)]"
                    onClick={() => setServiceSearchOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={serviceSearchOpen}
                  >
                    <span className="min-w-0">
                      <span className={selectedService ? 'block truncate font-semibold text-slate-900' : 'block truncate font-semibold text-slate-400'}>
                        {selectedService?.name ?? (language === 'en' ? 'Select a service' : 'Selecciona un servicio')}
                      </span>
                      <span className="mt-1 block truncate text-sm text-slate-500">
                        {selectedService
                          ? `${selectedService.durationMinutes} min · ${formatCurrency(selectedService.price, language)}`
                          : language === 'en'
                            ? 'Search by service name or description.'
                            : 'Busca por nombre o descripción del servicio.'}
                      </span>
                    </span>
                    <span className="ml-4 text-slate-400" aria-hidden="true">{serviceSearchOpen ? '▲' : '▼'}</span>
                  </button>

                  {serviceSearchOpen ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_26px_60px_rgba(15,23,42,0.16)]">
                      <div className="border-b border-slate-100 p-3">
                        <input
                          value={serviceSearchQuery}
                          onChange={(event) => setServiceSearchQuery(event.target.value)}
                          placeholder={language === 'en' ? 'Search service...' : 'Buscar servicio...'}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-72 overflow-y-auto py-2" role="listbox">
                        {filteredServices.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-slate-500">
                            {language === 'en' ? 'No services match your search.' : 'No hay servicios que coincidan con la búsqueda.'}
                          </p>
                        ) : (
                          filteredServices.map((service) => {
                            const isSelected = service.id === selectedServiceId;
                            return (
                              <button
                                key={service.id}
                                type="button"
                                className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50 ${isSelected ? 'bg-[color-mix(in_srgb,var(--primary)_10%,white)]' : ''}`}
                                onClick={() => {
                                  setSelectedServiceId(service.id);
                                  setSelectedStaffId('');
                                  setSelectedDate('');
                                  setSelectedSlot('');
                                  setSlots([]);
                                  setAvailabilityMessage(null);
                                  setServiceSearchOpen(false);
                                  setServiceSearchQuery('');
                                }}
                              >
                                <span className="min-w-0">
                                  <span className="block truncate font-medium text-slate-900">{service.name}</span>
                                  <span className="mt-1 block text-sm text-slate-500">
                                    {service.description?.trim() || (language === 'en' ? 'No description available.' : 'Sin descripción disponible.')}
                                  </span>
                                </span>
                                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  {service.durationMinutes} min
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {selectedService ? (
                  <div className="rounded-[1.5rem] border border-[color-mix(in_srgb,var(--primary)_18%,white)] bg-[color-mix(in_srgb,var(--secondary)_64%,white)] p-5 text-[color-mix(in_srgb,var(--primary)_78%,#0f172a)] shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold">{selectedService.name}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {selectedService.description?.trim() || (language === 'en' ? 'No description available for this service.' : 'Este servicio no tiene una descripción adicional.')}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                        {selectedService.durationMinutes} min
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-700">
                        {formatCurrency(selectedService.price, language)}
                      </p>
                      <button
                        type="button"
                        className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)] transition hover:opacity-80"
                        onClick={() => setServiceSearchOpen(true)}
                      >
                        {language === 'en' ? 'Change service' : 'Cambiar servicio'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    {language === 'en'
                      ? 'Choose a service from the searchable selector to continue with professionals and schedule.'
                      : 'Elige un servicio desde el selector buscable para continuar con profesionales y horarios.'}
                  </div>
                )}
              </div>
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">2</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{copy.booking.stepTwo}</h2>
                  <p className="text-sm text-slate-500">{copy.booking.fieldHints.staffScope}</p>
                </div>
              </div>
              {!selectedServiceId ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                  {copy.booking.selectServicePrompt}
                </div>
              ) : compatibleStaff.length === 0 ? (
                <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  {copy.booking.noStaffPrompt}
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {compatibleStaff.map((member) => {
                    const isSelected = member.id === selectedStaffId;
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className={`flex items-start gap-4 rounded-[1.5rem] border p-4 text-left transition ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)] text-white shadow-lg' : 'border-[color-mix(in_srgb,var(--primary)_18%,white)] bg-white text-[color-mix(in_srgb,var(--primary)_78%,#0f172a)] hover:border-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--secondary)_64%,white)]'}`}
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
                          <p className={`mt-2 text-sm ${isSelected ? 'text-white/80' : 'text-slate-600'}`}>{member.bio ?? copy.booking.selectedProfessionalBody}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">3</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{copy.booking.stepThree}</h2>
                  <p className="text-sm text-slate-500">{copy.booking.fieldHints.availabilityScope}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-[0.7fr_0.3fr]">
                <input
                  type="date"
                  name="booking-date"
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
                  className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition ${availabilityLoading || !selectedServiceId || !selectedStaffId || !selectedDate ? 'cursor-not-allowed bg-[color-mix(in_srgb,var(--primary) 45%,#cbd5e1)]' : 'bg-[var(--primary)] hover:opacity-90'}`}
                  onClick={loadAvailability}
                  disabled={availabilityLoading || !selectedServiceId || !selectedStaffId || !selectedDate}
                >
                  {availabilityLoading ? copy.booking.selectDateButtonLoading : copy.booking.selectDateButton}
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
                            {slot.staffName ?? selectedStaff?.name ?? copy.booking.availableProfessionalFallback}
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
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-semibold text-white">4</span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{copy.booking.stepFour}</h2>
                  <p className="text-sm text-slate-500">{copy.booking.fieldHints.reservationData}</p>
                </div>
              </div>
              <div className="grid gap-5">
                <input
                  name="fullName"
                  className="h-14 rounded-xl border border-slate-200 px-4 text-base"
                  placeholder={copy.booking.fullName}
                />
                <div className="grid gap-2">
                  <div className="grid gap-3 sm:grid-cols-[210px_minmax(0,1fr)]">
                    <div className="relative" ref={countrySelectRef}>
                      <button
                        type="button"
                        className="flex h-14 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-slate-900"
                        onClick={() => setCountrySearchOpen((current) => !current)}
                        aria-haspopup="listbox"
                        aria-expanded={countrySearchOpen}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="text-lg" aria-hidden="true">{flagEmojiFromIso2(selectedCountry.iso2)}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{selectedCountry.dialCode}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {formatDisplayCountryName(selectedCountry, language)}
                            </span>
                          </span>
                        </span>
                        <span className="text-slate-400" aria-hidden="true">▾</span>
                      </button>
                      {countrySearchOpen ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                          <div className="border-b border-slate-100 p-3">
                            <input
                              value={countrySearchQuery}
                              onChange={(event) => setCountrySearchQuery(event.target.value)}
                              placeholder={language === 'en' ? 'Search country or code' : 'Buscar país o código'}
                              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-64 overflow-y-auto py-2" role="listbox">
                            {filteredCountryOptions.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-slate-500">
                                {language === 'en' ? 'No matches found.' : 'No se encontraron coincidencias.'}
                              </p>
                            ) : (
                              filteredCountryOptions.map((option) => (
                                <button
                                  key={`${option.iso2}-${option.dialCode}`}
                                  type="button"
                                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                  onClick={() => {
                                    setSelectedCountryDialCode(option.dialCode);
                                    setCountrySearchQuery('');
                                    setCountrySearchOpen(false);
                                  }}
                                >
                                  <span className="text-lg" aria-hidden="true">{flagEmojiFromIso2(option.iso2)}</span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-slate-900">{formatDisplayCountryName(option, language)}</span>
                                    <span className="block truncate text-xs text-slate-500">{option.dialCode}</span>
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <input
                      name="phoneLocal"
                      className="h-14 rounded-xl border border-slate-200 px-4 text-base"
                      placeholder={language === 'en' ? 'Phone number' : 'Número de teléfono'}
                      value={localPhone}
                      onChange={(event) => setLocalPhone(event.target.value)}
                      inputMode="tel"
                      autoComplete="tel-national"
                    />
                  </div>
                  <p className="px-1 text-xs leading-5 text-slate-500">
                    {language === 'en'
                      ? 'Choose the country code and enter the number without spaces. If it starts with 0, we remove that prefix before sending.'
                      : 'Elige el código de país e ingresa el número sin espacios. Si empieza con 0, quitamos ese prefijo antes de enviarlo.'}
                  </p>
                  <input type="hidden" name="phone" value={phonePayloadValue} />
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  className="h-14 rounded-xl border border-slate-200 px-4 text-base"
                  placeholder={copy.booking.email}
                />
                <textarea
                  name="notes"
                  className="min-h-32 rounded-xl border border-slate-200 px-4 py-4 text-base"
                  placeholder={copy.booking.notes}
                />
              </div>

              <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {language === 'en' ? 'Payment method' : 'Método de pago'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {language === 'en'
                      ? 'Choose how you want to complete this reservation.'
                      : 'Elige cómo deseas completar esta reserva.'}
                  </p>
                </div>
                {paymentMethodOptions.length === 0 ? (
                  <p className="text-sm text-amber-700">
                    {language === 'en'
                      ? 'No payment methods are enabled for this tenant.'
                      : 'No hay métodos de pago habilitados para este tenant.'}
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-3">
                    {paymentMethodOptions.map((option) => {
                      const isSelected = option.value === selectedPaymentMethod;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={`rounded-[1.25rem] border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary) 10%,white)]'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                          onClick={() => setSelectedPaymentMethod(option.value)}
                        >
                          <p className="font-medium text-slate-900">{getPaymentMethodLabel(option.value, language)}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            {isSelected
                              ? language === 'en'
                                ? 'Selected'
                                : 'Seleccionado'
                              : language === 'en'
                                ? 'Tap to choose'
                                : 'Toca para elegir'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {payphoneBoxSession ? (
                <div
                  ref={payphoneBoxAnchorRef}
                  className="grid gap-3 rounded-[1.5rem] border border-[color-mix(in_srgb,var(--primary)_28%,#e2e8f0)] bg-[color-mix(in_srgb,var(--secondary)_40%,white)] p-5"
                >
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.booking.payphoneBoxTitle}</h3>
                    <p className="mt-2 text-sm text-slate-600">{copy.booking.payphoneBoxDescription}</p>
                  </div>
                  <div id={PAYPHONE_BOOKING_BOX_ID} className="min-h-[120px]" />
                </div>
              ) : null}

              <button
                type="submit"
                className={`rounded-full px-5 py-3 text-sm font-semibold text-white transition ${submittingReservation || payphoneBoxSession || !selectedServiceId || !selectedStaffId || !selectedSlot || paymentMethodOptions.length === 0 ? 'cursor-not-allowed bg-[color-mix(in_srgb,var(--primary) 45%,#cbd5e1)]' : 'bg-[var(--primary)] hover:opacity-90'}`}
                disabled={submittingReservation || Boolean(payphoneBoxSession) || !selectedServiceId || !selectedStaffId || !selectedSlot || paymentMethodOptions.length === 0}
              >
                {submittingReservation ? copy.booking.submitButtonLoading : copy.booking.submitButton}
              </button>
            </section>
          </form>

            </section>

        <aside className="space-y-6 md:sticky md:top-24">
          <section className="rounded-[2rem] bg-[linear-gradient(135deg,var(--primary),var(--accent))] p-8 text-white shadow-sm">
            <h2 className="font-serif text-3xl">{copy.booking.summaryTitle}</h2>
            <div className="mt-6 grid gap-4 text-sm text-white/80">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">{copy.booking.summaryService}</p>
                <p className="mt-2 text-base text-white">{selectedService?.name ?? copy.booking.selectedServiceFallback}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">{copy.booking.summaryProfessional}</p>
                <p className="mt-2 text-base text-white">{selectedStaff?.name ?? selectedSlotData?.staffName ?? copy.booking.selectedProfessionalFallback}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">{copy.booking.summaryDateTime}</p>
                <p className="mt-2 text-base text-white">{selectedSlot ? formatDateTime(selectedSlot, language) : copy.booking.notSelected}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">{copy.booking.summaryDuration}</p>
                <p className="mt-2 text-base text-white">{selectedService ? `${selectedService.durationMinutes} min` : copy.booking.notDefined}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">{copy.booking.summaryPrice}</p>
                <p className="mt-2 text-base text-white">{selectedService ? formatCurrency(selectedService.price, language) : copy.booking.notDefined}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">
                  {language === 'en' ? 'Payment method' : 'Método de pago'}
                </p>
                <p className="mt-2 text-base text-white">{selectedPaymentMethodLabel}</p>
              </div>
            </div>
          </section>

          {selectedStaff ? (
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent)]">{copy.booking.selectedProfessional}</p>
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
                    {selectedStaff.bio ?? copy.booking.selectedProfessionalBody}
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
