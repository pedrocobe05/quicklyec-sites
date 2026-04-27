import { FormEvent, useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { changeMyPassword, getMyProfile, MyProfileResponse, updateMyProfile } from '../lib/api';
import { FormField } from '../shared/components/forms/FormField';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { Input } from '../shared/components/ui/Input';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

export function MyProfilePage() {
  const token = localStorage.getItem('qs_access_token');
  const storedUser = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as {
    fullName?: string;
    isPlatformAdmin?: boolean;
  } | null;
  const { notify } = useNotification();

  const [profile, setProfile] = useState<MyProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function loadProfile() {
    if (!token) return;
    const nextProfile = await getMyProfile(token);
    setProfile(nextProfile);
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    loadProfile()
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get('fullName') ?? '').trim();

    setSavingProfile(true);
    try {
      const response = await updateMyProfile(token, { fullName });
      await loadProfile();
      const mergedUser = {
        ...(storedUser ?? {}),
        fullName,
      };
      localStorage.setItem('qs_user', JSON.stringify(mergedUser));
      notify(response.message ?? 'Perfil actualizado correctamente.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get('currentPassword') ?? '');
    const newPassword = String(form.get('newPassword') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (newPassword !== confirmPassword) {
      notify('Las contraseñas nuevas no coinciden.', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await changeMyPassword(token, { currentPassword, newPassword });
      notify(response.message ?? 'Contraseña actualizada.', 'success');
      event.currentTarget.reset();
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(storedUser?.isPlatformAdmin)} currentPath="/profile">
      <section className="grid gap-6">
        <Card>
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-slate-900">Mi perfil</h2>
            <p className="mt-1 text-sm text-slate-500">
              Administra tus datos personales y tu contraseña de acceso al panel.
            </p>
          </div>
        </Card>

        {loading ? (
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="mt-4 flex justify-end">
              <Skeleton className="h-10 w-40" />
            </div>
          </Card>
        ) : (
          <Card>
            <h3 className="text-lg font-semibold text-slate-900">Datos personales</h3>
            <form className="mt-5 grid gap-4" onSubmit={handleProfileSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Nombre completo" required>
                  <Input name="fullName" defaultValue={profile?.fullName ?? ''} />
                </FormField>
                <FormField label="Correo">
                  <Input value={profile?.email ?? ''} readOnly disabled />
                </FormField>
              </div>
              <div className="flex justify-end">
                <Button type="submit" isLoading={savingProfile} loadingLabel="Guardando...">
                  Guardar datos
                </Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <h3 className="text-lg font-semibold text-slate-900">Seguridad</h3>
          <p className="mt-1 text-sm text-slate-500">
            Para mantener tu cuenta segura, confirma tu contraseña actual antes de cambiarla.
          </p>

          <form className="mt-5 grid gap-4" onSubmit={handlePasswordSubmit} autoComplete="off">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Contraseña actual" required>
                <Input name="currentPassword" type="password" autoComplete="current-password" />
              </FormField>
              <FormField label="Nueva contraseña" required>
                <Input name="newPassword" type="password" autoComplete="new-password" />
              </FormField>
              <FormField label="Confirmar nueva contraseña" required>
                <Input name="confirmPassword" type="password" autoComplete="new-password" />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={savingPassword} loadingLabel="Actualizando...">
                Cambiar contraseña
              </Button>
            </div>
          </form>
        </Card>
      </section>
    </AdminLayout>
  );
}
