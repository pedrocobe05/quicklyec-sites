import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { Card } from '../shared/components/ui/Card';
import { useNotification } from '../shared/notifications/use-notification';

type StoredMembership = {
  role?: {
    permissions?: string[];
  } | null;
  tenant?: {
    id?: string;
    name?: string;
    slug?: string;
  };
};

type StoredUser = {
  fullName?: string;
  email?: string;
  isPlatformAdmin?: boolean;
  effectiveModules?: string[];
  memberships?: StoredMembership[];
};

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('qs_user') ?? 'null') as StoredUser | null;
  } catch {
    return null;
  }
}

function deriveModulesFromPermissions(permissions: string[]) {
  return Array.from(
    new Set(
      permissions
        .map((permission) => permission.split('.')[0])
        .filter(Boolean),
    ),
  );
}

export function WelcomePage() {
  const { notify } = useNotification();
  const token = localStorage.getItem('qs_access_token');
  const user = readStoredUser();

  useEffect(() => {
    const notice = window.sessionStorage.getItem('qs_permission_notice');
    if (!notice) {
      return;
    }

    window.sessionStorage.removeItem('qs_permission_notice');
    notify(notice, 'info');
  }, [notify]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.isPlatformAdmin && user.memberships?.[0]?.tenant?.id) {
    return <Navigate to="/app" replace />;
  }

  const memberships = user?.memberships ?? [];
  const firstTenant = memberships[0]?.tenant;
  const welcomeModules = user?.isPlatformAdmin
    ? []
    : deriveModulesFromPermissions(
        memberships.flatMap((membership) => membership.role?.permissions ?? []),
      );

  return (
    <AdminLayout
      availableModules={welcomeModules}
      isPlatformAdmin={Boolean(user?.isPlatformAdmin)}
      activeTenant={firstTenant?.id && firstTenant?.name && firstTenant?.slug
        ? { id: firstTenant.id, name: firstTenant.name, slug: firstTenant.slug }
        : null}
      tenantRoutePrefix={firstTenant?.id ? '/app' : ''}
      currentPath="/"
    >
      <section className="grid gap-6">
        <Card>
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-[rgba(255,203,48,0.28)] bg-[rgba(255,203,48,0.1)] px-3 py-1 text-[0.65rem] uppercase tracking-[0.28em] text-[var(--brand-gold-deep)]">
              Bienvenida
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">
              {user?.fullName ? `Hola, ${user.fullName}.` : 'Hola.'}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Este es tu punto de entrada al panel. Desde aquí puedes ir a la empresa que administras o, si tienes acceso global,
              entrar a la operación de plataforma.
            </p>
          </div>
        </Card>

        {user?.isPlatformAdmin ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="flex h-full flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Empresas</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Revisa tenants, entra a sus configuraciones y administra sus planes.
                </p>
              </div>
            </Card>
            <Card className="flex h-full flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Usuarios de plataforma</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Gestiona usuarios con acceso global y sus permisos principales.
                </p>
              </div>
            </Card>
            <Card className="flex h-full flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Configuración de plataforma</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Ajusta parámetros globales, branding y comportamiento general del producto.
                </p>
              </div>
            </Card>
          </div>
        ) : null}

        {memberships.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {memberships.map((membership, index) => {
              const tenant = membership.tenant;
              if (!tenant?.id) {
                return null;
              }

              return (
                <Card key={tenant.id ?? index} className="flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Empresa</p>
                    <h3 className="mt-3 text-xl font-semibold text-slate-900">{tenant.name ?? 'Empresa'}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Usa el menú lateral para entrar a servicios, staff, agenda, reservas y clientes.
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
