import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { PlatformRolesPage } from './pages/PlatformRolesPage';
import { PlatformSettingsPage } from './pages/PlatformSettingsPage';
import { PlatformTenantsPage } from './pages/PlatformTenantsPage';
import { PlatformUsersPage } from './pages/PlatformUsersPage';
import { TenantDetailPage } from './pages/TenantDetailPage';

type StoredUser = {
  isPlatformAdmin?: boolean;
  memberships?: Array<{ tenant?: { id?: string } }>;
};

function readStoredUser(): StoredUser | null {
  try {
    return JSON.parse(localStorage.getItem('qs_user') ?? 'null') as StoredUser | null;
  } catch {
    return null;
  }
}

function HomeRedirect() {
  const token = localStorage.getItem('qs_access_token');
  const user = readStoredUser();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.isPlatformAdmin) return <Navigate to="/platform/tenants" replace />;

  const tenantId = user?.memberships?.[0]?.tenant?.id;
  return tenantId ? <Navigate to={`/platform/tenants/${tenantId}`} replace /> : <Navigate to="/login" replace />;
}

function TenantTabRedirect({ tab }: { tab: string }) {
  const token = localStorage.getItem('qs_access_token');
  const user = readStoredUser();

  if (!token) return <Navigate to="/login" replace />;
  if (user?.isPlatformAdmin) return <Navigate to="/platform/tenants" replace />;

  const tenantId = user?.memberships?.[0]?.tenant?.id;
  return tenantId ? <Navigate to={`/platform/tenants/${tenantId}?tab=${tab}`} replace /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/platform" element={<Navigate to="/platform/tenants" replace />} />
      <Route path="/platform/users" element={<PlatformUsersPage />} />
      <Route path="/platform/roles" element={<PlatformRolesPage />} />
      <Route path="/platform/tenants" element={<PlatformTenantsPage />} />
      <Route path="/platform/tenants/:tenantId" element={<TenantDetailPage />} />
      <Route path="/platform/settings" element={<PlatformSettingsPage />} />
      <Route path="/site" element={<TenantTabRedirect tab="site" />} />
      <Route path="/branding" element={<TenantTabRedirect tab="branding" />} />
      <Route path="/services" element={<TenantTabRedirect tab="services" />} />
      <Route path="/staff" element={<TenantTabRedirect tab="staff" />} />
      <Route path="/agenda" element={<TenantTabRedirect tab="agenda" />} />
      <Route path="/appointments" element={<TenantTabRedirect tab="appointments" />} />
      <Route path="/customers" element={<TenantTabRedirect tab="customers" />} />
      <Route path="/domains" element={<TenantTabRedirect tab="domains" />} />
      <Route path="/settings" element={<TenantTabRedirect tab="general" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
