import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  HiBars3,
  HiCog6Tooth,
  HiDocumentText,
  HiHome,
  HiRectangleStack,
  HiSquares2X2,
  HiUsers,
  HiXMark,
} from 'react-icons/hi2';
import { BrandMark } from '../shared/components/brand/BrandMark';
import { ConfirmModal } from '../shared/components/modal/ConfirmModal';
import { Button } from '../shared/components/ui/Button';
import { cn } from '../shared/utils/cn';

type NavItem = {
  to: string;
  label: string;
  module?: string;
  matchPath?: string;
};

type NavGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

const baseNavItems: NavItem[] = [
  { to: '/', label: 'Inicio' },
  { to: '/services', label: 'Servicios', module: 'services' },
  { to: '/staff', label: 'Equipo', module: 'staff' },
  { to: '/appointments', label: 'Reservas', module: 'appointments' },
  { to: '/customers', label: 'Clientes', module: 'customers' },
  { to: '/agenda', label: 'Agenda', module: 'agenda' },
];

const platformNavItems: NavItem[] = [
  { to: '/platform/users', label: 'Usuarios de plataforma' },
  { to: '/platform/roles', label: 'Roles de plataforma' },
  { to: '/platform/tenants', label: 'Empresas' },
  { to: '/platform/settings', label: 'Configuración plataforma' },
];

const sectionMeta: Record<string, { title: string; description: string }> = {
  '/': {
    title: 'Inicio',
    description: 'Vista ejecutiva de la empresa activa con contexto y estado operativo.',
  },
  '/platform': {
    title: 'Plataforma',
    description: 'Gestión global de empresas, planes y acceso administrativo.',
  },
  '/platform/users': {
    title: 'Usuarios de plataforma',
    description: 'Administración de usuarios con acceso global a la plataforma.',
  },
  '/platform/roles': {
    title: 'Roles de plataforma',
    description: 'Vista de roles globales del panel de plataforma.',
  },
  '/platform/tenants': {
    title: 'Empresas',
    description: 'Administración de empresas y acceso a su configuración detallada.',
  },
  '/platform/settings': {
    title: 'Configuración plataforma',
    description: 'Ajustes globales del producto y operación de plataforma.',
  },
  '/services': {
    title: 'Servicios',
    description: 'Oferta comercial, duración y precio de los servicios reservables.',
  },
  '/staff': {
    title: 'Equipo',
    description: 'Equipo operativo visible para reservas y atención.',
  },
  '/appointments': {
    title: 'Reservas',
    description: 'Seguimiento rápido de citas, estado y reagendamiento.',
  },
  '/customers': {
    title: 'Clientes',
    description: 'Base de clientes de la empresa activa.',
  },
  '/agenda': {
    title: 'Agenda',
    description: 'Reglas de disponibilidad y bloqueos de agenda.',
  },
  '/site': {
    title: 'Sitio web',
    description: 'Páginas y estructura pública del sitio.',
  },
  '/branding': {
    title: 'Marca',
    description: 'Logo, colores y sistema visual de la empresa.',
  },
  '/domains': {
    title: 'Dominios',
    description: 'Subdominios, dominios personalizados y estado de verificación.',
  },
  '/settings': {
    title: 'Configuración',
    description: 'SEO, contacto y ajustes generales del sitio.',
  },
};

interface AdminLayoutProps extends PropsWithChildren {
  availableModules?: string[];
  isPlatformAdmin?: boolean;
  activeTenant?: { id: string; name: string; slug: string } | null;
  tenantRoutePrefix?: string;
  currentPath?: string;
}

function GroupIcon({ id }: { id: string }) {
  const iconClass = 'h-4 w-4';
  const icons: Record<string, JSX.Element> = {
    general: <HiHome className={iconClass} />,
    operations: <HiRectangleStack className={iconClass} />,
    site: <HiSquares2X2 className={iconClass} />,
    platform: <HiUsers className={iconClass} />,
    settings: <HiCog6Tooth className={iconClass} />,
  };

  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-[rgba(0,64,145,0.72)]">
      {icons[id] ?? <HiDocumentText className={iconClass} />}
    </span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn('h-4 w-4 transition-transform duration-200', open ? 'rotate-90' : 'rotate-0')}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

export function AdminLayout({
  children,
  availableModules = [],
  isPlatformAdmin = false,
  activeTenant = null,
  tenantRoutePrefix = '',
  currentPath,
}: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const storedUser = typeof window !== 'undefined' ? window.localStorage.getItem('qs_user') : null;
  const parsedUser = storedUser
    ? (JSON.parse(storedUser) as {
        isPlatformAdmin?: boolean;
        fullName?: string;
        email?: string;
        memberships?: Array<{ tenant?: { name?: string; slug?: string } }>;
      })
    : null;

  const [pendingHttpRequests, setPendingHttpRequests] = useState(0);
  const [showHttpOverlay, setShowHttpOverlay] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const canSeePlatform = isPlatformAdmin || parsedUser?.isPlatformAdmin;
  const resolvedPath = currentPath ?? location.pathname;
  const filteredItems = useMemo(
    () =>
      canSeePlatform
        ? platformNavItems
        : baseNavItems.filter((item) => !item.module || availableModules.includes(item.module)),
    [availableModules, canSeePlatform],
  );
  const resolvePath = (path: string) => {
    if (path.startsWith('/platform')) {
      return path;
    }

    if (!tenantRoutePrefix) {
      return path;
    }

    return path === '/' ? '/' : `${tenantRoutePrefix}?tab=${path.slice(1)}`;
  };

  const navigationGroups: NavGroup[] = useMemo(
    () => {
      if (canSeePlatform) {
        return [
          {
            id: 'platform',
            title: 'Plataforma',
            items: filteredItems.map((item) => ({ ...item, to: item.to, matchPath: item.to })),
          },
        ];
      }

      return [
        {
          id: 'general',
          title: 'General',
          items: filteredItems
            .filter((item) => item.to === '/')
            .map((item) => ({ ...item, to: resolvePath(item.to), matchPath: item.to })),
        },
        {
          id: 'operations',
          title: 'Operación',
          items: filteredItems
            .filter((item) =>
              ['/services', '/staff', '/appointments', '/customers', '/agenda'].includes(item.to),
            )
            .map((item) => ({ ...item, to: resolvePath(item.to), matchPath: item.to })),
        },
      ].filter((group) => group.items.length > 0);
    },
    [canSeePlatform, filteredItems, tenantRoutePrefix],
  );

  const normalizedResolvedPath = resolvedPath.startsWith('/platform/tenants/')
    ? '/platform/tenants'
    : resolvedPath;
  const currentPage = sectionMeta[normalizedResolvedPath] ?? sectionMeta['/'];
  const tenantLabel = activeTenant?.name ?? (canSeePlatform ? 'Plataforma global' : 'Sin empresa activa');

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function handleHttpStart() {
      setPendingHttpRequests((current) => current + 1);
    }

    function handleHttpEnd() {
      setPendingHttpRequests((current) => Math.max(0, current - 1));
    }

    window.addEventListener('qs:http:start', handleHttpStart as EventListener);
    window.addEventListener('qs:http:end', handleHttpEnd as EventListener);

    return () => {
      window.removeEventListener('qs:http:start', handleHttpStart as EventListener);
      window.removeEventListener('qs:http:end', handleHttpEnd as EventListener);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (pendingHttpRequests > 0) {
      timer = setTimeout(() => setShowHttpOverlay(true), 140);
    } else {
      timer = setTimeout(() => setShowHttpOverlay(false), 220);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [pendingHttpRequests]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setOpenGroups((current) => {
      const next = Object.fromEntries(
        navigationGroups.map((group) => [group.id, current[group.id] ?? false]),
      );
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(next);

      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) => current[key] === next[key])
      ) {
        return current;
      }

      return next;
    });
  }, [navigationGroups]);

  useEffect(() => {
    const activeGroupIds = navigationGroups
      .filter((group) =>
        group.items.some((item) =>
          (item.matchPath ?? item.to) === '/'
            ? normalizedResolvedPath === '/'
            : normalizedResolvedPath.startsWith(item.matchPath ?? item.to),
        ),
      )
      .map((group) => group.id);

    if (activeGroupIds.length === 0) {
      return;
    }

    setOpenGroups((current) => {
      const next = { ...current };
      let changed = false;
      activeGroupIds.forEach((groupId) => {
        if (!next[groupId]) {
          next[groupId] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [navigationGroups, normalizedResolvedPath]);

  const sidebar = useMemo(
    () => (
      <>
        <div className="mb-6 rounded-[1.5rem] border border-[rgba(0,1,32,0.08)] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-4 shadow-[0_16px_40px_rgba(0,1,32,0.07)]">
          <BrandMark subtitle="Consola" tone="dark" />
        </div>

        <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {navigationGroups.map((group) => (
            <div key={group.id}>
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((current) => ({
                    ...current,
                    [group.id]: !current[group.id],
                  }))
                }
                className="mb-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[0.9rem] font-medium text-[rgba(15,23,42,0.88)] transition hover:bg-[rgba(0,64,145,0.05)] hover:text-[var(--brand-navy)]"
              >
                <span className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-transparent text-[rgba(0,64,145,0.72)]">
                    <GroupIcon id={group.id} />
                  </span>
                  <span>{group.title}</span>
                </span>
                <span className="text-[rgba(0,64,145,0.65)]">
                  <Chevron open={Boolean(openGroups[group.id])} />
                </span>
              </button>
              <div
                className={cn(
                  'overflow-hidden transition-all duration-200 ease-out',
                  openGroups[group.id] ? 'max-h-[120rem] opacity-100' : 'max-h-0 opacity-0',
                )}
              >
                <div className="space-y-0.5 pl-8 pt-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={() => {
                        const matchPath = item.matchPath ?? item.to;
                        const isActive = matchPath === '/'
                          ? normalizedResolvedPath === '/'
                          : normalizedResolvedPath.startsWith(matchPath);

                        return cn(
                          'group block rounded-lg px-3 py-2 text-[0.9rem] transition-all duration-200',
                          isActive
                            ? 'bg-[rgba(0,64,145,0.06)] text-[var(--brand-navy)] shadow-[0_6px_14px_rgba(0,64,145,0.06)]'
                            : 'bg-transparent text-slate-600 hover:bg-white/75 hover:text-[var(--brand-navy)]',
                        );
                      }}
                    >
                      {(() => {
                        const matchPath = item.matchPath ?? item.to;
                        const isActive = matchPath === '/'
                          ? normalizedResolvedPath === '/'
                          : normalizedResolvedPath.startsWith(matchPath);

                        return (
                          <div className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                'h-1.5 w-1.5 rounded-full transition',
                                isActive ? 'bg-[rgba(0,64,145,0.72)]' : 'bg-[rgba(148,163,184,0.8)] group-hover:bg-[rgba(0,64,145,0.36)]',
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <span className={cn('block truncate leading-5', isActive ? 'font-medium' : 'font-normal')}>
                                {item.label}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 rounded-[1.35rem] border border-[rgba(0,64,145,0.10)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-3.5 shadow-[0_16px_36px_rgba(0,1,32,0.06)]">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[rgba(0,64,145,0.8)]">
            Sesión activa
          </p>
          <dl className="mt-3 space-y-2.5">
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">Usuario</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {parsedUser?.email ?? parsedUser?.fullName ?? 'Sin sesión'}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] uppercase tracking-[0.16em] text-slate-400">Empresa</dt>
              <dd className="mt-1 text-sm text-slate-600">{tenantLabel}</dd>
            </div>
          </dl>
          <Button
            className="mt-4 h-9 w-full border border-[rgba(0,64,145,0.18)] bg-[var(--brand-navy)] px-3 text-white hover:bg-[#07113f]"
            onClick={() => setLogoutOpen(true)}
          >
            Cerrar sesión
          </Button>
        </div>
      </>
    ),
    [navigationGroups, normalizedResolvedPath, openGroups, parsedUser?.email, parsedUser?.fullName, tenantLabel],
  );

  return (
    <div className="quickly-page-shell isolate flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,203,48,0.08),_transparent_24%),linear-gradient(180deg,_#fbfaf6_0%,_#f3f5f9_100%)]">
      {createPortal(
        <div
          className={cn(
            'pointer-events-none fixed inset-x-0 top-0 z-[10040] flex justify-center px-4 transition-all duration-300',
            showHttpOverlay ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0',
          )}
        >
          <div className="mt-4 w-full max-w-md overflow-hidden rounded-[1.6rem] border border-[rgba(0,1,32,0.08)] bg-[linear-gradient(135deg,rgba(6,12,42,0.94),rgba(15,23,42,0.9))] px-4 py-3 text-white shadow-[0_24px_80px_rgba(0,1,32,0.22)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
                <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(255,203,48,0.12)]" />
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/80 border-r-transparent" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-[0.08em] text-white">Cargando...</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[linear-gradient(90deg,#ffcb30,#ffffff)]" />
            </div>
          </div>
        </div>,
        document.body,
      )}

      <aside className="sidebar-professional fixed inset-y-0 left-0 z-20 hidden w-72 flex-col overflow-hidden border-r border-[rgba(0,64,145,0.12)] bg-[linear-gradient(180deg,#eef5ff_0%,#e4edf9_100%)] px-5 py-6 text-slate-700 shadow-[8px_0_28px_rgba(0,64,145,0.06)] lg:flex">
        {sidebar}
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-4 sm:py-5 lg:ml-72 lg:px-6 lg:py-6">
        <div className="mb-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[rgba(0,64,145,0.15)] bg-white/90 px-3 text-sm font-medium text-[var(--brand-navy)] shadow-sm"
          >
            <HiBars3 className="h-5 w-5" />
            Menú
          </button>
        </div>

        {location.pathname === '/' ? null : (
          <header className="mb-5 rounded-3xl border border-[rgba(0,1,32,0.06)] bg-white/82 px-4 py-4 shadow-panel backdrop-blur sm:px-5 sm:py-5 lg:mb-6 lg:px-6">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--brand-gold-deep)]">
                  plataforma QuicklyEC Sites
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-[var(--brand-navy)]">{currentPage.title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{currentPage.description}</p>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <div className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 px-4 py-2 text-sm text-slate-600">
                  {tenantLabel}
                </div>
                {canSeePlatform ? (
                  <div className="rounded-full border border-[rgba(255,203,48,0.22)] bg-[rgba(255,203,48,0.08)] px-4 py-2 text-sm text-[var(--brand-gold-deep)]">
                    Super admin
                  </div>
                ) : null}
              </div>
            </div>
          </header>
        )}

        <div key={location.pathname} className="quickly-page-shell animate-page-fade-in min-w-0">
          {children}
        </div>
      </main>

      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileSidebarOpen(false)}
        aria-hidden={!mobileSidebarOpen}
      />

      <aside
        className={cn(
          'sidebar-professional fixed inset-y-0 left-0 z-40 flex w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden border-r border-[rgba(0,64,145,0.12)] bg-[linear-gradient(180deg,#eef5ff_0%,#e4edf9_100%)] px-5 py-6 text-slate-700 shadow-[8px_0_28px_rgba(0,64,145,0.12)] transition-transform duration-200 lg:hidden',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(0,64,145,0.15)] bg-white/70 text-slate-700"
            aria-label="Cerrar menú"
          >
            <HiXMark className="h-5 w-5" />
          </button>
        </div>
        {sidebar}
      </aside>

      <ConfirmModal
        open={logoutOpen}
        title="Cerrar sesión"
        description="Se cerrará la sesión actual y regresarás al login."
        confirmLabel="Salir"
        onClose={() => setLogoutOpen(false)}
        onConfirm={() => {
          localStorage.removeItem('qs_access_token');
          localStorage.removeItem('qs_user');
          setLogoutOpen(false);
          navigate('/login');
        }}
      />
    </div>
  );
}
