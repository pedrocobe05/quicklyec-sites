import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import { getPlatformStats, getPlatformStatsByTenant, getPlatformTenants } from '../lib/api';
import { Card } from '../shared/components/ui/Card';
import { Select } from '../shared/components/ui/Select';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

interface TenantOption {
  id: string;
  name: string;
  slug: string;
}

interface AppointmentsByStatus {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

interface GlobalStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    archived: number;
    newThisMonth: number;
    withExpiredSubscription: number;
    byPlan: Record<string, number>;
  };
  appointments: {
    total: number;
    thisMonth: number;
    byStatus: AppointmentsByStatus;
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
  services: {
    total: number;
    active: number;
  };
  staff: {
    total: number;
  };
}

interface TenantStats {
  tenant: { id: string; name: string; slug: string; plan: string; status: string };
  appointments: {
    total: number;
    thisMonth: number;
    byStatus: AppointmentsByStatus;
  };
  customers: {
    total: number;
    newThisMonth: number;
  };
  services: {
    total: number;
    active: number;
  };
  staff: {
    total: number;
  };
}

type Stats = GlobalStats | TenantStats;

function isGlobalStats(stats: Stats): stats is GlobalStats {
  return 'tenants' in stats;
}

const STATUS_LABELS: Record<keyof AppointmentsByStatus, string> = {
  pending: 'Pendientes',
  confirmed: 'Confirmadas',
  completed: 'Completadas',
  cancelled: 'Canceladas',
  no_show: 'No asistió',
};

const STATUS_COLORS: Record<keyof AppointmentsByStatus, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-400',
  no_show: 'bg-slate-400',
};

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${accent ?? 'text-slate-900'}`}>
        {typeof value === 'number' ? value.toLocaleString('es') : value}
      </span>
      {sub ? <span className="text-xs text-slate-500">{sub}</span> : null}
    </div>
  );
}

function AppointmentStatusBar({ byStatus }: { byStatus: AppointmentsByStatus }) {
  const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
  const entries = (Object.entries(byStatus) as [keyof AppointmentsByStatus, number][]).filter(
    ([, count]) => count > 0,
  );

  if (total === 0) {
    return <p className="text-sm text-slate-400">Sin reservas registradas.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {entries.map(([key, count]) => (
          <div
            key={key}
            className={`${STATUS_COLORS[key]} transition-all`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${STATUS_LABELS[key]}: ${count}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(byStatus) as (keyof AppointmentsByStatus)[]).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_COLORS[key]}`} />
            <span className="text-xs text-slate-500">
              {STATUS_LABELS[key]}
              <span className="ml-1 font-semibold text-slate-700">{byStatus[key]}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-2xl" />
    </div>
  );
}

export function PlatformDashboardPage() {
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const { notify } = useNotification();

  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats(tenantId: string) {
    if (!token) return;
    setLoading(true);
    try {
      const data = tenantId
        ? await getPlatformStatsByTenant(token, tenantId)
        : await getPlatformStats(token);
      setStats(data as Stats);
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    Promise.all([
      getPlatformStats(token),
      getPlatformTenants(token),
    ])
      .then(([statsData, tenantsData]) => {
        setStats(statsData as Stats);
        setTenants(tenantsData as TenantOption[]);
      })
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  function handleTenantChange(tenantId: string) {
    setSelectedTenantId(tenantId);
    void loadStats(tenantId);
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(user?.isPlatformAdmin)} currentPath="/platform/dashboard">
      <div className="space-y-6">
        <div className="w-full sm:w-72">
          <Select
            value={selectedTenantId}
            onChange={(e) => handleTenantChange(e.target.value)}
          >
            <option value="">Todas las empresas</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </Select>
        </div>

        {loading || !stats ? (
          <Card>
            <StatsSkeleton />
          </Card>
        ) : isGlobalStats(stats) ? (
          <GlobalStatsView stats={stats} />
        ) : (
          <TenantStatsView stats={stats} />
        )}
      </div>
    </AdminLayout>
  );
}

function GlobalStatsView({ stats }: { stats: GlobalStats }) {
  const planEntries = Object.entries(stats.tenants.byPlan);
  const totalByPlan = planEntries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Empresas</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={stats.tenants.total} />
          <StatCard
            label="Activas"
            value={stats.tenants.active}
            accent="text-emerald-600"
            sub={`${stats.tenants.total > 0 ? Math.round((stats.tenants.active / stats.tenants.total) * 100) : 0}% del total`}
          />
          <StatCard label="Inactivas" value={stats.tenants.inactive} />
          <StatCard label="Archivadas" value={stats.tenants.archived} />
          <StatCard
            label="Nuevas este mes"
            value={stats.tenants.newThisMonth}
            accent="text-blue-600"
          />
          <StatCard
            label="Suscripción vencida"
            value={stats.tenants.withExpiredSubscription}
            accent={stats.tenants.withExpiredSubscription > 0 ? 'text-red-500' : 'text-slate-900'}
          />
        </div>

        {planEntries.length > 0 ? (
          <div className="mt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Distribución por plan
            </p>
            <div className="flex flex-wrap gap-3">
              {planEntries.map(([plan, count]) => (
                <div
                  key={plan}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  <span className="font-medium capitalize text-slate-700">{plan}</span>
                  <span className="font-bold text-slate-900">{count}</span>
                  <span className="text-slate-400">
                    ({totalByPlan > 0 ? Math.round((count / totalByPlan) * 100) : 0}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Reservas
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard label="Total acumulado" value={stats.appointments.total} />
            <StatCard
              label="Este mes"
              value={stats.appointments.thisMonth}
              accent="text-blue-600"
            />
          </div>
          <div className="mt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Por estado
            </p>
            <AppointmentStatusBar byStatus={stats.appointments.byStatus} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Clientes
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Total acumulado" value={stats.customers.total} />
              <StatCard
                label="Nuevos este mes"
                value={stats.customers.newThisMonth}
                accent="text-blue-600"
              />
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Servicios
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard label="Total" value={stats.services.total} />
                <StatCard
                  label="Activos"
                  value={stats.services.active}
                  accent="text-emerald-600"
                />
              </div>
            </Card>
            <Card>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Equipo
              </h3>
              <StatCard label="Miembros totales" value={stats.staff.total} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantStatsView({ stats }: { stats: TenantStats }) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{stats.tenant.name}</h3>
            <p className="text-xs text-slate-500">
              Plan <span className="font-medium capitalize">{stats.tenant.plan}</span>
              {' · '}
              <span
                className={
                  stats.tenant.status === 'active'
                    ? 'font-medium text-emerald-600'
                    : 'font-medium text-slate-500'
                }
              >
                {stats.tenant.status === 'active' ? 'Activa' : stats.tenant.status}
              </span>
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Reservas totales" value={stats.appointments.total} />
          <StatCard
            label="Reservas este mes"
            value={stats.appointments.thisMonth}
            accent="text-blue-600"
          />
          <StatCard label="Clientes" value={stats.customers.total} />
          <StatCard
            label="Nuevos clientes"
            value={stats.customers.newThisMonth}
            accent="text-blue-600"
            sub="este mes"
          />
          <StatCard
            label="Servicios activos"
            value={stats.services.active}
            accent="text-emerald-600"
            sub={`de ${stats.services.total} totales`}
          />
          <StatCard label="Equipo" value={stats.staff.total} sub="miembros" />
        </div>
      </Card>

      <Card>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Reservas por estado
        </h3>
        <AppointmentStatusBar byStatus={stats.appointments.byStatus} />
      </Card>
    </div>
  );
}
