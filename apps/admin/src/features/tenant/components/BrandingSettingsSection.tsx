import { SITE_FONT_OPTIONS } from '@quickly-sites/shared';
import { FormEvent } from 'react';
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
    logoUrl?: string | null;
    faviconUrl?: string | null;
  } | null;
  settings?: {
    canonicalDomain?: string | null;
    defaultSeoTitle?: string | null;
    defaultSeoDescription?: string | null;
    siteIndexingEnabled?: boolean;
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsappNumber?: string | null;
    contactAddress?: string | null;
  } | null;
  onUploadBrandingAsset?: (field: 'logo' | 'favicon', file: File) => void;
  onSubmitBranding: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitSettings: (event: FormEvent<HTMLFormElement>) => void;
}

export function BrandingSettingsSection({
  saving,
  uploadingAsset,
  branding,
  settings,
  onUploadBrandingAsset,
  onSubmitBranding,
  onSubmitSettings,
}: BrandingSettingsSectionProps) {
  return (
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
              <Input name="primaryColor" defaultValue={branding?.primaryColor ?? '#C16A7B'} placeholder="#C16A7B" />
            </FormField>
            <FormField label="Color secundario">
              <Input name="secondaryColor" defaultValue={branding?.secondaryColor ?? '#F8E6EA'} placeholder="#F8E6EA" />
            </FormField>
            <FormField label="Color acento">
              <Input name="accentColor" defaultValue={branding?.accentColor ?? '#7C3A46'} placeholder="#7C3A46" />
            </FormField>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Tipografía">
              <Select name="fontFamily" defaultValue={branding?.fontFamily ?? 'Cormorant Garamond'}>
                {SITE_FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Radio de borde">
              <Input name="borderRadius" defaultValue={branding?.borderRadius ?? '1.5rem'} placeholder="1.5rem" />
            </FormField>
            <FormField label="Estilo de botón">
              <Input name="buttonStyle" defaultValue={branding?.buttonStyle ?? 'pill'} placeholder="pill" />
            </FormField>
          </div>
          <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
            {saving === 'branding' ? 'Guardando...' : 'Guardar marca'}
          </Button>
        </form>
      </article>

      <article id="settings" className="rounded-[2rem] bg-white p-6 shadow-sm scroll-mt-6">
        <h3 className="font-serif text-2xl">SEO y contacto</h3>
        <form className="mt-5 grid gap-3" onSubmit={onSubmitSettings}>
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
          <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
            <Checkbox type="checkbox" name="siteIndexingEnabled" defaultChecked={settings?.siteIndexingEnabled ?? true} />
            Permitir indexación del sitio
          </label>
          <Button type="submit" className="rounded-full px-5 py-3 text-sm font-semibold">
            {saving === 'settings' ? 'Guardando...' : 'Guardar SEO y configuración'}
          </Button>
        </form>
      </article>
    </div>
  );
}
