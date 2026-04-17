import { useSyncExternalStore } from 'react';

export type PublicLanguage = 'es' | 'en';
export type PublicLanguagePreference = PublicLanguage | 'auto';

export type PublicCopy = {
  languageSelector: {
    label: string;
    auto: string;
    english: string;
    spanish: string;
  };
  menu: {
    open: string;
    close: string;
  };
  nav: {
    home: string;
    services: string;
    booking: string;
    contact: string;
  };
  shell: {
    loading: {
      eyebrow: string;
      title: string;
      description: string;
    };
    error: {
      eyebrow: string;
      title: string;
      description: string;
    };
  };
  layout: {
    bookingEnabled: string;
    informationalSite: string;
    headerLabel: string;
    footerNavigation: string;
    footerDetails: string;
  };
  template: {
    heroTitle: string;
    experienceLabel: string;
    experienceTitle: string;
    experienceBody: string;
    aboutKicker: string;
    aboutTitle: string;
    servicesTitle: string;
    galleryTitle: string;
    galleryItemFallback: string;
    testimonialsTitle: string;
    bookingTitle: string;
    bookingBody: string;
    bookingAction: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone: string;
    contactWhatsapp: string;
    whatsappCta: string;
    poweredBy: string;
  };
  home: {
    loading: {
      eyebrow: string;
      title: string;
      description: string;
    };
  };
  services: {
    loading: {
      eyebrow: string;
      title: string;
      description: string;
    };
    eyebrow: string;
    title: string;
    serviceLabel: string;
    priceLabel: string;
    priceFallback: string;
  };
  contact: {
    loading: {
      eyebrow: string;
      title: string;
      description: string;
    };
    eyebrow: string;
    title: string;
    body: string;
    channels: string;
    email: string;
    phone: string;
    whatsapp: string;
  };
  booking: {
    loading: {
      eyebrow: string;
      title: string;
      description: string;
    };
    notAvailable: {
      title: string;
      description: string;
    };
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    stepOne: string;
    stepOneHint: string;
    stepTwo: string;
    stepTwoHint: string;
    stepThree: string;
    stepThreeHint: string;
    stepFour: string;
    stepFourHint: string;
    selectServicePrompt: string;
    noStaffPrompt: string;
    selectDatePrompt: string;
    selectDateButton: string;
    selectDateButtonLoading: string;
    noSlots: string;
    availabilityPrompt: string;
    availabilityError: string;
    createError: string;
    fullName: string;
    phone: string;
    email: string;
    notes: string;
    submitButton: string;
    submitButtonLoading: string;
    confirmPrompt: string;
    summaryTitle: string;
    summaryService: string;
    summaryProfessional: string;
    summaryDateTime: string;
    summaryDuration: string;
    summaryPrice: string;
    selectedProfessional: string;
    selectedProfessionalBody: string;
    selectedServiceFallback: string;
    selectedProfessionalFallback: string;
    notSelected: string;
    notDefined: string;
    availableProfessionalFallback: string;
    availabilityUnavailableReason: string;
    createdSuccess: string;
    slotUnavailable: string;
    updateAvailability: string;
    chooseAnotherDay: string;
    payphoneEmailRequired: string;
    payphonePhoneRequired: string;
    payphonePhoneInvalid: string;
    payphoneBoxTitle: string;
    payphoneBoxDescription: string;
    payphoneBoxMisconfigured: string;
    payphoneBoxLoadError: string;
    fieldHints: {
      serviceCatalog: string;
      staffScope: string;
      availabilityScope: string;
      reservationData: string;
    };
  };
  api: {
    requestFailed: string;
    connectionFailed: string;
    notificationFallback: string;
  };
  payphoneReturn: {
    eyebrow: string;
    titleApproved: string;
    titleCancelled: string;
    titleLoading: string;
    titleFailed: string;
    descriptionLoading: string;
    descriptionApproved: string;
    descriptionCancelled: string;
    descriptionFailed: string;
    parametersMissing: string;
    parametersMissingHint: string;
    bookingReferenceLabel: string;
    verifyingPayment: string;
    verifyingPaymentHint: string;
    payphoneNotConfigured: string;
    payphoneDirectFailed: string;
    backToBooking: string;
    goHome: string;
  };
  bookingPending: {
    eyebrow: string;
    title: string;
    description: string;
    pendingLabel: string;
    cashHint: string;
    transferHint: string;
    bookingReferenceLabel: string;
    backToBooking: string;
    goHome: string;
  };
};

const LANGUAGE_STORAGE_KEY = 'quickly-sites.public-language';

const LANGUAGE_SUBSCRIBERS = new Set<() => void>();
let currentLanguage: PublicLanguage = 'es';
if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es') {
      currentLanguage = stored;
    }
  } catch {
    // Ignore storage failures and keep the default language.
  }
}

function emitLanguageChange() {
  LANGUAGE_SUBSCRIBERS.forEach((listener) => listener());
}

export function normalizePublicLanguage(value?: string | null): PublicLanguage {
  const normalized = String(value ?? '').toLowerCase().trim();
  if (normalized.startsWith('en')) {
    return 'en';
  }
  return 'es';
}

export function setPublicLanguage(language: PublicLanguage) {
  if (currentLanguage === language) {
    return;
  }

  currentLanguage = language;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore storage failures.
    }
  }
  emitLanguageChange();
}

function readStoredLanguage(): PublicLanguage {
  if (typeof window === 'undefined') {
    return currentLanguage;
  }

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es') {
      return stored;
    }
  } catch {
    return currentLanguage;
  }

  return currentLanguage;
}

function subscribeLanguage(listener: () => void) {
  LANGUAGE_SUBSCRIBERS.add(listener);
  return () => {
    LANGUAGE_SUBSCRIBERS.delete(listener);
  };
}

export function resolvePreferredPublicLanguage() {
  return readStoredLanguage();
}

const COPY: Record<PublicLanguage, PublicCopy> = {
  es: {
    languageSelector: {
      label: 'Idioma',
      auto: 'Auto',
      english: 'Inglés',
      spanish: 'Español',
    },
    menu: {
      open: 'Abrir menú',
      close: 'Cerrar menú',
    },
    nav: {
      home: 'Inicio',
      services: 'Servicios',
      booking: 'Reservar',
      contact: 'Contacto',
    },
    shell: {
      loading: {
        eyebrow: 'Cargando sitio',
        title: 'Preparando una experiencia visual más suave y continua.',
        description: 'Estamos cargando las secciones, estilos y contenido del sitio para que la transición se sienta natural.',
      },
      error: {
        eyebrow: 'Temporalmente no disponible',
        title: 'No pudimos cargar esta vista.',
        description: 'Intenta recargar en unos segundos.',
      },
    },
    layout: {
      bookingEnabled: 'Sitio y reservas online',
      informationalSite: 'Sitio informativo del negocio',
      headerLabel: 'Selector de idioma',
      footerNavigation: 'Navegación',
      footerDetails: 'Detalles',
    },
    template: {
      heroTitle: 'Una presencia digital diseñada para destacar tu marca',
      experienceLabel: 'Experiencia',
      experienceTitle: 'Diseño editorial y experiencia premium.',
      experienceBody: 'Presentación visual pensada para marcas que quieren verse cuidadas, coherentes y memorables desde el primer contacto.',
      aboutKicker: 'Nosotros',
      aboutTitle: 'Sobre la marca',
      servicesTitle: 'Servicios',
      galleryTitle: 'Galería',
      galleryItemFallback: 'Imagen',
      testimonialsTitle: 'Testimonios',
      bookingTitle: 'Agenda tu cita online',
      bookingBody: 'Selecciona tu servicio, revisa disponibilidad y confirma la reserva en pocos pasos.',
      bookingAction: 'Reservar ahora',
      contactTitle: 'Contacto',
      contactEmail: 'Correo',
      contactPhone: 'Teléfono',
      contactWhatsapp: 'WhatsApp',
      whatsappCta: 'Escríbenos por WhatsApp',
      poweredBy: 'Desarrollado por Quickly Sites',
    },
    home: {
      loading: {
        eyebrow: 'Cargando sitio',
        title: 'Estamos preparando tu sitio.',
        description: 'Cargamos las secciones y estilos para que puedas explorar la experiencia completa.',
      },
    },
    services: {
      loading: {
        eyebrow: 'Cargando servicios',
        title: 'Estamos preparando el catálogo con una transición más agradable.',
        description: 'Se están cargando los bloques, tarjetas y contenido para que el cambio de página no se sienta abrupto.',
      },
      eyebrow: 'Servicios disponibles',
      title: 'Explora la oferta disponible y encuentra la atención que necesitas.',
      serviceLabel: 'Servicio',
      priceLabel: 'Consultar precio',
      priceFallback: 'Consultar precio',
    },
    contact: {
      loading: {
        eyebrow: 'Cargando contacto',
        title: 'Estamos preparando los canales de atención y los bloques editoriales.',
        description: 'La vista se está montando con una transición más suave para que la experiencia se sienta continua.',
      },
      eyebrow: 'Contacto',
      title: 'Conversemos sobre tu próxima cita.',
      body: 'Este bloque de demo muestra cómo una marca puede presentar sus canales de contacto de forma cálida, profesional y ordenada.',
      channels: 'Canales disponibles',
      email: 'Correo',
      phone: 'Teléfono',
      whatsapp: 'WhatsApp',
    },
    booking: {
      loading: {
        eyebrow: 'Cargando agenda',
        title: 'Estamos cargando la agenda de reservas.',
        description: 'Preparamos una experiencia más fluida para elegir servicio, profesional y horario.',
      },
      notAvailable: {
        title: 'Reservas no disponibles',
        description: 'Este sitio está en un plan que no incluye reservas online. Usa los datos de contacto o WhatsApp para agendar.',
      },
      heroEyebrow: 'Reserva online',
      heroTitle: 'Agenda tu cita paso a paso',
      heroDescription: 'Elige primero el servicio, luego el profesional disponible para ese servicio y finalmente la fecha y hora que mejor se adapte.',
      stepOne: 'Selecciona un servicio',
      stepOneHint: 'Este catálogo es general para el tenant.',
      stepTwo: 'Elige un profesional',
      stepTwoHint: 'Solo se muestran profesionales que pueden realizar el servicio elegido.',
      stepThree: 'Escoge fecha y hora',
      stepThreeHint: 'Consulta la agenda disponible del profesional seleccionado.',
      stepFour: 'Confirma tus datos',
      stepFourHint: 'Estos datos se usarán para crear y dar seguimiento a tu reserva.',
      selectServicePrompt: 'Selecciona primero un servicio para ver los profesionales compatibles.',
      noStaffPrompt: 'No hay profesionales activos asignados a este servicio todavía.',
      selectDatePrompt: 'Selecciona servicio, profesional y fecha para consultar horarios.',
      selectDateButton: 'Consultar horarios',
      selectDateButtonLoading: 'Consultando...',
      noSlots: 'No existen horarios disponibles para la fecha seleccionada. Prueba con otro día o profesional.',
      availabilityPrompt: 'Consulta la agenda disponible del profesional seleccionado.',
      availabilityError: 'No se pudo consultar la disponibilidad.',
      createError: 'No se pudo crear la reserva.',
      fullName: 'Nombre completo',
      phone: 'Teléfono',
      email: 'Correo electrónico',
      notes: 'Notas adicionales',
      submitButton: 'Confirmar reserva',
      submitButtonLoading: 'Registrando...',
      confirmPrompt: 'Completa servicio, profesional y horario antes de confirmar.',
      summaryTitle: 'Resumen de tu reserva',
      summaryService: 'Servicio',
      summaryProfessional: 'Profesional',
      summaryDateTime: 'Fecha y hora',
      summaryDuration: 'Duración',
      summaryPrice: 'Valor referencial',
      selectedProfessional: 'Profesional seleccionado',
      selectedProfessionalBody: 'Profesional disponible para atender este servicio.',
      selectedServiceFallback: 'No seleccionado',
      selectedProfessionalFallback: 'No seleccionado',
      notSelected: 'No seleccionada',
      notDefined: 'No definido',
      availableProfessionalFallback: 'Profesional seleccionado',
      availabilityUnavailableReason: 'No disponible',
      createdSuccess: 'Reserva creada correctamente.',
      slotUnavailable: 'Ese horario acaba de ocuparse. Actualizamos la agenda para que elijas otro.',
      updateAvailability: 'No hay horarios disponibles para la fecha seleccionada. Prueba con otro día o profesional.',
      chooseAnotherDay: 'Selecciona otro día o profesional.',
      payphoneEmailRequired: 'Para pagar con Payphone indica un correo electrónico válido.',
      payphonePhoneRequired: 'Para pagar con Payphone indica un número de teléfono válido (por ejemplo 0991234567 o +593991234567).',
      payphonePhoneInvalid: 'El teléfono no tiene un formato válido para Payphone. Usa celular Ecuador (09… o +593…) u otro número en formato internacional con prefijo +.',
      payphoneBoxTitle: 'Pago con Payphone',
      payphoneBoxDescription: 'Completa el pago en la cajita siguiente. Al finalizar, te indicaremos el resultado.',
      payphoneBoxMisconfigured: 'Payphone (cajita) no está configurado: faltan token o Store ID en el panel.',
      payphoneBoxLoadError: 'No se pudo cargar el formulario de pago Payphone. Recarga la página e inténtalo de nuevo.',
      fieldHints: {
        serviceCatalog: 'Este catálogo es general para el tenant.',
        staffScope: 'Solo se muestran profesionales que pueden realizar el servicio elegido.',
        availabilityScope: 'Consulta la agenda disponible del profesional seleccionado.',
        reservationData: 'Estos datos se usarán para crear y dar seguimiento a tu reserva.',
      },
    },
    api: {
      requestFailed: 'No se pudo completar la solicitud',
      connectionFailed: 'No se pudo establecer conexión con el servidor.',
      notificationFallback: 'No se pudo completar la acción.',
    },
    payphoneReturn: {
      eyebrow: 'Payphone',
      titleApproved: '¡Gracias por tu pago!',
      titleCancelled: 'Pago cancelado',
      titleLoading: 'Confirmando pago',
      titleFailed: 'No se pudo confirmar el pago',
      descriptionLoading: 'Estamos validando la transacción...',
      descriptionApproved:
        'Tu reserva quedó confirmada automáticamente. Te esperamos en la fecha y hora que elegiste.',
      descriptionCancelled: 'El pago fue cancelado o no se aprobó a tiempo.',
      descriptionFailed: 'No se pudo confirmar el pago.',
      parametersMissing: 'No se recibieron en la URL los parámetros que envía Payphone al volver (se esperan id y clientTransactionId).',
      parametersMissingHint:
        'Esta ruta (/payphone/return) sí existe: si el pago se completó pero falla aquí, el problema suele ser la confirmación con el servidor de Payphone (token, ambiente pruebas/producción o parámetros en la URL), no una página 404.',
      bookingReferenceLabel: 'Referencia de reserva',
      verifyingPayment: 'Verificando el pago',
      verifyingPaymentHint: 'No cierres esta ventana ni actualices la página.',
      payphoneNotConfigured:
        'Payphone no está disponible en este sitio (falta token o Store ID en la configuración).',
      payphoneDirectFailed: 'Payphone no devolvió un JSON válido al confirmar el pago.',
      backToBooking: 'Volver a reservar',
      goHome: 'Ir al inicio',
    },
    bookingPending: {
      eyebrow: 'Reserva',
      title: 'Gracias por tu reserva',
      description: 'Tu reserva fue registrada. Quedará pendiente hasta que el pago sea verificado.',
      pendingLabel: 'Pendiente de verificación de pago',
      cashHint: 'Si elegiste efectivo, completa el pago directamente con el negocio.',
      transferHint: 'Si elegiste transferencia, envía el comprobante para que pueda verificarse.',
      bookingReferenceLabel: 'Referencia de la reserva',
      backToBooking: 'Volver a reservar',
      goHome: 'Ir al inicio',
    },
  },
  en: {
    languageSelector: {
      label: 'Language',
      auto: 'Auto',
      english: 'English',
      spanish: 'Spanish',
    },
    menu: {
      open: 'Open menu',
      close: 'Close menu',
    },
    nav: {
      home: 'Home',
      services: 'Services',
      booking: 'Book',
      contact: 'Contact',
    },
    shell: {
      loading: {
        eyebrow: 'Loading site',
        title: 'Preparing a smoother, more continuous experience.',
        description: 'We are loading the sections, styles, and site content so the transition feels natural.',
      },
      error: {
        eyebrow: 'Temporarily unavailable',
        title: 'We could not load this view.',
        description: 'Try reloading in a few seconds.',
      },
    },
    layout: {
      bookingEnabled: 'Site and online booking',
      informationalSite: 'Business information site',
      headerLabel: 'Language selector',
      footerNavigation: 'Navigation',
      footerDetails: 'Details',
    },
    template: {
      heroTitle: 'A digital presence designed to elevate your brand',
      experienceLabel: 'Experience',
      experienceTitle: 'Editorial design and premium experience.',
      experienceBody: 'A visual presentation crafted for brands that want to look polished, consistent, and memorable from the first touchpoint.',
      aboutKicker: 'About',
      aboutTitle: 'About the brand',
      servicesTitle: 'Services',
      galleryTitle: 'Gallery',
      galleryItemFallback: 'Image',
      testimonialsTitle: 'Testimonials',
      bookingTitle: 'Book your appointment online',
      bookingBody: 'Choose your service, check availability, and confirm the booking in a few steps.',
      bookingAction: 'Book now',
      contactTitle: 'Contact',
      contactEmail: 'Email',
      contactPhone: 'Phone',
      contactWhatsapp: 'WhatsApp',
      whatsappCta: 'Chat on WhatsApp',
      poweredBy: 'Powered by Quickly Sites',
    },
    home: {
      loading: {
        eyebrow: 'Loading site',
        title: 'We are preparing your site.',
        description: 'We are loading the sections and styles so you can explore the full experience.',
      },
    },
    services: {
      loading: {
        eyebrow: 'Loading services',
        title: 'We are preparing the catalog with a smoother transition.',
        description: 'Blocks, cards, and content are loading so the page change does not feel abrupt.',
      },
      eyebrow: 'Available services',
      title: 'Explore the available offer and find the care you need.',
      serviceLabel: 'Service',
      priceLabel: 'Check price',
      priceFallback: 'Check price',
    },
    contact: {
      loading: {
        eyebrow: 'Loading contact',
        title: 'We are preparing the contact channels and editorial blocks.',
        description: 'The view is being mounted with a smoother transition so the experience feels continuous.',
      },
      eyebrow: 'Contact',
      title: 'Let us talk about your next appointment.',
      body: 'This demo block shows how a brand can present its contact channels in a warm, professional, and organized way.',
      channels: 'Available channels',
      email: 'Email',
      phone: 'Phone',
      whatsapp: 'WhatsApp',
    },
    booking: {
      loading: {
        eyebrow: 'Loading booking',
        title: 'We are loading the booking schedule.',
        description: 'We are preparing a smoother experience to choose service, professional, and time slot.',
      },
      notAvailable: {
        title: 'Booking unavailable',
        description: 'This site is on a plan that does not include online booking. Use the contact details or WhatsApp to schedule.',
      },
      heroEyebrow: 'Online booking',
      heroTitle: 'Book your appointment step by step',
      heroDescription: 'Choose the service first, then the professional available for that service, and finally the date and time that fits best.',
      stepOne: 'Select a service',
      stepOneHint: 'This catalog is shared across the tenant.',
      stepTwo: 'Choose a professional',
      stepTwoHint: 'Only professionals who can perform the selected service are shown.',
      stepThree: 'Pick date and time',
      stepThreeHint: 'Check the available schedule for the selected professional.',
      stepFour: 'Confirm your details',
      stepFourHint: 'These details will be used to create and track your booking.',
      selectServicePrompt: 'Select a service first to see matching professionals.',
      noStaffPrompt: 'No active professionals are assigned to this service yet.',
      selectDatePrompt: 'Select service, professional, and date to check availability.',
      selectDateButton: 'Check times',
      selectDateButtonLoading: 'Checking...',
      noSlots: 'There are no available time slots for the selected date. Try another day or professional.',
      availabilityPrompt: 'Check the available schedule for the selected professional.',
      availabilityError: 'We could not check availability.',
      createError: 'We could not create the booking.',
      fullName: 'Full name',
      phone: 'Phone',
      email: 'Email',
      notes: 'Additional notes',
      submitButton: 'Confirm booking',
      submitButtonLoading: 'Saving...',
      confirmPrompt: 'Complete service, professional, and time slot before confirming.',
      summaryTitle: 'Your booking summary',
      summaryService: 'Service',
      summaryProfessional: 'Professional',
      summaryDateTime: 'Date and time',
      summaryDuration: 'Duration',
      summaryPrice: 'Reference price',
      selectedProfessional: 'Selected professional',
      selectedProfessionalBody: 'Professional available for this service.',
      selectedServiceFallback: 'Not selected',
      selectedProfessionalFallback: 'Not selected',
      notSelected: 'Not selected',
      notDefined: 'Not defined',
      availableProfessionalFallback: 'Selected professional',
      availabilityUnavailableReason: 'Unavailable',
      createdSuccess: 'Booking created successfully.',
      slotUnavailable: 'That time slot was just taken. We updated the schedule so you can pick another one.',
      updateAvailability: 'There are no available time slots for the selected date. Try another day or professional.',
      chooseAnotherDay: 'Choose another day or professional.',
      payphoneEmailRequired: 'To pay with Payphone, enter a valid email address.',
      payphonePhoneRequired: 'To pay with Payphone, enter a valid phone number (e.g. 0991234567 or +593991234567).',
      payphonePhoneInvalid: 'The phone number is not valid for Payphone. Use an Ecuador mobile (09… or +593…) or another international number starting with +.',
      payphoneBoxTitle: 'Pay with Payphone',
      payphoneBoxDescription: 'Complete your payment in the box below. We will show the result when you finish.',
      payphoneBoxMisconfigured: 'Payphone (payment box) is not configured: token or Store ID is missing in the admin.',
      payphoneBoxLoadError: 'Could not load the Payphone payment form. Reload the page and try again.',
      fieldHints: {
        serviceCatalog: 'This catalog is shared across the tenant.',
        staffScope: 'Only professionals who can perform the selected service are shown.',
        availabilityScope: 'Check the available schedule for the selected professional.',
        reservationData: 'These details will be used to create and track your booking.',
      },
    },
    api: {
      requestFailed: 'The request could not be completed',
      connectionFailed: 'Could not connect to the server.',
      notificationFallback: 'The action could not be completed.',
    },
    payphoneReturn: {
      eyebrow: 'Payphone',
      titleApproved: 'Thank you for your payment!',
      titleCancelled: 'Payment cancelled',
      titleLoading: 'Confirming payment',
      titleFailed: 'Payment could not be confirmed',
      descriptionLoading: 'We are validating the transaction...',
      descriptionApproved:
        'Your booking is confirmed automatically. We look forward to seeing you at the date and time you chose.',
      descriptionCancelled: 'The payment was cancelled or not approved in time.',
      descriptionFailed: 'The payment could not be confirmed.',
      parametersMissing: 'Payphone did not send confirmation parameters in the URL (expected id and clientTransactionId).',
      parametersMissingHint:
        'This return route (/payphone/return) does exist. If payment completed but this step fails, the issue is usually Payphone’s confirmation API (token, sandbox vs production, or URL parameters), not a missing page.',
      bookingReferenceLabel: 'Booking reference',
      verifyingPayment: 'Verifying your payment',
      verifyingPaymentHint: 'Do not close this window or refresh the page.',
      payphoneNotConfigured: 'Payphone is not available on this site (token or Store ID missing in settings).',
      payphoneDirectFailed: 'Payphone did not return valid JSON when confirming the payment.',
      backToBooking: 'Back to booking',
      goHome: 'Go to home',
    },
    bookingPending: {
      eyebrow: 'Booking',
      title: 'Thanks for your booking',
      description: 'Your reservation has been registered. It will remain pending until the payment is verified.',
      pendingLabel: 'Pending payment verification',
      cashHint: 'If you selected cash, please complete the payment directly with the business.',
      transferHint: 'If you selected bank transfer, send the transfer receipt so it can be verified.',
      bookingReferenceLabel: 'Booking reference',
      backToBooking: 'Back to booking',
      goHome: 'Go to home',
    },
  },
};

const ROUTES: Record<'home' | 'services' | 'booking' | 'bookingConfirmation' | 'contact', Record<PublicLanguage, string>> = {
  home: { es: '/', en: '/' },
  services: { es: '/servicios', en: '/services' },
  booking: { es: '/reservar', en: '/book' },
  bookingConfirmation: { es: '/reservar/gracias', en: '/book/thanks' },
  contact: { es: '/contacto', en: '/contact' },
};

export function usePublicLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, () => currentLanguage, () => currentLanguage);

  return {
    language,
  };
}

export function usePublicCopy() {
  const { language } = usePublicLanguage();
  return COPY[language];
}

export function getPublicCopy(language: PublicLanguage) {
  return COPY[language];
}

export function getLocalizedPath(route: keyof typeof ROUTES, language: PublicLanguage) {
  return ROUTES[route][language];
}

export function resolveRouteKey(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized === '/' || normalized === '') {
    return 'home' as const;
  }

  if (normalized === '/servicios' || normalized === '/services') {
    return 'services' as const;
  }

  if (normalized === '/reservar' || normalized === '/book') {
    return 'booking' as const;
  }

  if (normalized === '/reservar/gracias' || normalized === '/book/thanks') {
    return 'bookingConfirmation' as const;
  }

  if (normalized === '/contacto' || normalized === '/contact') {
    return 'contact' as const;
  }

  return null;
}
