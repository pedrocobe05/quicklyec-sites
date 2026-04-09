import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { forgotPassword, login, resetPassword } from '../lib/api';
import { BrandMark } from '../shared/components/brand/BrandMark';
import { FormField } from '../shared/components/forms/FormField';
import { Modal } from '../shared/components/modal/Modal';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { Input } from '../shared/components/ui/Input';
import { useNotification } from '../shared/notifications/use-notification';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { notify } = useNotification();
  const token = localStorage.getItem('qs_access_token');
  const [isLoading, setIsLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const resetToken = searchParams.get('resetToken')?.trim() ?? '';
  const isResetMode = Boolean(resetToken);
  const resetDescription = useMemo(
    () => 'Ingresa una nueva contraseña segura para recuperar el acceso a tu cuenta.',
    [],
  );

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setIsLoading(true);
    try {
      const response = (await login(
        String(formData.get('email') ?? ''),
        String(formData.get('password') ?? ''),
      )) as { accessToken: string; refreshToken: string; user: unknown };
      localStorage.setItem('qs_access_token', response.accessToken);
      localStorage.setItem('qs_refresh_token', response.refreshToken);
      localStorage.setItem('qs_user', JSON.stringify(response.user));
      notify('Sesión iniciada correctamente.', 'success');
      navigate('/');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setForgotLoading(true);
    try {
      const response = await forgotPassword(String(formData.get('email') ?? '')) as { message?: string };
      notify(response.message ?? 'Si el correo existe, te enviaremos un enlace de recuperación.', 'success');
      setForgotOpen(false);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setForgotLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      notify('Las contraseñas no coinciden.', 'error');
      return;
    }

    setResetLoading(true);
    try {
      const response = await resetPassword(resetToken, password) as { message?: string };
      notify(response.message ?? 'Tu contraseña fue actualizada correctamente.', 'success');
      searchParams.delete('resetToken');
      setSearchParams(searchParams, { replace: true });
      navigate('/login', { replace: true });
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,203,48,0.14),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(0,1,32,0.08),_transparent_28%),linear-gradient(180deg,_#faf8f2_0%,_#efefe9_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[rgba(255,203,48,0.14)] bg-[var(--brand-navy)] p-10 text-white shadow-panel lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,203,48,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.04),_transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-end">
            <div>
              <BrandMark subtitle="Gestión multi-site" tone="light" />
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] text-[#f6f2ea] lg:text-6xl">
                Administra tu site desde un solo lugar.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
                Reservas, clientes, sitios y operación diaria en una experiencia simple, clara y profesional.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md rounded-[2rem] border border-[#e3dacb] bg-white/88 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
            <div className="mb-8">
              <div className="inline-flex rounded-full border border-[rgba(255,203,48,0.24)] bg-[rgba(255,203,48,0.12)] px-3 py-1 text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brand-gold-deep)]">
                Quickly Sites
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
                {isResetMode ? 'Crea una nueva contraseña' : 'Inicia sesión'}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {isResetMode ? resetDescription : 'Ingresa con tu correo y contraseña para continuar.'}
              </p>
            </div>

            {isResetMode ? (
              <form className="space-y-5" onSubmit={handleResetPassword}>
                <FormField label="Nueva contraseña" required>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="h-12 rounded-2xl border-[#ddd6ca] bg-[#fcfbf8] px-4 focus:border-[var(--brand-gold-deep)] focus:ring-[rgba(255,203,48,0.18)]"
                  />
                </FormField>
                <FormField label="Confirmar contraseña" required>
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Repite tu nueva contraseña"
                    className="h-12 rounded-2xl border-[#ddd6ca] bg-[#fcfbf8] px-4 focus:border-[var(--brand-gold-deep)] focus:ring-[rgba(255,203,48,0.18)]"
                  />
                </FormField>
                <Button
                  className="h-12 w-full rounded-2xl bg-[var(--brand-navy)] text-sm tracking-[0.08em] text-white hover:bg-[rgba(0,1,32,0.94)]"
                  type="submit"
                  isLoading={resetLoading}
                  loadingLabel="Actualizando..."
                >
                  Guardar nueva contraseña
                </Button>
                <button
                  type="button"
                  className="w-full text-sm font-medium text-[var(--brand-navy)] underline-offset-4 hover:underline"
                  onClick={() => {
                    searchParams.delete('resetToken');
                    setSearchParams(searchParams, { replace: true });
                  }}
                >
                  Volver al login
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={handleSubmit}>
                <FormField label="Correo" required>
                  <Input
                    name="email"
                    type="email"
                    placeholder="mail@example.com"
                    className="h-12 rounded-2xl border-[#ddd6ca] bg-[#fcfbf8] px-4 focus:border-[var(--brand-gold-deep)] focus:ring-[rgba(255,203,48,0.18)]"
                  />
                </FormField>
                <FormField label="Contraseña" required>
                  <Input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 rounded-2xl border-[#ddd6ca] bg-[#fcfbf8] px-4 focus:border-[var(--brand-gold-deep)] focus:ring-[rgba(255,203,48,0.18)]"
                  />
                </FormField>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--brand-navy)] underline-offset-4 hover:underline"
                    onClick={() => setForgotOpen(true)}
                  >
                    Olvidé mi contraseña
                  </button>
                </div>
                <Button
                  className="h-12 w-full rounded-2xl bg-[var(--brand-navy)] text-sm tracking-[0.08em] text-white hover:bg-[rgba(0,1,32,0.94)]"
                  type="submit"
                  isLoading={isLoading}
                  loadingLabel="Ingresando..."
                >
                  Ingresar
                </Button>
              </form>
            )}
          </Card>
        </div>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Recuperar contraseña"
        description="Te enviaremos un enlace seguro para crear una nueva contraseña."
        maxWidthClassName="max-w-lg"
      >
        <form className="grid gap-4" onSubmit={handleForgotPassword}>
          <FormField label="Correo" required>
            <Input
              name="email"
              type="email"
              placeholder="tu@correo.com"
              className="h-12 rounded-2xl border-[#ddd6ca] bg-[#fcfbf8] px-4"
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setForgotOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={forgotLoading} loadingLabel="Enviando...">
              Enviar enlace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
