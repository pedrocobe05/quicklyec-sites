import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { BrandMark } from '../shared/components/brand/BrandMark';
import { Alert } from '../shared/components/ui/Alert';
import { FormField } from '../shared/components/forms/FormField';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { Input } from '../shared/components/ui/Input';
import { useNotification } from '../shared/notifications/use-notification';

export function LoginPage() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const token = localStorage.getItem('qs_access_token');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
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
      const message = (err as Error).message;
      setError(message);
      notify(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,203,48,0.14),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(0,1,32,0.08),_transparent_28%),linear-gradient(180deg,_#faf8f2_0%,_#efefe9_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[rgba(255,203,48,0.14)] bg-[var(--brand-navy)] p-10 text-white shadow-panel lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,203,48,0.18),_transparent_28%),linear-gradient(135deg,_rgba(255,255,255,0.04),_transparent_45%)]" />
          <div className="relative flex h-full flex-col justify-end">
            <div>
              <BrandMark subtitle="Gestión multi-tenant" tone="light" />
              <h2 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.05] text-[#f6f2ea] lg:text-6xl">
                Administra tu negocio desde un solo lugar.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">
                Tenants, reservas, clientes, sitios y operación diaria en una experiencia simple, clara y profesional.
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
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">Inicia sesión</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Ingresa con tu correo y contraseña para continuar.
              </p>
            </div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error ? <Alert variant="error">{error}</Alert> : null}
              <FormField label="Correo" required>
                <Input
                  name="email"
                  type="email"
                  placeholder="sites@quicklyec.com"
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
              <Button
                className="h-12 w-full rounded-2xl bg-[var(--brand-navy)] text-sm tracking-[0.08em] text-white hover:bg-[rgba(0,1,32,0.94)]"
                type="submit"
                isLoading={isLoading}
                loadingLabel="Ingresando..."
              >
                Ingresar
              </Button>
            </form>

            <div className="mt-8 rounded-[1.5rem] border border-[rgba(255,203,48,0.18)] bg-[rgba(255,203,48,0.08)] px-4 py-4 text-sm text-slate-700">
              Plataforma: `sites@quicklyec.com`
              <br />
              Tenant demo: `admin@quicklysites.local`
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
