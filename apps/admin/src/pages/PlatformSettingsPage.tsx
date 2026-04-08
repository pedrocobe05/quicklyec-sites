import { FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { getPlatformSettings, updatePlatformSettings } from '../lib/api';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { FormField } from '../shared/components/forms/FormField';
import { Input } from '../shared/components/ui/Input';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

interface PlatformSettingsRecord {
  platformName: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  publicAppUrl?: string | null;
  quicklysitesBaseDomain?: string | null;
  defaultSenderName?: string | null;
  defaultSenderEmail?: string | null;
}

export function PlatformSettingsPage() {
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const { notify } = useNotification();
  const [settings, setSettings] = useState<PlatformSettingsRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    if (!token) return;
    const data = (await getPlatformSettings(token)) as PlatformSettingsRecord;
    setSettings(data);
  }

  useEffect(() => {
    if (!token) return;
    loadData()
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await updatePlatformSettings(token, {
        platformName: String(form.get('platformName') ?? ''),
        supportEmail: String(form.get('supportEmail') ?? ''),
        supportPhone: String(form.get('supportPhone') ?? ''),
        publicAppUrl: String(form.get('publicAppUrl') ?? ''),
        quicklysitesBaseDomain: String(form.get('quicklysitesBaseDomain') ?? ''),
        defaultSenderName: String(form.get('defaultSenderName') ?? ''),
        defaultSenderEmail: String(form.get('defaultSenderEmail') ?? ''),
      });
      await loadData();
      notify('Configuración de plataforma guardada.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(user?.isPlatformAdmin)} currentPath="/platform/settings">
      <Card>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Configuración de la plataforma</h2>
          <p className="mt-1 text-sm text-slate-500">Variables operativas globales para soporte, URLs y remitentes por defecto.</p>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-20" />
            <div className="flex justify-end">
              <Skeleton className="h-11 w-40" />
            </div>
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Nombre de la plataforma" required>
                <Input name="platformName" defaultValue={settings?.platformName ?? ''} />
              </FormField>
              <FormField label="Correo de soporte">
                <Input name="supportEmail" type="email" defaultValue={settings?.supportEmail ?? ''} />
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Teléfono de soporte">
                <Input name="supportPhone" defaultValue={settings?.supportPhone ?? ''} />
              </FormField>
              <FormField label="URL pública del producto">
                <Input name="publicAppUrl" defaultValue={settings?.publicAppUrl ?? ''} />
              </FormField>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Dominio base Quickly Sites">
                <Input name="quicklysitesBaseDomain" defaultValue={settings?.quicklysitesBaseDomain ?? ''} />
              </FormField>
              <FormField label="Nombre remitente por defecto">
                <Input name="defaultSenderName" defaultValue={settings?.defaultSenderName ?? ''} />
              </FormField>
            </div>
            <FormField label="Correo remitente por defecto">
              <Input name="defaultSenderEmail" type="email" defaultValue={settings?.defaultSenderEmail ?? ''} />
            </FormField>
            <div className="flex justify-end">
              <Button type="submit" isLoading={saving} loadingLabel="Guardando...">
                Guardar cambios
              </Button>
            </div>
          </form>
        )}
      </Card>
    </AdminLayout>
  );
}
