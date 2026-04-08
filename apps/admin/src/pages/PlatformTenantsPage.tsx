import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import {
  createPlatformTenant,
  deletePlatformTenant,
  getPlatformPlans,
  getPlatformTenants,
  updatePlatformTenant,
  updatePlatformTenantPlan,
} from '../lib/api';
import { Modal } from '../shared/components/modal/Modal';
import { Button } from '../shared/components/ui/Button';
import { Card } from '../shared/components/ui/Card';
import { DataTable, DataTablePagination, DataTableShell, DataTableToolbar } from '../shared/components/ui/DataTable';
import { FormField } from '../shared/components/forms/FormField';
import { Input } from '../shared/components/ui/Input';
import { Select } from '../shared/components/ui/Select';
import { Skeleton } from '../shared/components/ui/Skeleton';
import { useNotification } from '../shared/notifications/use-notification';

interface PlatformPlanRecord {
  id: string;
  code: string;
  name: string;
}

interface PlatformTenantRecord {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
}

export function PlatformTenantsPage() {
  const token = localStorage.getItem('qs_access_token');
  const user = JSON.parse(localStorage.getItem('qs_user') ?? 'null') as { isPlatformAdmin?: boolean } | null;
  const navigate = useNavigate();
  const { notify } = useNotification();
  const [plans, setPlans] = useState<PlatformPlanRecord[]>([]);
  const [tenants, setTenants] = useState<PlatformTenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<PlatformTenantRecord | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 8;
  const filteredTenants = tenants.filter((tenant) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [tenant.name, tenant.slug, tenant.plan, tenant.status].some((value) =>
      String(value).toLowerCase().includes(query),
    );
  });
  const pageCount = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  async function loadData() {
    if (!token) return;
    const [plansData, tenantsData] = await Promise.all([
      getPlatformPlans(token),
      getPlatformTenants(token),
    ]);
    setPlans(plansData as PlatformPlanRecord[]);
    setTenants(tenantsData as PlatformTenantRecord[]);
  }

  useEffect(() => {
    if (!token) return;
    loadData()
      .catch((err: Error) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const payload = {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        status: editing ? String(form.get('status') ?? editing.status) : 'active',
        plan: String(form.get('plan') ?? 'starter'),
        primaryDomain: String(form.get('primaryDomain') ?? ''),
        customDomain: String(form.get('customDomain') ?? ''),
        contactEmail: String(form.get('contactEmail') ?? ''),
        contactPhone: String(form.get('contactPhone') ?? ''),
        whatsappNumber: String(form.get('whatsappNumber') ?? ''),
      };

      if (editing) {
        await updatePlatformTenant(token, editing.id, payload);
        if (editing.plan !== payload.plan) {
          await updatePlatformTenantPlan(token, editing.id, payload.plan);
        }
      } else {
        await createPlatformTenant(token, payload);
      }

      await loadData();
      setOpen(false);
      setEditing(null);
      notify('Empresa guardada.', 'success');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout isPlatformAdmin={Boolean(user?.isPlatformAdmin)} currentPath="/platform/tenants">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Listado de empresas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Administra empresas y entra a la configuración detallada de cada una.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            Nueva empresa
          </Button>
        </div>

        <DataTableShell>
          <DataTableToolbar
            summary={`${filteredTenants.length} empresa${filteredTenants.length === 1 ? '' : 's'}`}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar por nombre, slug o plan..."
          />
          <DataTable>
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="w-px whitespace-nowrap px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`tenant-skeleton-${index}`} className="border-t border-slate-200">
                    <td className="px-4 py-3" colSpan={4}>
                      <div className="grid gap-3 md:grid-cols-[1.3fr_0.4fr_0.4fr_0.9fr] md:items-center">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                        <Skeleton className="h-12" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredTenants.length === 0 ? (
                <tr><td className="px-4 py-4 text-slate-500" colSpan={4}>No hay empresas creadas.</td></tr>
              ) : (
                visibleTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{tenant.name}</p>
                      <p className="text-xs text-slate-500">{tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{tenant.plan}</td>
                    <td className="px-4 py-3">{tenant.status === 'active' ? 'Activa' : tenant.status}</td>
                    <td className="w-px whitespace-nowrap px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="primary" className="h-9 px-4 text-xs font-semibold" onClick={() => navigate(`/platform/tenants/${tenant.id}`)}>
                          Configurar
                        </Button>
                        <Button variant="secondary" className="h-9 px-4 text-xs font-semibold" onClick={() => { setEditing(tenant); setOpen(true); }}>
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="h-9 px-4 text-xs font-semibold"
                          onClick={async () => {
                            if (!token) return;
                            try {
                              await deletePlatformTenant(token, tenant.id);
                              await loadData();
                              notify('Empresa archivada.', 'success');
                            } catch (err) {
                              notify((err as Error).message, 'error');
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </DataTable>
          <DataTablePagination
            page={currentPage}
            pageCount={pageCount}
            pageSize={pageSize}
            totalItems={filteredTenants.length}
            onPageChange={setPage}
          />
        </DataTableShell>
      </Card>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Editar empresa' : 'Nueva empresa'}
        maxWidthClassName="max-w-3xl"
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre" required>
              <Input name="name" defaultValue={editing?.name ?? ''} />
            </FormField>
            <FormField label="Slug" required>
              <Input name="slug" defaultValue={editing?.slug ?? ''} />
            </FormField>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Plan">
              <Select name="plan" defaultValue={editing?.plan ?? plans[0]?.code ?? 'starter'}>
                {plans.length > 0 ? (
                  plans.map((plan) => (
                    <option key={plan.id} value={plan.code}>
                      {plan.name}
                    </option>
                  ))
                ) : (
                  <option value="starter">Starter</option>
                )}
              </Select>
            </FormField>
            {editing ? (
              <FormField label="Estado">
                <Select name="status" defaultValue={editing.status}>
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </Select>
              </FormField>
            ) : null}
          </div>
          {!editing ? (
            <>
              <FormField label="Dominio primario">
                <Input name="primaryDomain" placeholder="empresa.quicklyecsites.local" />
              </FormField>
              <FormField label="Dominio personalizado">
                <Input name="customDomain" placeholder="midominio.com" />
              </FormField>
            </>
          ) : null}
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Email contacto">
              <Input name="contactEmail" />
            </FormField>
            <FormField label="Teléfono">
              <Input name="contactPhone" />
            </FormField>
            <FormField label="WhatsApp">
              <Input name="whatsappNumber" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving} loadingLabel="Guardando...">
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
