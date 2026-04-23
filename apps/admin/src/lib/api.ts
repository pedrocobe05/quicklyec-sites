function resolveApiUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000/api';
  }

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000/api';
  }

  return 'https://api.quicklyecsites.com/api';
}

const API_URL = resolveApiUrl();

function createIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildIdempotencyHeaders() {
  return {
    'Idempotency-Key': createIdempotencyKey(),
  };
}

function emitHttpActivity(type: 'start' | 'end') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(`qs:http:${type}`));
  }
}

function extractErrorMessage(errorText: string, status: number) {
  const trimmed = errorText.trim();
  if (!trimmed) {
    return `Request failed: ${status}`;
  }

  try {
    const parsed = JSON.parse(trimmed) as { message?: string | string[] };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(', ');
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

let refreshPromise: Promise<string | null> | null = null;

function clearSessionAndRedirect() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem('qs_access_token');
  window.localStorage.removeItem('qs_refresh_token');
  window.localStorage.removeItem('qs_user');

  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

function redirectToLoginWithNotice(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem('qs_permission_notice', message);
  clearSessionAndRedirect();
}

function redirectToHomeWithPermissionNotice(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem('qs_permission_notice', message);

  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

async function tryRefreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const refreshToken = window.localStorage.getItem('qs_refresh_token');
  if (!refreshToken) {
    clearSessionAndRedirect();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Unable to refresh session');
        }
        const data = (await response.json()) as { accessToken: string };
        window.localStorage.setItem('qs_access_token', data.accessToken);
        return data.accessToken;
      })
      .catch(() => {
        clearSessionAndRedirect();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(path: string, options?: RequestInit, hasRetried = false): Promise<T> {
  emitHttpActivity('start');
  try {
    const method = (options?.method ?? 'GET').toUpperCase();
    const headers = new Headers(options?.headers ?? {});
    if (method !== 'GET' && method !== 'HEAD' && !headers.has('Idempotency-Key')) {
      Object.entries(buildIdempotencyHeaders()).forEach(([key, value]) => headers.set(key, value));
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
    if (response.status === 401 && !hasRetried && path !== '/auth/refresh') {
      const nextAccessToken = await tryRefreshAccessToken();
      if (nextAccessToken) {
        const nextHeaders = new Headers(headers);
        if (nextHeaders.has('Authorization')) {
          nextHeaders.set('Authorization', `Bearer ${nextAccessToken}`);
        }
        return request<T>(path, { ...options, headers: nextHeaders }, true);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = extractErrorMessage(errorText, response.status);

      if (
        response.status === 403 &&
        errorMessage.toLowerCase().includes('platform admin access required')
      ) {
        redirectToHomeWithPermissionNotice('No tienes permisos para acceder a esa sección.');
        throw new Error('No tienes permisos para acceder a esa sección.');
      }

      if (
        response.status === 403
        && errorMessage.toLowerCase().includes('acceso deshabilitado')
      ) {
        redirectToLoginWithNotice(errorMessage);
        throw new Error(errorMessage);
      }

      throw new Error(errorMessage);
    }
    return response.json() as Promise<T>;
  } finally {
    emitHttpActivity('end');
  }
}

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

export interface AppointmentAvailabilitySlot {
  start: string;
  end: string;
  staffId?: string | null;
  staffName?: string | null;
  available: boolean;
  unavailableReason?: string | null;
}

export async function login(email: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

export async function forgotPassword(email: string) {
  return request('/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string) {
  return request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
}

export async function getTenantProfile(accessToken: string, tenantId: string) {
  return request(`/tenants/me?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateTenantBranding(accessToken: string, tenantId: string, payload: Record<string, unknown>) {
  return request(`/tenants/branding?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function createPresignedUpload(accessToken: string, tenantId: string, payload: Record<string, unknown>) {
  return request(`/files/presign-upload?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function uploadTenantFile(
  accessToken: string,
  tenantId: string,
  file: File,
  resourceType: 'branding' | 'site' | 'gallery',
  visibility: 'public' | 'private' = 'public',
) {
  const presign = (await createPresignedUpload(accessToken, tenantId, {
    resourceType,
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    visibility,
  })) as {
    fileId: string;
    uploadUrl: string;
    headers?: Record<string, string>;
  };

  const response = await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: presign.headers ?? { 'content-type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!response.ok) {
    throw new Error('No se pudo subir el archivo al almacenamiento');
  }

  return {
    fileId: presign.fileId,
    reference: `file:${presign.fileId}`,
  };
}

export async function deleteTenantFile(accessToken: string, tenantId: string, fileId: string) {
  return request(`/files/${fileId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateTenantSettings(accessToken: string, tenantId: string, payload: Record<string, unknown>) {
  return request(`/tenants/settings?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function sendTenantTestEmail(accessToken: string, tenantId: string, to: string) {
  return request(`/tenants/test-email?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ to }),
  });
}

export async function preparePayphoneTestPayment(accessToken: string, tenantId: string, payload: Record<string, unknown>) {
  return request(`/admin/payments/payphone-test-prepare?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function createTenantDomain(accessToken: string, payload: Record<string, unknown>) {
  return request('/tenants/domains', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteTenantDomain(accessToken: string, tenantId: string, domainId: string) {
  return request(`/tenants/domains/${domainId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getServices(accessToken: string, tenantId: string) {
  return request(`/services?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createService(accessToken: string, payload: Record<string, unknown>) {
  return request('/services', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteService(accessToken: string, tenantId: string, serviceId: string) {
  return request(`/services/${serviceId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateService(
  accessToken: string,
  tenantId: string,
  serviceId: string,
  payload: Record<string, unknown>,
) {
  return request(`/services/${serviceId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getStaff(accessToken: string, tenantId: string) {
  return request(`/staff?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createStaff(accessToken: string, payload: Record<string, unknown>) {
  return request('/staff', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteStaff(accessToken: string, tenantId: string, staffId: string) {
  return request(`/staff/${staffId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateStaff(
  accessToken: string,
  tenantId: string,
  staffId: string,
  payload: Record<string, unknown>,
) {
  return request(`/staff/${staffId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getAppointments(accessToken: string, tenantId: string) {
  return request(`/appointments?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getAppointmentAvailability(
  accessToken: string,
  tenantId: string,
  serviceId: string,
  date: string,
  staffId?: string,
) {
  const staffQuery = staffId ? `&staffId=${encodeURIComponent(staffId)}` : '';
  return request<AppointmentAvailabilitySlot[]>(
    `/appointments/availability?tenantId=${tenantId}&serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(date)}${staffQuery}`,
    {
    headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function createAppointment(
  accessToken: string,
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return request(`/appointments?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updateAppointmentStatus(
  accessToken: string,
  tenantId: string,
  appointmentId: string,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show',
) {
  return request(`/appointments/${appointmentId}/status?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ tenantId, status }),
  });
}

export async function updateAppointment(
  accessToken: string,
  tenantId: string,
  appointmentId: string,
  payload: Record<string, unknown>,
) {
  return request(`/appointments/${appointmentId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function reversePayphoneAppointmentPayment(
  accessToken: string,
  tenantId: string,
  appointmentId: string,
) {
  return request(`/appointments/${appointmentId}/reverse-payphone?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ tenantId }),
  });
}

export async function getTemplates(accessToken: string) {
  return request('/site/templates', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPages(accessToken: string, tenantId: string) {
  return request(`/site/pages?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createPage(accessToken: string, payload: Record<string, unknown>) {
  return request('/site/pages', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deletePage(accessToken: string, tenantId: string, pageId: string) {
  return request(`/site/pages/${pageId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updatePage(
  accessToken: string,
  tenantId: string,
  pageId: string,
  payload: Record<string, unknown>,
) {
  return request(`/site/pages/${pageId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getSections(accessToken: string, tenantId: string, pageId?: string, scope: 'page' | 'global' = 'page') {
  const params = new URLSearchParams({ tenantId, scope });
  if (pageId) {
    params.set('pageId', pageId);
  }

  return request(`/site/sections?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createSection(accessToken: string, payload: Record<string, unknown>) {
  return request('/site/sections', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteSection(accessToken: string, tenantId: string, sectionId: string) {
  return request(`/site/sections/${sectionId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateSection(
  accessToken: string,
  tenantId: string,
  sectionId: string,
  payload: Record<string, unknown>,
) {
  return request(`/site/sections/${sectionId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getAvailabilityRules(accessToken: string, tenantId: string) {
  return request(`/agenda/availability-rules?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createAvailabilityRule(accessToken: string, payload: Record<string, unknown>) {
  return request('/agenda/availability-rules', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteAvailabilityRule(accessToken: string, tenantId: string, ruleId: string) {
  return request(`/agenda/availability-rules/${ruleId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateAvailabilityRule(
  accessToken: string,
  tenantId: string,
  ruleId: string,
  payload: Record<string, unknown>,
) {
  return request(`/agenda/availability-rules/${ruleId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getScheduleBlocks(accessToken: string, tenantId: string) {
  return request(`/agenda/schedule-blocks?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createScheduleBlock(accessToken: string, payload: Record<string, unknown>) {
  return request('/agenda/schedule-blocks', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteScheduleBlock(accessToken: string, tenantId: string, blockId: string) {
  return request(`/agenda/schedule-blocks/${blockId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateScheduleBlock(
  accessToken: string,
  tenantId: string,
  blockId: string,
  payload: Record<string, unknown>,
) {
  return request(`/agenda/schedule-blocks/${blockId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getCustomers(accessToken: string, tenantId: string) {
  return request(`/customers?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updateCustomer(
  accessToken: string,
  tenantId: string,
  customerId: string,
  payload: Record<string, unknown>,
) {
  return request(`/customers/${customerId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(accessToken: string, tenantId: string, customerId: string) {
  return request(`/customers/${customerId}?tenantId=${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getTenantMemberships(accessToken: string, tenantId: string) {
  return request(`/tenants/memberships?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createTenantMembership(
  accessToken: string,
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return request(`/tenants/memberships?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updateTenantMembership(
  accessToken: string,
  tenantId: string,
  membershipId: string,
  payload: Record<string, unknown>,
) {
  return request(`/tenants/memberships/${membershipId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function resetTenantMembershipPassword(
  accessToken: string,
  tenantId: string,
  membershipId: string,
) {
  return request(`/tenants/memberships/${membershipId}/reset-password?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
  });
}

export async function getTenantRoles(accessToken: string, tenantId: string) {
  return request(`/tenants/roles?tenantId=${tenantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createTenantRole(
  accessToken: string,
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return request(`/tenants/roles?tenantId=${tenantId}`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updateTenantRole(
  accessToken: string,
  tenantId: string,
  roleId: string,
  payload: Record<string, unknown>,
) {
  return request(`/tenants/roles/${roleId}?tenantId=${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getPlatformPlans(accessToken: string) {
  return request('/platform/plans', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPlatformUsers(accessToken: string) {
  return request('/platform/users', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getPlatformRoles(accessToken: string) {
  return request('/platform/roles', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createPlatformUser(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/users', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformUser(
  accessToken: string,
  userId: string,
  payload: Record<string, unknown>,
) {
  return request(`/platform/users/${userId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deletePlatformUser(accessToken: string, userId: string) {
  return request(`/platform/users/${userId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createPlatformRole(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/roles', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformRole(accessToken: string, roleId: string, payload: Record<string, unknown>) {
  return request(`/platform/roles/${roleId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deletePlatformRole(accessToken: string, roleId: string) {
  return request(`/platform/roles/${roleId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createPlatformPlan(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/plans', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function getPlatformTenants(accessToken: string) {
  return request('/platform/tenants', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updatePlatformTenantPlan(
  accessToken: string,
  tenantId: string,
  plan: string,
) {
  return request(`/platform/tenants/${tenantId}/plan`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ plan }),
  });
}

export async function getPlatformSettings(accessToken: string) {
  return request('/platform/settings', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function updatePlatformSettings(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/settings', {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function createPlatformTenant(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/tenants', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformTenant(
  accessToken: string,
  tenantId: string,
  payload: Record<string, unknown>,
) {
  return request(`/platform/tenants/${tenantId}`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function deletePlatformTenant(accessToken: string, tenantId: string) {
  return request(`/platform/tenants/${tenantId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function createPlatformMembership(accessToken: string, payload: Record<string, unknown>) {
  return request('/platform/memberships', {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}
