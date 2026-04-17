import { SITE_FONT_OPTIONS } from '@quickly-sites/shared';
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from 'react';
import { preparePayphoneTestPayment } from '../../../lib/api';
import { mountPayphonePaymentBox } from '../../../lib/payphone-box-sdk';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { Select } from '../../../shared/components/ui/Select';
import { Textarea } from '../../../shared/components/ui/Textarea';
import { Checkbox } from '../../../shared/components/ui/Checkbox';
import { FormField } from '../../../shared/components/forms/FormField';
import { ImagePreview } from '../../../shared/components/ui/ImagePreview';

interface BrandingSettingsSectionProps {
  saving: string | null;
  uploadingAsset?: 'logo' | 'favicon' | null;
  branding?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
    borderRadius?: string | null;
    buttonStyle?: string | null;
    customCss?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
  } | null;
  settings?: {
    locale?: string | null;
    canonicalDomain?: string | null;
    defaultSeoTitle?: string | null;
    defaultSeoDescription?: string | null;
    siteIndexingEnabled?: boolean;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    contactAddress?: string | null;
    cashPaymentEnabled?: boolean;
    transferPaymentEnabled?: boolean;
    payphonePaymentEnabled?: boolean;
    payphoneMode?: string | null;
    payphoneStoreId?: string | null;
    payphoneToken?: string | null;
  } | null;
  onUploadBrandingAsset?: (field: 'logo' | 'favicon', file: File) => void;
  onSubmitBranding: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitSettings: (event: FormEvent<HTMLFormElement>) => void;
  tenantId?: string;
  accessToken?: string;
  notify?: (message: string, variant: 'success' | 'error' | 'info') => void;
}

const BUTTON_STYLE_OPTIONS = [
  {
    value: 'pill',
    label: 'Pill',
    description: 'Botones redondeados y suaves, ideales para una marca editorial o premium.',
    radius: '999px',
  },
  {
    value: 'rounded',
    label: 'Rounded',
    description: 'Botones con borde redondeado moderado, más versátiles y sobrios.',
    radius: '1rem',
  },
  {
    value: 'soft-square',
    label: 'Soft square',
    description: 'Botones más rectos y modernos, con una presencia visual más firme.',
    radius: '0.7rem',
  },
] as const;

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const PAYPHONE_ADMIN_BOX_ID = 'pp-admin-payphone-test';

function buildPublicPayphoneReturnUrl(canonicalDomain: string): string | null {
  const trimmed = canonicalDomain.trim();
  const fromEnv = import.meta.env.VITE_PUBLIC_PAYPHONE_RETURN_ORIGIN;
  if (!trimmed && typeof fromEnv === 'string' && fromEnv.trim()) {
    try {
      return `${new URL(fromEnv.trim()).origin}/payphone/return`;
    } catch {
      return null;
    }
  }
  if (!trimmed) {
    return null;
  }
  let href = trimmed;
  if (!/^https?:\/\//i.test(href)) {
    const host = href.split('/')[0] ?? '';
    const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    href = `${protocol}://${host}`;
  }
  try {
    return `${new URL(href).origin}/payphone/return`;
  } catch {
    return null;
  }
}

function normalizeHexColor(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? '').trim();
  if (HEX_COLOR_PATTERN.test(normalized)) {
    return normalized;
  }
  return fallback;
}

export function BrandingSettingsSection({
  saving,
  uploadingAsset,
  branding,
  settings,
  onUploadBrandingAsset,
  onSubmitBranding,
  onSubmitSettings,
  tenantId,
  accessToken,
  notify,
}: BrandingSettingsSectionProps) {
  const [preview, setPreview] = useState({
    primaryColor: normalizeHexColor(branding?.primaryColor, '#C16A7B'),
    secondaryColor: normalizeHexColor(branding?.secondaryColor, '#F8E6EA'),
    accentColor: normalizeHexColor(branding?.accentColor, '#7C3A46'),
    fontFamily: branding?.fontFamily ?? 'Cormorant Garamond',
    borderRadius: branding?.borderRadius ?? '1.5rem',
    buttonStyle: branding?.buttonStyle ?? 'pill',
  });

  useEffect(() => {
    setPreview({
      primaryColor: normalizeHexColor(branding?.primaryColor, '#C16A7B'),
      secondaryColor: normalizeHexColor(branding?.secondaryColor, '#F8E6EA'),
      accentColor: normalizeHexColor(branding?.accentColor, '#7C3A46'),
      fontFamily: branding?.fontFamily ?? 'Cormorant Garamond',
      borderRadius: branding?.borderRadius ?? '1.5rem',
      buttonStyle: branding?.buttonStyle ?? 'pill',
    });
  }, [
    branding?.primaryColor,
    branding?.secondaryColor,
    branding?.accentColor,
    branding?.fontFamily,
    branding?.borderRadius,
    branding?.buttonStyle,
  ]);

  const previewFontFamily = useMemo(
    () => SITE_FONT_OPTIONS.find((font) => font.value === preview.fontFamily)?.cssFamily ?? `"${preview.fontFamily}", serif`,
    [preview.fontFamily],
  );
  const previewButtonRadius = useMemo(
    () => BUTTON_STYLE_OPTIONS.find((option) => option.value === preview.buttonStyle)?.radius ?? '999px',
    [preview.buttonStyle],
  );
  const previewStyle = {
    '--preview-primary': preview.primaryColor,
    '--preview-secondary': preview.secondaryColor,
    '--preview-accent': preview.accentColor,
    '--preview-radius': preview.borderRadius,
    '--preview-font-family': previewFontFamily,
    '--preview-button-radius': previewButtonRadius,
  } as CSSProperties;

  const [payphoneTestBusy, setPayphoneTestBusy] = useState(false);
  const [payphoneBoxModal, setPayphoneBoxModal] = useState<null | {
    clientTransactionId: string;
    token: string;
    storeId: string;
    amount: number;
    currency: string;
    reference: string;
    email: string;
    phoneNumber: string;
  }>(null);

  async function handlePayphonePaymentTest() {
    if (!tenantId || !accessToken) {
      notify?.('No hay sesión o tenant para probar Payphone.', 'error');
      return;
    }
    const form = document.getElementById('tenant-seo-settings-form') as HTMLFormElement | null;
    if (!form) {
      notify?.('No se encontró el formulario de configuración.', 'error');
      return;
    }
    const fd = new FormData(form);
    const canonical = String(fd.get('canonicalDomain') ?? '');
    const responseUrl = buildPublicPayphoneReturnUrl(canonical);
    if (!responseUrl) {
      notify?.(
        'Indica el dominio canónico del sitio público (o define VITE_PUBLIC_PAYPHONE_RETURN_ORIGIN en el admin) para la URL de retorno de Payphone.',
        'error',
      );
      return;
    }
    const payphoneToken = String(fd.get('payphoneToken') ?? '');
    const payphoneStoreId = String(fd.get('payphoneStoreId') ?? '');
    const payphoneMode = String(fd.get('payphoneMode') ?? 'redirect');
    const contactEmail = String(fd.get('contactEmail') ?? '').trim();
    const contactPhone = String(fd.get('contactPhone') ?? '').trim();

    setPayphoneTestBusy(true);
    try {
      const result = (await preparePayphoneTestPayment(accessToken, tenantId, {
        responseUrl,
        cancellationUrl: `${new URL(responseUrl).origin}/book`,
        amountCents: 100,
        payphoneToken: payphoneToken || undefined,
        payphoneStoreId: payphoneStoreId || undefined,
        payphoneMode: payphoneMode === 'box' ? 'box' : 'redirect',
        customerEmail: contactEmail || undefined,
        customerPhone: contactPhone || undefined,
      })) as {
        payphoneFlow?: string;
        redirectUrl?: string;
        clientTransactionId: string;
        amount?: number;
        currency?: string;
        reference?: string;
        payphoneBox?: { token: string; storeId: string };
      };

      if (result.payphoneFlow === 'box' && result.payphoneBox && result.amount != null) {
        setPayphoneBoxModal({
          clientTransactionId: result.clientTransactionId,
          token: result.payphoneBox.token,
          storeId: result.payphoneBox.storeId,
          amount: result.amount,
          currency: result.currency ?? 'USD',
          reference: result.reference ?? '',
          email: contactEmail || 'prueba@example.com',
          phoneNumber: contactPhone || '+593999999999',
        });
        notify?.('Cajita lista: pago de prueba por $1.00 (100 centavos).', 'success');
      } else if (result.redirectUrl?.trim()) {
        window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
        notify?.('Se abrió Payphone en una pestaña nueva (prueba $1.00). Tras pagar, confirma en el sitio público.', 'success');
      } else {
        notify?.('Respuesta de prueba incompleta.', 'error');
      }
    } catch (error) {
      notify?.(error instanceof Error ? error.message : 'No se pudo iniciar la prueba de Payphone', 'error');
    } finally {
      setPayphoneTestBusy(false);
    }
  }

  useEffect(() => {
    if (!payphoneBoxModal) {
      return;
    }

    let cancelled = false;
    let destroyBox: (() => void) | undefined;

    mountPayphonePaymentBox({
      containerId: PAYPHONE_ADMIN_BOX_ID,
      token: payphoneBoxModal.token,
      storeId: payphoneBoxModal.storeId,
      clientTransactionId: payphoneBoxModal.clientTransactionId,
      amount: payphoneBoxModal.amount,
      currency: payphoneBoxModal.currency,
      reference: payphoneBoxModal.reference,
      lang: 'es',
      timeZone: -5,
      email: payphoneBoxModal.email,
      phoneNumber: payphoneBoxModal.phoneNumber,
    })
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }
        destroyBox = handle.destroy;
      })
      .catch((err: Error) => {
        if (!cancelled) {
          notify?.(err.message || 'No se pudo cargar la cajita Payphone', 'error');
          setPayphoneBoxModal(null);
        }
      });

    return () => {
      cancelled = true;
      destroyBox?.();
      const el = document.getElementById(PAYPHONE_ADMIN_BOX_ID);
      if (el) {
        el.innerHTML = '';
      }
    };
  }, [payphoneBoxModal, notify]);

  return (
    <>
    <div className="grid gap-6 xl:grid-cols-2">
      <article id="branding" className="rounded-[2rem] bg-white p-6 shadow-sm scroll-mt-6">
        <h3 className="font-serif text-2xl">Marca</h3>
        <form className="mt-5 grid gap-3" onSubmit={onSubmitBranding}>
          <FormField label="URL del logo">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input name="logoUrl" defaultValue={branding?.logoUrl ?? ''} placeholder="URL del logo o referencia interna" />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file && onUploadBrandingAsset) onUploadBrandingAsset('logo', file);
                    event.currentTarget.value = '';
                  }}
                />
                {uploadingAsset === 'logo' ? 'Subiendo...' : 'Subir logo'}
              </label>
            </div>
            <div className="mt-3">
              <ImagePreview src={branding?.logoUrl} alt="Logo del tenant" label="Logo actual" className="h-24 w-24" />
            </div>
          </FormField>
          <FormField label="URL del favicon">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input name="faviconUrl" defaultValue={branding?.faviconUrl ?? ''} placeholder="URL del favicon o referencia interna" />
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    if (file && onUploadBrandingAsset) onUploadBrandingAsset('favicon', file);
                    event.currentTarget.value = '';
                  }}
                />
                {uploadingAsset === 'favicon' ? 'Subiendo...' : 'Subir favicon'}
              </label>
            </div>
            <div className="mt-3">
              <ImagePreview src={branding?.faviconUrl} alt="Favicon del tenant" label="Favicon actual" className="h-20 w-20" />
            </div>
          </FormField>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Color primario">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <input
                  type="color"
                  name="primaryColorPicker"
                  value={normalizeHexColor(preview.primaryColor, '#C16A7B')}
                  onChange={(event) => setPreview((current) => ({ ...current, primaryColor: event.target.value }))}
                  className="h-12 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                />
                <Input
                  name="primaryColor"
                  value={preview.primaryColor}
                  onChange={(event) => setPreview((current) => ({ ...current, primaryColor: event.target.value }))}
                  placeholder="#C16A7B"
                />
              </div>
            </FormField>
            <FormField label="Color secundario">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <input
                  type="color"
                  name="secondaryColorPicker"
                  value={normalizeHexColor(preview.secondaryColor, '#F8E6EA')}
                  onChange={(event) => setPreview((current) => ({ ...current, secondaryColor: event.target.value }))}
                  className="h-12 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                />
                <Input
                  name="secondaryColor"
                  value={preview.secondaryColor}
                  onChange={(event) => setPreview((current) => ({ ...current, secondaryColor: event.target.value }))}
                  placeholder="#F8E6EA"
                />
              </div>
            </FormField>
            <FormField label="Color acento">
              <div className="grid grid-cols-[auto_1fr] gap-3">
                <input
                  type="color"
                  name="accentColorPicker"
                  value={normalizeHexColor(preview.accentColor, '#7C3A46')}
                  onChange={(event) => setPreview((current) => ({ ...current, accentColor: event.target.value }))}
                  className="h-12 w-14 cursor-pointer rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
                />
                <Input
                  name="accentColor"
                  value={preview.accentColor}
                  onChange={(event) => setPreview((current) => ({ ...current, accentColor: event.target.value }))}
                  placeholder="#7C3A46"
                />
              </div>
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Tipografía">
              <Select
                name="fontFamily"
                value={preview.fontFamily}
                onChange={(event) => setPreview((current) => ({ ...current, fontFamily: event.target.value }))}
              >
                {SITE_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Radio de borde">
              <Input
                name="borderRadius"
                value={preview.borderRadius}
                onChange={(event) => setPreview((current) => ({ ...current, borderRadius: event.target.value }))}
                placeholder="1.5rem"
              />
            </FormField>
            <FormField label="Estilo de botón">
              <Select
                name="buttonStyle"
                value={preview.buttonStyle}
                onChange={(event) => setPreview((current) => ({ ...current, buttonStyle: event.target.value }))}
              >
                {BUTTON_STYLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-900">Estilo de botón seleccionado</p>
            <p className="mt-1">
              {BUTTON_STYLE_OPTIONS.find((option) => option.value === preview.buttonStyle)?.description ?? 'Define la personalidad visual de los botones del sitio.'}
            </p>
          </div>
          <FormField label="CSS personalizado del tenant">
            <Textarea
              name="customCss"
              defaultValue={branding?.customCss ?? ''}
              placeholder="Ejemplo: .public-theme .hero-title { letter-spacing: .02em; }"
              className="min-h-32"
            />
          </FormField>
          <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
            {saving === 'branding' ? 'Guardando...' : 'Guardar marca'}
          </Button>
        </form>
      </article>

      <article id="settings" className="rounded-[2rem] bg-white p-6 shadow-sm scroll-mt-6">
        <h3 className="font-serif text-2xl">SEO y contacto</h3>
        <form id="tenant-seo-settings-form" className="mt-5 grid gap-3" onSubmit={onSubmitSettings}>
          <FormField label="Idioma del tenant">
            <Select name="locale" defaultValue={String(settings?.locale ?? 'es').toLowerCase().startsWith('en') ? 'en' : 'es'}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </Select>
          </FormField>
          <FormField label="Dominio canónico">
            <Input name="canonicalDomain" defaultValue={settings?.canonicalDomain ?? ''} placeholder="Dominio canónico" />
          </FormField>
          <FormField label="Título SEO">
            <Input name="defaultSeoTitle" defaultValue={settings?.defaultSeoTitle ?? ''} placeholder="Título SEO" />
          </FormField>
          <FormField label="Descripción SEO">
            <Textarea name="defaultSeoDescription" defaultValue={settings?.defaultSeoDescription ?? ''} placeholder="Descripción SEO" className="min-h-24" />
          </FormField>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Correo">
              <Input name="contactEmail" defaultValue={settings?.contactEmail ?? ''} placeholder="Correo" />
            </FormField>
            <FormField label="Teléfono">
              <Input name="contactPhone" defaultValue={settings?.contactPhone ?? ''} placeholder="Teléfono" />
            </FormField>
            <FormField label="WhatsApp">
              <Input name="whatsappNumber" defaultValue={settings?.whatsappNumber ?? ''} placeholder="WhatsApp" />
            </FormField>
          </div>
          <FormField label="Dirección">
            <Input name="contactAddress" defaultValue={settings?.contactAddress ?? ''} placeholder="Dirección del negocio" />
          </FormField>
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Métodos de pago</h4>
              <p className="mt-1 text-sm text-slate-500">Activa los métodos que el tenant podrá mostrar al reservar.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700">
                <Checkbox type="checkbox" name="cashPaymentEnabled" defaultChecked={settings?.cashPaymentEnabled ?? true} />
                Efectivo
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700">
                <Checkbox type="checkbox" name="transferPaymentEnabled" defaultChecked={settings?.transferPaymentEnabled ?? false} />
                Transferencia
              </label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700">
                <Checkbox type="checkbox" name="payphonePaymentEnabled" defaultChecked={settings?.payphonePaymentEnabled ?? false} />
                Payphone
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <FormField label="Modo Payphone">
                <Select name="payphoneMode" defaultValue={settings?.payphoneMode ?? 'redirect'}>
                  <option value="redirect">Redirección</option>
                  <option value="box">Cajita</option>
                </Select>
              </FormField>
              <FormField label="Payphone Store ID">
                <Input
                  name="payphoneStoreId"
                  defaultValue={settings?.payphoneStoreId ?? ''}
                  placeholder="Credenciales en Payphone Developer"
                />
              </FormField>
              <FormField label="Payphone Token">
                <Input
                  name="payphoneToken"
                  defaultValue={settings?.payphoneToken ?? ''}
                  placeholder="Token"
                  maxLength={2048}
                />
              </FormField>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-600">
                Prueba un cobro de <span className="font-semibold text-slate-900">$1.00</span> sin pasar por la reserva. Usa token y Store ID del formulario (no hace falta guardar antes).
              </p>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold"
                disabled={payphoneTestBusy || !tenantId || !accessToken}
                onClick={() => {
                  void handlePayphonePaymentTest();
                }}
              >
                {payphoneTestBusy ? 'Preparando…' : 'Probar pago Payphone'}
              </Button>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <Checkbox type="checkbox" name="siteIndexingEnabled" defaultChecked={settings?.siteIndexingEnabled ?? true} />
            Permitir indexación del sitio
          </label>
          <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
            {saving === 'settings' ? 'Guardando...' : 'Guardar SEO y configuración'}
          </Button>
        </form>
      </article>

      <article className="rounded-[2rem] bg-white p-6 shadow-sm xl:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl text-slate-900">Vista previa de marca</h3>
            <p className="mt-1 text-sm text-slate-500">Esta mini vista previa te muestra cómo se sentirían la fuente, colores, radios y botones antes de guardar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Fuente: {preview.fontFamily}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">Botón: {preview.buttonStyle}</span>
          </div>
        </div>

        <div
          className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200"
          style={previewStyle}
        >
          <div
            className="border-b border-black/5 px-5 py-4"
            style={{
              fontFamily: 'var(--preview-font-family)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.92), color-mix(in srgb, var(--preview-secondary) 72%, white))',
            }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center border border-black/5 text-xs font-semibold uppercase tracking-[0.28em]"
                  style={{
                    backgroundColor: 'var(--preview-secondary)',
                    color: 'var(--preview-accent)',
                    borderRadius: 'calc(var(--preview-radius) - 0.25rem)',
                  }}
                >
                  QS
                </div>
                <div>
                  <p className="text-[0.68rem] uppercase tracking-[0.34em]" style={{ color: 'var(--preview-accent)' }}>
                    Experiencia privada
                  </p>
                  <p className="text-3xl font-semibold text-slate-900">Atelier Privé</p>
                  <p className="text-sm text-slate-500">Cocina de autor a domicilio para veladas memorables.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-700">
                <span className="rounded-full px-4 py-2" style={{ backgroundColor: 'color-mix(in srgb, var(--preview-secondary) 78%, white)', borderRadius: 'var(--preview-button-radius)' }}>Inicio</span>
                <span className="rounded-full px-4 py-2" style={{ backgroundColor: 'white', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 'var(--preview-button-radius)' }}>Servicios</span>
                <span className="rounded-full px-4 py-2" style={{ backgroundColor: 'white', border: '1px solid rgba(15,23,42,0.08)', borderRadius: 'var(--preview-button-radius)' }}>Contacto</span>
              </div>
            </div>
          </div>

          <div
            className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]"
            style={{
              fontFamily: 'var(--preview-font-family)',
              background:
                'radial-gradient(circle at top left, color-mix(in srgb, var(--preview-secondary) 68%, white), transparent 28%), linear-gradient(180deg, #f8f7f4 0%, white 52%, color-mix(in srgb, var(--preview-secondary) 42%, white) 100%)',
            }}
          >
            <div
              className="border border-black/5 bg-white/95 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]"
              style={{ borderRadius: 'var(--preview-radius)' }}
            >
              <p className="text-[0.72rem] uppercase tracking-[0.35em]" style={{ color: 'var(--preview-accent)' }}>
                Vista previa
              </p>
              <h4 className="mt-3 text-5xl leading-[0.95] text-slate-900">Una marca que se ve tan cuidada como la experiencia que vende.</h4>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                Aquí puedes evaluar si la tipografía se siente correcta, si los fondos tienen el nivel de calidez adecuado y si los botones transmiten la personalidad visual que buscas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
                  style={{ backgroundColor: 'var(--preview-primary)', borderRadius: 'var(--preview-button-radius)' }}
                >
                  Botón principal
                </button>
                <button
                  type="button"
                  className="border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
                  style={{ borderRadius: 'var(--preview-button-radius)' }}
                >
                  Botón secundario
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              <div
                className="border border-black/5 p-5"
                style={{
                  borderRadius: 'calc(var(--preview-radius) - 0.1rem)',
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--preview-secondary) 82%, white), white)',
                  fontFamily: 'var(--preview-font-family)',
                }}
              >
                <p className="text-xs uppercase tracking-[0.3em]" style={{ color: 'var(--preview-accent)' }}>
                  Fondo secundario
                </p>
                <p className="mt-3 text-lg text-slate-900">Así se siente una tarjeta, panel o bloque de apoyo.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 p-4 text-center text-sm text-slate-700">
                  <div className="mx-auto h-8 w-8 rounded-full" style={{ backgroundColor: 'var(--preview-primary)' }} />
                  <p className="mt-3">Primario</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{preview.primaryColor}</p>
                </div>
                <div className="rounded-2xl border border-black/5 p-4 text-center text-sm text-slate-700">
                  <div className="mx-auto h-8 w-8 rounded-full border border-black/5" style={{ backgroundColor: 'var(--preview-secondary)' }} />
                  <p className="mt-3">Secundario</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{preview.secondaryColor}</p>
                </div>
                <div className="rounded-2xl border border-black/5 p-4 text-center text-sm text-slate-700">
                  <div className="mx-auto h-8 w-8 rounded-full" style={{ backgroundColor: 'var(--preview-accent)' }} />
                  <p className="mt-3">Acento</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">{preview.accentColor}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
    {payphoneBoxModal ? (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payphone-test-dialog-title"
      >
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 id="payphone-test-dialog-title" className="font-serif text-xl text-slate-900">
                Prueba cajita Payphone
              </h4>
              <p className="mt-1 text-sm text-slate-600">
                Pago de prueba por $1.00. Al terminar, Payphone redirige al sitio público; la confirmación se procesa en la página de retorno.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => setPayphoneBoxModal(null)}
            >
              Cerrar
            </button>
          </div>
          <div id={PAYPHONE_ADMIN_BOX_ID} className="mt-4 min-h-[140px]" />
        </div>
      </div>
    ) : null}
    </>
  );
}
